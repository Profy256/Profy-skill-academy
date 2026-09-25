package com.profy256.profy.modules.ai.repository;

import com.profy256.profy.modules.ai.entity.AiProviderKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface AiProviderKeyRepository extends JpaRepository<AiProviderKey, UUID> {

    /**
     * Active keys for a provider, healthy keys first (not cooling down),
     * then fewest failures, then least recently used.
     */
    @Query("""
            SELECT k FROM AiProviderKey k
            WHERE k.providerId = :providerId AND k.isActive = true
            ORDER BY CASE WHEN k.disabledUntil IS NULL OR k.disabledUntil < :now THEN 0 ELSE 1 END,
                     k.failureCount ASC,
                     COALESCE(k.lastUsedAt, k.createdAt) ASC
            """)
    List<AiProviderKey> findActiveKeysOrdered(@Param("providerId") UUID providerId,
                                              @Param("now") Instant now);

    List<AiProviderKey> findByProviderIdIn(Collection<UUID> providerIds);

    List<AiProviderKey> findByProviderId(UUID providerId);

    void deleteByProviderId(UUID providerId);
}
