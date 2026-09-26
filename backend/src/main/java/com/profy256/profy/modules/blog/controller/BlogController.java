package com.profy256.profy.modules.blog.controller;

import com.profy256.profy.modules.blog.dto.BlogResponses.PostDetail;
import com.profy256.profy.modules.blog.dto.BlogResponses.PostSummary;
import com.profy256.profy.modules.blog.service.BlogService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.TimeUnit;

/**
 * Public blog read API (anonymous).
 *
 * Only published posts leave this controller — drafts can never leak through
 * a query parameter or a race, because filtering happens in the repository.
 */
@RestController
@RequestMapping("/api/v1/blog")
public class BlogController {

    private static final int PAGE_SIZE = 12;
    private static final int MAX_PAGE_SIZE = 50;

    private final BlogService blogService;

    public BlogController(BlogService blogService) {
        this.blogService = blogService;
    }

    @GetMapping
    public ResponseEntity<Page<PostSummary>> list(
            @RequestParam(required = false) String tag,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + PAGE_SIZE) int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), bounded(size));
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(60, TimeUnit.SECONDS))
                .body(blogService.listPublished(tag, pageable));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<PostDetail> detail(@PathVariable String slug) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(300, TimeUnit.SECONDS))
                .body(blogService.getBySlug(slug));
    }

    private int bounded(int size) {
        return Math.min(Math.max(1, size), MAX_PAGE_SIZE);
    }
}
