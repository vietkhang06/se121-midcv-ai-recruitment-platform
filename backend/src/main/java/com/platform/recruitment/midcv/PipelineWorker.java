package com.platform.recruitment.midcv;

import com.fasterxml.jackson.databind.*;
import java.util.*;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

@Component
@ConditionalOnProperty(name = "midcv.worker-enabled", havingValue = "true")
public class PipelineWorker {
  private final UUID worker = UUID.randomUUID();
  private final Db db;
  private final JobQueue queue;
  private final Events events;
  private final Documents docs;
  private final TextReader reader;
  private final AiClient ai;
  private final GithubClient github;
  private final Scoring scoring;
  private final TransactionTemplate tx;

  public PipelineWorker(
      @Qualifier("midcvDb") Db db,
      JobQueue queue,
      Events events,
      Documents docs,
      TextReader reader,
      AiClient ai,
      GithubClient github,
      Scoring scoring,
      org.springframework.transaction.PlatformTransactionManager manager) {
    this.db = db;
    this.queue = queue;
    this.events = events;
    this.docs = docs;
    this.reader = reader;
    this.ai = ai;
    this.github = github;
    this.scoring = scoring;
    this.tx = new TransactionTemplate(manager);
  }

  @Scheduled(fixedDelay = 1500)
  public void tick() {
    Optional<Map<String, Object>> claimed;
    try {
      claimed = queue.claim(worker);
    } catch (Exception e) {
      events.failure(e, "QUEUE_UNAVAILABLE");
      return;
    }
    if (claimed.isEmpty()) return;
    var job = claimed.get();
    UUID id = db.id(job.get("id")),
        owner = db.id(job.get("owner_id")),
        entity = db.id(job.get("entity_id"));
    String kind = db.text(job, "kind");
    MDC.put("request_id", db.text(job, "request_id"));
    MDC.put("job_id", id.toString());
    long start = System.nanoTime();
    try {
      if (kind.equals("EXTRACT")) extract(id, owner, entity);
      else if (!match(id, owner, entity, kind.equals("SCREEN_MATCH"))) return;
      events.emit(
          id,
          owner,
          "INFO",
          "DONE",
          "JOB_SUCCEEDED",
          "Tác vụ đã hoàn tất.",
          (System.nanoTime() - start) / 1_000_000);
    } catch (Exception e) {
      ApiFailure f =
          e instanceof ApiFailure a
              ? a
              : new ApiFailure(
                  500, "PIPELINE_FAILED", "Pipeline lỗi; xem log theo mã job/request để kiểm tra.");
      events.failure(e, f.code);
      if (!f.code.equals("JOB_LEASE_LOST")) {
        try {
          tx.executeWithoutResult(status -> {
            queue.assertLease(id, worker);
            if (kind.equals("EXTRACT"))
              db.update(
                  "UPDATE document_versions SET state='FAILED',error_code=?,error_message=? WHERE id=?",
                  f.code, f.getMessage(), entity);
            queue.fail(id, worker, f);
          });
        } catch (Exception finalizationError) {
          events.failure(finalizationError, "JOB_FINALIZATION_FAILED");
        }
      }
      events.emit(
          id,
          owner,
          "ERROR",
          "FAILED",
          f.code,
          f.getMessage(),
          (System.nanoTime() - start) / 1_000_000);
    } finally {
      MDC.clear();
    }
  }

