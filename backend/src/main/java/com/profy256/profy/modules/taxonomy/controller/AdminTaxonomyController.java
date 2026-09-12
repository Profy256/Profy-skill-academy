package com.profy256.profy.modules.taxonomy.controller;

import com.profy256.profy.modules.taxonomy.dto.TaxonomyRequests.ReorderRequest;
import com.profy256.profy.modules.taxonomy.dto.TaxonomyRequests.TaxonomyCreateRequest;
import com.profy256.profy.modules.taxonomy.dto.TaxonomyRequests.TaxonomyUpdateRequest;
import com.profy256.profy.modules.taxonomy.entity.TaxonomyNode;
import com.profy256.profy.modules.taxonomy.service.TaxonomyService;
import com.profy256.profy.platform.audit.Audited;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/taxonomy")
public class AdminTaxonomyController {

    private final TaxonomyService taxonomyService;

    public AdminTaxonomyController(TaxonomyService taxonomyService) {
        this.taxonomyService = taxonomyService;
    }

    @PostMapping
    @Audited
    public ResponseEntity<Map<String, Object>> create(@RequestBody TaxonomyCreateRequest request) {
        TaxonomyNode node = taxonomyService.createNode(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "id", node.getId().toString(),
                "slug", node.getSlug(),
                "name", node.getName()
        ));
    }

    @PutMapping("/{id}")
    @Audited
    public ResponseEntity<Map<String, Object>> update(
            @PathVariable UUID id,
            @RequestBody TaxonomyUpdateRequest request) {
        TaxonomyNode node = taxonomyService.updateNode(id, request);
        return ResponseEntity.ok(Map.of(
                "id", node.getId().toString(),
                "slug", node.getSlug(),
                "name", node.getName()
        ));
    }

    @PostMapping("/reorder")
    @Audited
    public ResponseEntity<Map<String, Object>> reorder(@RequestBody ReorderRequest request) {
        taxonomyService.reorderNodes(request);
        return ResponseEntity.ok(Map.of("status", "reordered"));
    }

    @DeleteMapping("/{id}")
    @Audited
    public ResponseEntity<Map<String, Object>> delete(@PathVariable UUID id) {
        taxonomyService.deleteNode(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }
}
