package com.profy256.profy.modules.blog.dto;

import java.time.Instant;
import java.util.List;

public final class BlogResponses {

    private BlogResponses() {}

    /** Lightweight card for the index page — never exposes draft content. */
    public record PostSummary(
            String slug,
            String title,
            String excerpt,
            String coverImageUrl,
            List<String> tags,
            String readingTime,
            Instant publishedAt,
            String authorName
    ) {}

    /** Public detail view. */
    public record PostDetail(
            String slug,
            String title,
            String excerpt,
            String contentMd,
            String coverImageUrl,
            List<String> tags,
            String metaTitle,
            String metaDescription,
            String readingTime,
            Instant publishedAt,
            Instant updatedAt,
            String authorName
    ) {}

    /** Admin edit view — drafts included, content and all SEO fields. */
    public record AdminPost(
            String id,
            String slug,
            String title,
            String excerpt,
            String contentMd,
            String coverImageUrl,
            List<String> tags,
            String metaTitle,
            String metaDescription,
            String status,
            Instant publishedAt,
            Instant createdAt,
            Instant updatedAt,
            String authorName
    ) {}
}
