package com.platform.recruitment;

import com.platform.recruitment.embedding.Embedding;
import com.platform.recruitment.embedding.EmbeddingRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmbeddingPersistenceTest {

    @Mock
    private EmbeddingRepository embeddingRepository;

    @Test
    void testEmbeddingEntity_StoresMetadataAndDimension() {
        UUID jobId = UUID.randomUUID();
        Embedding embedding = Embedding.builder()
                .entityType("JOB")
                .entityId(jobId)
                .modelProvider("OPENAI")
                .modelName("text-embedding-3-small")
                .modelVersion("v1.0")
                .dimension(1536)
                .status("ACTIVE")
                .build();

        when(embeddingRepository.findByEntityTypeAndEntityId("JOB", jobId)).thenReturn(Optional.of(embedding));

        Optional<Embedding> result = embeddingRepository.findByEntityTypeAndEntityId("JOB", jobId);
        assertTrue(result.isPresent());
        assertEquals(1536, result.get().getDimension());
        assertEquals("text-embedding-3-small", result.get().getModelName());
    }
}
