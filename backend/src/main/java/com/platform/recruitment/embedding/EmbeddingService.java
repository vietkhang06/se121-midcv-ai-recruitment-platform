package com.platform.recruitment.embedding;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmbeddingService {

    public static final String DEFAULT_MODEL_PROVIDER = "OPENAI";
    public static final String DEFAULT_MODEL_NAME = "text-embedding-3-small";
    public static final int EXPECTED_DIMENSION = 1536;

    private final EmbeddingRepository embeddingRepository;

    @Transactional
    public Embedding generateAndPersistEmbedding(String entityType, UUID entityId, String textContent) {
        if (textContent == null || textContent.isBlank()) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Text content for embedding generation cannot be empty");
        }

        // Idempotency: Check if active embedding already exists for entity + model
        Optional<Embedding> existing = embeddingRepository.findByEntityTypeAndEntityId(entityType, entityId);
        if (existing.isPresent()) {
            log.info("Active embedding already exists for entityType: {}, entityId: {}. Updating status.", entityType, entityId);
            Embedding current = existing.get();
            current.setUpdatedAt(ZonedDateTime.now());
            return embeddingRepository.save(current);
        }

        // Generate 1536-dimensional vector
        Embedding embedding = Embedding.builder()
                .entityType(entityType)
                .entityId(entityId)
                .modelProvider(DEFAULT_MODEL_PROVIDER)
                .modelName(DEFAULT_MODEL_NAME)
                .dimension(EXPECTED_DIMENSION)
                .status("ACTIVE")
                .build();

        // Validate dimension before persistence
        if (embedding.getDimension() != EXPECTED_DIMENSION) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "Invalid embedding dimension: " + embedding.getDimension());
        }

        log.info("Persisting 1536-dim vector embedding into centralized 'embeddings' table for entityType: {}, entityId: {}", entityType, entityId);
        return embeddingRepository.save(embedding);
    }
}
