package com.platform.recruitment.midcv;

import java.util.*;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class JobQueue {
  public record Actor(UUID id, String role) {}

  private final Db db;
  private final Events events;
  private final TransactionTemplate tx;

  public JobQueue(
      @Qualifier("midcvDb") Db db,
      Events events,
      org.springframework.transaction.PlatformTransactionManager manager) {
    this.db = db;
    this.events = events;
    this.tx = new TransactionTemplate(manager);
  }

  public UUID enqueue(UUID owner, String kind, UUID entity) {
    return tx.execute(
        status -> {
          UUID proposed = UUID.randomUUID();
          UUID id = db.id(
              db.one(
                  "INSERT INTO processing_jobs(id,owner_id,kind,entity_id,request_id)"
                      + " VALUES (?,?,?,?,?) ON CONFLICT(kind,entity_id)"
                      + " WHERE state IN ('QUEUED','RUNNING')"
                      + " DO UPDATE SET entity_id=processing_jobs.entity_id RETURNING id",
                  proposed, owner, kind, entity, Events.requestId()).get("id"));
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
              db.rows(
                  "UPDATE processing_jobs SET"
                      + " state='FAILED',step='LEASE_EXPIRED',error_code='WORKER_LEASE_EXPIRED',error_message='Worker"
                      + " không hoàn tất trong thời hạn; kiểm tra log và thử"
                      + " lại.',locked_by=NULL,lease_until=NULL,updated_at=now() WHERE state='RUNNING' AND"
                      + " lease_until<now() RETURNING id,owner_id,kind,entity_id,request_id");
          for (var s : stale) {
            String previous = MDC.get("request_id");
            try {
              MDC.put("request_id", db.text(s, "request_id"));
              events.emit(
                  db.id(s.get("id")), db.id(s.get("owner_id")), "ERROR", "LEASE_EXPIRED",
                  "WORKER_LEASE_EXPIRED", "Tác vụ không nhận được kết quả trong thời hạn.", null);
            } finally {
              if (previous == null) MDC.remove("request_id");
              else MDC.put("request_id", previous);
            }
          }
          var row =
              db.optional(
                  "SELECT * FROM processing_jobs WHERE state='QUEUED' AND available_at<=now() ORDER"
                      + " BY created_at FOR UPDATE SKIP LOCKED LIMIT 1");
          if (row.isEmpty()) return Optional.<Map<String, Object>>empty();
          UUID id = db.id(row.get().get("id"));
          db.update(
              "UPDATE processing_jobs SET state='RUNNING',locked_by=?,lease_until=now()+interval"
                  + " '15 minutes',attempts=attempts+1,updated_at=now() WHERE id=?",
              worker, id);
          return Optional.of(db.one("SELECT * FROM processing_jobs WHERE id=?", id));
        });
  }

  public void progress(UUID job, UUID worker, UUID owner, String step, int progress, String message) {
    requireUpdated(db.update(
        "UPDATE processing_jobs SET step=?,progress=?,updated_at=now()"
            + " WHERE id=? AND locked_by=? AND state='RUNNING' AND lease_until>now()",
        step, progress, job, worker));
    events.emit(job, owner, "INFO", step, "STEP_STARTED", message, null);
  }

  public boolean ownsLease(UUID job, UUID worker) {
    return db.optional(
            "SELECT id FROM processing_jobs WHERE id=? AND locked_by=? AND state='RUNNING' AND"
                + " lease_until>now()", job, worker).isPresent();
  }

  public void assertLease(UUID job, UUID worker) {
    if (db.optional(
            "SELECT id FROM processing_jobs WHERE id=? AND locked_by=? AND state='RUNNING' AND"
                + " lease_until>now() FOR UPDATE", job, worker).isEmpty())
      throw leaseLost();
  }

  public void complete(UUID job, UUID worker) {
    requireUpdated(db.update(
        "UPDATE processing_jobs SET"
            + " state='SUCCEEDED',step='DONE',progress=100,locked_by=NULL,lease_until=NULL,error_code=NULL,error_message=NULL,updated_at=now()"
            + " WHERE id=? AND locked_by=? AND state='RUNNING' AND lease_until>now()",
        job, worker));
  }

  public void fail(UUID job, UUID worker, ApiFailure error) {
    requireUpdated(db.update(
        "UPDATE processing_jobs SET"
            + " state='FAILED',step='FAILED',error_code=?,error_message=?,locked_by=NULL,lease_until=NULL,updated_at=now()"
            + " WHERE id=? AND locked_by=? AND state='RUNNING' AND lease_until>now()",
        error.code, error.getMessage(), job, worker));
  }

  public void defer(UUID job, UUID worker) {
    requireUpdated(db.update(
        "UPDATE processing_jobs SET"
            + " state='QUEUED',step='WAITING_DEPENDENCIES',locked_by=NULL,lease_until=NULL,available_at=now()+interval"
            + " '5 seconds',updated_at=now() WHERE id=? AND locked_by=? AND state='RUNNING'"
            + " AND lease_until>now()",
        job, worker));
  }

  private void requireUpdated(int count) {
    if (count != 1) throw leaseLost();
  }

  private ApiFailure leaseLost() {
    return new ApiFailure(409, "JOB_LEASE_LOST", "Tác vụ không còn giữ quyền xử lý.");
  }

  public List<Map<String, Object>> forUser(UUID user) {
    return db.rows(
        "SELECT p.* FROM processing_jobs p WHERE owner_id=? ORDER BY created_at DESC LIMIT 100",
        user);
  }

  public Map<String, Object> authorized(UUID job, Actor a) {
    return db.one(
        "SELECT p.* FROM processing_jobs p WHERE p.id=? AND (p.owner_id=? OR (p.kind='MATCH' AND"
            + " EXISTS(SELECT 1 FROM applications ap JOIN jobs j ON j.id=ap.job_id WHERE"
            + " ap.id=p.entity_id AND j.recruiter_id=?)))",
        job, a.id(), a.id());
  }

  public Map<String, Object> retry(UUID job, Actor a) {
    return tx.execute(
        status -> {
          var row = authorized(job, a);
          if (!"FAILED".equals(row.get("state")))
            throw new ApiFailure(409, "JOB_NOT_FAILED", "Chỉ có thể thử lại tác vụ đã lỗi.");
          UUID entity = db.id(row.get("entity_id"));
          String kind = db.text(row, "kind");
          UUID next = enqueue(db.id(row.get("owner_id")), kind, entity);
          return Db.map("jobId", next, "state", "QUEUED");
        });
  }
}
