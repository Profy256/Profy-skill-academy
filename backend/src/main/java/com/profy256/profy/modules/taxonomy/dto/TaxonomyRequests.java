package com.profy256.profy.modules.taxonomy.dto;

import java.util.List;

public class TaxonomyRequests {

    public record TaxonomyCreateRequest(
            String parentNodeId,
            String nodeType,
            String name,
            String slug,
            String description,
            String icon,
            Integer phase,
            Boolean isActive,
            Integer sortOrder
    ) {}

    public record TaxonomyUpdateRequest(
            String name,
            String slug,
            String description,
            String icon,
            Integer phase,
            Boolean isActive,
            Integer sortOrder
    ) {}

    public record ReorderRequest(List<ReorderItem> items) {}

    public record ReorderItem(String id, Integer sortOrder) {}

    public record BulkCreateRequest(
            String categoryName,
            String categoryDescription,
            String categoryIcon,
            List<String> subcategories
    ) {}

    public record BulkCreateResponse(
            String categoryId,
            String categorySlug,
            List<SubcategoryResult> subcategories
    ) {}

    public record SubcategoryResult(
            String subcategoryId,
            String subcategorySlug,
            List<CourseResult> courses
    ) {}

    public record CourseResult(
            String courseId,
            String courseSlug,
            String name
    ) {}
}
