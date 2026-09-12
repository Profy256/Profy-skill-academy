package com.profy256.profy.modules.lessons.controller;

import com.profy256.profy.modules.lessons.service.LessonsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class SearchController {

    private final LessonsService lessonsService;

    public SearchController(LessonsService lessonsService) {
        this.lessonsService = lessonsService;
    }

    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> search(@RequestParam(required = false) String q) {
        List<Map<String, Object>> results = lessonsService.search(q);
        return ResponseEntity.ok(Map.of("results", results, "query", q != null ? q : ""));
    }

    @GetMapping("/home/featured")
    public ResponseEntity<Map<String, Object>> getFeatured() {
        List<Map<String, Object>> featuredCourses = lessonsService.getFeaturedCourses();
        List<Map<String, Object>> categoryGrid = lessonsService.getCategoryGrid();
        return ResponseEntity.ok(Map.of(
                "featuredCourses", featuredCourses,
                "categoryGrid", categoryGrid
        ));
    }
}
