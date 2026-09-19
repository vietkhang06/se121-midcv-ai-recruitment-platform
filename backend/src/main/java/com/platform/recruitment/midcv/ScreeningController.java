package com.platform.recruitment.midcv;

import com.platform.recruitment.document.Documents;
import com.platform.recruitment.event.Events;
import com.platform.recruitment.worker.JobQueue;
import java.util.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/hr")
public class ScreeningController {
  private final Db db;
  private final Documents docs;
  private final JobQueue queue;
  private final Events events;

  public ScreeningController(
      @Qualifier("midcvDb") Db db,
      Documents docs,
      JobQueue queue,
      Events events) {
    this.db = db;
    this.docs = docs;
    this.queue = queue;
    this.events = events;
  }

  @PostMapping("/jobs/{id}/screenings")
  @Transactional(rollbackFor = Exception.class)
  public Map<String, Object> upload(
      @PathVariable UUID id,
      @RequestParam("file") MultipartFile file,
      @RequestParam(value = "githubEnabled", required = false, defaultValue = "true") boolean githubEnabled)
      throws Exception {
    var a = AuthService.requireRole("HR");
    var j =
        db.one(
            "SELECT j.* FROM jobs j LEFT JOIN recruiter_profiles rp ON rp.company_id = j.company_id"
                + " WHERE j.id=? AND (rp.user_id=? OR EXISTS(SELECT 1 FROM users u WHERE u.id=? AND u.role='ADMIN')) FOR SHARE",
            id,
            a.id(),
            a.id());

    String title = Optional.ofNullable(file.getOriginalFilename()).orElse("CV tải lên");
    if (title.length() > 200) title = title.substring(title.length() - 200);
    var cv = docs.upload(a.id(), "CV", title, file, null);

    UUID jdVersionId;
    var existingJd =
        db.optional(
            "SELECT jd_version_id FROM screening_runs WHERE job_id=? ORDER BY created_at DESC LIMIT 1",
            id);
    if (existingJd.isPresent()) {
      jdVersionId = db.id(existingJd.get().get("jd_version_id"));
    } else {
      String jobTitle = db.text(j, "title");
      String jobDesc = db.text(j, "description");
      if (jobDesc.isBlank()) {
        jobDesc = jobTitle;
      }
      var jdDoc = docs.text(a.id(), "JD", "JD - " + jobTitle, jobDesc, null);
      jdVersionId = jdDoc.versionId();
    }

    UUID run = UUID.randomUUID();
    String industry = db.text(j, "industry");
    db.update(
        "INSERT INTO"
            + " screening_runs(id,owner_id,job_id,cv_version_id,jd_version_id,industry_snapshot,github_enabled_snapshot)"
            + " VALUES (?,?,?,?,?,?,?)",
        run,
        a.id(),
        id,
        cv.versionId(),
        jdVersionId,
        industry,
        githubEnabled);

    UUID task = queue.enqueue(a.id(), "SCREEN_MATCH", run);
    events.emit(
        task,
        a.id(),
        "INFO",
        "SCREENING",
        "SCREENING_CREATED",
        "Đã tạo lượt đối chiếu nhanh; không tạo tài khoản hoặc đơn ứng tuyển thay ứng viên.",
        null);
    return Db.map("id", run, "jobId", task, "document", cv);
  }

  @GetMapping("/jobs/{id}/screenings")
  public List<Map<String, Object>> list(
      @PathVariable UUID id,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    if (page < 0 || page > 1000 || size < 1 || size > 100)
      throw ApiFailure.bad("INVALID_PAGE", "Tham số phân trang không hợp lệ.");
    var a = AuthService.requireRole("HR");
    db.one(
        "SELECT j.id FROM jobs j LEFT JOIN recruiter_profiles rp ON rp.company_id = j.company_id"
            + " WHERE j.id=? AND (rp.user_id=? OR EXISTS(SELECT 1 FROM users u WHERE u.id=? AND u.role='ADMIN'))",
        id,
        a.id(),
        a.id());
    return db.rows(
        "SELECT s.*,d.title,v.filename,v.state AS cv_state,r.score,r.coverage,p.state AS"
            + " processing_state,p.error_code FROM screening_runs s JOIN document_versions v ON"
            + " v.id=s.cv_version_id JOIN documents d ON d.id=v.document_id LEFT JOIN"
            + " LATERAL(SELECT * FROM midcv_match_results WHERE screening_id=s.id ORDER BY created_at"
            + " DESC LIMIT 1)r ON true LEFT JOIN LATERAL(SELECT * FROM processing_jobs WHERE"
            + " kind='SCREEN_MATCH' AND entity_id=s.id ORDER BY created_at DESC LIMIT 1)p ON true"
            + " WHERE s.job_id=? ORDER BY r.score DESC NULLS LAST,s.created_at ASC,s.id ASC LIMIT ? OFFSET ?",
        id,
        size,
        page * size);
  }

  @GetMapping("/screenings/{id}")
  public Map<String, Object> detail(@PathVariable UUID id) {
    var a = AuthService.requireRole("HR");
    var run = db.one("SELECT * FROM screening_runs WHERE id=? AND owner_id=?", id, a.id());
    return Db.map(
        "screening",
        run,
        "cv",
        clean(docs.accessibleVersion(db.id(run.get("cv_version_id")), new JobQueue.Actor(a.id(), a.role()))),
        "jd",
        clean(docs.accessibleVersion(db.id(run.get("jd_version_id")), new JobQueue.Actor(a.id(), a.role()))),
        "result",
        db.optional(
                "SELECT * FROM midcv_match_results WHERE screening_id=? ORDER BY created_at DESC LIMIT 1",
                id)
            .orElse(null),
        "jobs",
        db.rows(
            "SELECT * FROM processing_jobs WHERE kind='SCREEN_MATCH' AND entity_id=? ORDER BY"
                + " created_at DESC",
            id));
  }

  @PostMapping("/screenings/{id}/match")
  public Map<String, Object> rematch(@PathVariable UUID id) {
    var a = AuthService.requireRole("HR");
    db.one("SELECT id FROM screening_runs WHERE id=? AND owner_id=?", id, a.id());
    return Db.map("jobId", queue.enqueue(a.id(), "SCREEN_MATCH", id));
  }

  private Map<String, Object> clean(Map<String, Object> m) {
    Map<String, Object> copy = new HashMap<>(m);
    copy.remove("storage_key");
    return copy;
  }
}