  private void extract(UUID job, UUID owner, UUID version) {
    var v =
        db.one(
            "SELECT v.*,d.kind,d.owner_id FROM document_versions v JOIN documents d ON"
                + " d.id=v.document_id WHERE v.id=?",
            version);
    if ("READY".equals(v.get("state"))) {
      events.emit(
          job,
          owner,
          "INFO",
          "CACHE",
          "VERSION_READY",
          "Phiên bản đã có kết quả hợp lệ; sử dụng lại.",
          null);
      queue.complete(job, worker);
      return;
    }
    tx.executeWithoutResult(status -> {
      queue.assertLease(job, worker);
      db.update(
          "UPDATE document_versions SET state='PROCESSING',error_code=NULL,error_message=NULL WHERE id=?",
          version);
    });
    queue.progress(job, worker, owner, "READ_DOCUMENT", 10, "Đang đọc nội dung tài liệu.");
    String raw = db.text(v, "raw_text"), method = db.text(v, "extraction_method");
    if (raw.isBlank()) {
      var extracted = reader.read(docs.path(db.text(v, "storage_key")));
      raw = extracted.text();
      method = extracted.method();
      final String extractedText = raw, extractedMethod = method;
      tx.executeWithoutResult(status -> {
        queue.assertLease(job, worker);
        db.update(
            "UPDATE document_versions SET raw_text=?,extraction_method=? WHERE id=?",
            extractedText, extractedMethod, version);
      });
    }
    String activeLlm = ai.activeLlmModel();
    if (activeLlm == null) activeLlm = (ai.llmModel != null ? ai.llmModel : "dna5rm/granite4.2:3b-8k");
    String activeEmbed = ai.activeEmbeddingModel();
    if (activeEmbed == null) activeEmbed = (ai.embeddingModel != null ? ai.embeddingModel : "bge-m3");

    String cache =
        AiClient.buildCacheKey(
            owner,
            db.text(v, "kind"),
            raw,
            activeLlm,
            activeEmbed,
            AiClient.PIPELINE_VERSION,
            TaxonomyService.TAXONOMY_VERSION,
            AiClient.EMBEDDING_TEXT_VERSION);
    var cached =
        db.optional(
            "SELECT normalized,embedding::text AS embedding_text FROM extraction_cache WHERE"
                + " cache_key=? AND owner_id=?",
            cache,
            owner);
    JsonNode normalized;
    String vector;
    if (cached.isPresent()) {
      normalized = db.tree(cached.get().get("normalized"));
      vector = db.text(cached.get(), "embedding_text");
      events.emit(
          job,
          owner,
          "INFO",
          "CACHE",
          "EXTRACTION_CACHE_HIT",
          "Sử dụng kết quả theo hash nội dung, chủ sở hữu, model và schema.",
          null);
    } else {
      queue.progress(job, worker, owner, "LLM_EXTRACTION", 30, "LLM đang bóc tách và chuẩn hóa nội dung.");
      normalized = ai.extract(db.text(v, "kind"), raw);
      queue.progress(job, worker, owner,
          "EVIDENCE_VALIDATED",
          60,
          "Schema và trích dẫn đã được kiểm tra với văn bản gốc.");
      queue.progress(job, worker, owner, "EMBEDDING", 75, "Đang tạo embedding nội dung nghề nghiệp.");
      vector = ai.embed(ai.semanticText(normalized), activeEmbed);
    }
    final JsonNode n = normalized;
    final String vec = vector;
    final String finalLlm = activeLlm;
    final String finalEmbed = activeEmbed;
    tx.executeWithoutResult(
        status -> {
          queue.assertLease(job, worker);
          db.update(
              "UPDATE document_versions SET"
                  + " normalized=?::jsonb,embedding=?::vector,llm_model=?,embedding_model=?,pipeline_version=?,state='READY',error_code=NULL,error_message=NULL"
                  + " WHERE id=?",
              n.toString(),
              vec,
              finalLlm,
              finalEmbed,
              AiClient.PIPELINE,
              version);
          db.update(
              "INSERT INTO extraction_cache(cache_key,owner_id,normalized,embedding) VALUES"
                  + " (?,?,?::jsonb,?::vector) ON CONFLICT(cache_key) DO NOTHING",
              cache,
              owner,
              n.toString(),
              vec);
          queue.complete(job, worker);
        });
  }

