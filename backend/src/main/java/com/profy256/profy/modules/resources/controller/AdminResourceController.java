package com.profy256.profy.modules.resources.controller;

import com.profy256.profy.modules.resources.dto.ResourceRequests.CreateResourceRequest;
import com.profy256.profy.modules.resources.dto.ResourceRequests.UpdateResourceRequest;
import com.profy256.profy.modules.resources.entity.Resource;
import com.profy256.profy.modules.resources.service.ResourceService;
import com.profy256.profy.platform.audit.Audited;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/resources")
public class AdminResourceController {

    private final ResourceService resourceService;

    public AdminResourceController(ResourceService resourceService) {
        this.resourceService = resourceService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listAll() {
        return ResponseEntity.ok(resourceService.listAll());
    }

    @GetMapping("/node/{nodeId}")
    public ResponseEntity<List<Map<String, Object>>> listByNode(@PathVariable UUID nodeId) {
        return ResponseEntity.ok(resourceService.listByNodeId(nodeId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(resourceService.getById(id));
    }

    @PostMapping
    @Audited
    public ResponseEntity<Map<String, Object>> create(
            @RequestBody CreateResourceRequest request,
            Authentication authentication) {
        UUID adminUserId = UUID.fromString(authentication.getName());
        Resource resource = resourceService.create(request, adminUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "id", resource.getId().toString(),
                "title", resource.getTitle(),
                "fileName", resource.getFileName()
        ));
    }

    @PutMapping("/{id}")
    @Audited
    public ResponseEntity<Map<String, Object>> update(
            @PathVariable UUID id,
            @RequestBody UpdateResourceRequest request) {
        Resource resource = resourceService.update(id, request);
        return ResponseEntity.ok(Map.of(
                "id", resource.getId().toString(),
                "title", resource.getTitle(),
                "allowDownload", resource.getAllowDownload(),
                "pageFlipEnabled", resource.getPageFlipEnabled()
        ));
    }

    @DeleteMapping("/{id}")
    @Audited
    public ResponseEntity<Map<String, Object>> delete(@PathVariable UUID id) {
        resourceService.delete(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }
}
