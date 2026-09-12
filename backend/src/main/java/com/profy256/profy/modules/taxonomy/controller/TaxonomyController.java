package com.profy256.profy.modules.taxonomy.controller;

import com.profy256.profy.modules.taxonomy.service.TaxonomyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/taxonomy")
public class TaxonomyController {

    private final TaxonomyService taxonomyService;

    public TaxonomyController(TaxonomyService taxonomyService) {
        this.taxonomyService = taxonomyService;
    }

    @GetMapping("/tree")
    public ResponseEntity<Map<String, Object>> getTree(
            @RequestParam(required = false) Integer phase) {
        List<Map<String, Object>> tree = taxonomyService.getTree(phase);
        return ResponseEntity.ok(Map.of("tree", tree));
    }

    @GetMapping("/nodes/{slug}")
    public ResponseEntity<Map<String, Object>> getNodeBySlug(@PathVariable String slug) {
        Map<String, Object> node = taxonomyService.getNodeBySlug(slug);
        return ResponseEntity.ok(node);
    }
}
