package com.profy256.profy.modules.lessons.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.profy256.profy.modules.lessons.dto.LessonRequests.CreateLessonRequest;
import com.profy256.profy.modules.lessons.dto.LessonRequests.VideoInput;
import com.profy256.profy.modules.lessons.entity.Lesson;
import com.profy256.profy.modules.lessons.entity.LessonVideo;
import com.profy256.profy.modules.lessons.repository.LessonRepository;
import com.profy256.profy.modules.lessons.repository.LessonVideoRepository;
import com.profy256.profy.modules.taxonomy.entity.TaxonomyNode;
import com.profy256.profy.modules.taxonomy.repository.TaxonomyNodeRepository;
import com.profy256.profy.platform.error.BadRequestException;
import com.profy256.profy.platform.error.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class LessonsService {

    private static final Pattern YOUTUBE_ID_PATTERN = Pattern.compile("^[A-Za-z0-9_-]{11}$");
    private static final ObjectMapper objectMapper = new ObjectMapper();

    private final LessonRepository lessonRepository;
    private final LessonVideoRepository lessonVideoRepository;
    private final TaxonomyNodeRepository taxonomyNodeRepository;

    public LessonsService(LessonRepository lessonRepository,
                          LessonVideoRepository lessonVideoRepository,
                          TaxonomyNodeRepository taxonomyNodeRepository) {
        this.lessonRepository = lessonRepository;
        this.lessonVideoRepository = lessonVideoRepository;
        this.taxonomyNodeRepository = taxonomyNodeRepository;
    }

    public Map<String, Object> getCourseBySlug(String slug) {
        TaxonomyNode node = taxonomyNodeRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + slug));

        List<Lesson> lessons = lessonRepository.findByStatusAndNodeId("published", node.getId());

        List<Map<String, Object>> lessonList = lessons.stream()
                .map(this::lessonSummaryToMap)
                .collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", node.getId().toString());
        result.put("name", node.getName());
        result.put("slug", node.getSlug());
        result.put("description", node.getDescription());
        result.put("icon", node.getIcon());
        result.put("nodeType", node.getNodeType());
        result.put("phase", node.getPhase());
        result.put("lessons", lessonList);
        return result;
    }

    public Map<String, Object> getLessonBySlug(String slug) {
        Lesson lesson = lessonRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found: " + slug));

        if (!"published".equals(lesson.getStatus())) {
            throw new ResourceNotFoundException("Lesson not found");
        }

        Optional<LessonVideo> primaryVideoOpt = lessonVideoRepository.findByLessonIdAndIsPrimaryTrue(lesson.getId());
        List<LessonVideo> allVideos = lessonVideoRepository.findByLessonId(lesson.getId());

        Map<String, Object> result = lessonToMap(lesson);
        result.put("primaryVideo", primaryVideoOpt.map(this::videoToMap).orElse(null));
        result.put("videos", allVideos.stream().map(this::videoToMap).collect(Collectors.toList()));
        return result;
    }

    public Lesson createLesson(CreateLessonRequest request, UUID adminUserId) {
        UUID nodeId = UUID.fromString(request.nodeId());
        taxonomyNodeRepository.findById(nodeId)
                .orElseThrow(() -> new ResourceNotFoundException("Taxonomy node not found"));

        lessonRepository.findBySlug(request.slug()).ifPresent(existing -> {
            throw new BadRequestException("Lesson slug already exists: " + request.slug());
        });

        Lesson lesson = new Lesson();
        lesson.setId(UUID.randomUUID());
        lesson.setNodeId(nodeId);
        lesson.setTitle(request.title());
        lesson.setSlug(request.slug());
        lesson.setDescription(request.description());
        lesson.setExplanation(request.explanation());
        lesson.setObjectives(toJson(request.objectives()));
        lesson.setExamples(toJson(request.examples()));
        lesson.setExercises(toJson(request.exercises()));
        lesson.setQuizzes(request.quizzes() != null ? toJson(request.quizzes()) : "[]");
        lesson.setLevel(request.level());
        lesson.setStatus(request.status() != null ? request.status() : "draft");
        lesson.setSortOrder(request.sortOrder() != null ? request.sortOrder() : 0);
        lesson.setCreatedBy(adminUserId);

        return lessonRepository.save(lesson);
    }

    public Lesson updateLesson(UUID id, CreateLessonRequest request) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));

        if (request.title() != null) lesson.setTitle(request.title());
        if (request.description() != null) lesson.setDescription(request.description());
        if (request.explanation() != null) lesson.setExplanation(request.explanation());
        if (request.objectives() != null) lesson.setObjectives(toJson(request.objectives()));
        if (request.examples() != null) lesson.setExamples(toJson(request.examples()));
        if (request.exercises() != null) lesson.setExercises(toJson(request.exercises()));
        if (request.quizzes() != null) lesson.setQuizzes(toJson(request.quizzes()));
        if (request.level() != null) lesson.setLevel(request.level());
        if (request.status() != null) lesson.setStatus(request.status());
        if (request.sortOrder() != null) lesson.setSortOrder(request.sortOrder());

        if (request.slug() != null && !request.slug().equals(lesson.getSlug())) {
            lessonRepository.findBySlug(request.slug()).ifPresent(existing -> {
                throw new BadRequestException("Lesson slug already exists: " + request.slug());
            });
            lesson.setSlug(request.slug());
        }

        return lessonRepository.save(lesson);
    }

    public LessonVideo addVideoToLesson(UUID lessonId, VideoInput input, UUID adminUserId) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));

        String videoId = input.youtubeVideoId();
        if (videoId == null || videoId.isBlank()) {
            throw new BadRequestException("YouTube video ID is required");
        }
        if (!YOUTUBE_ID_PATTERN.matcher(videoId).matches()) {
            throw new BadRequestException("Invalid YouTube video ID format");
        }

        LessonVideo video = new LessonVideo();
        video.setId(UUID.randomUUID());
        video.setLessonId(lessonId);
        video.setYoutubeVideoId(videoId);
        video.setTitle(input.title());
        video.setChannel(input.channel());
        video.setIsPrimary(input.isPrimary() != null ? input.isPrimary() : false);
        video.setCuratorStatus(input.curatorStatus() != null ? input.curatorStatus() : "pending");
        video.setNotes(input.notes());
        video.setAddedBy(adminUserId);

        return lessonVideoRepository.save(video);
    }

    public LessonVideo updateVideo(UUID videoId, VideoInput input) {
        LessonVideo video = lessonVideoRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Video not found"));

        if (input.title() != null) video.setTitle(input.title());
        if (input.channel() != null) video.setChannel(input.channel());
        if (input.isPrimary() != null) video.setIsPrimary(input.isPrimary());
        if (input.curatorStatus() != null) video.setCuratorStatus(input.curatorStatus());
        if (input.notes() != null) video.setNotes(input.notes());

        if (input.youtubeVideoId() != null && !input.youtubeVideoId().equals(video.getYoutubeVideoId())) {
            if (!YOUTUBE_ID_PATTERN.matcher(input.youtubeVideoId()).matches()) {
                throw new BadRequestException("Invalid YouTube video ID format");
            }
            video.setYoutubeVideoId(input.youtubeVideoId());
        }

        return lessonVideoRepository.save(video);
    }

    public List<Map<String, Object>> getReviewQueue() {
        List<LessonVideo> videos = lessonVideoRepository.findReviewQueue();
        return videos.stream().map(this::videoToMap).collect(Collectors.toList());
    }

    public List<Map<String, Object>> search(String query) {
        if (query == null || query.isBlank()) {
            return Collections.emptyList();
        }
        List<Lesson> lessons = lessonRepository.searchByTitleOrDescription(query);
        return lessons.stream()
                .filter(l -> "published".equals(l.getStatus()))
                .map(this::lessonSummaryToMap)
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getFeaturedCourses() {
        List<TaxonomyNode> nodes = taxonomyNodeRepository.findByIsActiveTrueAndPhase(1);
        List<Map<String, Object>> courses = new ArrayList<>();
        for (TaxonomyNode node : nodes) {
            if ("course".equals(node.getNodeType())) {
                List<Lesson> lessons = lessonRepository.findByStatusAndNodeId("published", node.getId());
                if (!lessons.isEmpty()) {
                    Map<String, Object> courseMap = new LinkedHashMap<>();
                    courseMap.put("id", node.getId().toString());
                    courseMap.put("name", node.getName());
                    courseMap.put("slug", node.getSlug());
                    courseMap.put("description", node.getDescription());
                    courseMap.put("icon", node.getIcon());
                    courseMap.put("lessonCount", lessons.size());
                    courses.add(courseMap);
                }
            }
        }
        return courses;
    }

    public List<Map<String, Object>> getCategoryGrid() {
        List<TaxonomyNode> categories = taxonomyNodeRepository.findByParentIdIsNullAndPhaseOrderBySortOrder(1);
        return categories.stream().map(node -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", node.getId().toString());
            map.put("name", node.getName());
            map.put("slug", node.getSlug());
            map.put("icon", node.getIcon());
            return map;
        }).collect(Collectors.toList());
    }

    private Map<String, Object> lessonSummaryToMap(Lesson lesson) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", lesson.getId().toString());
        map.put("nodeId", lesson.getNodeId().toString());
        map.put("title", lesson.getTitle());
        map.put("slug", lesson.getSlug());
        map.put("description", lesson.getDescription());
        map.put("level", lesson.getLevel());
        map.put("status", lesson.getStatus());
        map.put("sortOrder", lesson.getSortOrder());
        map.put("createdAt", lesson.getCreatedAt() != null ? lesson.getCreatedAt().toString() : null);
        return map;
    }

    private Map<String, Object> lessonToMap(Lesson lesson) {
        Map<String, Object> map = lessonSummaryToMap(lesson);
        map.put("explanation", lesson.getExplanation());
        map.put("objectives", parseJson(lesson.getObjectives()));
        map.put("examples", parseJson(lesson.getExamples()));
        map.put("exercises", parseJson(lesson.getExercises()));
        map.put("quizzes", parseJson(lesson.getQuizzes()));
        map.put("createdBy", lesson.getCreatedBy() != null ? lesson.getCreatedBy().toString() : null);
        map.put("updatedAt", lesson.getUpdatedAt() != null ? lesson.getUpdatedAt().toString() : null);
        return map;
    }

    private Map<String, Object> videoToMap(LessonVideo video) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", video.getId().toString());
        map.put("lessonId", video.getLessonId().toString());
        map.put("youtubeVideoId", video.getYoutubeVideoId());
        map.put("title", video.getTitle());
        map.put("channel", video.getChannel());
        map.put("isPrimary", video.getIsPrimary());
        map.put("curatorStatus", video.getCuratorStatus());
        map.put("dateReviewed", video.getDateReviewed() != null ? video.getDateReviewed().toString() : null);
        map.put("notes", video.getNotes());
        map.put("addedBy", video.getAddedBy() != null ? video.getAddedBy().toString() : null);
        map.put("createdAt", video.getCreatedAt() != null ? video.getCreatedAt().toString() : null);
        map.put("updatedAt", video.getUpdatedAt() != null ? video.getUpdatedAt().toString() : null);
        return map;
    }

    private String toJson(Object obj) {
        if (obj == null) return "[]";
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }

    private Object parseJson(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, Object.class);
        } catch (JsonProcessingException e) {
            return Collections.emptyList();
        }
    }
}
