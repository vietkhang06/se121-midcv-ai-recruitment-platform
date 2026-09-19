package com.platform.recruitment.worker;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.event.Events;
import java.util.*;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class JobQueue {
  public record Actor(UUID id, String role) {}

  private final JdbcTemplate jdbc;
  private final Events events;
  private final TransactionTemplate tx;

  public JobQueue(
      JdbcTemplate jdbc,
      Events events,
      org.springframework.transaction.PlatformTransactionManager manager) {
    this.jdbc = jdbc;
    this.events = events;
    this.tx = new TransactionTemplate(manager);
  }

  public UUID enqueue(UUID owner, String kind, UUID entity) {
    return tx.execute(
        status -> {
          UUID proposed = UUID.randomUUID();
          List<UUID> ids =
              jdbc.query(
                  "INSERT INTO processing_jobs(id,owner_id,kind,entity_id,request_id)"
                      + " VALUES (?,?,?,?,?) ON CONFLICT(kind,entity_id)"
                      + " WHERE state IN ('QUEUED','RUNNING')"
                      + " DO UPDATE SET entity_id=processing_jobs.entity_id RETURNING id",
                  (rs, rowNum) -> rs.getObject("id", UUID.class),
                  proposed,
                  owner,
                  kind,
                  entity,
                  Events.requestId());
          UUID id = ids.get(0);
          if (id.equals(proposed))
            events.emit(id, owner, "INFO", "QUEUED", "JOB_QUEUED",
                "Đã xếp tác vụ vào hàng đợi.", null);
          return id;
        });
  }

  public Optional<Map<String, Object>> claim(UUID worker) {
    return tx.execute(
        status -> {
          var stale =
              jdbc.queryForList(
                  "UPDATE processing_jobs SET"
                      + " state='FAILED',step='LEASE_EXPIRED',error_code='WORKER_LEASE_EXPIRED',error_message='Worker"
                      + " không hoàn tất trong thời hạn; kiểm tra log và thử"
                      + " lại.',locked_by=NULL,lease_until=NULL,updated_at=now() WHERE state='RUNNING' AND"
                      + " lease_until<now() RETURNING id,owner_id,kind,entity_id,request_id");
          for (var s : stale) {
            String previous = MDC.get("request_id");
            try {
              MDC.put("request_id", Objects.toString(s.get("request_id"), ""));
              events.emit(
                  (UUID) s.get("id"), (UUID) s.get("owner_id"), "ERROR", "LEASE_EXPIRED",
                  "WORKER_LEASE_EXPIRED", "Tác vụ không nhận được kết quả trong thời hạn.", null);
            } finally {
              if (previous == null) MDC.remove("request_id");
              else MDC.put("request_id", previous);
            }
          }
          var candidates =
              jdbc.queryForList(
                  "SELECT * FROM processing_jobs WHERE state='QUEUED' AND available_at<=now() ORDER"
                      + " BY created_at FOR UPDATE SKIP LOCKED LIMIT 1");
          if (candidates.isEmpty()) return Optional.<Map<String, Object>>empty();
          UUID id = (UUID) candidates.get(0).get("id");
          jdbc.update(
              "UPDATE processing_jobs SET state='RUNNING',locked_by=?,lease_until=now()+interval"
                  + " '15 minutes',attempts=attempts+1,updated_at=now() WHERE id=?",
              worker, id);
          List<Map<String, Object>> running =
              jdbc.queryForList("SELECT * FROM processing_jobs WHERE id=?", id);
          return running.isEmpty() ? Optional.empty() : Optional.of(running.get(0));
        });
  }

  public void progress(UUID job, UUID worker, UUID owner, String step, int progress, String message) {
    requireUpdated(jdbc.update(
        "UPDATE processing_jobs SET step=?,progress=?,updated_at=now()"
            + " WHERE id=? AND locked_by=? AND state='RUNNING' AND lease_until>now()",
        step, progress, job, worker));
    events.emit(job, owner, "INFO", step, "STEP_STARTED", message, null);
  }

  public boolean ownsLease(UUID job, UUID worker) {
    List<Map<String, Object>> rows =
        jdbc.queryForList(
            "SELECT id FROM processing_jobs WHERE id=? AND locked_by=? AND state='RUNNING' AND"
                + " lease_until>now()",
            job,
            worker);
    return !rows.isEmpty();
  }

  public void assertLease(UUID job, UUID worker) {
    List<Map<String, Object>> rows =
        jdbc.queryForList(
            "SELECT id FROM processing_jobs WHERE id=? AND locked_by=? AND state='RUNNING' AND"
                + " lease_until>now() FOR UPDATE",
            job,
            worker);
    if (rows.isEmpty())
      throw leaseLost();
  }

  public void complete(UUID job, UUID worker) {
    requireUpdated(jdbc.update(
        "UPDATE processing_jobs SET"
            + " state='SUCCEEDED',step='DONE',progress=100,locked_by=NULL,lease_until=NULL,error_code=NULL,error_message=NULL,updated_at=now()"
            + " WHERE id=? AND locked_by=? AND state='RUNNING' AND lease_until>now()",
        job, worker));
  }

  public void fail(UUID job, UUID worker, String errorCode, String errorMessage) {
    requireUpdated(jdbc.update(
        "UPDATE processing_jobs SET"
            + " state='FAILED',step='FAILED',error_code=?,error_message=?,locked_by=NULL,lease_until=NULL,updated_at=now()"
            + " WHERE id=? AND locked_by=? AND state='RUNNING' AND lease_until>now()",
        errorCode, errorMessage, job, worker));
  }

  public void defer(UUID job, UUID worker) {
    requireUpdated(jdbc.update(
        "UPDATE processing_jobs SET"
            + " state='QUEUED',step='WAITING_DEPENDENCIES',locked_by=NULL,lease_until=NULL,available_at=now()+interval"
            + " '5 seconds',updated_at=now() WHERE id=? AND locked_by=? AND state='RUNNING'"
            + " AND lease_until>now()",
        job, worker));
  }

  private void requireUpdated(int count) {
    if (count != 1) throw leaseLost();
  }

  private CustomException leaseLost() {
    return new CustomException(ErrorCode.DUPLICATE_APPLICATION, "Tác vụ không còn giữ quyền xử lý.");
  }

  public List<Map<String, Object>> forUser(UUID user) {
    return jdbc.queryForList(
        "SELECT p.* FROM processing_jobs p WHERE owner_id=? ORDER BY created_at DESC LIMIT 100",
        user);
  }

  public Map<String, Object> authorized(UUID job, Actor a) {
    List<Map<String, Object>> rows =
        jdbc.queryForList(
            "SELECT p.* FROM processing_jobs p WHERE p.id=? AND (p.owner_id=? OR (p.kind='MATCH' AND"
                + " EXISTS(SELECT 1 FROM applications ap JOIN jobs j ON j.id=ap.job_id WHERE"
                + " ap.id=p.entity_id AND j.recruiter_id=?)))",
            job,
            a.id(),
            a.id());
    if (rows.isEmpty()) {
      throw new CustomException(
          ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy tác vụ hoặc bạn không có quyền truy cập.");
    }
    return rows.get(0);
  }

  public Map<String, Object> retry(UUID job, Actor a) {
    return tx.execute(
        status -> {
          var row = authorized(job, a);
          if (!"FAILED".equals(row.get("state")))
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Chỉ có thể thử lại tác vụ đã lỗi.");
          UUID entity = (UUID) row.get("entity_id");
          String kind = Objects.toString(row.get("kind"), "");
          UUID next = enqueue((UUID) row.get("owner_id"), kind, entity);
          Map<String, Object> res = new LinkedHashMap<>();
          res.put("jobId", next);
          res.put("state", "QUEUED");
          return res;
        });
  }
}
