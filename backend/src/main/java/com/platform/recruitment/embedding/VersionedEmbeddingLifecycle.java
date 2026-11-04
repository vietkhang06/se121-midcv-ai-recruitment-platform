package com.platform.recruitment.embedding;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.ai.AiClient;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.cv.CVVersion;
import com.platform.recruitment.cv.ConfirmedCvInput;
import com.platform.recruitment.document.Documents;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobRequirement;
import com.platform.recruitment.worker.JobQueue;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Canonical application-scoring vector lifecycle. Only document_versions.embedding contains
 * a usable pgvector; embeddings-table metadata is not evidence of an actual vector.
 * Both a confirmed CV and the JD persist an immutable version-bound embedding input.
 * Ollama model/dimension are verified by AiClient at generation time, never fabricated.
 */
@Service
@RequiredArgsConstructor
public class VersionedEmbeddingLifecycle {
    public static final String PIPELINE = "midcv-reviewed-vector-v1";
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final JobQueue queue;
    private final AiClient ai;

    public static String canonicalJobText(Job job) {
        StringBuilder text = new StringBuilder();
        append(text, "Title", job.getTitle());
        append(text, "Industry", job.getIndustry());
        append(text, "Seniority", job.getSeniority());
        append(text, "Seniority detail", job.getSeniorityOther());
        append(text, "Location", job.getLocation());
        append(text, "Employment type", job.getEmploymentType());
        append(text, "Description", job.getDescription());
        if (job.getResponsibilities() != null) {
            for (String responsibility : job.getResponsibilities()) append(text, "Responsibility", responsibility);
        }
        List<JobRequirement> requirements = new ArrayList<>(
                job.getRequirements() == null ? List.of() : job.getRequirements());
        requirements.sort(Comparator.comparing((JobRequirement r) ->
                r.getRequirementType() == null ? "" : r.getRequirementType().name())
                .thenComparing(r -> Objects.toString(r.getSkillName(), ""))
                .thenComparing(r -> r.getMinYearsExp() == null ? 0 : r.getMinYearsExp()));
        for (JobRequirement r : requirements) {
            append(text, r.getRequirementType() == null ? "Requirement" : r.getRequirementType().name(),
                    Objects.toString(r.getSkillName(), "") + " (min years "
                            + (r.getMinYearsExp() == null ? 0 : r.getMinYearsExp()) + ")");
        }
        return text.toString().strip();
    }

    private static void append(StringBuilder text, String label, String value) {
        if (value != null && !value.isBlank()) text.append(label).append(": ").append(value.strip()).append('\n');
    }

