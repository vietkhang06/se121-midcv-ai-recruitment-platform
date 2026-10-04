package com.platform.recruitment;

import com.platform.recruitment.ai.AiWorkerClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase 6: Real live integration test between Java Backend and FastAPI AI Worker (port 8000).
 * Verifies contract integrity, health check with bge-m3 embedding, and document extraction.
 */
public class RealAiWorkerLiveIntegrationTest {

    private AiWorkerClient aiWorkerClient;

    @BeforeEach
    void setUp() {
        org.junit.jupiter.api.Assumptions.assumeTrue(
                isAiWorkerReachable(),
                "FastAPI AI Worker (http://127.0.0.1:8000) is not reachable; skipping live contract test"
        );
        aiWorkerClient = new AiWorkerClient("http://127.0.0.1:8000/internal/ai");
    }

    private static boolean isAiWorkerReachable() {
        try (java.net.Socket socket = new java.net.Socket()) {
            socket.connect(new java.net.InetSocketAddress("127.0.0.1", 8000), 500);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Test
    @DisplayName("AI Worker Live Health Check verifies contract, bge-m3 embedding, and OCR status")
    void testLiveAiWorker_HealthCheckContract() {
        Map<String, Object> health = aiWorkerClient.checkHealth();

        assertNotNull(health, "Health check response should not be null");
        assertEquals("UP", health.get("status"));

        // Verify document extraction sub-status
        assertTrue(health.containsKey("documentExtraction"));
        Map<String, Object> docExtraction = (Map<String, Object>) health.get("documentExtraction");
        assertEquals("UP", docExtraction.get("status"));

        // Verify standardized bge-m3 embedding model contract
        assertTrue(health.containsKey("embedding"), "Health response should contain embedding configuration");
        Map<String, Object> embedding = (Map<String, Object>) health.get("embedding");
        assertEquals("bge-m3", embedding.get("model"));
        assertEquals(1024, ((Number) embedding.get("dimension")).intValue());
        assertEquals("LOCAL_OLLAMA", embedding.get("provider"));
    }

    @Test
    @DisplayName("AI Worker Live Document Extraction handles plain text extraction contract")
    void testLiveAiWorker_ExtractDocumentContract() {
        String testText = "Nguyen Van A\nSenior Software Engineer\nSkills: Java 21, Spring Boot, PostgreSQL, Docker";
        Map<String, Object> result = aiWorkerClient.extractDocument(
                null,
                "resume.txt",
                "text/plain",
                testText
        );

        assertNotNull(result, "Document extraction response should not be null");
        assertEquals("EXTRACTED", result.get("status"));
        assertNotNull(result.get("rawText"));
        assertTrue(result.get("rawText").toString().contains("Java 21"));
        assertNotNull(result.get("checksum"));
    }
}
