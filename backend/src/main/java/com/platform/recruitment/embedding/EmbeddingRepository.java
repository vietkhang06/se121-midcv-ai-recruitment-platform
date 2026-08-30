package com.platform.recruitment.embedding;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmbeddingRepository extends JpaRepository<Embedding, UUID> {
    Optional<Embedding> findByEntityTypeAndEntityId(String entityType, UUID entityId);
}
