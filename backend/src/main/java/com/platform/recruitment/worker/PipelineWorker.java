package com.platform.recruitment.worker;

import com.platform.recruitment.ai.AiClient;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.cv.TextReader;
import com.platform.recruitment.document.Documents;
import com.platform.recruitment.event.Events;
import com.platform.recruitment.github.GithubClient;
import com.platform.recruitment.matching.Scoring;
import com.platform.recruitment.taxonomy.TaxonomyService;
import com.fasterxml.jackson.databind.*;
import java.util.*;
import org.slf4j.MDC;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

@Component
@ConditionalOnProperty(name = {"app.worker-enabled", "midcv.worker-enabled"}, havingValue = "true", matchIfMissing = true)
public class PipelineWorker {
  private final UUID worker = UUID.randomUUID();
  private final JdbcTemplate jdbc;
  private final ObjectMapper mapper;
  private final JobQueue queue;
  private final Events events;
  private final Documents docs;
  private final TextReader reader;
  private final AiClient ai;
  private final GithubClient github;
  private final Scoring scoring;
  private final TransactionTemplate tx;

  public PipelineWorker(
      JdbcTemplate jdbc,
      ObjectMapper mapper,
      JobQueue queue,
      Events events,
      Documents docs,
      TextReader reader,
      AiClient ai,
      GithubClient github,
      Scoring scoring,
      org.springframework.transaction.PlatformTransactionManager manager) {
    this.jdbc = jdbc;
    this.mapper = mapper != null ? mapper : new ObjectMapper();
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
    UUID id = (UUID) job.get("id"),
        owner = (UUID) job.get("owner_id"),
        entity = (UUID) job.get("entity_id");
    String kind = Objects.toString(job.get("kind"), "");
    MDC.put("request_id", Objects.toString(job.get("request_id"), ""));
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
      String code = "PIPELINE_FAILED";
      String msg = "Pipeline lỗi; xem log theo mã job/request để kiểm tra.";
      if (e instanceof CustomException ce) {
        code = ce.getErrorCode().name();
        msg = ce.getMessage();
      }
      events.failure(e, code);
      if (!"JOB_LEASE_LOST".equals(code)) {
        final String fCode = code;
        final String fMsg = msg;
        try {
          tx.executeWithoutResult(status -> {
            queue.assertLease(id, worker);
            if (kind.equals("EXTRACT"))
              jdbc.update(
                  "UPDATE document_versions SET state='FAILED',error_code=?,error_message=? WHERE id=?",
                  fCode, fMsg, entity);
            queue.fail(id, worker, fCode, fMsg);
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
          code,
          msg,
          (System.nanoTime() - start) / 1_000_000);
    } finally {
      MDC.clear();
    }
  }

  private JsonNode toTree(Object o) {
    if (o == null) return mapper.createObjectNode();
    if (o instanceof JsonNode j) return j;
    try {
      return mapper.readTree(o.toString());
    } catch (Exception e) {
      return mapper.valueToTree(o);
    }
  }

  private void extract(UUID job, UUID owner, UUID version) {
    List<Map<String, Object>> vRows =
        jdbc.queryForList(
            "SELECT v.*,d.kind,d.owner_id FROM document_versions v JOIN documents d ON"
                + " d.id=v.document_id WHERE v.id=?",
            version);
    if (vRows.isEmpty()) {
      throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "Phiên bản tài liệu không tồn tại.");
    }
    var v = vRows.get(0);
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
      jdbc.update(
          "UPDATE document_versions SET state='PROCESSING',error_code=NULL,error_message=NULL WHERE id=?",
          version);
    });
    queue.progress(job, worker, owner, "READ_DOCUMENT", 10, "Đang đọc nội dung tài liệu.");
    String raw = Objects.toString(v.get("raw_text"), ""), method = Objects.toString(v.get("extraction_method"), "");
    if (raw.isBlank()) {
      var extracted = reader.read(docs.path(Objects.toString(v.get("storage_key"), "")));
      raw = extracted.text();
      method = extracted.method();
      final String extractedText = raw, extractedMethod = method;
      tx.executeWithoutResult(status -> {
        queue.assertLease(job, worker);
        jdbc.update(
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
            Objects.toString(v.get("kind"), ""),
            raw,
            activeLlm,
            activeEmbed,
            AiClient.PIPELINE_VERSION,
            TaxonomyService.TAXONOMY_VERSION,
            AiClient.EMBEDDING_TEXT_VERSION);
    List<Map<String, Object>> cached =
        jdbc.queryForList(
            "SELECT normalized::text, embedding::text AS embedding_text FROM extraction_cache WHERE"
                + " cache_key=? AND owner_id=?",
            cache,
            owner);
    JsonNode normalized;
    String vector;
    if (!cached.isEmpty()) {
      normalized = toTree(cached.get(0).get("normalized"));
      vector = Objects.toString(cached.get(0).get("embedding_text"), "");
      ai.validate(normalized, raw, Objects.toString(v.get("kind"), ""));
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
      normalized = ai.extract(Objects.toString(v.get("kind"), ""), raw);
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
          jdbc.update(
              "UPDATE document_versions SET"
                  + " normalized=?::jsonb,embedding=?::vector,llm_model=?,embedding_model=?,pipeline_version=?,state='READY',error_code=NULL,error_message=NULL"
                  + " WHERE id=?",
              n.toString(),
              vec,
              finalLlm,
              finalEmbed,
              AiClient.PIPELINE,
              version);
          jdbc.update(
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
    List<Map<String, Object>> apRows =
        jdbc.queryForList(
            screening
                ? "SELECT a.*,a.industry_snapshot AS industry,a.github_enabled_snapshot AS"
                      + " github_enabled,NULL AS github_username FROM screening_runs a WHERE a.id=?"
                : "SELECT a.*,j.industry AS industry,true AS github_enabled,NULL AS github_username"
                      + " FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=?",
            appId);
    if (apRows.isEmpty()) {
      throw new CustomException(
          ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy hồ sơ hoặc phiên screening.");
    }
    var ap = apRows.get(0);
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
    UUID cvId = (UUID) ap.get("cv_version_id"), jdId = (UUID) ap.get("jd_version_id");
    List<Map<String, Object>> cvRows = jdbc.queryForList("SELECT * FROM document_versions WHERE id=?", cvId);
    List<Map<String, Object>> jdRows = jdbc.queryForList("SELECT * FROM document_versions WHERE id=?", jdId);
    if (cvRows.isEmpty() || jdRows.isEmpty()) {
      throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy phiên bản CV hoặc JD.");
    }
    var cv = cvRows.get(0);
    var jd = jdRows.get(0);
    for (var doc : List.of(cv, jd)) {
      if ("FAILED".equals(doc.get("state")))
        throw new CustomException(
            ErrorCode.INTERNAL_SERVER_ERROR,
            "CV hoặc JD xử lý thất bại ("
                + Objects.toString(doc.get("error_code"), "")
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
      throw new CustomException(
          ErrorCode.VALIDATION_ERROR,
          missing + " chưa có vector embedding. Vui lòng trích xuất lại tài liệu.");
    }
    if (!Objects.equals(cv.get("embedding_model"), jd.get("embedding_model")))
      throw new CustomException(
          ErrorCode.VALIDATION_ERROR,
          "CV/JD sử dụng hai model embedding khác nhau. Tạo phiên bản mới với cùng model.");
    queue.progress(job, worker, owner, "PGVECTOR_MATCH", 35, "Đang đối sánh ngữ nghĩa bằng PostgreSQL/Pgvector.");
    List<Map<String, Object>> scoreRows =
        jdbc.queryForList(
            "SELECT greatest(0,least(100,(1-(cv.embedding <=> jd.embedding))*100)) AS score"
                + " FROM document_versions cv CROSS JOIN document_versions jd"
                + " WHERE cv.id=? AND jd.id=?",
            cvId,
            jdId);
    if (scoreRows.isEmpty() || scoreRows.get(0).get("score") == null) {
      throw new CustomException(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "Không thể tính toán khoảng cách vector ngữ nghĩa (kết quả NULL).");
    }
    double semantic = ((Number) scoreRows.get(0).get("score")).doubleValue();
    JsonNode cvData = toTree(cv.get("normalized")), jdData = toTree(jd.get("normalized"));
    JsonNode git = mapper.valueToTree(Map.of("status", "NOT_APPLICABLE"));
    String industry = Objects.toString(ap.get("industry"), "");
    if (Boolean.TRUE.equals(ap.get("github_enabled")) && ("IT".equalsIgnoreCase(industry) || industry.toUpperCase().contains("TECH") || industry.toUpperCase().contains("SOFTWARE"))) {
      String handle = cvData.path("githubUsername").asText("");
      String handleSource = "CV";
      if (handle.isBlank()) {
        handle = Objects.toString(ap.get("github_username"), "");
        handleSource = "PROFILE";
      }
      if (handle.isBlank()) git = mapper.valueToTree(Map.of("status", "NOT_PROVIDED"));
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
        } catch (CustomException e) {
          Map<String, Object> unavail = new LinkedHashMap<>();
          unavail.put("status", "UNAVAILABLE");
          unavail.put("code", e.getErrorCode().name());
          unavail.put("message", e.getMessage());
          unavail.put("username", handle);
          git = mapper.valueToTree(unavail);
          events.emit(job, owner, "WARN", "GITHUB", e.getErrorCode().name(), e.getMessage(), null);
        }
      }
    }
    queue.progress(job, worker, owner, "SCORING", 85, "Đang tổng hợp điểm thành phần và minh chứng.");
    Scoring.Result result = scoring.calculate(cvData, jdData, semantic, git);
    final JsonNode snapshot = git;
    tx.executeWithoutResult(
        status -> {
          queue.assertLease(job, worker);
          String detailsJson;
          try {
            detailsJson = mapper.writeValueAsString(result.details());
          } catch (Exception ex) {
            detailsJson = "{}";
          }
          jdbc.update(
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
              detailsJson,
              snapshot.toString(),
              Scoring.VERSION,
              cvId,
              jdId);
          queue.complete(job, worker);
        });
    return true;
  }
}
