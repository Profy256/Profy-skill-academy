package com.profy256.profy.modules.taxonomy.service;

import com.profy256.profy.modules.taxonomy.dto.TaxonomyRequests.BulkCreateRequest;
import com.profy256.profy.modules.taxonomy.dto.TaxonomyRequests.BulkCreateResponse;
import com.profy256.profy.modules.taxonomy.dto.TaxonomyRequests.CourseResult;
import com.profy256.profy.modules.taxonomy.dto.TaxonomyRequests.ReorderItem;
import com.profy256.profy.modules.taxonomy.dto.TaxonomyRequests.ReorderRequest;
import com.profy256.profy.modules.taxonomy.dto.TaxonomyRequests.SubcategoryResult;
import com.profy256.profy.modules.taxonomy.dto.TaxonomyRequests.TaxonomyCreateRequest;
import com.profy256.profy.modules.taxonomy.dto.TaxonomyRequests.TaxonomyUpdateRequest;
import com.profy256.profy.modules.taxonomy.entity.TaxonomyNode;
import com.profy256.profy.modules.taxonomy.repository.TaxonomyNodeRepository;
import com.profy256.profy.platform.error.BadRequestException;
import com.profy256.profy.platform.error.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class TaxonomyService {

    private final TaxonomyNodeRepository taxonomyNodeRepository;

    public TaxonomyService(TaxonomyNodeRepository taxonomyNodeRepository) {
        this.taxonomyNodeRepository = taxonomyNodeRepository;
    }

    public List<Map<String, Object>> listAllAdmin(Integer phase) {
        List<TaxonomyNode> nodes;
        if (phase != null) {
            nodes = taxonomyNodeRepository.findAllByPhase(phase);
        } else {
            nodes = taxonomyNodeRepository.findAll();
        }
        return buildTree(nodes);
    }

    public Map<String, Object> getNodeById(UUID id) {
        TaxonomyNode node = taxonomyNodeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Taxonomy node not found"));

        List<TaxonomyNode> children = taxonomyNodeRepository.findByParentIdAndPhaseOrderBySortOrder(id, node.getPhase());

        List<Map<String, Object>> childMaps = new ArrayList<>();
        for (TaxonomyNode child : children) {
            Map<String, Object> childMap = nodeToMap(child);
            childMap.put("children", Collections.emptyList());
            childMaps.add(childMap);
        }

        List<Map<String, String>> breadcrumb = buildBreadcrumb(node);

        Map<String, Object> result = nodeToMap(node);
        result.put("children", childMaps);
        result.put("breadcrumb", breadcrumb);
        return result;
    }

    public List<Map<String, Object>> getTree(Integer phase) {
        int effectivePhase = phase != null ? phase : 1;
        List<TaxonomyNode> nodes = taxonomyNodeRepository.findByIsActiveTrueAndPhase(effectivePhase);
        return buildTree(nodes);
    }

    public Map<String, Object> getNodeBySlug(String slug) {
        TaxonomyNode node = taxonomyNodeRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Taxonomy node not found: " + slug));

        List<Map<String, Object>> children = new ArrayList<>();
        for (TaxonomyNode child : taxonomyNodeRepository.findByParentIdAndPhaseOrderBySortOrder(node.getId(), node.getPhase())) {
            Map<String, Object> childMap = nodeToMap(child);
            childMap.put("children", Collections.emptyList());
            children.add(childMap);
        }

        List<Map<String, String>> breadcrumb = buildBreadcrumb(node);

        Map<String, Object> result = nodeToMap(node);
        result.put("children", children);
        result.put("breadcrumb", breadcrumb);
        return result;
    }

    public TaxonomyNode createNode(TaxonomyCreateRequest request) {
        if (request.parentNodeId() != null && !request.parentNodeId().isBlank()) {
            UUID parentId = UUID.fromString(request.parentNodeId());
            TaxonomyNode parent = taxonomyNodeRepository.findById(parentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Parent node not found"));
            if (parent.getDepth() >= 2) {
                throw new BadRequestException("Maximum depth of 2 exceeded");
            }
        }

        taxonomyNodeRepository.findBySlug(request.slug()).ifPresent(existing -> {
            throw new BadRequestException("Slug already exists: " + request.slug());
        });

        TaxonomyNode node = new TaxonomyNode();
        node.setId(UUID.randomUUID());
        node.setParentId(request.parentNodeId() != null && !request.parentNodeId().isBlank()
                ? UUID.fromString(request.parentNodeId()) : null);
        node.setNodeType(request.nodeType());
        node.setName(request.name());
        node.setSlug(request.slug());
        node.setDescription(request.description());
        node.setIcon(request.icon());
        node.setPhase(request.phase() != null ? request.phase() : 1);
        node.setIsActive(request.isActive() != null ? request.isActive() : true);
        node.setSortOrder(request.sortOrder() != null ? request.sortOrder() : 0);
        node.setDepth(request.parentNodeId() != null && !request.parentNodeId().isBlank()
                ? calculateDepth(UUID.fromString(request.parentNodeId())) + 1 : 0);

        return taxonomyNodeRepository.save(node);
    }

    public TaxonomyNode updateNode(UUID id, TaxonomyUpdateRequest request) {
        TaxonomyNode node = taxonomyNodeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Taxonomy node not found"));

        if (request.name() != null) node.setName(request.name());
        if (request.description() != null) node.setDescription(request.description());
        if (request.icon() != null) node.setIcon(request.icon());
        if (request.phase() != null) node.setPhase(request.phase());
        if (request.isActive() != null) node.setIsActive(request.isActive());
        if (request.sortOrder() != null) node.setSortOrder(request.sortOrder());

        if (request.slug() != null && !request.slug().equals(node.getSlug())) {
            taxonomyNodeRepository.findBySlug(request.slug()).ifPresent(existing -> {
                throw new BadRequestException("Slug already exists: " + request.slug());
            });
            node.setSlug(request.slug());
        }

        return taxonomyNodeRepository.save(node);
    }

    public void reorderNodes(ReorderRequest request) {
        for (ReorderItem item : request.items()) {
            TaxonomyNode node = taxonomyNodeRepository.findById(UUID.fromString(item.id()))
                    .orElseThrow(() -> new ResourceNotFoundException("Node not found: " + item.id()));
            node.setSortOrder(item.sortOrder());
            taxonomyNodeRepository.save(node);
        }
    }

    public void deleteNode(UUID id) {
        TaxonomyNode node = taxonomyNodeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Taxonomy node not found"));

        List<TaxonomyNode> children = taxonomyNodeRepository.findByParentIdAndPhaseOrderBySortOrder(id, node.getPhase());
        if (!children.isEmpty()) {
            throw new BadRequestException("Cannot delete node with children");
        }

        taxonomyNodeRepository.delete(node);
    }

    @Transactional
    public BulkCreateResponse bulkCreate(BulkCreateRequest request) {
        // Create the category
        String categorySlug = slugify(request.categoryName());
        TaxonomyCreateRequest catReq = new TaxonomyCreateRequest(
                null, "category", request.categoryName(), categorySlug,
                request.categoryDescription() != null ? request.categoryDescription() : "",
                request.categoryIcon() != null ? request.categoryIcon() : "",
                1, true, 0);
        TaxonomyNode category = taxonomyNodeRepository.save(toNode(catReq));

        List<SubcategoryResult> subcategoryResults = new ArrayList<>();

        if (request.subcategories() != null) {
            int subSortOrder = 0;
            for (String subName : request.subcategories()) {
                String subSlug = slugify(subName);
                TaxonomyCreateRequest subReq = new TaxonomyCreateRequest(
                        category.getId().toString(), "subcategory", subName, subSlug,
                        "", "", 1, true, subSortOrder++);
                TaxonomyNode subcategory = taxonomyNodeRepository.save(toNode(subReq));
                subcategoryResults.add(new SubcategoryResult(
                        subcategory.getId().toString(), subcategory.getSlug(), new ArrayList<>()));
            }
        }

        return new BulkCreateResponse(category.getId().toString(), category.getSlug(), subcategoryResults);
    }

    @Transactional
    public List<CourseResult> bulkAddCourses(String parentSubcategoryId, List<String> courseNames) {
        UUID parentId = UUID.fromString(parentSubcategoryId);
        TaxonomyNode parent = taxonomyNodeRepository.findById(parentId)
                .orElseThrow(() -> new ResourceNotFoundException("Parent node not found"));

        List<CourseResult> results = new ArrayList<>();
        int sortOrder = 0;
        for (String name : courseNames) {
            String slug = slugify(name);
            TaxonomyCreateRequest req = new TaxonomyCreateRequest(
                    parentId.toString(), "course", name, slug,
                    "", "", parent.getPhase(), true, sortOrder++);
            TaxonomyNode course = taxonomyNodeRepository.save(toNode(req));
            results.add(new CourseResult(course.getId().toString(), course.getSlug(), course.getName()));
        }
        return results;
    }

    private TaxonomyNode toNode(TaxonomyCreateRequest req) {
        TaxonomyNode node = new TaxonomyNode();
        node.setId(UUID.randomUUID());
        node.setParentId(req.parentNodeId() != null && !req.parentNodeId().isBlank()
                ? UUID.fromString(req.parentNodeId()) : null);
        node.setNodeType(req.nodeType());
        node.setName(req.name());
        node.setSlug(req.slug());
        node.setDescription(req.description());
        node.setIcon(req.icon());
        node.setPhase(req.phase() != null ? req.phase() : 1);
        node.setIsActive(req.isActive() != null ? req.isActive() : true);
        node.setSortOrder(req.sortOrder() != null ? req.sortOrder() : 0);
        node.setDepth(req.parentNodeId() != null && !req.parentNodeId().isBlank()
                ? calculateDepth(UUID.fromString(req.parentNodeId())) + 1 : 0);
        return node;
    }

    private String slugify(String text) {
        return Pattern.compile("[^a-z0-9]+").matcher(text.toLowerCase().trim())
                .replaceAll("-").replaceAll("^-|-$", "");
    }

    private List<Map<String, Object>> buildTree(List<TaxonomyNode> nodes) {
        Map<UUID, List<TaxonomyNode>> childrenMap = nodes.stream()
                .collect(Collectors.groupingBy(n -> n.getParentId() != null ? n.getParentId() : UUID.randomUUID()));

        List<TaxonomyNode> roots = nodes.stream()
                .filter(n -> n.getParentId() == null)
                .sorted(Comparator.comparingInt(TaxonomyNode::getSortOrder))
                .collect(Collectors.toList());

        List<Map<String, Object>> tree = new ArrayList<>();
        for (TaxonomyNode root : roots) {
            tree.add(buildNodeMap(root, childrenMap));
        }
        return tree;
    }

    private Map<String, Object> buildNodeMap(TaxonomyNode node, Map<UUID, List<TaxonomyNode>> childrenMap) {
        Map<String, Object> map = nodeToMap(node);

        List<TaxonomyNode> children = childrenMap.getOrDefault(node.getId(), Collections.emptyList())
                .stream()
                .sorted(Comparator.comparingInt(TaxonomyNode::getSortOrder))
                .collect(Collectors.toList());

        List<Map<String, Object>> childMaps = new ArrayList<>();
        for (TaxonomyNode child : children) {
            childMaps.add(buildNodeMap(child, childrenMap));
        }
        map.put("children", childMaps);
        return map;
    }

    private Map<String, Object> nodeToMap(TaxonomyNode node) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", node.getId().toString());
        map.put("parentId", node.getParentId() != null ? node.getParentId().toString() : null);
        map.put("nodeType", node.getNodeType());
        map.put("name", node.getName());
        map.put("slug", node.getSlug());
        map.put("description", node.getDescription());
        map.put("icon", node.getIcon());
        map.put("phase", node.getPhase());
        map.put("isActive", node.getIsActive());
        map.put("sortOrder", node.getSortOrder());
        map.put("depth", node.getDepth());
        map.put("createdAt", node.getCreatedAt() != null ? node.getCreatedAt().toString() : null);
        map.put("updatedAt", node.getUpdatedAt() != null ? node.getUpdatedAt().toString() : null);
        return map;
    }

    private List<Map<String, String>> buildBreadcrumb(TaxonomyNode node) {
        List<Map<String, String>> breadcrumb = new ArrayList<>();
        Map<String, String> current = new LinkedHashMap<>();
        current.put("id", node.getId().toString());
        current.put("name", node.getName());
        current.put("slug", node.getSlug());
        breadcrumb.add(current);

        UUID parentId = node.getParentId();
        while (parentId != null) {
            TaxonomyNode parent = taxonomyNodeRepository.findById(parentId).orElse(null);
            if (parent == null) break;
            Map<String, String> entry = new LinkedHashMap<>();
            entry.put("id", parent.getId().toString());
            entry.put("name", parent.getName());
            entry.put("slug", parent.getSlug());
            breadcrumb.add(0, entry);
            parentId = parent.getParentId();
        }
        return breadcrumb;
    }

    private int calculateDepth(UUID nodeId) {
        TaxonomyNode node = taxonomyNodeRepository.findById(nodeId).orElse(null);
        if (node == null) return 0;
        return node.getDepth();
    }
}
