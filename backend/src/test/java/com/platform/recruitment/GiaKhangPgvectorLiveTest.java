package com.platform.recruitment;

import com.platform.recruitment.embedding.PgvectorCosineSimilarity;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

/** Opt-in, real SQL, temporary tables on an explicitly configured disposable DB only. */
@EnabledIfEnvironmentVariable(named="MIDCV_TEST_JDBC_URL", matches=".+")
class GiaKhangPgvectorLiveTest {
    @Test void actualCosineRejectsStaleOrMismatchedModels() {
        var data = new SingleConnectionDataSource(System.getenv("MIDCV_TEST_JDBC_URL"),
                System.getenv("MIDCV_TEST_DB_USER"), System.getenv("MIDCV_TEST_DB_PASSWORD"), true);
        try {
            JdbcTemplate jdbc = new JdbcTemplate(data);
            jdbc.execute("CREATE EXTENSION IF NOT EXISTS vector");
            jdbc.execute("CREATE TEMP TABLE document_versions(id uuid PRIMARY KEY, embedding vector(1024), embedding_model text, state text)");
            String vector = "[1," + "0,".repeat(1022) + "0]";
            UUID cv = UUID.randomUUID(), jd = UUID.randomUUID();
            jdbc.update("INSERT INTO document_versions VALUES (?,?::vector,'bge-m3','READY'), (?,?::vector,'bge-m3','READY')", cv, vector, jd, vector);
            var query = new PgvectorCosineSimilarity(jdbc);
            assertEquals(100.0, query.evaluatePgvectorSemanticSimilarity(cv, jd).doubleValue());
            jdbc.update("UPDATE document_versions SET embedding_model='different-model' WHERE id=?", jd);
            assertNull(query.evaluatePgvectorSemanticSimilarity(cv, jd));
            jdbc.update("UPDATE document_versions SET embedding_model='bge-m3',state='STALE' WHERE id=?", jd);
            assertNull(query.evaluatePgvectorSemanticSimilarity(cv, jd));
        } finally { data.destroy(); }
    }
}
