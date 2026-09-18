package com.platform.recruitment.midcv;

import com.fasterxml.jackson.databind.*;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component("midcvDb")
public class Db {
  public final JdbcTemplate jdbc;
  public final ObjectMapper mapper;

  public Db(JdbcTemplate jdbc, ObjectMapper mapper) {
    this.jdbc = jdbc;
    this.mapper = mapper;
  }

  public int update(String sql, Object... args) {
    return jdbc.update(sql, args);
  }

  public List<Map<String, Object>> rows(String sql, Object... args) {
    return jdbc.queryForList(sql, args).stream()
        .map(
            row -> {
              Map<String, Object> m = new LinkedHashMap<>();
              row.forEach((k, v) -> m.put(k, clean(v)));
              return m;
            })
        .toList();
  }

  private Object clean(Object v) {
    if (v == null) return null;
    if (v instanceof UUID) return v.toString();
    if (v instanceof java.sql.Timestamp t) return t.toInstant().toString();
    if (v instanceof OffsetDateTime t) return t.toInstant().toString();
    if (v.getClass().getName().equals("org.postgresql.util.PGobject")) return parse(v.toString());
    return v;
  }

  public Map<String, Object> one(String sql, Object... args) {
    return rows(sql, args).stream().findFirst().orElseThrow(ApiFailure::missing);
  }

  public Optional<Map<String, Object>> optional(String sql, Object... args) {
    return rows(sql, args).stream().findFirst();
  }

  public UUID id(Object v) {
    try {
      return UUID.fromString(String.valueOf(v));
    } catch (Exception e) {
      throw ApiFailure.bad("INVALID_ID", "Mã dữ liệu không hợp lệ.");
    }
  }

  public String text(Map<String, Object> m, String k) {
    return Objects.toString(m.get(k), "");
  }

  public String json(Object v) {
    try {
      return mapper.writeValueAsString(v);
    } catch (Exception e) {
      throw new IllegalStateException("JSON_SERIALIZATION_FAILED", e);
    }
  }

  public JsonNode parse(String s) {
    try {
      return mapper.readTree(s);
    } catch (Exception e) {
      throw new IllegalStateException("JSON_PARSE_FAILED", e);
    }
  }

  public JsonNode tree(Object v) {
    return v instanceof JsonNode j ? j : mapper.valueToTree(v);
  }

  public static Map<String, Object> map(Object... pairs) {
    Map<String, Object> m = new LinkedHashMap<>();
    for (int i = 0; i < pairs.length; i += 2) m.put((String) pairs[i], pairs[i + 1]);
    return m;
  }
}
