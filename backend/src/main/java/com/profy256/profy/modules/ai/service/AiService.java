package com.profy256.profy.modules.ai.service;

import com.profy256.profy.modules.ai.dto.AiResponses.AIChatResponse;
import com.profy256.profy.modules.ai.dto.AiResponses.ChatHistoryResponse;
import com.profy256.profy.modules.ai.dto.AiResponses.ChatMessageResponse;
import com.profy256.profy.modules.ai.entity.AiChatMessage;
import com.profy256.profy.modules.ai.entity.AiChatSession;
import com.profy256.profy.modules.ai.repository.AiChatMessageRepository;
import com.profy256.profy.modules.ai.repository.AiChatSessionRepository;
import com.profy256.profy.modules.ai.service.LLMProvider.ChatMessage;
import com.profy256.profy.modules.billing.repository.SubscriptionRepository;
import com.profy256.profy.modules.lessons.entity.Lesson;
import com.profy256.profy.modules.lessons.repository.LessonRepository;
import com.profy256.profy.platform.config.AppConfig;
import com.profy256.profy.platform.error.AiUnavailableException;
import com.profy256.profy.platform.error.ResourceNotFoundException;
import com.profy256.profy.platform.error.RateLimitException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class AiService {

    private static final Logger log = LoggerFactory.getLogger(AiService.class);
    private static final int LESSON_HISTORY_LIMIT = 10;
    private static final String AI_MSG_KEY_PREFIX = "ai:msgs:";
    private static final DateTimeFormatter DAY_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final AiChatSessionRepository sessionRepository;
    private final AiChatMessageRepository messageRepository;
    private final LessonRepository lessonRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final LLMProvider llmProvider;
    private final AppConfig appConfig;
    private final StringRedisTemplate redisTemplate;
    private final CircuitBreaker circuitBreaker;

    public AiService(AiChatSessionRepository sessionRepository,
                     AiChatMessageRepository messageRepository,
                     LessonRepository lessonRepository,
                     SubscriptionRepository subscriptionRepository,
                     LLMProvider llmProvider,
                     AppConfig appConfig,
                     StringRedisTemplate redisTemplate,
                     CircuitBreaker circuitBreaker) {
        this.sessionRepository = sessionRepository;
        this.messageRepository = messageRepository;
        this.lessonRepository = lessonRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.llmProvider = llmProvider;
        this.appConfig = appConfig;
        this.redisTemplate = redisTemplate;
        this.circuitBreaker = circuitBreaker;
    }

    @Transactional
    public AIChatResponse chat(UUID userId, UUID lessonId, String message) {
        checkRateLimit(userId);

        AiChatSession session = sessionRepository.findByUserIdAndLessonId(userId, lessonId)
                .orElseGet(() -> sessionRepository.save(new AiChatSession(userId, lessonId)));

        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));

        String systemPrompt = buildSystemPrompt(lesson);

        List<AiChatMessage> history = messageRepository
                .findBySessionIdOrderByCreatedAtAsc(session.getId());
        int start = Math.max(0, history.size() - LESSON_HISTORY_LIMIT);
        List<ChatMessage> recentHistory = history.subList(start, history.size()).stream()
                .map(m -> new ChatMessage(m.getRole(), m.getContent()))
                .toList();

        String circuitKey = userId.toString();
        if (circuitBreaker.isOpen(circuitKey)) {
            throw new AiUnavailableException("AI Teacher is temporarily unavailable due to repeated errors. Please try again later.");
        }

        ChatMessage userMsg = new ChatMessage("user", message);
        List<ChatMessage> messages = new ArrayList<>(recentHistory);
        messages.add(userMsg);

        saveMessage(session.getId(), "user", message);

        try {
            LLMProvider.ChatResponse response = llmProvider.complete(messages, systemPrompt);
            circuitBreaker.recordSuccess(circuitKey);

            saveMessage(session.getId(), "assistant", response.content());
            incrementRateLimit(userId);

            return new AIChatResponse(response.content());
        } catch (AiUnavailableException e) {
            circuitBreaker.recordFailure(circuitKey);
            throw e;
        } catch (Exception e) {
            circuitBreaker.recordFailure(circuitKey);
            log.error("AI chat error: {}", e.getMessage());
            throw new AiUnavailableException("Failed to get AI response");
        }
    }

    @Transactional(readOnly = true)
    public ChatHistoryResponse getHistory(UUID userId, UUID lessonId) {
        AiChatSession session = sessionRepository.findByUserIdAndLessonId(userId, lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat session not found"));

        List<AiChatMessage> messages = messageRepository
                .findBySessionIdOrderByCreatedAtAsc(session.getId());

        List<ChatMessageResponse> responses = messages.stream()
                .map(m -> new ChatMessageResponse(m.getId(), m.getRole(), m.getContent(), m.getCreatedAt()))
                .toList();

        return new ChatHistoryResponse(responses);
    }

    private void checkRateLimit(UUID userId) {
        boolean isPremium = isUserPremium(userId);
        int dailyLimit = isPremium ? appConfig.getAiPremiumMsgsPerDay() : appConfig.getAiFreeMsgsPerDay();

        String key = buildRedisKey(userId);
        String val = redisTemplate.opsForValue().get(key);
        if (val != null) {
            int count = Integer.parseInt(val);
            if (count >= dailyLimit) {
                throw new RateLimitException("Daily AI message limit reached (" + dailyLimit + " messages/day). "
                        + (isPremium ? "" : "Upgrade to premium for more messages."));
            }
        }
    }

    private void incrementRateLimit(UUID userId) {
        String key = buildRedisKey(userId);
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1L) {
            Instant endOfDay = LocalDate.now().atStartOfDay(ZoneId.systemDefault())
                    .plusDays(1).toInstant();
            long ttlSeconds = endOfDay.getEpochSecond() - Instant.now().getEpochSecond();
            if (ttlSeconds > 0) {
                redisTemplate.expire(key, Duration.ofSeconds(ttlSeconds));
            }
        }
    }

    private String buildRedisKey(UUID userId) {
        String today = LocalDate.now().format(DAY_FORMAT);
        return AI_MSG_KEY_PREFIX + userId + ":" + today;
    }

    private boolean isUserPremium(UUID userId) {
        try {
            return subscriptionRepository
                    .findFirstByUserIdAndStatusOrderByCurrentPeriodEndDesc(userId, "active")
                    .map(sub -> {
                        if (sub.getCurrentPeriodEnd() != null && sub.getCurrentPeriodEnd().isAfter(Instant.now())) {
                            return true;
                        }
                        return false;
                    })
                    .orElse(false);
        } catch (Exception e) {
            log.warn("Could not check premium status for user {}: {}", userId, e.getMessage());
            return false;
        }
    }

    private String buildSystemPrompt(Lesson lesson) {
        String title = lesson.getTitle() != null ? lesson.getTitle() : "this lesson";
        String description = lesson.getDescription() != null ? lesson.getDescription() : "N/A";
        String explanation = lesson.getExplanation() != null ? lesson.getExplanation() : "N/A";
        String objectives = lesson.getObjectives() != null ? lesson.getObjectives() : "[]";
        String examples = lesson.getExamples() != null ? lesson.getExamples() : "[]";
        String exercises = lesson.getExercises() != null ? lesson.getExercises() : "[]";
        String quizzes = lesson.getQuizzes() != null ? lesson.getQuizzes() : "[]";

        return "You are an AI Teacher for the lesson '" + title + "'. Answer questions ONLY based on the following lesson content. If the question is off-topic or not related to this lesson, reply with: 'I can only help with questions about this lesson's content. Please ask something related to the lesson material.'\n\n"
                + "Lesson content:\n"
                + "Description: " + description + "\n"
                + "Explanation: " + explanation + "\n"
                + "Objectives: " + objectives + "\n"
                + "Examples: " + examples + "\n"
                + "Exercises: " + exercises + "\n"
                + "Quizzes: " + quizzes;
    }

    private void saveMessage(UUID sessionId, String role, String content) {
        AiChatMessage msg = new AiChatMessage(sessionId, role, content);
        messageRepository.save(msg);
    }
}
