package com.profy256.profy.modules.resources.repository;

import com.profy256.profy.modules.resources.entity.Resource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ResourceRepository extends JpaRepository<Resource, UUID> {

    List<Resource> findByNodeIdAndIsActiveTrue(UUID nodeId);

    List<Resource> findByIsActiveTrue();

    List<Resource> findByNodeId(UUID nodeId);
}
