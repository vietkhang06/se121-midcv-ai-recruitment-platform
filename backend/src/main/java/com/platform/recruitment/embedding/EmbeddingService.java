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

    public static final String DEFAULT_MODEL_PROVIDER = "LOCAL_OLLAMA";
    public static final String DEFAULT_MODEL_NAME = "bge-m3";
    public static final int EXPECTED_DIMENSION = 1024;

    private final EmbeddingRepository embeddingRepository;

    /**
     * Historical embeddings-table pathway was metadata-only (never wrote the vector).
     * Retired for generation: using this API must never silently produce ACTIVE fake data.
     * Production applications use VersionedEmbeddingLifecycle + document_versions.embedding.
     */
    @Deprecated
    @Transactional
    public Embedding generateAndPersistEmbedding(String entityType, UUID entityId, String textContent) {
        throw new CustomException(ErrorCode.SERVICE_UNAVAILABLE,
                "Legacy embeddings metadata-only API cannot generate a real vector. "
                        + "Use confirmed CV/JD document version embedding lifecycle.");
    }

    @Transactional
    public void invalidateEmbedding(String entityType, UUID entityId) {
        if (entityType == null || entityId == null) {
            return;
        }
        Optional<Embedding> existing = embeddingRepository.findByEntityTypeAndEntityId(entityType, entityId);
        if (existing.isPresent()) {
            Embedding current = existing.get();
            current.setStatus("INACTIVE");
            current.setUpdatedAt(ZonedDateTime.now());
            embeddingRepository.save(current);
            log.info("Invalidated embedding for entityType: {}, entityId: {}", entityType, entityId);
        }
    }
}
