package com.platform.recruitment.event;

import com.platform.recruitment.midcv.Db;
import java.util.*;
import org.slf4j.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

@Component
public class Events {
  private final Db db;
  private static final Logger log = LoggerFactory.getLogger(Events.class);

  public Events(@Qualifier("midcvDb") Db db) {
    this.db = db;
  }

  public static String requestId() {
    String s = MDC.get("request_id");
    return s == null ? UUID.randomUUID().toString() : s;
  }

  public void emit(
      UUID job, UUID owner, String level, String step, String code, String message, Long duration) {
    String req = requestId();
    Map<String, Object> fields =
        Db.map(
            "request_id",
            req,
            "job_id",
            job,
            "owner_id",
            owner,
            "step",
            step,
            "code",
            code,
            "duration_ms",
            duration,
            "message",
            message);
    if ("ERROR".equals(level)) log.error(db.json(fields));
    else if ("WARN".equals(level)) log.warn(db.json(fields));
    else log.info(db.json(fields));
    try {
      db.update(
          "INSERT INTO job_events(job_id,owner_id,request_id,level,step,code,message,duration_ms)"
              + " VALUES (?,?,?,?,?,?,?,?)",
          job,
          owner,
          req,
          level,
          limit(step, 60),
          limit(code, 100),
          limit(message, 1000),
          duration);
    } catch (Exception e) {
      log.error(
          "event_persistence_failed request_id={} code={} exception={}",
          req,
          code,
          e.getClass().getSimpleName());
    }
  }

  private String limit(String s, int max) {
    return s.length() > max ? s.substring(0, max) : s;
  }

  public void failure(Throwable error, String code) {
    Throwable root = error;
    while (root.getCause() != null && root != root.getCause()) root = root.getCause();
    log.error(
        "failure code={} exception={} root_exception={} sql_state={} stack={}",
        code,
        error.getClass().getName(),
        root.getClass().getName(),
        root instanceof java.sql.SQLException sql ? sql.getSQLState() : null,
        Arrays.toString(error.getStackTrace()));
  }
}
