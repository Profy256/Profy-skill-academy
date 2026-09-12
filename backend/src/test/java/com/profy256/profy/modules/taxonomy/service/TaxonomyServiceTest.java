package com.profy256.profy.modules.taxonomy.service;

import com.profy256.profy.modules.taxonomy.dto.TaxonomyRequests.TaxonomyCreateRequest;
import com.profy256.profy.modules.taxonomy.dto.TaxonomyRequests.TaxonomyUpdateRequest;
import com.profy256.profy.modules.taxonomy.entity.TaxonomyNode;
import com.profy256.profy.modules.taxonomy.repository.TaxonomyNodeRepository;
import com.profy256.profy.platform.error.BadRequestException;
import com.profy256.profy.platform.error.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaxonomyServiceTest {

    @Mock
    private TaxonomyNodeRepository taxonomyNodeRepository;

    @InjectMocks
    private TaxonomyService taxonomyService;

    private UUID rootId;
    private UUID childId;
    private UUID leafId;
    private TaxonomyNode rootNode;
    private TaxonomyNode childNode;
    private TaxonomyNode leafNode;

    @BeforeEach
    void setUp() {
        rootId = UUID.randomUUID();
        childId = UUID.randomUUID();
        leafId = UUID.randomUUID();

        rootNode = new TaxonomyNode();
        rootNode.setId(rootId);
        rootNode.setParentId(null);
        rootNode.setNodeType("category");
        rootNode.setName("Programming");
        rootNode.setSlug("programming");
        rootNode.setPhase(1);
        rootNode.setIsActive(true);
        rootNode.setSortOrder(0);
        rootNode.setDepth(0);

        childNode = new TaxonomyNode();
        childNode.setId(childId);
        childNode.setParentId(rootId);
        childNode.setNodeType("course");
        childNode.setName("Java Basics");
        childNode.setSlug("java-basics");
        childNode.setPhase(1);
        childNode.setIsActive(true);
        childNode.setSortOrder(0);
        childNode.setDepth(1);

        leafNode = new TaxonomyNode();
        leafNode.setId(leafId);
        leafNode.setParentId(childId);
        leafNode.setNodeType("topic");
        leafNode.setName("Variables");
        leafNode.setSlug("variables");
        leafNode.setPhase(1);
        leafNode.setIsActive(true);
        leafNode.setSortOrder(0);
        leafNode.setDepth(2);
    }

    @Test
    void getTree_returnsNestedTreeWithCorrectPhaseFiltering() {
        when(taxonomyNodeRepository.findByIsActiveTrueAndPhase(1))
                .thenReturn(List.of(rootNode, childNode));

        List<Map<String, Object>> tree = taxonomyService.getTree(1);

        assertThat(tree).hasSize(1);
        assertThat(tree.get(0).get("name")).isEqualTo("Programming");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> children = (List<Map<String, Object>>) tree.get(0).get("children");
        assertThat(children).hasSize(1);
        assertThat(children.get(0).get("name")).isEqualTo("Java Basics");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> grandchildren = (List<Map<String, Object>>) children.get(0).get("children");
        assertThat(grandchildren).isEmpty();
    }

    @Test
    void getTree_defaultsToPhaseOneWhenPhaseIsNull() {
        when(taxonomyNodeRepository.findByIsActiveTrueAndPhase(1))
                .thenReturn(List.of(rootNode));

        List<Map<String, Object>> tree = taxonomyService.getTree(null);

        assertThat(tree).hasSize(1);
        verify(taxonomyNodeRepository).findByIsActiveTrueAndPhase(1);
    }

    @Test
    void getNodeBySlug_returnsNodeWithBreadcrumb() {
        when(taxonomyNodeRepository.findBySlug("java-basics")).thenReturn(Optional.of(childNode));
        when(taxonomyNodeRepository.findByParentIdAndPhaseOrderBySortOrder(childId, 1))
                .thenReturn(Collections.emptyList());
        when(taxonomyNodeRepository.findById(rootId)).thenReturn(Optional.of(rootNode));

        Map<String, Object> result = taxonomyService.getNodeBySlug("java-basics");

        assertThat(result.get("name")).isEqualTo("Java Basics");
        assertThat(result.get("slug")).isEqualTo("java-basics");

        @SuppressWarnings("unchecked")
        List<Map<String, String>> breadcrumb = (List<Map<String, String>>) result.get("breadcrumb");
        assertThat(breadcrumb).hasSize(2);
        assertThat(breadcrumb.get(0).get("name")).isEqualTo("Programming");
        assertThat(breadcrumb.get(1).get("name")).isEqualTo("Java Basics");
    }

    @Test
    void getNodeBySlug_throwsResourceNotFoundExceptionForNonexistentSlug() {
        when(taxonomyNodeRepository.findBySlug("nonexistent")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taxonomyService.getNodeBySlug("nonexistent"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("nonexistent");
    }

    @Test
    void createNode_success() {
        when(taxonomyNodeRepository.findBySlug("new-course")).thenReturn(Optional.empty());
        when(taxonomyNodeRepository.findById(rootId)).thenReturn(Optional.of(rootNode));
        when(taxonomyNodeRepository.save(any(TaxonomyNode.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TaxonomyCreateRequest request = new TaxonomyCreateRequest(
                rootId.toString(), "course", "New Course", "new-course", "desc", "icon", 1, true, 0);

        TaxonomyNode result = taxonomyService.createNode(request);

        assertThat(result.getName()).isEqualTo("New Course");
        assertThat(result.getSlug()).isEqualTo("new-course");
        assertThat(result.getParentId()).isEqualTo(rootId);
        assertThat(result.getDepth()).isEqualTo(1);
        verify(taxonomyNodeRepository).save(any(TaxonomyNode.class));
    }

    @Test
    void createNode_rootNode_depthZero() {
        when(taxonomyNodeRepository.findBySlug("root-node")).thenReturn(Optional.empty());

        TaxonomyCreateRequest request = new TaxonomyCreateRequest(
                null, "category", "Root Node", "root-node", "desc", "icon", 1, true, 0);

        TaxonomyNode result = taxonomyService.createNode(request);

        assertThat(result.getParentId()).isNull();
        assertThat(result.getDepth()).isEqualTo(0);
    }

    @Test
    void createNode_depthExceedsTwo_throwsBadRequest() {
        when(taxonomyNodeRepository.findById(childId)).thenReturn(Optional.of(childNode));

        TaxonomyCreateRequest request = new TaxonomyCreateRequest(
                childId.toString(), "topic", "Deep Node", "deep", "desc", "icon", 1, true, 0);

        assertThatThrownBy(() -> taxonomyService.createNode(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Maximum depth of 2 exceeded");
    }

    @Test
    void createNode_duplicateSlug_throwsBadRequest() {
        when(taxonomyNodeRepository.findBySlug("java-basics")).thenReturn(Optional.of(childNode));

        TaxonomyCreateRequest request = new TaxonomyCreateRequest(
                null, "course", "Java Basics", "java-basics", "desc", "icon", 1, true, 0);

        assertThatThrownBy(() -> taxonomyService.createNode(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Slug already exists");
    }

    @Test
    void createNode_nonexistentParent_throwsResourceNotFound() {
        when(taxonomyNodeRepository.findBySlug("new-course")).thenReturn(Optional.empty());
        when(taxonomyNodeRepository.findById(any(UUID.class))).thenReturn(Optional.empty());

        TaxonomyCreateRequest request = new TaxonomyCreateRequest(
                UUID.randomUUID().toString(), "course", "New Course", "new-course", "desc", "icon", 1, true, 0);

        assertThatThrownBy(() -> taxonomyService.createNode(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Parent node not found");
    }

    @Test
    void updateNode_success() {
        when(taxonomyNodeRepository.findById(rootId)).thenReturn(Optional.of(rootNode));
        when(taxonomyNodeRepository.save(any(TaxonomyNode.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TaxonomyUpdateRequest request = new TaxonomyUpdateRequest(
                "Updated Name", null, "Updated desc", "new-icon", 2, false, 5);

        TaxonomyNode result = taxonomyService.updateNode(rootId, request);

        assertThat(result.getName()).isEqualTo("Updated Name");
        assertThat(result.getDescription()).isEqualTo("Updated desc");
        assertThat(result.getIcon()).isEqualTo("new-icon");
        assertThat(result.getPhase()).isEqualTo(2);
        assertThat(result.getIsActive()).isFalse();
        assertThat(result.getSortOrder()).isEqualTo(5);
        assertThat(result.getSlug()).isEqualTo("programming");
    }

    @Test
    void updateNode_slugChange_success() {
        when(taxonomyNodeRepository.findById(rootId)).thenReturn(Optional.of(rootNode));
        when(taxonomyNodeRepository.findBySlug("new-slug")).thenReturn(Optional.empty());
        when(taxonomyNodeRepository.save(any(TaxonomyNode.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TaxonomyUpdateRequest request = new TaxonomyUpdateRequest(
                null, "new-slug", null, null, null, null, null);

        TaxonomyNode result = taxonomyService.updateNode(rootId, request);

        assertThat(result.getSlug()).isEqualTo("new-slug");
    }

    @Test
    void updateNode_duplicateSlug_throwsBadRequest() {
        when(taxonomyNodeRepository.findById(rootId)).thenReturn(Optional.of(rootNode));
        when(taxonomyNodeRepository.findBySlug("java-basics")).thenReturn(Optional.of(childNode));

        TaxonomyUpdateRequest request = new TaxonomyUpdateRequest(
                null, "java-basics", null, null, null, null, null);

        assertThatThrownBy(() -> taxonomyService.updateNode(rootId, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Slug already exists");
    }

    @Test
    void updateNode_nonexistentNode_throwsResourceNotFound() {
        when(taxonomyNodeRepository.findById(any(UUID.class))).thenReturn(Optional.empty());

        TaxonomyUpdateRequest request = new TaxonomyUpdateRequest(
                "New", null, null, null, null, null, null);

        assertThatThrownBy(() -> taxonomyService.updateNode(UUID.randomUUID(), request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void deleteNode_success() {
        when(taxonomyNodeRepository.findById(rootId)).thenReturn(Optional.of(rootNode));
        when(taxonomyNodeRepository.findByParentIdAndPhaseOrderBySortOrder(rootId, 1))
                .thenReturn(Collections.emptyList());

        taxonomyService.deleteNode(rootId);

        verify(taxonomyNodeRepository).delete(rootNode);
    }

    @Test
    void deleteNode_withChildren_throwsBadRequest() {
        when(taxonomyNodeRepository.findById(rootId)).thenReturn(Optional.of(rootNode));
        when(taxonomyNodeRepository.findByParentIdAndPhaseOrderBySortOrder(rootId, 1))
                .thenReturn(List.of(childNode));

        assertThatThrownBy(() -> taxonomyService.deleteNode(rootId))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Cannot delete node with children");
    }

    @Test
    void deleteNode_nonexistentNode_throwsResourceNotFound() {
        when(taxonomyNodeRepository.findById(any(UUID.class))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taxonomyService.deleteNode(UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
