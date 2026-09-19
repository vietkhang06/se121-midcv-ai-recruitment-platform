package com.platform.recruitment.midcv;

import com.fasterxml.jackson.databind.*;
import java.text.Normalizer;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class Scoring {
  public static final String VERSION = "midcv-score-v1";

  public record Result(
      double baseScore,
      double githubBonus,
      double score,
      double coverage,
      Map<String, Object> details) {}

  public static String key(String s) {
    return Normalizer.normalize(s, Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "")
        .replace('đ', 'd')
        .toLowerCase(Locale.ROOT)
        .replaceAll("[^\\p{L}\\p{N}+#]", "");
  }

  public Result calculate(JsonNode cv, JsonNode jd, double semantic, JsonNode github) {
    if (!Double.isFinite(semantic))
      throw new ApiFailure(422, "SEMANTIC_INVALID", "Không có điểm ngữ nghĩa hợp lệ.");
    semantic = Math.max(0, Math.min(100, semantic));
    List<Map<String, Object>> criteria = new ArrayList<>();
    addSkills(criteria, cv.path("skills"), jd.path("skills"), "required_skills", 30, false);
    addSkills(criteria, cv.path("skills"), jd.path("skills"), "preferred_skills", 10, true);
    var je = jd.path("experience");
    var ce = cv.path("experience");
    if (!je.path("years").isNull()) {
      Double score =
          ce.path("years").isNull()
              ? null
              : (je.path("years").asDouble() == 0
                  ? 100
                  : Math.min(100, ce.path("years").asDouble() / je.path("years").asDouble() * 100));
      criteria.add(
          criterion(
              "experience",
              15,
              score,
              score == null ? "UNKNOWN" : score >= 100 ? "MET" : "PARTIAL",
              List.of(
                  Db.map(
                      "jd_evidence",
                      je.path("evidence"),
                      "cv_evidence",
                      ce.path("evidence"),
                      "required_years",
                      je.path("years"),
                      "candidate_years",
                      ce.path("years")))));
    }
    if (!jd.path("education").isEmpty()) {
      List<Map<String, Object>> evidence = new ArrayList<>();
      double sum = 0;
      for (JsonNode required : jd.path("education")) {
        JsonNode best = null;
        double score = 0;
        for (JsonNode present : cv.path("education")) {
          boolean level =
              degree(present.path("level").asText()) >= degree(required.path("level").asText())
                  && (!required.path("level").asText().equals("OTHER")
                      || present.path("level").asText().equals("OTHER"));
          boolean field =
              required.path("field").isNull()
                  || key(required.path("field").asText())
                      .equals(key(present.path("field").asText()));
          double candidate = (level ? 50 : 0) + (field && level ? 50 : 0);
          if (candidate > score) {
            score = candidate;
            best = present;
          }
        }
        sum += score;
        evidence.add(
            Db.map(
                "jd_evidence",
                required.path("evidence"),
                "cv_evidence",
                best == null ? null : best.path("evidence"),
                "status",
                score == 100 ? "MET" : score > 0 ? "PARTIAL" : "NOT_FOUND",
                "field_comparison",
                "normalized exact field; semantic similarity is a separate criterion"));
      }
      double score = sum / jd.path("education").size();
      criteria.add(
          criterion(
              "education",
              10,
              score,
              score == 100 ? "MET" : score > 0 ? "PARTIAL" : "NOT_FOUND",
              evidence));
    }
    if (!jd.path("projects").isEmpty()) {
      Set<String> requiredTech = new LinkedHashSet<>();
      for (JsonNode p : jd.path("projects"))
        for (JsonNode t : p.path("technologies")) requiredTech.add(key(t.asText()));
      Set<String> actualTech = new HashSet<>();
      for (JsonNode p : cv.path("projects"))
        for (JsonNode t : p.path("technologies")) actualTech.add(key(t.asText()));
      Double score =
          requiredTech.isEmpty()
              ? null
              : 100.0
                  * requiredTech.stream().filter(actualTech::contains).count()
                  / requiredTech.size();
      criteria.add(
          criterion(
              "projects",
              10,
              score,
              score == null
                  ? "REVIEW_REQUIRED"
                  : score >= 100 ? "MET" : score > 0 ? "PARTIAL" : "NOT_FOUND",
              Db.map(
                  "jd_projects",
                  jd.path("projects"),
                  "cv_projects",
                  cv.path("projects"),
                  "method",
                  "explicit project technology overlap; review project quality manually")));
    }
    addSkills(
        criteria,
        cv.path("otherRequirements"),
        jd.path("otherRequirements"),
        "other_requirements",
        5,
        null);
    criteria.add(
        criterion(
            "semantic",
            20,
            semantic,
            "SIMILARITY",
            Db.map(
                "method",
                "pgvector cosine similarity",
                "note",
                "Độ tương đồng nội dung nghề nghiệp, không phải xác suất tuyển dụng thành công.")));
    double actualWeight = 0, totalWeight = 0, weighted = 0;
    for (var c : criteria) {
      double w = ((Number) c.get("weight")).doubleValue();
      totalWeight += w;
      if (c.get("score") != null) {
        actualWeight += w;
        weighted += w * ((Number) c.get("score")).doubleValue();
      }
    }
    double base = actualWeight > 0 ? weighted / actualWeight : 0;
    var git = githubEvidence(jd, github);
    double fraction = ((Number) git.get("fraction")).doubleValue();
    double bonus = Math.min(5, 5 * fraction);
    double total = Math.min(100, base + bonus);
    double coverage = totalWeight > 0 ? 100 * actualWeight / totalWeight : 0;
    double roundedBase = round(base);
    double roundedTotal = round(total);
    double roundedBonus = round(roundedTotal - roundedBase);
    return new Result(
        roundedBase,
        roundedBonus,
        roundedTotal,
        round(coverage),
        Db.map(
            "algorithm",
            VERSION,
            "criteria",
            criteria,
            "github_evidence",
            git.get("evidence"),
            "coverage",
            round(coverage),
            "formula",
            "weighted mean of assessable criteria + up to 5 supporting GitHub points; capped at"
                + " 100",
            "github_policy",
            "No penalty when absent, unavailable or not applicable. Stars/forks are displayed"
                + " only.",
            "decision",
            "HR_REVIEW_REQUIRED"));
  }

  private void addSkills(
      List<Map<String, Object>> list,
      JsonNode cv,
      JsonNode jd,
      String name,
      int weight,
      Boolean preferred) {
    List<JsonNode> requirements = new ArrayList<>();
    Set<String> seen = new HashSet<>();
    for (JsonNode r : jd) {
      boolean p = r.path("priority").asText().equals("PREFERRED");
      if ((preferred == null || preferred == p) && seen.add(key(r.path("canonical").asText())))
        requirements.add(r);
    }
    if (requirements.isEmpty()) return;
    int hits = 0;
    List<Map<String, Object>> details = new ArrayList<>();
    for (JsonNode r : requirements) {
      JsonNode match = null;
      for (JsonNode s : cv)
        if (key(s.path("canonical").asText()).equals(key(r.path("canonical").asText()))) {
          match = s;
          break;
        }
      if (match != null) hits++;
      details.add(
          Db.map(
              "name",
              r.path("canonical").asText(),
              "priority",
              r.path("priority").asText(),
              "status",
              match == null ? "NOT_FOUND" : "MET",
              "jd_evidence",
              r.path("evidence"),
              "cv_evidence",
              match == null ? null : match.path("evidence")));
    }
    double score = 100.0 * hits / requirements.size();
    list.add(
        criterion(
            name,
            weight,
            score,
            hits == requirements.size() ? "MET" : hits > 0 ? "PARTIAL" : "NOT_FOUND",
            details));
  }

  private Map<String, Object> criterion(
      String id, int weight, Double score, String state, Object evidence) {
    return Db.map(
        "id",
        id,
        "weight",
        weight,
        "score",
        score == null ? null : round(score),
        "status",
        state,
        "evidence",
        evidence);
  }

  private int degree(String s) {
    return switch (s) {
      case "HIGH_SCHOOL" -> 1;
      case "ASSOCIATE" -> 2;
      case "BACHELOR" -> 3;
      case "MASTER" -> 4;
      case "DOCTORATE" -> 5;
      default -> 0;
    };
  }

  private Map<String, Object> githubEvidence(JsonNode jd, JsonNode github) {
    List<Map<String, Object>> evidence = new ArrayList<>();
    if (!github.path("status").asText().equals("AVAILABLE"))
      return Db.map("fraction", 0, "evidence", evidence);
    Set<String> skills = new HashSet<>();
    for (JsonNode s : jd.path("skills")) skills.add(key(s.path("canonical").asText()));
    for (String skill : skills) {
      for (JsonNode r : github.path("repos")) {
        if (r.path("fork").asBoolean() || r.path("archived").asBoolean()) continue;
        Set<String> signals = new HashSet<>();
        signals.add(key(r.path("language").asText()));
        r.path("languages").fieldNames().forEachRemaining(l -> signals.add(key(l)));
        for (JsonNode t : r.path("topics")) signals.add(key(t.asText()));
        if (signals.contains(skill)) {
          evidence.add(
              Db.map(
                  "skill",
                  skill,
                  "repo",
                  r.path("name").asText(),
                  "url",
                  r.path("url").asText(),
                  "source",
                  "repository language/topics",
                  "fetched_at",
                  github.path("fetched_at").asText()));
          break;
        }
      }
    }
    return Db.map(
        "fraction",
        skills.isEmpty() ? 0 : (double) evidence.size() / skills.size(),
        "evidence",
        evidence);
  }

  private double round(double d) {
    return Math.round(d * 100) / 100.0;
  }
}
