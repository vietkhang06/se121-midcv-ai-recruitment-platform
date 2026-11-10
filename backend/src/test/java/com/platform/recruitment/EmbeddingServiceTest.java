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
    void legacyMetadataOnlyGenerationMustNeverPretendToCreateAnActiveVector() {
        UUID cvId = UUID.randomUUID();
        assertThrows(com.platform.recruitment.common.CustomException.class,
                () -> embeddingService.generateAndPersistEmbedding("CV", cvId, "Java Spring Boot"));
        verifyNoInteractions(embeddingRepository);
    }

}
