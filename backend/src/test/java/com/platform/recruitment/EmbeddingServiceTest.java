package com.platform.recruitment;

import com.platform.recruitment.embedding.Embedding;
import com.platform.recruitment.embedding.EmbeddingRepository;
import com.platform.recruitment.embedding.EmbeddingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmbeddingServiceTest {

    @Mock
    private EmbeddingRepository embeddingRepository;

    private EmbeddingService embeddingService;

    @BeforeEach
    void setUp() {
        embeddingService = new EmbeddingService(embeddingRepository);
    }

    @Test
    void testGenerateEmbedding_Validates1536Dimension_PersistsCentralizedStore() {
        UUID cvId = UUID.randomUUID();
        when(embeddingRepository.findByEntityTypeAndEntityId("CV", cvId)).thenReturn(Optional.empty());
        when(embeddingRepository.save(any(Embedding.class))).thenAnswer(i -> i.getArgument(0));

        Embedding result = embeddingService.generateAndPersistEmbedding("CV", cvId, "Java 21 Spring Boot");

        assertNotNull(result);
        assertEquals("CV", result.getEntityType());
        assertEquals(cvId, result.getEntityId());
        assertEquals("text-embedding-3-small", result.getModelName());
        assertEquals(1536, result.getDimension());
        assertEquals("ACTIVE", result.getStatus());
        verify(embeddingRepository, times(1)).save(any(Embedding.class));
    }
}
