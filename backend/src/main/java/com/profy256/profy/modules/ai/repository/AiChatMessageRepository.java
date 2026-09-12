package com.profy256.profy.modules.ai.repository;

import com.profy256.profy.modules.ai.entity.AiChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface AiChatMessageRepository extends JpaRepository<AiChatMessage, UUID> {
    List<AiChatMessage> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);
    long countBySessionIdAndRoleAndCreatedAtAfter(UUID sessionId, String role, Instant since);
}
