package com.profy256.profy.modules.billing.repository;

import com.profy256.profy.modules.billing.entity.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {
    Optional<Subscription> findFirstByUserIdAndStatusOrderByCurrentPeriodEndDesc(UUID userId, String status);
    Optional<Subscription> findFirstByProviderSubscriptionId(String providerSubscriptionId);
}
