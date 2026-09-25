package com.profy256.profy.modules.lessons.repository;

import com.profy256.profy.modules.lessons.entity.AutoCurationSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AutoCurationSettingsRepository extends JpaRepository<AutoCurationSettings, UUID> {
}
