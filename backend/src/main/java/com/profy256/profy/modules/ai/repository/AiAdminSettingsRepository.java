package com.profy256.profy.modules.ai.repository;

import com.profy256.profy.modules.ai.entity.AiAdminSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AiAdminSettingsRepository extends JpaRepository<AiAdminSettings, UUID> {
}
