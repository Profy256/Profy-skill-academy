package com.profy256.profy.modules.lessons.controller;

import com.profy256.profy.modules.lessons.dto.LessonRequests.CreateLessonRequest;
import com.profy256.profy.modules.lessons.dto.LessonRequests.VideoInput;
import com.profy256.profy.modules.lessons.entity.Lesson;
import com.profy256.profy.modules.lessons.entity.LessonVideo;
import com.profy256.profy.modules.lessons.service.LessonsService;
import com.profy256.profy.platform.audit.Audited;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminLessonsController {

    private final LessonsService lessonsService;

    public AdminLessonsController(LessonsService lessonsService) {
        this.lessonsService = lessonsService;
    }

    @PostMapping("/lessons")
    @Audited
    public ResponseEntity<Map<String, Object>> createLesson(
            @RequestBody CreateLessonRequest request,
            Authentication authentication) {
        UUID adminUserId = UUID.fromString(authentication.getName());
        Lesson lesson = lessonsService.createLesson(request, adminUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "id", lesson.getId().toString(),
                "slug", lesson.getSlug(),
                "title", lesson.getTitle(),
                "status", lesson.getStatus()
        ));
    }

    @PutMapping("/lessons/{id}")
    @Audited
    public ResponseEntity<Map<String, Object>> updateLesson(
            @PathVariable UUID id,
            @RequestBody CreateLessonRequest request) {
        Lesson lesson = lessonsService.updateLesson(id, request);
        return ResponseEntity.ok(Map.of(
                "id", lesson.getId().toString(),
                "slug", lesson.getSlug(),
                "title", lesson.getTitle(),
                "status", lesson.getStatus()
        ));
    }

    @PostMapping("/lessons/{id}/videos")
    @Audited
    public ResponseEntity<Map<String, Object>> addVideo(
            @PathVariable UUID id,
            @RequestBody VideoInput input,
            Authentication authentication) {
        UUID adminUserId = UUID.fromString(authentication.getName());
        LessonVideo video = lessonsService.addVideoToLesson(id, input, adminUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "id", video.getId().toString(),
                "youtubeVideoId", video.getYoutubeVideoId(),
                "title", video.getTitle()
        ));
    }

    @PutMapping("/videos/{id}")
    @Audited
    public ResponseEntity<Map<String, Object>> updateVideo(
            @PathVariable UUID id,
            @RequestBody VideoInput input) {
        LessonVideo video = lessonsService.updateVideo(id, input);
        return ResponseEntity.ok(Map.of(
                "id", video.getId().toString(),
                "youtubeVideoId", video.getYoutubeVideoId(),
                "title", video.getTitle()
        ));
    }

    @GetMapping("/lessons")
    public ResponseEntity<List<Map<String, Object>>> listLessons(
            @RequestParam(required = false) String nodeId) {
        List<Map<String, Object>> lessons = lessonsService.listAllLessons(nodeId);
        return ResponseEntity.ok(lessons);
    }

    @GetMapping("/lessons/{id}")
    public ResponseEntity<Map<String, Object>> getLesson(@PathVariable UUID id) {
        return ResponseEntity.ok(lessonsService.getLessonById(id));
    }

    @DeleteMapping("/lessons/{id}")
    @Audited
    public ResponseEntity<Map<String, Object>> deleteLesson(@PathVariable UUID id) {
        lessonsService.deleteLesson(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @GetMapping("/lessons/{id}/videos")
    public ResponseEntity<List<Map<String, Object>>> listVideos(@PathVariable UUID id) {
        return ResponseEntity.ok(lessonsService.listVideosByLesson(id));
    }

    @PostMapping("/lessons/{id}/videos/auto")
    @Audited
    public ResponseEntity<Map<String, Object>> autoCurateVideo(@PathVariable UUID id) {
        Map<String, Object> video = lessonsService.autoCurateVideo(id);
        return ResponseEntity.status(HttpStatus.CREATED).body(video);
    }

    @DeleteMapping("/lessons/{id}/videos/{videoId}")
    @Audited
    public ResponseEntity<Map<String, Object>> deleteVideo(
            @PathVariable UUID id,
            @PathVariable UUID videoId) {
        lessonsService.deleteVideo(videoId);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @GetMapping("/review/videos")
    public ResponseEntity<List<Map<String, Object>>> getReviewQueue() {
        List<Map<String, Object>> queue = lessonsService.getReviewQueue();
        return ResponseEntity.ok(queue);
    }

    @GetMapping("/report/uncovered-lessons")
    public ResponseEntity<List<Map<String, Object>>> getUncoveredLessonsReport() {
        return ResponseEntity.ok(lessonsService.getUncoveredLessonsReport());
    }
}
