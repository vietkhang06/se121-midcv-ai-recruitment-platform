package com.platform.recruitment.screening;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.document.Documents;
import com.platform.recruitment.event.Events;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import com.platform.recruitment.worker.JobQueue;
import java.time.OffsetDateTime;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/hr")
public class ScreeningController {
  private final JdbcTemplate jdbc;
  private final ObjectMapper mapper;
  private final Documents docs;
  private final JobQueue queue;
  private final Events events;

  public ScreeningController(
      JdbcTemplate jdbc,
      ObjectMapper mapper,
      Documents docs,
      JobQueue queue,
      Events events) {
    this.jdbc = jdbc;
    this.mapper = mapper;
    this.docs = docs;
    this.queue = queue;
    this.events = events;
  }

  private User requireRole(Role expectedRole) {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof User user)) {
      throw new CustomException(ErrorCode.AUTHENTICATION_FAILED, "Vui lòng đăng nhập để tiếp tục.");
    }
    if (user.getRole() != expectedRole && user.getRole() != Role.ADMIN) {
      throw new CustomException(ErrorCode.ACCESS_DENIED, "Vai trò tài khoản không được phép thực hiện thao tác này.");
    }
    return user;
  }

  @PostMapping("/jobs/{id}/screenings")
  @Transactional(rollbackFor = Exception.class)
  public Map<String, Object> upload(
      @PathVariable UUID id,
      @RequestParam("file") MultipartFile file,
      @RequestParam(value = "githubEnabled", required = false, defaultValue = "true") boolean githubEnabled)
      throws Exception {
    User a = requireRole(Role.HR);
    var j =
        queryOne(
            "SELECT j.* FROM jobs j LEFT JOIN recruiter_profiles rp ON rp.company_id = j.company_id"
                + " WHERE j.id=? AND (rp.user_id=? OR EXISTS(SELECT 1 FROM users u WHERE u.id=? AND u.role='ADMIN')) FOR SHARE",
            id,
            a.getId(),
            a.getId());

    String title = Optional.ofNullable(file.getOriginalFilename()).orElse("CV tải lên");
    if (title.length() > 200) title = title.substring(title.length() - 200);
    var cv = docs.upload(a.getId(), "CV", title, file, null);

    UUID jdVersionId;
    var existingJd =
        queryOptional(
            "SELECT jd_version_id FROM screening_runs WHERE job_id=? ORDER BY created_at DESC LIMIT 1",
            id);
    if (existingJd.isPresent()) {
      jdVersionId = parseUuid(existingJd.get().get("jd_version_id"));
    } else {
      String jobTitle = text(j, "title");
      String jobDesc = text(j, "description");
      if (jobDesc.isBlank()) {
        jobDesc = jobTitle;
      }
      var jdDoc = docs.text(a.getId(), "JD", "JD - " + jobTitle, jobDesc, null);
      jdVersionId = jdDoc.versionId();
    }

    UUID run = UUID.randomUUID();
    String industry = text(j, "industry");
    jdbc.update(
        "INSERT INTO"
            + " screening_runs(id,owner_id,job_id,cv_version_id,jd_version_id,industry_snapshot,github_enabled_snapshot)"
            + " VALUES (?,?,?,?,?,?,?)",
        run,
        a.getId(),
        id,
        cv.versionId(),
        jdVersionId,
        industry,
        githubEnabled);

    UUID task = queue.enqueue(a.getId(), "SCREEN_MATCH", run);
    events.emit(
        task,
        a.getId(),
        "INFO",
        "SCREENING",
        "SCREENING_CREATED",
        "Đã tạo lượt đối chiếu nhanh; không tạo tài khoản hoặc đơn ứng tuyển thay ứng viên.",
        null);
    return map("id", run, "jobId", task, "document", cv);
  }

  @GetMapping("/jobs/{id}/screenings")
  public List<Map<String, Object>> list(
      @PathVariable UUID id,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    if (page < 0 || page > 1000 || size < 1 || size > 100)
      throw new CustomException(ErrorCode.VALIDATION_ERROR, "Tham số phân trang không hợp lệ.");
    User a = requireRole(Role.HR);
    queryOne(
        "SELECT j.id FROM jobs j LEFT JOIN recruiter_profiles rp ON rp.company_id = j.company_id"
            + " WHERE j.id=? AND (rp.user_id=? OR EXISTS(SELECT 1 FROM users u WHERE u.id=? AND u.role='ADMIN'))",
        id,
        a.getId(),
        a.getId());
    return queryRows(
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
    User a = requireRole(Role.HR);
    var run = queryOne("SELECT * FROM screening_runs WHERE id=? AND (owner_id=? OR EXISTS(SELECT 1 FROM users u WHERE u.id=? AND u.role='ADMIN'))", id, a.getId(), a.getId());
    return map(
        "screening",
        run,
        "cv",
        cleanDoc(docs.accessibleVersion(parseUuid(run.get("cv_version_id")), new JobQueue.Actor(a.getId(), a.getRole().name()))),
        "jd",
        cleanDoc(docs.accessibleVersion(parseUuid(run.get("jd_version_id")), new JobQueue.Actor(a.getId(), a.getRole().name()))),
        "result",
        queryOptional(
                "SELECT * FROM midcv_match_results WHERE screening_id=? ORDER BY created_at DESC LIMIT 1",
                id)
            .orElse(null),
        "jobs",
        queryRows(
            "SELECT * FROM processing_jobs WHERE kind='SCREEN_MATCH' AND entity_id=? ORDER BY"
                + " created_at DESC",
            id));
  }

  @PostMapping("/screenings/{id}/match")
  public Map<String, Object> rematch(@PathVariable UUID id) {
    User a = requireRole(Role.HR);
    queryOne("SELECT id FROM screening_runs WHERE id=? AND (owner_id=? OR EXISTS(SELECT 1 FROM users u WHERE u.id=? AND u.role='ADMIN'))", id, a.getId(), a.getId());
    return map("jobId", queue.enqueue(a.getId(), "SCREEN_MATCH", id));
  }

  private List<Map<String, Object>> queryRows(String sql, Object... args) {
    return jdbc.queryForList(sql, args).stream()
        .map(
            row -> {
              Map<String, Object> m = new LinkedHashMap<>();
              row.forEach((k, v) -> m.put(k, cleanValue(v)));
              return m;
            })
        .toList();
  }

  private Object cleanValue(Object v) {
    if (v == null) return null;
    if (v instanceof UUID) return v.toString();
    if (v instanceof java.sql.Timestamp t) return t.toInstant().toString();
    if (v instanceof OffsetDateTime t) return t.toInstant().toString();
    if (v.getClass().getName().equals("org.postgresql.util.PGobject")) {
      try {
        return mapper.readTree(v.toString());
      } catch (Exception e) {
        return v.toString();
      }
    }
    return v;
  }

  private Map<String, Object> queryOne(String sql, Object... args) {
    return queryRows(sql, args).stream()
        .findFirst()
        .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "Bản ghi không tồn tại hoặc bạn không có quyền truy cập."));
  }

  private Optional<Map<String, Object>> queryOptional(String sql, Object... args) {
    return queryRows(sql, args).stream().findFirst();
  }

  private UUID parseUuid(Object v) {
    try {
      return UUID.fromString(String.valueOf(v));
    } catch (Exception e) {
      throw new CustomException(ErrorCode.VALIDATION_ERROR, "Mã dữ liệu không hợp lệ.");
    }
  }

  private String text(Map<String, Object> m, String k) {
    return Objects.toString(m.get(k), "");
  }

  private static Map<String, Object> map(Object... pairs) {
    Map<String, Object> m = new LinkedHashMap<>();
    for (int i = 0; i < pairs.length; i += 2) m.put((String) pairs[i], pairs[i + 1]);
    return m;
  }

  private Map<String, Object> cleanDoc(Map<String, Object> m) {
    Map<String, Object> copy = new HashMap<>(m);
    copy.remove("storage_key");
    return copy;
  }
}
