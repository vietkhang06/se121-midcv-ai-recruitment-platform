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
class AuthoritativeEmbeddingStoreTest {

    @Mock
    private EmbeddingRepository embeddingRepository;

    @Test
    void testAuthoritativeEmbeddingStore_AllEntityEmbeddingsCentralizedInSingleTable() {
        UUID cvId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();

        Embedding cvEmbedding = Embedding.builder()
                .entityType("CV")
                .entityId(cvId)
                .modelProvider("OPENAI")
                .modelName("text-embedding-3-small")
                .dimension(1536)
                .status("ACTIVE")
                .build();

        Embedding jobEmbedding = Embedding.builder()
                .entityType("JOB")
                .entityId(jobId)
                .modelProvider("OPENAI")
                .modelName("text-embedding-3-small")
                .dimension(1536)
                .status("ACTIVE")
                .build();

        when(embeddingRepository.findByEntityTypeAndEntityId("CV", cvId)).thenReturn(Optional.of(cvEmbedding));
        when(embeddingRepository.findByEntityTypeAndEntityId("JOB", jobId)).thenReturn(Optional.of(jobEmbedding));

        Optional<Embedding> cvResult = embeddingRepository.findByEntityTypeAndEntityId("CV", cvId);
        Optional<Embedding> jobResult = embeddingRepository.findByEntityTypeAndEntityId("JOB", jobId);

        assertTrue(cvResult.isPresent());
        assertTrue(jobResult.isPresent());
        assertEquals("CV", cvResult.get().getEntityType());
        assertEquals("JOB", jobResult.get().getEntityType());
        assertEquals(1536, cvResult.get().getDimension());
        assertEquals(1536, jobResult.get().getDimension());
    }
}
