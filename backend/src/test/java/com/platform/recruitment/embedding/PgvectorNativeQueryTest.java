package com.platform.recruitment.embedding;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Verifies SQL selection; not a substitute for a LIVE PostgreSQL/Pgvector integration test. */
@ExtendWith(MockitoExtension.class)
class PgvectorNativeQueryTest {
    @Mock JdbcTemplate jdbc;

    @Test void nativeSqlUsesPgvectorDistanceAndSameModel() {
        UUID cv = UUID.randomUUID(), jd = UUID.randomUUID();
        when(jdbc.queryForList(anyString(), eq(cv), eq(jd)))
                .thenReturn(List.of(Map.of("score", 73.25)));
        PgvectorCosineSimilarity scorer = new PgvectorCosineSimilarity(jdbc);
        assertEquals(new BigDecimal("73.25"), scorer.evaluatePgvectorSemanticSimilarity(cv, jd));
        verify(jdbc).queryForList(argThat(sql -> sql.contains("<=>")
                && sql.contains("cv.embedding_model=jd.embedding_model")
                && sql.contains("cv.embedding_dimension=1024")), eq(cv), eq(jd));
    }

    @Test void noVectorRowsMeansNoClaimOfPgvectorSuccess() {
        UUID cv = UUID.randomUUID(), jd = UUID.randomUUID();
        when(jdbc.queryForList(anyString(), eq(cv), eq(jd))).thenReturn(List.of());
        assertNull(new PgvectorCosineSimilarity(jdbc).evaluatePgvectorSemanticSimilarity(cv, jd));
    }
}
