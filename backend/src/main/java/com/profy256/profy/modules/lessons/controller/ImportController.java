package com.profy256.profy.modules.lessons.controller;

import com.profy256.profy.modules.lessons.service.ImportService;
import com.profy256.profy.platform.audit.Audited;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/import")
public class ImportController {

    private final ImportService importService;

    public ImportController(ImportService importService) {
        this.importService = importService;
    }

    @PostMapping("/youtube")
    @Audited
    public ResponseEntity<Map<String, Object>> importYouTube(
            @RequestBody Map<String, String> request,
            Authentication authentication) {
        UUID adminUserId = UUID.fromString(authentication.getName());
        String youtubeUrl = request.get("youtubeUrl");
        String courseId = request.get("courseId");

        if (youtubeUrl == null || youtubeUrl.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "YouTube URL is required"));
        }
        if (courseId == null || courseId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Course ID is required"));
        }

        var result = importService.importYouTube(youtubeUrl, courseId, adminUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "lessonId", result.lessonId(),
                "title", result.title(),
                "slug", result.slug(),
                "videoId", result.videoId(),
                "channel", result.channel(),
                "status", result.status()
        ));
    }

    @PostMapping("/url")
    @Audited
    public ResponseEntity<Map<String, Object>> importFromUrl(
            @RequestBody Map<String, String> request,
            Authentication authentication) {
        UUID adminUserId = UUID.fromString(authentication.getName());
        String url = request.get("url");
        String courseId = request.get("courseId");

        if (url == null || url.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "URL is required"));
        }
        if (courseId == null || courseId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Course ID is required"));
        }

        var result = importService.importFromUrl(url, courseId, adminUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "lessonId", result.lessonId(),
                "title", result.title(),
                "slug", result.slug(),
                "status", result.status(),
                "message", result.message()
        ));
    }

    @PostMapping(value = "/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Audited
    public ResponseEntity<Map<String, Object>> importFromFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("courseId") String courseId,
            @RequestParam(value = "lessonCount", defaultValue = "3") Integer lessonCount,
            Authentication authentication) {
        UUID adminUserId = UUID.fromString(authentication.getName());

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is required"));
        }
        if (courseId == null || courseId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Course ID is required"));
        }

        var result = importService.importFromFile(file, courseId, adminUserId, lessonCount);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "lessons", result.lessons(),
                "message", result.message()
        ));
    }
}
