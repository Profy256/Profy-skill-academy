package com.profy256.profy.modules.progress.repository;

import com.profy256.profy.modules.progress.entity.Certificate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CertificateRepository extends JpaRepository<Certificate, UUID> {

    Optional<Certificate> findByUserIdAndCourseNodeId(UUID userId, UUID courseNodeId);

    Optional<Certificate> findByUserIdAndCourseNodeIdAndDefinitionId(
            UUID userId, UUID courseNodeId, UUID definitionId);

    java.util.List<Certificate> findByUserIdOrderByIssuedAtDesc(UUID userId);

    Optional<Certificate> findByCertCode(String certCode);

    boolean existsByCertCode(String certCode);

    /** Credentials are looked up by code without auth — only live (non-revoked) ones. */
    Optional<Certificate> findFirstByCertCodeAndRevokedAtIsNull(String certCode);

    Page<Certificate> findAllByOrderByIssuedAtDesc(Pageable pageable);

    long countByDefinitionId(UUID definitionId);

    Page<Certificate> findByUserIdOrderByIssuedAtDesc(UUID userId, Pageable pageable);

    Page<Certificate> findByRevokedAtIsNullOrderByIssuedAtDesc(Pageable pageable);
}
