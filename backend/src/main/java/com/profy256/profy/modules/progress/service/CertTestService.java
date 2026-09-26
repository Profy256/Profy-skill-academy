package com.profy256.profy.modules.progress.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.profy256.profy.modules.auth.entity.User;
import com.profy256.profy.modules.auth.repository.UserRepository;
import com.profy256.profy.modules.lessons.entity.Lesson;
import com.profy256.profy.modules.lessons.repository.LessonRepository;
import com.profy256.profy.modules.progress.dto.CertRequests.SubmitFinalTestRequest;
import com.profy256.profy.modules.progress.dto.CertResponses.*;
import com.profy256.profy.modules.progress.entity.*;
import com.profy256.profy.modules.progress.repository.LessonProgressRepository;
import com.profy256.profy.modules.progress.repository.TestAttemptRepository;
import com.profy256.profy.modules.taxonomy.entity.TaxonomyNode;
import com.profy256.profy.modules.taxonomy.repository.TaxonomyNodeRepository;
import com.profy256.profy.platform.error.BadRequestException;
import com.profy256.profy.platform.error.PaymentRequiredException;
import com.profy256.profy.platform.error.RateLimitException;
import com.profy256.profy.platform.error.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Course-level final certification test.
 *
 * Rules (all enforced server-side):
 *   - attempt #1 is FREE only when course progress >= the admin-configured
 *     threshold (default 50%);
 *   - every other attempt requires an unused {@link TestCredit}
 *     ($2 Stripe / 7,500 UGX MarzPay — both admin-editable);
 *   - the answer key never leaves the server; the client only ever receives
 *     question + options;
 *   - passing (>= pass percent) issues a {@link Certificate} snapshotting the
 *     recipient name, course name and score.
 *
 * Lesson-level quizzes are practice and are deliberately NOT counted here.
 */
@Service
public class CertTestService {

