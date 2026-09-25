package com.profy256.profy.modules.ai.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.profy256.profy.modules.ai.dto.AiProviderDto.TestProviderRequest;
import com.profy256.profy.modules.ai.dto.AiProviderDto.TestProviderResponse;
import com.profy256.profy.modules.ai.service.LLMProvider.ChatMessage;
import com.profy256.profy.modules.ai.service.LLMProvider.ChatResponse;
import com.profy256.profy.modules.lessons.entity.Lesson;
import com.profy256.profy.modules.lessons.repository.LessonRepository;
import com.profy256.profy.modules.taxonomy.dto.TaxonomyRequests.TaxonomyCreateRequest;
import com.profy256.profy.modules.taxonomy.entity.TaxonomyNode;
import com.profy256.profy.modules.taxonomy.repository.TaxonomyNodeRepository;
import com.profy256.profy.platform.error.AiUnavailableException;
import com.profy256.profy.platform.error.BadRequestException;
import com.profy256.profy.platform.error.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class AdminAiService {

    private static final Logger log = LoggerFactory.getLogger(AdminAiService.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static final Pattern SLUG_PATTERN = Pattern.compile("[^a-z0-9]+");
    private static final int MAX_HISTORY = 20;

    private final LlmGateway llmGateway;
    private final TaxonomyNodeRepository taxonomyNodeRepository;
    private final LessonRepository lessonRepository;

    // In-memory conversation history per admin session (keyed by adminUserId)
    private final Map<UUID, List<ChatMessage>> conversationHistory = new HashMap<>();

    public AdminAiService(LlmGateway llmGateway,
                          TaxonomyNodeRepository taxonomyNodeRepository,
                          LessonRepository lessonRepository) {
        this.llmGateway = llmGateway;
        this.taxonomyNodeRepository = taxonomyNodeRepository;
        this.lessonRepository = lessonRepository;
    }

    public record AdminChatResponse(
            String content,
            String actionType,
            Map<String, Object> actionResult
    ) {}

    @Transactional
    public AdminChatResponse chat(UUID adminUserId, String message) {
        List<ChatMessage> history = conversationHistory
                .computeIfAbsent(adminUserId, k -> new ArrayList<>());

        String systemPrompt = buildSystemPrompt();
        history.add(new ChatMessage("user", message));

        // Trim history
        if (history.size() > MAX_HISTORY) {
            history = new ArrayList<>(history.subList(history.size() - MAX_HISTORY, history.size()));
            conversationHistory.put(adminUserId, history);
        }

        try {
            String responseText = callLlm(history, systemPrompt);
            history.add(new ChatMessage("assistant", responseText));

            // Try to parse as a structured action
            return parseAndExecuteAction(responseText, message);

        } catch (AiUnavailableException e) {
            throw e;
        } catch (Exception e) {
            log.error("Admin AI error: {}", e.getMessage(), e);
            throw new AiUnavailableException("AI assistant encountered an error: " + e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public TestProviderResponse testProvider(TestProviderRequest request) {
        try {
            List<ChatMessage> msgs = List.of(new ChatMessage("user", request.message()));
            String systemPrompt = "You are a helpful assistant. Reply concisely in 1-2 sentences.";

            String responseText = callLlm(msgs, systemPrompt);
            return new TestProviderResponse(true, responseText, null);

        } catch (Exception e) {
            return new TestProviderResponse(false, null, e.getMessage());
        }
    }

    private String callLlm(List<ChatMessage> history, String systemPrompt) {
        ChatResponse resp = llmGateway.complete(history, systemPrompt);
        return resp.content();
    }

    private String buildSystemPrompt() {
        List<TaxonomyNode> allNodes = taxonomyNodeRepository.findAll();
        String taxonomyJson = buildTaxonomySummary(allNodes);

        return """
            You are the Dera Skul admin AI assistant. You help administrators manage content.
            
            CURRENT TAXONOMY:
            %s
            
            You can perform these actions by responding with JSON in this format:
            {"action": "action_name", "params": {...}}
            
            AVAILABLE ACTIONS:
            
            1. create_category - Create a new top-level category
               params: {"name": "...", "description": "...", "icon": "..."}
            
            2. create_subcategory - Create a subcategory under a category
               params: {"parentSlug": "...", "name": "...", "description": "...", "icon": "..."}
            
            3. create_course - Create a course under a subcategory
               params: {"parentSlug": "...", "name": "...", "description": "..."}
            
            4. create_lesson - Create a new lesson in a course
               params: {"courseSlug": "...", "title": "...", "description": "...", "explanation": "...", "objectives": ["..."], "examples": ["..."], "exercises": ["..."], "quizzes": [{"question": "...", "options": ["..."], "answerIndex": 0}]}
            
            5. generate_lesson_content - Generate full lesson content for an existing lesson
               params: {"lessonTitle": "...", "courseContext": "...", "level": "beginner|intermediate|advanced"}
            
            6. list_lessons - List all lessons or filter by course
               params: {"courseSlug": "..."} (courseSlug optional)
            
            7. list_taxonomy - Show current taxonomy tree
            
            8. search_lessons - Search lessons by keyword
               params: {"query": "..."}
            
            If the user asks something that doesn't require an action, respond with a helpful text message (not JSON).
            If you generate content, always respond with the action JSON so it gets executed.
            
            RULES:
            - Always generate slug from title: lowercase, hyphens for spaces, no special chars
            - Lessons must be attached to an existing course (nodeType=course)
            - For create_lesson, include at least: title, description, explanation, objectives
            - For generate_lesson_content, create comprehensive educational content
            - Content should be suitable for the specified level
            - Never generate destructive actions (delete, remove)
            """.formatted(taxonomyJson);
    }

    private String buildTaxonomySummary(List<TaxonomyNode> nodes) {
        StringBuilder sb = new StringBuilder();
        Map<UUID, TaxonomyNode> nodeMap = nodes.stream()
                .collect(Collectors.toMap(TaxonomyNode::getId, n -> n));

        List<TaxonomyNode> roots = nodes.stream()
                .filter(n -> n.getParentId() == null)
                .sorted(Comparator.comparing(TaxonomyNode::getSortOrder))
                .toList();

        for (TaxonomyNode root : roots) {
            appendNodeTree(sb, root, nodes, 0);
        }
        return sb.toString();
    }

    private void appendNodeTree(StringBuilder sb, TaxonomyNode node, List<TaxonomyNode> all, int depth) {
        sb.append("  ".repeat(depth));
        sb.append("- ").append(node.getName())
          .append(" [").append(node.getNodeType()).append("]")
          .append(" (slug: ").append(node.getSlug()).append(")")
          .append("\n");

        List<TaxonomyNode> children = all.stream()
                .filter(n -> node.getId().equals(n.getParentId()))
                .sorted(Comparator.comparing(TaxonomyNode::getSortOrder))
                .toList();

        for (TaxonomyNode child : children) {
            appendNodeTree(sb, child, all, depth + 1);
        }
    }

    private AdminChatResponse parseAndExecuteAction(String responseText, String originalMessage) {
        // Try to extract JSON from the response (it might have text before/after)
        String json = extractJson(responseText);
        if (json == null) {
            return new AdminChatResponse(responseText, null, null);
        }

        try {
            JsonNode root = objectMapper.readTree(json);
            String action = root.path("action").asText("");
            JsonNode params = root.path("params");

            return switch (action) {
                case "create_category" -> executeCreateCategory(params);
                case "create_subcategory" -> executeCreateSubcategory(params);
                case "create_course" -> executeCreateCourse(params);
                case "create_lesson" -> executeCreateLesson(params);
                case "generate_lesson_content" -> executeGenerateContent(params, originalMessage);
                case "list_lessons" -> executeListLessons(params);
                case "list_taxonomy" -> executeListTaxonomy();
                case "search_lessons" -> executeSearchLessons(params);
                default -> new AdminChatResponse(responseText, null, null);
            };
        } catch (Exception e) {
            log.warn("Failed to parse AI action: {}", e.getMessage());
            return new AdminChatResponse(responseText, null, null);
        }
    }

    private String extractJson(String text) {
        // Find first { and last } to extract JSON block
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return text.substring(start, end + 1);
        }
        return null;
    }

    private AdminChatResponse executeCreateCategory(JsonNode params) {
        String name = params.path("name").asText();
        String slug = slugify(name);
        TaxonomyCreateRequest req = new TaxonomyCreateRequest(
                null, "category", name, slug,
                params.path("description").asText(""),
                params.path("icon").asText(""),
                1, true, 0);
        TaxonomyNode node = taxonomyNodeRepository.save(toNode(req));
        String msg = "Created category '%s' (slug: %s)".formatted(name, slug);
        return new AdminChatResponse(msg, "create_category", Map.of("id", node.getId(), "name", name, "slug", slug));
    }

    private AdminChatResponse executeCreateSubcategory(JsonNode params) {
        String parentSlug = params.path("parentSlug").asText();
        TaxonomyNode parent = taxonomyNodeRepository.findBySlug(parentSlug)
                .orElseThrow(() -> new BadRequestException("Parent category not found: " + parentSlug));

        String name = params.path("name").asText();
        String slug = slugify(name);
        TaxonomyCreateRequest req = new TaxonomyCreateRequest(
                parent.getId().toString(), "subcategory", name, slug,
                params.path("description").asText(""),
                params.path("icon").asText(""),
                parent.getPhase(), true, 0);
        TaxonomyNode node = taxonomyNodeRepository.save(toNode(req));
        String msg = "Created subcategory '%s' under '%s' (slug: %s)".formatted(name, parent.getName(), slug);
        return new AdminChatResponse(msg, "create_subcategory", Map.of("id", node.getId(), "name", name, "slug", slug));
    }

    private AdminChatResponse executeCreateCourse(JsonNode params) {
        String parentSlug = params.path("parentSlug").asText();
        TaxonomyNode parent = taxonomyNodeRepository.findBySlug(parentSlug)
                .orElseThrow(() -> new BadRequestException("Parent subcategory not found: " + parentSlug));

        String name = params.path("name").asText();
        String slug = slugify(name);
        TaxonomyCreateRequest req = new TaxonomyCreateRequest(
                parent.getId().toString(), "course", name, slug,
                params.path("description").asText(""),
                "",
                parent.getPhase(), true, 0);
        TaxonomyNode node = taxonomyNodeRepository.save(toNode(req));
        String msg = "Created course '%s' under '%s' (slug: %s)".formatted(name, parent.getName(), slug);
        return new AdminChatResponse(msg, "create_course", Map.of("id", node.getId(), "name", name, "slug", slug));
    }

    private AdminChatResponse executeCreateLesson(JsonNode params) {
        String courseSlug = params.path("courseSlug").asText();
        TaxonomyNode course = taxonomyNodeRepository.findBySlug(courseSlug)
                .orElseThrow(() -> new BadRequestException("Course not found: " + courseSlug));

        String title = params.path("title").asText();
        String slug = slugify(title);

        Lesson lesson = new Lesson();
        lesson.setNodeId(course.getId());
        lesson.setTitle(title);
        lesson.setSlug(slug);
        lesson.setDescription(params.path("description").asText(""));
        lesson.setExplanation(params.path("explanation").asText(""));
        lesson.setObjectives(params.path("objectives").toString());
        lesson.setExamples(params.path("examples").toString());
        lesson.setExercises(params.path("exercises").toString());
        lesson.setQuizzes(params.path("quizzes").toString());
        lesson.setLevel(params.path("level").asText("beginner"));
        lesson.setStatus("draft");
        lesson.setSortOrder(0);
        lesson.setCreatedBy(UUID.fromString("00000000-0000-0000-0000-000000000001"));

        lesson = lessonRepository.save(lesson);
        String msg = "Created lesson '%s' in course '%s' (status: draft)".formatted(title, course.getName());
        return new AdminChatResponse(msg, "create_lesson", Map.of("id", lesson.getId(), "title", title, "slug", slug));
    }

    private AdminChatResponse executeGenerateContent(JsonNode params, String originalMessage) {
        // This returns a prompt for the AI to generate content in the next turn
        String lessonTitle = params.path("lessonTitle").asText();
        String courseContext = params.path("courseContext").asText("");
        String level = params.path("level").asText("beginner");

        String prompt = """
            Generate a complete lesson for "%s" at %s level.
            Course context: %s
            
            Respond with a JSON action:
            {"action": "create_lesson", "params": {
              "courseSlug": "<appropriate slug>",
              "title": "%s",
              "description": "A compelling 1-2 sentence description",
              "explanation": "A thorough 3-5 paragraph explanation of the topic with code examples where applicable",
              "objectives": ["Objective 1", "Objective 2", "Objective 3", "Objective 4"],
              "examples": ["Example 1 with explanation", "Example 2 with explanation"],
              "exercises": ["Exercise 1", "Exercise 2", "Exercise 3"],
              "quizzes": [
                {"question": "Question 1?", "options": ["A", "B", "C", "D"], "answerIndex": 0},
                {"question": "Question 2?", "options": ["A", "B", "C", "D"], "answerIndex": 1}
              ]
            }}
            """.formatted(lessonTitle, level, courseContext, lessonTitle);

        return new AdminChatResponse(
                "I'll generate the lesson content now. Please confirm to create it.",
                "generate_lesson_content",
                Map.of("prompt", prompt, "lessonTitle", lessonTitle));
    }

    @Transactional(readOnly = true)
    private AdminChatResponse executeListLessons(JsonNode params) {
        String courseSlug = params.has("courseSlug") ? params.path("courseSlug").asText("") : "";
        List<Lesson> lessons;
        if (!courseSlug.isBlank()) {
            TaxonomyNode course = taxonomyNodeRepository.findBySlug(courseSlug)
                    .orElseThrow(() -> new BadRequestException("Course not found: " + courseSlug));
            lessons = lessonRepository.findByNodeId(course.getId());
        } else {
            lessons = lessonRepository.findAll();
        }

        String list = lessons.stream()
                .map(l -> "- %s [%s] (id: %s)".formatted(l.getTitle(), l.getStatus(), l.getId()))
                .collect(Collectors.joining("\n"));

        return new AdminChatResponse("Found %d lessons:\n%s".formatted(lessons.size(), list), "list_lessons", null);
    }

    @Transactional(readOnly = true)
    private AdminChatResponse executeListTaxonomy() {
        List<TaxonomyNode> all = taxonomyNodeRepository.findAll();
        String tree = buildTaxonomySummary(all);
        return new AdminChatResponse("Current taxonomy:\n" + tree, "list_taxonomy", null);
    }

    @Transactional(readOnly = true)
    private AdminChatResponse executeSearchLessons(JsonNode params) {
        String query = params.path("query").asText();
        List<Lesson> lessons = lessonRepository.searchByTitleOrDescription(query);
        String list = lessons.stream()
                .map(l -> "- %s [%s] (id: %s)".formatted(l.getTitle(), l.getStatus(), l.getId()))
                .collect(Collectors.joining("\n"));
        return new AdminChatResponse("Found %d lessons matching '%s':\n%s".formatted(lessons.size(), query, list), "search_lessons", null);
    }

    private TaxonomyNode toNode(TaxonomyCreateRequest req) {
        TaxonomyNode node = new TaxonomyNode();
        node.setId(UUID.randomUUID());
        node.setParentId(req.parentNodeId() != null ? UUID.fromString(req.parentNodeId()) : null);
        node.setNodeType(req.nodeType());
        node.setName(req.name());
        node.setSlug(req.slug());
        node.setDescription(req.description());
        node.setIcon(req.icon());
        node.setPhase(req.phase() != null ? req.phase() : 1);
        node.setIsActive(req.isActive() != null ? req.isActive() : true);
        node.setSortOrder(req.sortOrder() != null ? req.sortOrder() : 0);
        node.setDepth(req.parentNodeId() != null ? 1 : 0);
        return node;
    }

    private String slugify(String text) {
        return SLUG_PATTERN.matcher(text.toLowerCase().trim()).replaceAll("-").replaceAll("^-|-$", "");
    }
}
