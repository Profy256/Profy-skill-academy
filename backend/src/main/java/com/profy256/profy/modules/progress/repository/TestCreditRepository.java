package com.profy256.profy.modules.progress.repository;

import com.profy256.profy.modules.progress.entity.TestCredit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TestCreditRepository extends JpaRepository<TestCredit, UUID> {

    Optional<TestCredit> findByProviderAndProviderRef(String provider, String providerRef);

    List<TestCredit> findByUserIdAndCourseNodeIdAndStatusOrderByCreatedAtDesc(
            UUID userId, UUID courseNodeId, String status);

    List<TestCredit> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<TestCredit> findByStatusOrderByCreatedAtDesc(String status);

    long countByUserIdAndCourseNodeIdAndStatus(UUID userId, UUID courseNodeId, String status);
}
