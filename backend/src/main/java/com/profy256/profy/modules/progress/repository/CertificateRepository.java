package com.profy256.profy.modules.progress.repository;

import com.profy256.profy.modules.progress.entity.Certificate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CertificateRepository extends JpaRepository<Certificate, UUID> {

    Optional<Certificate> findByUserIdAndCourseNodeId(UUID userId, UUID courseNodeId);
}
