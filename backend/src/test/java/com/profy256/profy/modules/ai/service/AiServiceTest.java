package com.profy256.profy.modules.ai.service;

import com.profy256.profy.modules.ai.dto.AiResponses.ChatHistoryResponse;
import com.profy256.profy.modules.ai.entity.AiChatMessage;
import com.profy256.profy.modules.ai.entity.AiChatSession;
import com.profy256.profy.modules.ai.repository.AiChatMessageRepository;
import com.profy256.profy.modules.ai.repository.AiChatSessionRepository;
import com.profy256.profy.modules.lessons.repository.LessonRepository;
import com.profy256.profy.modules.billing.repository.SubscriptionRepository;
import com.profy256.profy.platform.config.AppConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AiServiceTest {

    private AiChatSessionRepository sessionRepository;
    private AiChatMessageRepository messageRepository;
    private AiService service;

    @BeforeEach
    void setUp() {
        sessionRepository = mock(AiChatSessionRepository.class);
        messageRepository = mock(AiChatMessageRepository.class);
        service = new AiService(
                sessionRepository,
                messageRepository,
                mock(LessonRepository.class),
                mock(SubscriptionRepository.class),
                mock(LlmGateway.class),
                mock(AppConfig.class),
                mock(StringRedisTemplate.class),
                mock(CircuitBreaker.class));
    }

    @Test
    void getHistoryReturnsEmptyListWhenNoSessionExistsYet() {
        UUID userId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        when(sessionRepository.findByUserIdAndLessonId(userId, lessonId)).thenReturn(Optional.empty());

        ChatHistoryResponse history = service.getHistory(userId, lessonId);

        assertThat(history.messages()).isEmpty();
    }

    @Test
    void getHistoryReturnsStoredMessagesForTheSession() {
        UUID userId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        AiChatSession session = new AiChatSession(userId, lessonId);
        when(sessionRepository.findByUserIdAndLessonId(userId, lessonId)).thenReturn(Optional.of(session));
        when(messageRepository.findBySessionIdOrderByCreatedAtAsc(session.getId())).thenReturn(List.of(
                new AiChatMessage(session.getId(), "user", "what is HTML?"),
                new AiChatMessage(session.getId(), "assistant", "HTML is the structure of a web page.")
        ));

        ChatHistoryResponse history = service.getHistory(userId, lessonId);

        assertThat(history.messages()).hasSize(2);
        assertThat(history.messages().get(0).role()).isEqualTo("user");
        assertThat(history.messages().get(1).content()).contains("structure");
    }
}