    private static final Logger log = LoggerFactory.getLogger(CertTestService.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final TaxonomyNodeRepository taxonomyNodeRepository;
    private final LessonRepository lessonRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final TestAttemptRepository testAttemptRepository;
    private final TestCreditGranter creditGranter;
    private final CertificateSettingsService settingsService;
    private final CertificateService certificateService;
    private final UserRepository userRepository;
    private final StringRedisTemplate redisTemplate;

    /** Submissions per learner per hour — well above any legitimate pace. */
    private static final int MAX_SUBMITS_PER_HOUR = 10;
    private static final Duration SUBMIT_LOCK_TTL = Duration.ofSeconds(60);

    public CertTestService(TaxonomyNodeRepository taxonomyNodeRepository,
                           LessonRepository lessonRepository,
                           LessonProgressRepository lessonProgressRepository,
                           TestAttemptRepository testAttemptRepository,
                           TestCreditGranter creditGranter,
                           CertificateSettingsService settingsService,
                           CertificateService certificateService,
                           UserRepository userRepository,
                           StringRedisTemplate redisTemplate) {
        this.taxonomyNodeRepository = taxonomyNodeRepository;
        this.lessonRepository = lessonRepository;
        this.lessonProgressRepository = lessonProgressRepository;
        this.testAttemptRepository = testAttemptRepository;
        this.creditGranter = creditGranter;
        this.settingsService = settingsService;
        this.certificateService = certificateService;
        this.userRepository = userRepository;
        this.redisTemplate = redisTemplate;
    }

    // ─── State (what the "Certificate" tab renders) ─────────────────

    @Transactional(readOnly = true)
    public FinalTestStateResponse getState(UUID userId, String courseSlug) {
        TaxonomyNode course = requireCourse(courseSlug);
        CertificateSettings settings = settingsService.get();

        Progress progress = computeProgress(userId, course.getId());
        int attemptsUsed = testAttemptRepository.maxAttemptNumber(userId, course.getId());
        int credits = creditGranter.availableCredits(userId, course.getId());

        boolean freeAvailable = attemptsUsed == 0
                && progress.percent() >= settings.getFreeAttemptProgressPercent();
        boolean featureEnabled = Boolean.TRUE.equals(settings.getCertEnabled());
        boolean hasTest = parseQuestions(course.getFinalTest()) != null;
        boolean ready = featureEnabled && hasTest && (freeAvailable || credits > 0);

        int passPercent = course.getFinalTestPassPercent() != null
                ? course.getFinalTestPassPercent()
                : settings.getDefaultPassPercent();

        List<CertificateResponse> earned = certificateService.responsesForUser(userId, course);
        CertificateResponse primaryCertificate = earned.isEmpty() ? null : earned.get(0);

        return new FinalTestStateResponse(
                course.getId().toString(),
                course.getSlug(),
                course.getName(),
                progress.percent(),
                settings.getFreeAttemptProgressPercent(),
                attemptsUsed,
                freeAvailable,
                credits,
                ready,
                featureEnabled && hasTest,
                settings.getTestTitle(),
                settings.getTestInstructions().replace("{passPercent}", String.valueOf(passPercent)),
                passPercent,
                new Pricing(
                        settings.getTestPriceCents(), "usd",
                        settings.getTestPriceUgx(), "UGX"
                ),
                ready ? toPublicQuestions(course.getFinalTest()) : List.of(),
                primaryCertificate,
                earned,
                progress.completed(),
                progress.total()
        );
    }

    // ─── Submit (grade + maybe issue) ───────────────────────────────

    @Transactional
    public SubmitResponse submit(UUID userId, String courseSlug, SubmitFinalTestRequest request) {
        String lockKey = acquireSubmitLock(userId, courseSlug);
        try {
            return doSubmit(userId, courseSlug, request);
        } finally {
            releaseSubmitLock(lockKey);
        }
    }

    private SubmitResponse doSubmit(UUID userId, String courseSlug, SubmitFinalTestRequest request) {
        TaxonomyNode course = requireCourse(courseSlug);
        CertificateSettings settings = settingsService.get();

        if (!Boolean.TRUE.equals(settings.getCertEnabled())) {
            throw new BadRequestException("Certificates are currently disabled by the academy");
        }

        List<Map<String, Object>> questions = parseQuestions(course.getFinalTest());
        if (questions == null || questions.isEmpty()) {
            throw new BadRequestException("No final test has been published for this course yet");
        }

        List<Integer> answers = request.answers() == null ? List.of() : request.answers();
        if (answers.size() != questions.size()) {
            throw new BadRequestException("Please answer every question before submitting");
        }

        Progress progress = computeProgress(userId, course.getId());
        int attemptsUsed = testAttemptRepository.maxAttemptNumber(userId, course.getId());
        boolean freeAttempt = attemptsUsed == 0
                && progress.percent() >= settings.getFreeAttemptProgressPercent();

        if (!freeAttempt) {
            // Requires a paid credit — consume the oldest unused one atomically.
            creditGranter.consume(userId, course.getId())
                    .orElseThrow(() -> new PaymentRequiredException(
                            "This attempt is locked. Pass the free test first or buy a retake credit."));
        }

        // ── Grade on the server. The client never saw answerIndex. ──
        int score = 0;
        for (int i = 0; i < questions.size(); i++) {
            Object key = questions.get(i).get("answerIndex");
            int answerIndex = key instanceof Number n ? n.intValue() : -1;
            if (answers.get(i) != null && answers.get(i) == answerIndex) score++;
        }
        int total = questions.size();
        int percent = (int) Math.round(score * 100.0 / total);
        int passPercent = course.getFinalTestPassPercent() != null
                ? course.getFinalTestPassPercent()
                : settings.getDefaultPassPercent();
        boolean passed = percent >= passPercent;

        int attemptNumber = attemptsUsed + 1;
        testAttemptRepository.save(new TestAttempt(
                userId, course.getId(), score, total, passed, attemptNumber, freeAttempt));

        List<Certificate> issued = List.of();
        if (passed) {
            issued = issueCertificate(userId, course, score, total, passPercent, request);
        }

        int creditsLeft = creditGranter.availableCredits(userId, course.getId());

        log.info("Final test graded: user={}, course={}, score={}/{}, passed={}, free={}",
                userId, course.getSlug(), score, total, passed, freeAttempt);

        return new SubmitResponse(
                score, total, percent, passed, attemptNumber, freeAttempt,
                creditsLeft,
                certificateService.responses(issued, course)
        );
    }

    /**
     * Serialises submissions per learner.
     *
     * Two racing requests must not both read attemptsUsed == 0 and burn two
     * free attempts; the lock plus the credit write makes the gate atomic
     * without needing a distributed transaction. Rate limiting keeps a script
     * from grinding paid credits out of the endpoint.
     */
    private String acquireSubmitLock(UUID userId, String courseSlug) {
        String lockKey = "cert:submit:lock:" + userId + ":" + courseSlug;
        Boolean acquired = redisTemplate.opsForValue()
                .setIfAbsent(lockKey, "1", SUBMIT_LOCK_TTL);
        if (!Boolean.TRUE.equals(acquired)) {
            throw new RateLimitException("Your previous submission is still being graded — wait a moment.");
        }

        String rateKey = "cert:submit:rate:" + userId;
        try {
            Long count = redisTemplate.opsForValue().increment(rateKey);
            if (count != null && count == 1L) redisTemplate.expire(rateKey, Duration.ofHours(1));
            if (count != null && count > MAX_SUBMITS_PER_HOUR) {
                throw new RateLimitException("Too many test submissions — try again later.");
            }
        } catch (RateLimitException e) {
            redisTemplate.delete(lockKey);
            throw e;
        }
        return lockKey;
    }

    private void releaseSubmitLock(String lockKey) {
        try {
            redisTemplate.delete(lockKey);
        } catch (Exception e) {
            log.warn("Could not release submit lock: {}", e.getMessage());
        }
    }

    // ─── Internals ──────────────────────────────────────────────────

    /**
     * Awards every credential definition this pass satisfies for the course.
     * A single course can carry several admin-authored credentials
     * (e.g. "Completed" + "Distinction"), so this returns a list.
     */
    private List<Certificate> issueCertificate(UUID userId, TaxonomyNode course,
                                               int score, int total, int passPercent,
                                               SubmitFinalTestRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Identity verification: the learner must confirm the name that will be
        // printed. Passing an explicit recipientName overrides the profile name.
        if (!Boolean.TRUE.equals(request.confirmName())) {
            throw new BadRequestException("Confirm your name to receive the certificate");
        }
        String printedName = (request.recipientName() != null && !request.recipientName().isBlank())
                ? request.recipientName().trim()
                : user.getName();
        if (printedName == null || printedName.isBlank()) {
            throw new BadRequestException("Your account has no name — set one before certifying");
        }

        Progress progress = computeProgress(userId, course.getId());
        return certificateService.issueForPassedTest(
                userId, user, course, score, total, passPercent,
                progress.percent(), printedName);
    }

    private Progress computeProgress(UUID userId, UUID courseNodeId) {
        List<Lesson> lessons = lessonRepository.findByStatusAndNodeId("published", courseNodeId);
        if (lessons.isEmpty()) return new Progress(0, 0, 0);

        int completed = 0;
        for (Lesson lesson : lessons) {
            LessonProgress p = lessonProgressRepository.findByUserIdAndLessonId(userId, lesson.getId())
                    .orElse(null);
            if (p != null && "completed".equals(p.getStatus())) completed++;
        }
        int percent = (int) Math.round(completed * 100.0 / lessons.size());
        return new Progress(completed, lessons.size(), percent);
    }

    private TaxonomyNode requireCourse(String slug) {
        TaxonomyNode node = taxonomyNodeRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + slug));
        if (!"course".equals(node.getNodeType())) {
            throw new BadRequestException("That slug is not a course");
        }
        return node;
    }

    /** Returns null when no test is authored/published for the course. */
    private List<Map<String, Object>> parseQuestions(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            List<Map<String, Object>> list = MAPPER.readValue(json, new TypeReference<>() {});
            return list.isEmpty() ? null : list;
        } catch (Exception e) {
            log.warn("Malformed final_test JSON: {}", e.getMessage());
            return null;
        }
    }

    /** Strip answerIndex so the key is never sent to the client. */
    private List<TestQuestion> toPublicQuestions(String json) {
        List<Map<String, Object>> questions = parseQuestions(json);
        if (questions == null) return List.of();
        List<TestQuestion> out = new ArrayList<>();
        for (int i = 0; i < questions.size(); i++) {
            Map<String, Object> q = questions.get(i);
            @SuppressWarnings("unchecked")
            List<String> options = q.get("options") instanceof List<?> raw
                    ? raw.stream().map(String::valueOf).toList()
                    : List.of();
            out.add(new TestQuestion(i, String.valueOf(q.getOrDefault("question", "")), options));
        }
        return out;
    }

    private record Progress(int completed, int total, int percent) {}
}
