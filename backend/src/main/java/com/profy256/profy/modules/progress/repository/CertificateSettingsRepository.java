package com.profy256.profy.modules.progress.repository;

import com.profy256.profy.modules.progress.entity.CertificateSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CertificateSettingsRepository extends JpaRepository<CertificateSettings, UUID> {
}
