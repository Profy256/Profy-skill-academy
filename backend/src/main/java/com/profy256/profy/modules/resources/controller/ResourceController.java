package com.profy256.profy.modules.resources.controller;

import com.profy256.profy.modules.resources.service.ResourceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class ResourceController {

    private final ResourceService resourceService;

    public ResourceController(ResourceService resourceService) {
        this.resourceService = resourceService;
    }

    @GetMapping("/resources")
    public ResponseEntity<List<Map<String, Object>>> listAllResources() {
        return ResponseEntity.ok(resourceService.listAllWithTaxonomy());
    }

    @GetMapping("/courses/{nodeId}/resources")
    public ResponseEntity<List<Map<String, Object>>> getResourcesByCourse(@PathVariable UUID nodeId) {
        return ResponseEntity.ok(resourceService.listByNodeId(nodeId));
    }
}
