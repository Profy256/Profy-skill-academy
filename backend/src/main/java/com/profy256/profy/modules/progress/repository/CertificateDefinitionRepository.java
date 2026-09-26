package com.profy256.profy.modules.progress.repository;

import com.profy256.profy.modules.progress.entity.CertificateDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CertificateDefinitionRepository extends JpaRepository<CertificateDefinition, UUID> {

    Optional<CertificateDefinition> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<CertificateDefinition> findAllByOrderBySortOrderAscNameAsc();

    List<CertificateDefinition> findByIsEnabledTrueOrderBySortOrderAscNameAsc();

    List<CertificateDefinition> findByCourseNodeIdAndIsEnabledTrue(UUID courseNodeId);

    List<CertificateDefinition> findByCourseNodeId(UUID courseNodeId);

    void deleteByCourseNodeId(UUID courseNodeId);
}