  private boolean match(UUID job, UUID owner, UUID appId, boolean screening) {
    var ap =
        db.one(
            screening
                ? "SELECT a.*,a.industry_snapshot AS industry,a.github_enabled_snapshot AS"
                      + " github_enabled,NULL AS github_username FROM screening_runs a WHERE a.id=?"
                : "SELECT a.*,j.industry AS industry,true AS github_enabled,NULL AS github_username"
                      + " FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=?",
            appId);
    if ("WITHDRAWN".equals(ap.get("status"))) {
      events.emit(
          job,
          owner,
          "INFO",
          "APPLICATION",
          "APPLICATION_WITHDRAWN",
          "Ứng viên đã rút đơn; không tạo điểm mới.",
          null);
      queue.complete(job, worker);
      return true;
    }
    UUID cvId = db.id(ap.get("cv_version_id")), jdId = db.id(ap.get("jd_version_id"));
    var cv = db.one("SELECT * FROM document_versions WHERE id=?", cvId);
    var jd = db.one("SELECT * FROM document_versions WHERE id=?", jdId);
    for (var doc : List.of(cv, jd)) {
      if ("FAILED".equals(doc.get("state")))
        throw new ApiFailure(
            424,
            "DOCUMENT_PROCESSING_FAILED",
            "CV hoặc JD xử lý thất bại ("
                + db.text(doc, "error_code")
                + "). Thử lại tác vụ trích xuất trước, sau đó chạy lại đối sánh.");
      if (!"READY".equals(doc.get("state"))) {
        queue.defer(job, worker);
        return false;
      }
    }
    if (cv.get("embedding") == null || jd.get("embedding") == null) {
      String missing =
          (cv.get("embedding") == null && jd.get("embedding") == null)
              ? "CV và JD"
              : cv.get("embedding") == null ? "CV" : "JD";
      throw new ApiFailure(
          422,
          "EMBEDDING_MISSING",
          missing + " chưa có vector embedding. Vui lòng trích xuất lại tài liệu.");
    }
    if (!Objects.equals(cv.get("embedding_model"), jd.get("embedding_model")))
      throw new ApiFailure(
          409,
          "EMBEDDING_MODEL_MISMATCH",
          "CV/JD sử dụng hai model embedding khác nhau. Tạo phiên bản mới với cùng model.");
    queue.progress(job, worker, owner, "PGVECTOR_MATCH", 35, "Đang đối sánh ngữ nghĩa bằng PostgreSQL/Pgvector.");
    var scoreRow =
        db.one(
            "SELECT greatest(0,least(100,(1-(cv.embedding <=> jd.embedding))*100)) AS score"
                + " FROM document_versions cv CROSS JOIN document_versions jd"
                + " WHERE cv.id=? AND jd.id=?",
            cvId,
            jdId);
    Object scoreVal = scoreRow.get("score");
    if (scoreVal == null) {
      throw new ApiFailure(
          500,
          "EMBEDDING_SIMILARITY_FAILED",
          "Không thể tính toán khoảng cách vector ngữ nghĩa (kết quả NULL).");
    }
    double semantic = ((Number) scoreVal).doubleValue();
    JsonNode cvData = db.tree(cv.get("normalized")), jdData = db.tree(jd.get("normalized"));
    JsonNode git = db.tree(Map.of("status", "NOT_APPLICABLE"));
    if (Boolean.TRUE.equals(ap.get("github_enabled")) && ("IT".equalsIgnoreCase(db.text(ap, "industry")) || db.text(ap, "industry").toUpperCase().contains("TECH") || db.text(ap, "industry").toUpperCase().contains("SOFTWARE"))) {
      String handle = cvData.path("githubUsername").asText("");
      String handleSource = "CV";
      if (handle.isBlank()) {
        handle = db.text(ap, "github_username");
        handleSource = "PROFILE";
      }
      if (handle.isBlank()) git = db.tree(Map.of("status", "NOT_PROVIDED"));
      else {
        queue.progress(job, worker, owner, "GITHUB", 55, "Đang lấy dữ liệu GitHub công khai bổ trợ.");
        try {
          git = github.fetch(handle);
          ((com.fasterxml.jackson.databind.node.ObjectNode) git)
              .put("username_source", handleSource);
          if (!git.path("activity_error").isNull() || git.path("language_partial").asBoolean())
            events.emit(
                job,
                owner,
                "WARN",
                "GITHUB",
                "GITHUB_PARTIAL",
                "Một phần hoạt động/ngôn ngữ repo chưa lấy được; nguồn thiếu được đánh dấu trong"
                    + " kết quả.",
                null);
        } catch (ApiFailure e) {
          git =
              db.tree(
                  Db.map(
                      "status",
                      "UNAVAILABLE",
                      "code",
                      e.code,
                      "message",
                      e.getMessage(),
                      "username",
                      handle));
          events.emit(job, owner, "WARN", "GITHUB", e.code, e.getMessage(), null);
        }
      }
    }
    queue.progress(job, worker, owner, "SCORING", 85, "Đang tổng hợp điểm thành phần và minh chứng.");
    Scoring.Result result = scoring.calculate(cvData, jdData, semantic, git);
    final JsonNode snapshot = git;
    tx.executeWithoutResult(
        status -> {
          queue.assertLease(job, worker);
          db.update(
              "INSERT INTO midcv_match_results(id,"
                  + (screening ? "screening_id" : "application_id")
                  + ",processing_job_id,base_score,github_bonus,score,coverage,semantic_score,details,github,algorithm_version,cv_version_id,jd_version_id)"
                  + " VALUES (?,?,?,?,?,?,?,?,?::jsonb,?::jsonb,?,?,?) ON"
                  + " CONFLICT(processing_job_id) DO NOTHING",
              UUID.randomUUID(),
              appId,
              job,
              result.baseScore(),
              result.githubBonus(),
              result.score(),
              result.coverage(),
              Math.round(semantic * 100) / 100.0,
              db.json(result.details()),
              snapshot.toString(),
              Scoring.VERSION,
              cvId,
              jdId);
          queue.complete(job, worker);
        });
    return true;
  }
}
