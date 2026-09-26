package com.profy256.profy.modules.blog.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public final class BlogRequests {

    private BlogRequests() {}

    public record BlogPostRequest(
            String slug,
            @NotBlank(message = "title is required") String title,
            String excerpt,
            String contentMd,
            String coverImageUrl,
            List<String> tags,
            String metaTitle,
            String metaDescription,
            String status
    ) {}

    public record TagRequest(@NotBlank(message = "tag is required") String tag) {}
}
