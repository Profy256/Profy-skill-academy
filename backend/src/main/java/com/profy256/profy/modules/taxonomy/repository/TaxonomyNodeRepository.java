package com.profy256.profy.modules.taxonomy.repository;

import com.profy256.profy.modules.taxonomy.entity.TaxonomyNode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TaxonomyNodeRepository extends JpaRepository<TaxonomyNode, UUID> {

    Optional<TaxonomyNode> findBySlug(String slug);

    List<TaxonomyNode> findByParentIdIsNullAndPhaseOrderBySortOrder(Integer phase);

    List<TaxonomyNode> findByParentIdAndPhaseOrderBySortOrder(UUID parentId, Integer phase);

    List<TaxonomyNode> findAllByPhase(Integer phase);

    List<TaxonomyNode> findByIsActiveTrueAndPhase(Integer phase);

    List<TaxonomyNode> findByIdIn(List<UUID> ids);

    List<TaxonomyNode> findByNodeTypeAndIsActiveTrue(String nodeType);
}
