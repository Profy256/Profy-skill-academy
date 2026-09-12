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
}
