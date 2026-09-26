package com.profy256.profy.modules.blog.controller;

import com.profy256.profy.modules.blog.dto.BlogRequests.BlogPostRequest;
import com.profy256.profy.modules.blog.dto.BlogResponses.AdminPost;
import com.profy256.profy.modules.blog.service.BlogService;
import com.profy256.profy.platform.audit.Audited;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/** Admin authoring surface for the blog. Secured by the `/admin/**` ROLE rule. */
@RestController
@RequestMapping("/api/v1/admin/blog")
public class AdminBlogController {

    private final BlogService blogService;

    public AdminBlogController(BlogService blogService) {
        this.blogService = blogService;
    }

    @GetMapping
    public ResponseEntity<Page<AdminPost>> list(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100));
        return ResponseEntity.ok(blogService.listAdmin(status, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminPost> get(@PathVariable String id) {
        return ResponseEntity.ok(blogService.getAdmin(id));
    }

    @PostMapping
    @Audited
    public ResponseEntity<AdminPost> create(
            @Valid @RequestBody BlogPostRequest request, Authentication authentication) {
        return ResponseEntity.ok(blogService.create(request, adminId(authentication)));
    }

    @PutMapping("/{id}")
    @Audited
    public ResponseEntity<AdminPost> update(
            @PathVariable String id,
            @Valid @RequestBody BlogPostRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(blogService.update(id, request, adminId(authentication)));
    }

    @PostMapping("/{id}/status")
    @Audited
    public ResponseEntity<AdminPost> updateStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        return ResponseEntity.ok(blogService.updateStatus(
                id, body.getOrDefault("status", "draft"), adminId(authentication)));
    }

    @DeleteMapping("/{id}")
    @Audited
    public ResponseEntity<Map<String, Object>> delete(@PathVariable String id) {
        blogService.delete(id);
        return ResponseEntity.ok(Map.of("status", "deleted", "id", id));
    }

    private UUID adminId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }
}
