package com.profy256.profy.modules.lessons.controller;

import com.profy256.profy.modules.lessons.service.LessonsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class LessonsController {

    private final LessonsService lessonsService;

    public LessonsController(LessonsService lessonsService) {
        this.lessonsService = lessonsService;
    }

    @GetMapping("/courses/{slug}")
    public ResponseEntity<Map<String, Object>> getCourseBySlug(@PathVariable String slug) {
        Map<String, Object> course = lessonsService.getCourseBySlug(slug);
        return ResponseEntity.ok(course);
    }

    @GetMapping("/lessons/{slug}")
    public ResponseEntity<Map<String, Object>> getLessonBySlug(@PathVariable String slug) {
        Map<String, Object> lesson = lessonsService.getLessonBySlug(slug);
        return ResponseEntity.ok(lesson);
    }
}
