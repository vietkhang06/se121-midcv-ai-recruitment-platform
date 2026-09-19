package com.platform.recruitment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.ai.AiClient;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.embedding.PgvectorCosineSimilarity;
import com.platform.recruitment.event.Events;
import com.platform.recruitment.worker.JobQueue;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Phase 5 Comprehensive Verification Test Suite:
 * Harden Embedding Generation, Persistence & Processing State.
 */
@ExtendWith(MockitoExtension.class)
public class EmbeddingLifecycleAndStateHardeningTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private Events events;
    @Mock private PlatformTransactionManager transactionManager;

    private String generateValid1024Vector() {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < 1024; i++) {
            if (i > 0) sb.append(",");
            sb.append("0.03125"); // 1024 * (1/32)^2 = 1024 * 1/1024 = 1.0 (unit norm)
        }
        sb.append("]");
        return sb.toString();
    }

    // 1. Successful 1024-dim vector validation
    @Test
    @DisplayName("EMB-01: Valid 1024-dimensional vector string passes contract validation")
    void testValid1024Vector_PassesValidation() {
        String validVec = generateValid1024Vector();
        assertDoesNotThrow(() -> AiClient.validateVector(validVec));
    }

    // 2. Wrong vector dimension rejected (< 1024)
    @Test
    @DisplayName("EMB-02: Vector with fewer than 1024 dimensions (e.g. 512, 768) is rejected")
    void testUnderDimensionVector_ThrowsException() {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < 768; i++) {
            if (i > 0) sb.append(",");
            sb.append("0.1");
        }
        sb.append("]");

        CustomException ex = assertThrows(CustomException.class, () ->
                AiClient.validateVector(sb.toString())
        );
        assertEquals(ErrorCode.INTERNAL_SERVER_ERROR, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("Chiều của vector embedding không khớp: yêu cầu 1024, nhận được 768"));
    }

    // 3. Wrong vector dimension rejected (> 1024)
    @Test
    @DisplayName("EMB-03: Vector with more than 1024 dimensions (e.g. 1536) is rejected")
    void testOverDimensionVector_ThrowsException() {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < 1536; i++) {
            if (i > 0) sb.append(",");
            sb.append("0.05");
        }
        sb.append("]");

        CustomException ex = assertThrows(CustomException.class, () ->
                AiClient.validateVector(sb.toString())
        );
        assertEquals(ErrorCode.INTERNAL_SERVER_ERROR, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("Chiều của vector embedding không khớp: yêu cầu 1024, nhận được 1536"));
    }

    // 4. Empty vector string or empty bracket rejected
    @Test
    @DisplayName("EMB-04: Empty vector or empty bracket rejected")
    void testEmptyVector_ThrowsException() {
        CustomException ex1 = assertThrows(CustomException.class, () -> AiClient.validateVector(""));
        assertEquals(ErrorCode.INTERNAL_SERVER_ERROR, ex1.getErrorCode());

        CustomException ex2 = assertThrows(CustomException.class, () -> AiClient.validateVector("[]"));
        assertEquals(ErrorCode.INTERNAL_SERVER_ERROR, ex2.getErrorCode());

        CustomException ex3 = assertThrows(CustomException.class, () -> AiClient.validateVector(null));
        assertEquals(ErrorCode.INTERNAL_SERVER_ERROR, ex3.getErrorCode());
    }

    // 5. Zero norm vector rejected (all zeros)
    @Test
    @DisplayName("EMB-05: Zero-norm vector (all zeros) rejected")
    void testZeroNormVector_ThrowsException() {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < 1024; i++) {
            if (i > 0) sb.append(",");
            sb.append("0.0");
        }
        sb.append("]");

        CustomException ex = assertThrows(CustomException.class, () ->
                AiClient.validateVector(sb.toString())
        );
        assertEquals(ErrorCode.INTERNAL_SERVER_ERROR, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("vector rỗng (norm = 0)"));
    }

    // 6. Non-finite floating point numbers rejected (NaN or Infinity)
    @Test
    @DisplayName("EMB-06: Vector with NaN or Infinity is rejected")
    void testNonFiniteVector_ThrowsException() {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < 1023; i++) {
            if (i > 0) sb.append(",");
            sb.append("0.1");
        }
        sb.append(",NaN]");

        CustomException ex = assertThrows(CustomException.class, () ->
                AiClient.validateVector(sb.toString())
        );
        assertEquals(ErrorCode.INTERNAL_SERVER_ERROR, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("Vector embedding"));
    }

    // 7. Vector dimension mismatch in PgvectorCosineSimilarity returns ZERO without error
    @Test
    @DisplayName("EMB-07: Vector dimension mismatch in calculateSimilarityScore returns ZERO instead of truncating")
    void testVectorDimensionMismatch_ReturnsZero() {
        PgvectorCosineSimilarity similarity = new PgvectorCosineSimilarity(null);
        String vec768 = "[0.1, 0.2, 0.3]";
        String vec1024 = "[0.1, 0.2, 0.3, 0.4]";

        BigDecimal score = similarity.calculateSimilarityScore(vec768, vec1024);
        assertEquals(BigDecimal.ZERO, score);
    }

    // 8. Pgvector query requires both documents to be READY
    @Test
    @DisplayName("EMB-08: Pgvector query checks cv.state='READY' and jd.state='READY'")
    void testPgvectorQuery_EnforcesReadyState() {
        UUID cvId = UUID.randomUUID();
        UUID jdId = UUID.randomUUID();

        when(jdbcTemplate.queryForList(anyString(), eq(cvId), eq(jdId)))
                .thenAnswer(invocation -> {
                    String sql = invocation.getArgument(0);
                    // Verify SQL includes the exact READY state check
                    assertTrue(sql.contains("cv.state='READY'"));
                    assertTrue(sql.contains("jd.state='READY'"));
                    return List.of(Map.of("score", 88.50));
                });

        PgvectorCosineSimilarity similarity = new PgvectorCosineSimilarity(jdbcTemplate);
        BigDecimal score = similarity.evaluatePgvectorSemanticSimilarity(cvId, jdId);

        assertNotNull(score);
        assertEquals(BigDecimal.valueOf(88.50).setScale(2), score);
    }

    // 9. Unready or missing embedding returns null (enables safe non-fabricated fallback)
    @Test
    @DisplayName("EMB-09: Unready or missing embedding returns null for pgvector similarity")
    void testPgvectorQuery_UnreadyOrMissingReturnsNull() {
        UUID cvId = UUID.randomUUID();
        UUID jdId = UUID.randomUUID();

        when(jdbcTemplate.queryForList(anyString(), eq(cvId), eq(jdId)))
                .thenReturn(Collections.emptyList()); // No rows matched because one document was not READY

        PgvectorCosineSimilarity similarity = new PgvectorCosineSimilarity(jdbcTemplate);
        BigDecimal score = similarity.evaluatePgvectorSemanticSimilarity(cvId, jdId);

        assertNull(score, "Unready document version must yield null rather than fabricated similarity");
    }

    // 10. JobQueue idempotency: Enqueueing same entity returns existing job ID
    @Test
    @DisplayName("EMB-10: JobQueue enqueue is idempotent under active queued/running state")
    void testJobQueue_IdempotentEnqueue() {
        UUID owner = UUID.randomUUID();
        UUID entity = UUID.randomUUID();
        UUID existingJobId = UUID.randomUUID();

        when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        when(jdbcTemplate.query(anyString(), any(org.springframework.jdbc.core.RowMapper.class), any(), eq(owner), eq("EXTRACT"), eq(entity), any()))
                .thenReturn(List.of(existingJobId));

        JobQueue queue = new JobQueue(jdbcTemplate, events, transactionManager);
        UUID returnedId = queue.enqueue(owner, "EXTRACT", entity);

        assertEquals(existingJobId, returnedId, "Enqueue must return existing job ID without duplicate jobs");
    }

    // 11. Stale worker lease expiration
    @Test
    @DisplayName("EMB-11: JobQueue claim expires stale running leases to FAILED")
    void testJobQueue_ExpiresStaleLeases() {
        UUID worker = UUID.randomUUID();
        UUID staleJobId = UUID.randomUUID();
        UUID staleOwnerId = UUID.randomUUID();

        when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        when(jdbcTemplate.queryForList(contains("lease_until<now() RETURNING")))
                .thenReturn(List.of(Map.of(
                        "id", staleJobId,
                        "owner_id", staleOwnerId,
                        "kind", "EXTRACT",
                        "entity_id", UUID.randomUUID(),
                        "request_id", "req-1"
                )));
        when(jdbcTemplate.queryForList(contains("state='QUEUED'")))
                .thenReturn(Collections.emptyList());

        JobQueue queue = new JobQueue(jdbcTemplate, events, transactionManager);
        Optional<Map<String, Object>> result = queue.claim(worker);

        assertTrue(result.isEmpty());
        verify(events).emit(eq(staleJobId), eq(staleOwnerId), eq("ERROR"), eq("LEASE_EXPIRED"),
                eq("WORKER_LEASE_EXPIRED"), anyString(), isNull());
    }

    // 12. Complete transitions to SUCCEEDED and DONE
    @Test
    @DisplayName("EMB-12: JobQueue complete marks job SUCCEEDED and DONE at 100%")
    void testJobQueue_CompleteTransitionsState() {
        UUID job = UUID.randomUUID();
        UUID worker = UUID.randomUUID();

        when(jdbcTemplate.update(contains("state='SUCCEEDED',step='DONE',progress=100"), eq(job), eq(worker)))
                .thenReturn(1);

        JobQueue queue = new JobQueue(jdbcTemplate, events, transactionManager);
        assertDoesNotThrow(() -> queue.complete(job, worker));
    }

    // 13. Fail transitions to FAILED
    @Test
    @DisplayName("EMB-13: JobQueue fail marks job FAILED with actionable error code")
    void testJobQueue_FailTransitionsState() {
        UUID job = UUID.randomUUID();
        UUID worker = UUID.randomUUID();

        when(jdbcTemplate.update(contains("state='FAILED',step='FAILED'"), eq("EMBEDDING_FAILED"), eq("Provider timed out"), eq(job), eq(worker)))
                .thenReturn(1);

        JobQueue queue = new JobQueue(jdbcTemplate, events, transactionManager);
        assertDoesNotThrow(() -> queue.fail(job, worker, "EMBEDDING_FAILED", "Provider timed out"));
    }
}
