package com.profy256.profy.modules.lessons.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.profy256.profy.modules.ai.service.AdminAiService;
import com.profy256.profy.modules.lessons.entity.Lesson;
import com.profy256.profy.modules.lessons.entity.LessonVideo;
import com.profy256.profy.modules.lessons.repository.LessonRepository;
import com.profy256.profy.modules.lessons.repository.LessonVideoRepository;
import com.profy256.profy.modules.taxonomy.entity.TaxonomyNode;
import com.profy256.profy.modules.taxonomy.repository.TaxonomyNodeRepository;
import com.profy256.profy.platform.error.BadRequestException;
import com.profy256.profy.platform.error.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class ImportService {

    private static final Logger log = LoggerFactory.getLogger(ImportService.class);
    private static final Pattern YOUTUBE_ID_PATTERN = Pattern.compile("(?:v=|youtu\\.be/|embed/)([a-zA-Z0-9_-]{11})");
    private static final ObjectMapper objectMapper = new ObjectMapper();

    private final LessonRepository lessonRepository;
    private final LessonVideoRepository lessonVideoRepository;
    private final TaxonomyNodeRepository taxonomyNodeRepository;
    private final AdminAiService adminAiService;

    public ImportService(LessonRepository lessonRepository,
                         LessonVideoRepository lessonVideoRepository,
                         TaxonomyNodeRepository taxonomyNodeRepository,
                         AdminAiService adminAiService) {
        this.lessonRepository = lessonRepository;
        this.lessonVideoRepository = lessonVideoRepository;
        this.taxonomyNodeRepository = taxonomyNodeRepository;
        this.adminAiService = adminAiService;
    }

    public record ImportYouTubeResponse(
            String lessonId,
            String title,
            String slug,
            String videoId,
            String channel,
            String status
    ) {}

    public record ImportUrlResponse(
            String lessonId,
            String title,
            String slug,
            String status,
            String message
    ) {}

    public record ImportFileResponse(
            List<CreatedLesson> lessons,
            String message
    ) {}

    public record CreatedLesson(
            String lessonId,
            String title,
            String slug,
            String status
    ) {}

    /**
     * Import a YouTube video as a lesson.
     * Extracts video ID from URL, creates a lesson with the video attached.
     */
    @Transactional
    public ImportYouTubeResponse importYouTube(String youtubeUrl, String courseId, UUID adminUserId) {
        // Extract video ID from URL
        Matcher matcher = YOUTUBE_ID_PATTERN.matcher(youtubeUrl);
        if (!matcher.find()) {
            throw new BadRequestException("Could not extract YouTube video ID from URL: " + youtubeUrl);
        }
        String videoId = matcher.group(1);

        // Find the course
        TaxonomyNode course = taxonomyNodeRepository.findById(UUID.fromString(courseId))
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        // Fetch video info from YouTube oEmbed API
        String title = "YouTube Video";
        String channel = "Unknown";
        try {
            String oembedUrl = "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=" + videoId + "&format=json";
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(oembedUrl))
                    .GET()
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode json = objectMapper.readTree(response.body());
                title = json.path("title").asText("YouTube Video");
                channel = json.path("author_name").asText("Unknown");
            }
        } catch (Exception e) {
            log.warn("Failed to fetch YouTube oEmbed info: {}", e.getMessage());
        }

        // Create lesson
        String slug = slugify(title);
        Lesson lesson = new Lesson();
        lesson.setId(UUID.randomUUID());
        lesson.setNodeId(UUID.fromString(courseId));
        lesson.setTitle(title);
        lesson.setSlug(slug);
        lesson.setDescription("Video lesson: " + title);
        lesson.setExplanation("");
        lesson.setObjectives("[]");
        lesson.setExamples("[]");
        lesson.setExercises("[]");
        lesson.setQuizzes("[]");
        lesson.setLevel("beginner");
        lesson.setStatus("draft");
        lesson.setSortOrder(0);
        lesson.setCreatedBy(adminUserId);
        lesson = lessonRepository.save(lesson);

        // Attach video
        LessonVideo video = new LessonVideo();
        video.setId(UUID.randomUUID());
        video.setLessonId(lesson.getId());
        video.setYoutubeVideoId(videoId);
        video.setTitle(title);
        video.setChannel(channel);
        video.setIsPrimary(true);
        video.setSource("curated");
        video.setCuratorStatus("approved");
        video.setAddedBy(adminUserId);
        lessonVideoRepository.save(video);

        return new ImportYouTubeResponse(
                lesson.getId().toString(), title, slug, videoId, channel, "draft");
    }

    /**
     * Import content from a URL. Fetches the page content and uses AI to generate a lesson.
     */
    @Transactional
    public ImportUrlResponse importFromUrl(String url, String courseId, UUID adminUserId) {
        TaxonomyNode course = taxonomyNodeRepository.findById(UUID.fromString(courseId))
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        String content = fetchUrlContent(url);
        if (content == null || content.isBlank()) {
            throw new BadRequestException("Could not fetch content from URL");
        }

        // Use AI to generate lesson from content
        String aiPrompt = """
                Based on the following web content, generate a complete educational lesson.
                The lesson should be suitable for beginners to intermediate learners.

                URL: %s

                Content (first 3000 chars):
                %s

                Generate a JSON response with this exact structure:
                {
                    "title": "Lesson title",
                    "description": "A compelling 1-2 sentence description",
                    "explanation": "A thorough 3-5 paragraph explanation of the topic with code examples where applicable",
                    "objectives": ["Objective 1", "Objective 2", "Objective 3", "Objective 4"],
                    "examples": ["Example 1 with explanation", "Example 2 with explanation"],
                    "exercises": ["Exercise 1", "Exercise 2", "Exercise 3"],
                    "quizzes": [
                        {"question": "Question 1?", "options": ["A", "B", "C", "D"], "answerIndex": 0},
                        {"question": "Question 2?", "options": ["A", "B", "C", "D"], "answerIndex": 1}
                    ]
                }
                """.formatted(url, content.substring(0, Math.min(content.length(), 3000)));

        try {
            String aiResponse = adminAiService.chat(adminUserId, aiPrompt).content();
            String json = extractJson(aiResponse);

            if (json != null) {
                JsonNode root = objectMapper.readTree(json);
                String title = root.path("title").asText("Imported Lesson");
                String slug = slugify(title);

                Lesson lesson = new Lesson();
                lesson.setId(UUID.randomUUID());
                lesson.setNodeId(UUID.fromString(courseId));
                lesson.setTitle(title);
                lesson.setSlug(slug);
                lesson.setDescription(root.path("description").asText(""));
                lesson.setExplanation(root.path("explanation").asText(""));
                lesson.setObjectives(root.path("objectives").toString());
                lesson.setExamples(root.path("examples").toString());
                lesson.setExercises(root.path("exercises").toString());
                lesson.setQuizzes(root.path("quizzes").toString());
                lesson.setLevel("beginner");
                lesson.setStatus("draft");
                lesson.setSortOrder(0);
                lesson.setCreatedBy(adminUserId);
                lesson = lessonRepository.save(lesson);

                return new ImportUrlResponse(
                        lesson.getId().toString(), title, slug, "draft",
                        "Successfully imported lesson from URL");
            }
        } catch (Exception e) {
            log.error("Failed to generate lesson from URL: {}", e.getMessage());
        }

        throw new BadRequestException("Failed to generate lesson from URL content. Please try again.");
    }

    /**
     * Import content from an uploaded file (PDF, text, etc.) and generate lessons using AI.
     */
    @Transactional
    public ImportFileResponse importFromFile(MultipartFile file, String courseId, UUID adminUserId, Integer lessonCount) {
        TaxonomyNode course = taxonomyNodeRepository.findById(UUID.fromString(courseId))
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        String content = extractTextFromFile(file);
        if (content == null || content.isBlank()) {
            throw new BadRequestException("Could not extract text from file");
        }

        int targetLessons = lessonCount != null ? Math.min(lessonCount, 10) : 3;
        List<CreatedLesson> createdLessons = new ArrayList<>();

        // Split content into chunks for multiple lessons
        List<String> chunks = splitContentIntoChunks(content, targetLessons);

        for (int i = 0; i < chunks.size(); i++) {
            String chunk = chunks.get(i);
            String aiPrompt = """
                    Based on the following content (part %d of %d), generate a complete educational lesson.
                    The lesson should be suitable for beginners to intermediate learners.

                    Content:
                    %s

                    Generate a JSON response with this exact structure:
                    {
                        "title": "Lesson title for this section",
                        "description": "A compelling 1-2 sentence description",
                        "explanation": "A thorough 3-5 paragraph explanation of the topic with code examples where applicable",
                        "objectives": ["Objective 1", "Objective 2", "Objective 3", "Objective 4"],
                        "examples": ["Example 1 with explanation", "Example 2 with explanation"],
                        "exercises": ["Exercise 1", "Exercise 2", "Exercise 3"],
                        "quizzes": [
                            {"question": "Question 1?", "options": ["A", "B", "C", "D"], "answerIndex": 0},
                            {"question": "Question 2?", "options": ["A", "B", "C", "D"], "answerIndex": 1}
                        ]
                    }
                    """.formatted(i + 1, chunks.size(), chunk.substring(0, Math.min(chunk.length(), 3000)));

            try {
                String aiResponse = adminAiService.chat(adminUserId, aiPrompt).content();
                String json = extractJson(aiResponse);

                if (json != null) {
                    JsonNode root = objectMapper.readTree(json);
                    String title = root.path("title").asText("Imported Lesson " + (i + 1));
                    String slug = slugify(title);

                    // Ensure slug uniqueness
                    String originalSlug = slug;
                    int counter = 1;
                    while (lessonRepository.findBySlug(slug).isPresent()) {
                        slug = originalSlug + "-" + counter++;
                    }

                    Lesson lesson = new Lesson();
                    lesson.setId(UUID.randomUUID());
                    lesson.setNodeId(UUID.fromString(courseId));
                    lesson.setTitle(title);
                    lesson.setSlug(slug);
                    lesson.setDescription(root.path("description").asText(""));
                    lesson.setExplanation(root.path("explanation").asText(""));
                    lesson.setObjectives(root.path("objectives").toString());
                    lesson.setExamples(root.path("examples").toString());
                    lesson.setExercises(root.path("exercises").toString());
                    lesson.setQuizzes(root.path("quizzes").toString());
                    lesson.setLevel("beginner");
                    lesson.setStatus("draft");
                    lesson.setSortOrder(i);
                    lesson.setCreatedBy(adminUserId);
                    lesson = lessonRepository.save(lesson);

                    createdLessons.add(new CreatedLesson(
                            lesson.getId().toString(), title, slug, "draft"));
                }
            } catch (Exception e) {
                log.error("Failed to generate lesson from chunk {}: {}", i + 1, e.getMessage());
            }
        }

        return new ImportFileResponse(createdLessons,
                "Successfully generated " + createdLessons.size() + " lessons from file");
    }

    private String fetchUrlContent(String url) {
        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", "Mozilla/5.0 (compatible; DeraSkul/1.0)")
                    .GET()
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                // Basic HTML to text conversion
                String html = response.body();
                return html.replaceAll("<script[^>]*>[\\s\\S]*?</script>", "")
                        .replaceAll("<style[^>]*>[\\s\\S]*?</style>", "")
                        .replaceAll("<[^>]+>", " ")
                        .replaceAll("\\s+", " ")
                        .trim();
            }
        } catch (Exception e) {
            log.error("Failed to fetch URL content: {}", e.getMessage());
        }
        return null;
    }

    private String extractTextFromFile(MultipartFile file) {
        try {
            String filename = file.getOriginalFilename();
            if (filename == null) filename = "unknown";

            if (filename.endsWith(".txt") || filename.endsWith(".md")) {
                return new String(file.getBytes());
            }

            // For PDFs, we'll extract basic text (in production, use a PDF library)
            BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()));
            return reader.lines().collect(Collectors.joining("\n"));
        } catch (Exception e) {
            log.error("Failed to extract text from file: {}", e.getMessage());
            return null;
        }
    }

    private List<String> splitContentIntoChunks(String content, int targetChunks) {
        List<String> chunks = new ArrayList<>();
        int chunkSize = Math.max(content.length() / targetChunks, 1000);

        for (int i = 0; i < content.length() && chunks.size() < targetChunks; i += chunkSize) {
            int end = Math.min(i + chunkSize, content.length());
            chunks.add(content.substring(i, end));
        }

        return chunks.isEmpty() ? List.of(content) : chunks;
    }

    private String extractJson(String text) {
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return text.substring(start, end + 1);
        }
        return null;
    }

    private String slugify(String text) {
        return Pattern.compile("[^a-z0-9]+").matcher(text.toLowerCase().trim())
                .replaceAll("-").replaceAll("^-|-$", "");
    }
}
