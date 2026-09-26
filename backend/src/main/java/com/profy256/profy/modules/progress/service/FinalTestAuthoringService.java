package com.profy256.profy.modules.progress.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.profy256.profy.modules.progress.dto.CertRequests.FinalTestQuestion;
import com.profy256.profy.modules.progress.dto.CertRequests.FinalTestRequest;
import com.profy256.profy.modules.taxonomy.entity.TaxonomyNode;
import com.profy256.profy.modules.taxonomy.repository.TaxonomyNodeRepository;
import com.profy256.profy.platform.error.BadRequestException;
import com.profy256.profy.platform.error.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Admin authoring of a course-level final test.
 * Stored as jsonb on taxonomy_nodes.final_test — one test per course.
 */
@Service
public class FinalTestAuthoringService {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final TaxonomyNodeRepository taxonomyNodeRepository;
    private final CertificateSettingsService settingsService;

    public FinalTestAuthoringService(TaxonomyNodeRepository taxonomyNodeRepository,
                                     CertificateSettingsService settingsService) {
        this.taxonomyNodeRepository = taxonomyNodeRepository;
        this.settingsService = settingsService;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> get(UUID courseId) {
        TaxonomyNode course = requireCourse(courseId);
        return toResponse(course);
    }

    @Transactional
    public Map<String, Object> save(UUID courseId, FinalTestRequest request, UUID adminUserId) {
        TaxonomyNode course = requireCourse(courseId);

        List<Map<String, Object>> questions = new ArrayList<>();
        int index = 0;
        for (FinalTestQuestion q : request.questions()) {
            String text = q.question() != null ? q.question().trim() : "";
            if (text.isEmpty()) throw new BadRequestException("Question " + (index + 1) + " is empty");

            List<String> options = q.options() == null ? List.of() : q.options();
            if (options.size() < 2) {
                throw new BadRequestException("Question " + (index + 1) + " needs at least 2 options");
            }
            if (options.stream().allMatch(String::isBlank)) {
                throw new BadRequestException("Question " + (index + 1) + " has no filled options");
            }
            int answer = q.answerIndex() == null ? -1 : q.answerIndex();
            if (answer < 0 || answer >= options.size()) {
                throw new BadRequestException("Question " + (index + 1) + " has an invalid correct answer");
            }

            Map<String, Object> out = new LinkedHashMap<>();
            out.put("question", text);
            out.put("options", options);
            out.put("answerIndex", answer);
            questions.add(out);
            index++;
        }

        if (questions.isEmpty()) throw new BadRequestException("Add at least one question");

        int passPercent = request.passPercent() != null
                ? request.passPercent()
                : settingsService.get().getDefaultPassPercent();

        try {
            course.setFinalTest(MAPPER.writeValueAsString(questions));
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new BadRequestException("Could not store the test questions: " + e.getMessage());
        }
        course.setFinalTestPassPercent(passPercent);
        taxonomyNodeRepository.save(course);
        return toResponse(course);
    }

    private TaxonomyNode requireCourse(UUID id) {
        TaxonomyNode node = taxonomyNodeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
        if (!"course".equals(node.getNodeType())) {
            throw new BadRequestException("Final tests can only be authored for courses");
        }
        return node;
    }

    private Map<String, Object> toResponse(TaxonomyNode course) {
        List<Map<String, Object>> questions = List.of();
        if (course.getFinalTest() != null && !course.getFinalTest().isBlank()) {
            try {
                questions = MAPPER.readValue(course.getFinalTest(), new TypeReference<>() {});
            } catch (Exception ignored) {
                questions = List.of();
            }
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("courseId", course.getId().toString());
        out.put("courseName", course.getName());
        out.put("courseSlug", course.getSlug());
        out.put("passPercent", course.getFinalTestPassPercent());
        out.put("questionCount", questions.size());
        out.put("questions", questions);
        return out;
    }
}
