package com.profy256.profy.modules.ai.repository;

import com.profy256.profy.modules.ai.entity.AiChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AiChatSessionRepository extends JpaRepository<AiChatSession, UUID> {
    Optional<AiChatSession> findByUserIdAndLessonId(UUID userId, UUID lessonId);
}