    private String jdSnapshot(Job job) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("title", job.getTitle());
        data.put("description", job.getDescription());
        data.put("industry", job.getIndustry());
        data.put("seniority", job.getSeniority());
        data.put("location", job.getLocation());
        data.put("employmentType", job.getEmploymentType());
        data.put("responsibilities", job.getResponsibilities());
        List<Map<String, Object>> skills = new ArrayList<>();
        if (job.getRequirements() != null) {
            for (JobRequirement req : job.getRequirements()) {
                Map<String, Object> skill = new LinkedHashMap<>();
                skill.put("skill", req.getSkillName());
                skill.put("type", req.getRequirementType() == null ? "REQUIRED" : req.getRequirementType().name());
                skill.put("minYears", req.getMinYearsExp());
                skills.add(skill);
            }
        }
        skills.sort(Comparator.comparing((Map<String, Object> s) -> Objects.toString(s.get("type"), ""))
                .thenComparing(s -> Objects.toString(s.get("skill"), "")));
        data.put("requirements", skills);
        try { return mapper.writeValueAsString(data); }
        catch (JsonProcessingException e) { throw new IllegalStateException("JD_SNAPSHOT_SERIALIZATION_FAILED", e); }
    }

    /**
     * Version 1 of each JD uses documents.id == jobs.id. Subsequent edits create a NEW
     * document_version, never mutate an existing application-bound version.
     */
    @Transactional
    public UUID prepareJob(Job job) {
        if (job == null || job.getId() == null || job.getCompany() == null)
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Job must be persisted before embedding");
        String text = canonicalJobText(job);
        if (text.isBlank()) throw new CustomException(ErrorCode.VALIDATION_ERROR, "Job text is empty");
        String hash = Documents.shaHex(text);
        List<UUID> owners = jdbc.query("SELECT user_id FROM recruiter_profiles WHERE company_id=? "
                + "ORDER BY created_at, id LIMIT 1", (rs, n) -> rs.getObject(1, UUID.class), job.getCompany().getId());
        if (owners.isEmpty()) throw new CustomException(ErrorCode.VALIDATION_ERROR,
                "Job has no recruiter to own its document");
        UUID owner = owners.get(0);
        jdbc.update("INSERT INTO documents(id,owner_id,kind,title) VALUES (?,?, 'JD',?) ON CONFLICT(id) DO NOTHING",
                job.getId(), owner, job.getTitle());
        // Serializes concurrent updates of a job's version number.
        List<Map<String, Object>> docs = jdbc.queryForList(
                "SELECT id,owner_id FROM documents WHERE id=? AND kind='JD' FOR UPDATE", job.getId());
        if (docs.isEmpty()) throw new CustomException(ErrorCode.VALIDATION_ERROR, "Conflicting document ID");
        owner = (UUID) docs.get(0).get("owner_id");
        List<Map<String, Object>> latest = jdbc.queryForList(
                "SELECT id,source_sha,embedding_model,embedding IS NOT NULL AS has_vector,embedding_source_sha "
                + "FROM document_versions WHERE document_id=? ORDER BY version_no DESC LIMIT 1", job.getId());
        UUID versionId;
        if (!latest.isEmpty() && hash.equals(Objects.toString(latest.get(0).get("source_sha"), "").strip())) {
            versionId = (UUID) latest.get(0).get("id");
        } else {
            Integer versionNo = jdbc.queryForObject(
                    "SELECT COALESCE(MAX(version_no),0)+1 FROM document_versions WHERE document_id=?",
                    Integer.class, job.getId());
            versionId = UUID.randomUUID();
            jdbc.update("INSERT INTO document_versions(id,document_id,version_no,filename,source_sha,raw_text,"
                    + "normalized,extraction_method,embedding_text,embedding_source_sha,state,pipeline_version) "
                    + "VALUES (?,?,?,'job-description.txt',?,?,?::jsonb,'hr_verified',?,?,'QUEUED',?)",
                    versionId, job.getId(), versionNo, hash, text, jdSnapshot(job), text, hash, PIPELINE);
        }
        if (!versionHasCurrentVector(versionId, hash)) enqueueAfterCommit(owner, "EMBED", versionId);
        return versionId;
    }

    /** Preserve uploaded source_sha/raw_text; bind the vector to the candidate-reviewed fields. */
    @Transactional
    public UUID prepareConfirmedCv(CVVersion version, UUID owner) {
        if (version == null || version.getCv() == null || version.getId() == null)
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "CV version is missing");
        String text = ConfirmedCvInput.text(version);
        if (text.isBlank()) throw new CustomException(ErrorCode.VALIDATION_ERROR, "Confirmed CV is empty");
        String hash = Documents.shaHex(text);
        String rawSource = version.getRawTextContent() == null ? text : version.getRawTextContent();
        String rawSourceHash = Documents.shaHex(rawSource);
        UUID cvId = version.getCv().getId();
        jdbc.update("INSERT INTO documents(id,owner_id,kind,title) VALUES (?,?, 'CV',?) ON CONFLICT(id) DO NOTHING",
                cvId, owner, version.getCv().getTitle());
        List<UUID> owned = jdbc.query("SELECT id FROM documents WHERE id=? AND owner_id=? AND kind='CV'",
                (rs, n) -> rs.getObject(1, UUID.class), cvId, owner);
        if (owned.isEmpty()) throw new CustomException(ErrorCode.ACCESS_DENIED, "CV document ownership mismatch");
        jdbc.update("INSERT INTO document_versions(id,document_id,version_no,filename,source_sha,raw_text,normalized,"
                + "extraction_method,embedding_text,embedding_source_sha,pipeline_version,state) "
                + "VALUES (?,?,?,'reviewed-cv.txt',?,?,?::jsonb,'candidate_review',?,?,?,'QUEUED') "
                + "ON CONFLICT(id) DO UPDATE SET normalized=EXCLUDED.normalized,embedding_text=EXCLUDED.embedding_text,"
                + "embedding_source_sha=EXCLUDED.embedding_source_sha,embedding=NULL,embedding_model=NULL,"
                + "embedding_dimension=NULL,embedding_generated_at=NULL,state='QUEUED',pipeline_version=EXCLUDED.pipeline_version "
                + "WHERE document_versions.embedding_source_sha IS DISTINCT FROM EXCLUDED.embedding_source_sha "
                + "OR document_versions.normalized IS DISTINCT FROM EXCLUDED.normalized",
                version.getId(), cvId, version.getVersionNumber(), rawSourceHash,
                rawSource,
                version.getStructuredJsonContent(), text, hash, PIPELINE);
        if (!versionHasCurrentVector(version.getId(), hash)) enqueueAfterCommit(owner, "EMBED", version.getId());
        return version.getId();
    }

    private boolean versionHasCurrentVector(UUID id, String contentHash) {
        String activeModel = ai.activeEmbeddingModel();
        Boolean valid = jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM document_versions WHERE id=? "
                + "AND state='READY' AND embedding IS NOT NULL AND embedding_source_sha=? "
                + "AND embedding_dimension=? AND embedding_model=?)", Boolean.class,
                id, contentHash, AiClient.EMBEDDING_DIMENSION, activeModel);
        return Boolean.TRUE.equals(valid);
    }

    /** Called by the queue worker: real provider result, checked SHA/dimension/model, atomic write. */
    public void generate(UUID versionId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT embedding_text,embedding_source_sha,embedding_model,embedding_dimension,state,"
                + "embedding IS NOT NULL AS has_vector FROM document_versions WHERE id=?", versionId);
        if (rows.isEmpty()) throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "Document version missing");
        Map<String, Object> row = rows.get(0);
        String input = Objects.toString(row.get("embedding_text"), "");
        String hash = Objects.toString(row.get("embedding_source_sha"), "").strip();
        if (input.isBlank() || !Documents.shaHex(input).equals(hash))
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Embedding input checksum mismatch");
        String model = ai.activeEmbeddingModel();
        if (Boolean.TRUE.equals(row.get("has_vector")) && "READY".equals(row.get("state"))
                && model.equals(row.get("embedding_model"))
                && Objects.equals(row.get("embedding_dimension"), AiClient.EMBEDDING_DIMENSION)) return;
        // This is the only method in the normal application flow that obtains real vectors.
        String vector = ai.embed(input, model);
        AiClient.validateVector(vector);
        int changed = jdbc.update("UPDATE document_versions SET embedding=?::vector,embedding_model=?,"
                + "embedding_dimension=?,embedding_generated_at=now(),state='READY',pipeline_version=?,"
                + "error_code=NULL,error_message=NULL WHERE id=? AND embedding_source_sha=? AND embedding_text=?",
                vector, model, AiClient.EMBEDDING_DIMENSION, PIPELINE, versionId, hash, input);
        if (changed != 1) throw new CustomException(ErrorCode.CONCURRENT_MODIFICATION,
                "Embedding source changed while generating the vector");
    }

    /** Recompute existing applications after either side's real embedding becomes READY. */
    public void enqueueAffectedMatches(UUID versionId) {
        List<Map<String, Object>> apps = jdbc.queryForList(
                "SELECT DISTINCT a.id AS id,cp.user_id AS owner FROM applications a "
                + "JOIN candidate_profiles cp ON cp.id=a.candidate_id "
                + "WHERE (a.applied_cv_version_id=? OR a.applied_jd_version_id=?) AND a.status<>'WITHDRAWN'",
                versionId, versionId);
        for (Map<String, Object> app : apps) {
            queue.enqueue((UUID) app.get("owner"), "MATCH", (UUID) app.get("id"));
        }
    }

    /** Enqueue in the SAME database transaction as the source row. A rollback discards the
     * queued task as well; a committed source can never be left unqueued by an afterCommit
     * callback failure. JobQueue uses TransactionTemplate(REQUIRED), joining the caller. */
    public void enqueueMatchAfterCommit(UUID owner, UUID applicationId) {
        enqueueAfterCommit(owner, "MATCH", applicationId);
    }

    private void enqueueAfterCommit(UUID owner, String kind, UUID entity) {
        queue.enqueue(owner, kind, entity);
    }
}
