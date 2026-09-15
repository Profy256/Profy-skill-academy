package com.profy256.profy.modules.resources.service;

import com.profy256.profy.modules.resources.dto.ResourceRequests.CreateResourceRequest;
import com.profy256.profy.modules.resources.dto.ResourceRequests.UpdateResourceRequest;
import com.profy256.profy.modules.resources.entity.Resource;
import com.profy256.profy.modules.resources.repository.ResourceRepository;
import com.profy256.profy.modules.taxonomy.entity.TaxonomyNode;
import com.profy256.profy.modules.taxonomy.repository.TaxonomyNodeRepository;
import com.profy256.profy.platform.error.BadRequestException;
import com.profy256.profy.platform.error.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final TaxonomyNodeRepository taxonomyNodeRepository;

    public ResourceService(ResourceRepository resourceRepository, TaxonomyNodeRepository taxonomyNodeRepository) {
        this.resourceRepository = resourceRepository;
        this.taxonomyNodeRepository = taxonomyNodeRepository;
    }

    public List<Map<String, Object>> listAll() {
        List<Resource> resources = resourceRepository.findByIsActiveTrue();
        return resources.stream().map(this::resourceToMap).collect(Collectors.toList());
    }

    public List<Map<String, Object>> listAllWithTaxonomy() {
        List<Resource> resources = resourceRepository.findByIsActiveTrue();
        return resources.stream().map(r -> {
            Map<String, Object> map = resourceToMap(r);
            // Enrich with taxonomy context
            var courseNode = taxonomyNodeRepository.findById(r.getNodeId()).orElse(null);
            if (courseNode != null) {
                map.put("courseName", courseNode.getName());
                map.put("courseSlug", courseNode.getSlug());
                // Walk up to find category
                UUID parentId = courseNode.getParentId();
                while (parentId != null) {
                    var parentNode = taxonomyNodeRepository.findById(parentId).orElse(null);
                    if (parentNode == null) break;
                    if (parentNode.getDepth() == 0) {
                        map.put("categoryName", parentNode.getName());
                        map.put("categorySlug", parentNode.getSlug());
                        break;
                    }
                    parentId = parentNode.getParentId();
                }
            }
            return map;
        }).collect(Collectors.toList());
    }

    public List<Map<String, Object>> listByNodeId(UUID nodeId) {
        List<Resource> resources = resourceRepository.findByNodeIdAndIsActiveTrue(nodeId);
        return resources.stream().map(this::resourceToMap).collect(Collectors.toList());
    }

    public Map<String, Object> getById(UUID id) {
        Resource resource = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));
        return resourceToMap(resource);
    }

    public Resource create(CreateResourceRequest request, UUID adminUserId) {
        UUID nodeId = UUID.fromString(request.nodeId());
        taxonomyNodeRepository.findById(nodeId)
                .orElseThrow(() -> new ResourceNotFoundException("Taxonomy node not found"));

        Resource resource = new Resource();
        resource.setId(UUID.randomUUID());
        resource.setNodeId(nodeId);
        resource.setTitle(request.title());
        resource.setDescription(request.description());
        resource.setFileName(request.fileName());
        resource.setFileSize(request.fileSize());
        resource.setFileUrl(request.fileUrl());
        resource.setAddedBy(adminUserId);
        resource.setAllowDownload(request.allowDownload() != null ? request.allowDownload() : false);
        resource.setPageFlipEnabled(request.pageFlipEnabled() != null ? request.pageFlipEnabled() : true);

        return resourceRepository.save(resource);
    }

    public Resource update(UUID id, UpdateResourceRequest request) {
        Resource resource = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        if (request.title() != null) resource.setTitle(request.title());
        if (request.description() != null) resource.setDescription(request.description());
        if (request.allowDownload() != null) resource.setAllowDownload(request.allowDownload());
        if (request.pageFlipEnabled() != null) resource.setPageFlipEnabled(request.pageFlipEnabled());
        if (request.isActive() != null) resource.setIsActive(request.isActive());

        return resourceRepository.save(resource);
    }

    public void delete(UUID id) {
        Resource resource = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));
        resourceRepository.delete(resource);
    }

    private Map<String, Object> resourceToMap(Resource resource) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", resource.getId().toString());
        map.put("nodeId", resource.getNodeId().toString());
        map.put("title", resource.getTitle());
        map.put("description", resource.getDescription());
        map.put("fileName", resource.getFileName());
        map.put("fileSize", resource.getFileSize());
        map.put("fileUrl", resource.getFileUrl());
        map.put("addedBy", resource.getAddedBy() != null ? resource.getAddedBy().toString() : null);
        map.put("allowDownload", resource.getAllowDownload());
        map.put("pageFlipEnabled", resource.getPageFlipEnabled());
        map.put("isActive", resource.getIsActive());
        map.put("createdAt", resource.getCreatedAt() != null ? resource.getCreatedAt().toString() : null);
        map.put("updatedAt", resource.getUpdatedAt() != null ? resource.getUpdatedAt().toString() : null);
        return map;
    }
}
