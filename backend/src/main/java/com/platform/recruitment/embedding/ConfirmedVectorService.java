package com.platform.recruitment.embedding;

import com.platform.recruitment.ai.AiClient;
import com.platform.recruitment.cv.*;
import com.platform.recruitment.job.*;
import com.platform.recruitment.matching.MatchingInputTrace;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.math.*;
import java.util.*;

/** Existing centralized vector store, bound to confirmed review content rather than extraction JSON. */
@Service
@RequiredArgsConstructor
public class ConfirmedVectorService {
    private final JdbcTemplate jdbc;
    private final AiClient ai;
    public record Comparison(BigDecimal score, String model, int dimension) {}

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Comparison compare(CVVersion version, Job job, List<JobRequirement> requirements, boolean persistCache) {
        ConfirmedCvInput.requireConfirmed(version, version.getCv().getCandidate().getId());
        String cv = ConfirmedCvInput.text(version);
        String jd = Objects.toString(job.getTitle(), "") + "\n" + Objects.toString(job.getDescription(), "") + "\n" + requirements.stream()
                .map(req -> req.getRequirementType() + ": " + req.getSkillName() + " " + Objects.toString(req.getMinYearsExp(), ""))
                .sorted().reduce("", (left, right) -> left + right + "\n");
        String model = ai.activeEmbeddingModel();
        String cvVector = vector("CV_VERSION", version.getId(), cv, model, persistCache);
        String jdVector = vector("JOB", job.getId(), jd, model, persistCache);
        Number score = jdbc.queryForObject(
                "SELECT greatest(0,least(100,(1-(?::vector <=> ?::vector))*100))", Number.class, cvVector, jdVector);
        if (score == null || !Double.isFinite(score.doubleValue())) throw new IllegalStateException("Invalid pgvector result");
        return new Comparison(BigDecimal.valueOf(score.doubleValue()).setScale(2, RoundingMode.HALF_UP), model, 1024);
    }

    private String vector(String type, UUID id, String source, String model, boolean persist) {
        String hash = MatchingInputTrace.hash(source);
        if (persist) {
            // Serialize a cache miss for this immutable source binding. Without this,
            // two transactions can both miss and insert two ACTIVE vectors.
            String lockKey = type + ":" + id + ":LOCAL_OLLAMA:" + model + ":1024:" + hash;
            jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(?,0)) IS NULL",
                    Boolean.class, lockKey);
        }
        List<String> cached = jdbc.query(
                "SELECT embedding_vector_1024::text FROM embeddings WHERE entity_type=? AND entity_id=? "
                        + "AND model_provider='LOCAL_OLLAMA' AND model_name=? AND source_sha256=? "
                        + "AND dimension=1024 AND status='ACTIVE' AND embedding_vector_1024 IS NOT NULL "
                        + "AND vector_norm(embedding_vector_1024)>0 ORDER BY updated_at DESC LIMIT 1",
                (rs, index) -> rs.getString(1), type, id, model, hash);
        if (!cached.isEmpty()) return cached.get(0);
        String vector = ai.embed(source, model); // AiClient rejects wrong model/dimension, non-finite and zero vectors.
        if (persist) {
            jdbc.update("UPDATE embeddings SET status='INACTIVE',updated_at=now() WHERE entity_type=? AND entity_id=? AND status='ACTIVE'", type, id);
            jdbc.update("INSERT INTO embeddings(entity_type,entity_id,model_provider,model_name,model_version,dimension,source_sha256,embedding_vector_1024,status) "
                    + "VALUES (?,?,'LOCAL_OLLAMA',?,'confirmed-source-v1',1024,?,?::vector,'ACTIVE')", type, id, model, hash, vector);
        }
        return vector;
    }
}
