package com.profy256.profy.modules.campus.dto;

import java.util.List;
import java.util.UUID;

public class CampusBookDto {

    public record CampusLibraryBook(
            String id,
            String title,
            String author,
            String description,
            String coverUrl,
            CampusLibraryCategory category,
            String language,
            Integer pageCount,
            Integer publishedYear,
            List<String> formats,
            Double rating,
            Integer ratingCount,
            Boolean isAvailable
    ) {}

    public record CampusLibraryCategory(
            String id,
            String name,
            String slug
    ) {}

    public record CampusLibraryResponse(
            List<CampusLibraryBook> books,
            CampusLibraryPagination pagination
    ) {}

    public record CampusLibraryPagination(
            int page,
            int limit,
            long total,
            int totalPages
    ) {}

    // ── Profy-facing responses ─────────────────────────────

    public record CampusBookResponse(
            UUID id,
            String campusBookId,
            String title,
            String author,
            String description,
            String coverUrl,
            String category,
            String categorySlug,
            String language,
            Integer pageCount,
            Integer publishedYear,
            List<String> formats,
            Double rating,
            Integer ratingCount,
            boolean isPremium,
            boolean isAvailable,
            String customNote
    ) {}

    public record CampusBookListResponse(
            List<CampusBookResponse> books,
            int page,
            int limit,
            long total,
            int totalPages
    ) {}

    public record CampusBookCategoryResponse(
            String name,
            String slug,
            long bookCount
    ) {}

    // ── Admin requests ─────────────────────────────────────

    public record UpdateSettingsRequest(
            Boolean isPremium,
            Boolean isFeatured,
            String customNote
    ) {}

    public record SyncResult(
            int added,
            int updated,
            int removed,
            String message
    ) {}
}
