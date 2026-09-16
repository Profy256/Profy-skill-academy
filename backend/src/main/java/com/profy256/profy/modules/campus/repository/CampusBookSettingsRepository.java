package com.profy256.profy.modules.campus.repository;

import com.profy256.profy.modules.campus.entity.CampusBookSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CampusBookSettingsRepository extends JpaRepository<CampusBookSettings, UUID> {

    Optional<CampusBookSettings> findByCampusBookId(String campusBookId);

    List<CampusBookSettings> findByIsPremiumTrue();

    List<CampusBookSettings> findByIsFeaturedTrue();

    boolean existsByCampusBookIdAndIsPremiumTrue(String campusBookId);

    boolean existsByCampusBookIdAndIsFeaturedTrue(String campusBookId);
}
