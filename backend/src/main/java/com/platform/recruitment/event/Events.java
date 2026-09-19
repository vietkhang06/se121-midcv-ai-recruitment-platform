package com.platform.recruitment.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.slf4j.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class Events {
  private final JdbcTemplate jdbc;
  private final ObjectMapper mapper;
  private static final Logger log = LoggerFactory.getLogger(Events.class);

  public Events(JdbcTemplate jdbc, ObjectMapper mapper) {
    this.jdbc = jdbc;
    this.mapper = mapper;
  }

  public static String requestId() {
    String s = MDC.get("request_id");
    return s == null ? UUID.randomUUID().toString() : s;
  }

  public void emit(
      UUID job, UUID owner, String level, String step, String code, String message, Long duration) {
    String req = requestId();
    Map<String, Object> fields = new LinkedHashMap<>();
    fields.put("request_id", req);
    fields.put("job_id", job != null ? job.toString() : null);
    fields.put("owner_id", owner != null ? owner.toString() : null);
    fields.put("step", step);
    fields.put("code", code);
    fields.put("duration_ms", duration);
    fields.put("message", message);

    String json;
    try {
      json = mapper.writeValueAsString(fields);
    } catch (Exception ignored) {
      json = fields.toString();
    }

    if ("ERROR".equals(level)) log.error(json);
    else if ("WARN".equals(level)) log.warn(json);
    else log.info(json);

    try {
      jdbc.update(
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
