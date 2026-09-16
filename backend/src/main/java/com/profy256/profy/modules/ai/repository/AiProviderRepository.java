package com.profy256.profy.modules.ai.repository;

import com.profy256.profy.modules.ai.entity.AiProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AiProviderRepository extends JpaRepository<AiProvider, UUID> {

    List<AiProvider> findAllByOrderByCreatedAtDesc();

    List<AiProvider> findByIsActiveTrue();
}
