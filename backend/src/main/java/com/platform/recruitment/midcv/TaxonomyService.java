package com.platform.recruitment.midcv;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.annotation.PostConstruct;
import java.text.Normalizer;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

/**
 * Skill & Terminology Taxonomy Service (4-tier deterministic resolution).
 */
@Service
public class TaxonomyService {
  private static final Logger log = LoggerFactory.getLogger(TaxonomyService.class);
  public static final String TAXONOMY_VERSION = "v1.0";

  public enum MatchType {
    EXACT_CANONICAL,
    EXACT_ALIAS,
    NORMALIZED_CANONICAL,
    NORMALIZED_ALIAS
  }

  public enum TaxonomyStatus {
    UNINITIALIZED,
    READY,
    EMPTY,
    UNAVAILABLE
  }

  public record TaxonomySkill(
      UUID id,
      String canonicalName,
      String normalizedName,
      String category,
      String description,
      String source,
      String version,
      boolean active) {}

  public record TaxonomyAlias(
      UUID id,
      UUID skillId,
      String alias,
      String normalizedAlias,
      String source,
      boolean active) {}

  public record TaxonomyMatch(
      TaxonomySkill skill,
      String matchedTerm,
      MatchType matchType) {
    public String canonicalName() {
      return skill.canonicalName();
    }
  }

  private final Db db;

  private volatile TaxonomyStatus status = TaxonomyStatus.UNINITIALIZED;
  private volatile String lastError = null;

  // In-memory lookup tables for deterministic O(1) resolution
  private final Map<String, TaxonomySkill> exactCanonicalMap = new ConcurrentHashMap<>();
  private final Map<String, TaxonomySkill> exactAliasMap = new ConcurrentHashMap<>();
  private final Map<String, TaxonomySkill> normCanonicalMap = new ConcurrentHashMap<>();
  private final Map<String, TaxonomySkill> normAliasMap = new ConcurrentHashMap<>();

  // Collision tracking: normalized keys that map to more than 1 distinct skill
  private final Set<String> collidedKeys = ConcurrentHashMap.newKeySet();

  public TaxonomyService(@Autowired(required = false) @Qualifier("midcvDb") Db db) {
    this.db = db;
    if (db == null) {
      this.status = TaxonomyStatus.EMPTY;
    }
  }

  @PostConstruct
  public void init() {
    if (db != null) {
      try {
        refresh();
      } catch (Exception e) {
        log.warn("TaxonomyService: Could not load taxonomy from DB on startup (tables may not exist yet): {}", e.getMessage());
      }
    }
  }

  public TaxonomyStatus getStatus() {
    return status;
  }

  public String getLastError() {
    return lastError;
  }

  public Set<String> getCollidedKeys() {
    return Collections.unmodifiableSet(collidedKeys);
  }

  public boolean hasCollision(String normKey) {
    return normKey != null && collidedKeys.contains(normKey);
  }

  public void setStatusForTesting(TaxonomyStatus status, String lastError) {
    this.status = status;
    this.lastError = lastError;
  }

  public static String normalizeKey(String s) {
    if (s == null) return "";
    return Normalizer.normalize(s.trim(), Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "")
        .replace('Đ', 'd')
        .replace('đ', 'd')
        .toLowerCase(Locale.ROOT)
        .replaceAll("[^\\p{L}\\p{N}+#]", "");
  }

  public Optional<TaxonomyMatch> lookup(String rawTerm) {
    if (rawTerm == null) return Optional.empty();
    String term = rawTerm.trim();
    if (term.isEmpty()) return Optional.empty();

    // 1. Exact canonical
    TaxonomySkill directCanonical = exactCanonicalMap.get(term);
    if (directCanonical != null) {
      return Optional.of(new TaxonomyMatch(directCanonical, term, MatchType.EXACT_CANONICAL));
    }

    // 2. Exact alias
    TaxonomySkill directAlias = exactAliasMap.get(term);
    if (directAlias != null) {
      return Optional.of(new TaxonomyMatch(directAlias, term, MatchType.EXACT_ALIAS));
    }

    // 3 & 4. Normalized lookup
    String normKey = normalizeKey(term);
    if (!normKey.isEmpty()) {
      if (!collidedKeys.contains(normKey)) {
        TaxonomySkill normCanonical = normCanonicalMap.get(normKey);
        if (normCanonical != null) {
          return Optional.of(new TaxonomyMatch(normCanonical, term, MatchType.NORMALIZED_CANONICAL));
        }

        TaxonomySkill normAlias = normAliasMap.get(normKey);
        if (normAlias != null) {
          return Optional.of(new TaxonomyMatch(normAlias, term, MatchType.NORMALIZED_ALIAS));
        }
      } else {
        log.warn("Taxonomy lookup for '{}' (key '{}') encountered collision; skipping ambiguous normalized resolution", term, normKey);
      }
    }

    return Optional.empty();
  }

  public String resolveCanonical(String rawTerm, String fallback) {
    return lookup(rawTerm).map(TaxonomyMatch::canonicalName).orElse(fallback);
  }

  public boolean isKnown(String rawTerm) {
    return lookup(rawTerm).isPresent();
  }

  public void normalizeDocumentSkills(JsonNode document) {
    if (document == null) return;
    if (status == TaxonomyStatus.UNAVAILABLE) {
      throw new ApiFailure(503, "TAXONOMY_UNAVAILABLE", "Hệ thống chuẩn hóa kỹ năng tạm thời không khả dụng: " + lastError);
    }
    normalizeSkillArray(document.path("skills"));
    normalizeSkillArray(document.path("otherRequirements"));
  }

  private void normalizeSkillArray(JsonNode arrayNode) {
    if (!(arrayNode instanceof ArrayNode arr)) return;
    for (JsonNode item : arr) {
      if (!(item instanceof ObjectNode obj)) continue;

      String canonical = obj.path("canonical").asText("").trim();
      String name = obj.path("name").asText("").trim();

      Optional<TaxonomyMatch> match = Optional.empty();
      if (!canonical.isEmpty()) {
        match = lookup(canonical);
      }
      if (match.isEmpty() && !name.isEmpty()) {
        match = lookup(name);
      }

      if (match.isPresent()) {
        TaxonomyMatch m = match.get();
        obj.put("canonical", m.canonicalName());
        if (m.skill().category() != null && !m.skill().category().isBlank()) {
          obj.put("category", m.skill().category());
        }
        obj.put("resolution", "TAXONOMY");
      } else {
        obj.put("resolution", "UNKNOWN");
      }
    }
  }

  public synchronized void registerSkill(TaxonomySkill skill, List<String> aliases) {
    if (skill == null || !skill.active()) return;

    exactCanonicalMap.put(skill.canonicalName(), skill);
    String normCanonical = normalizeKey(skill.canonicalName());
    if (!normCanonical.isEmpty()) {
      TaxonomySkill existing = normCanonicalMap.put(normCanonical, skill);
      if (existing != null && !existing.id().equals(skill.id())) {
        collidedKeys.add(normCanonical);
        normCanonicalMap.remove(normCanonical);
      }
    }

    if (aliases != null) {
      for (String alias : aliases) {
        if (alias == null || alias.isBlank()) continue;
        String trimmedAlias = alias.trim();
        exactAliasMap.put(trimmedAlias, skill);
        String normAlias = normalizeKey(trimmedAlias);
        if (!normAlias.isEmpty()) {
          TaxonomySkill existing = normAliasMap.put(normAlias, skill);
          if (existing != null && !existing.id().equals(skill.id())) {
            collidedKeys.add(normAlias);
            normAliasMap.remove(normAlias);
          }
        }
      }
    }

    this.status = TaxonomyStatus.READY;
  }

  public synchronized void refresh() {
    if (db == null) {
      this.status = exactCanonicalMap.isEmpty() ? TaxonomyStatus.EMPTY : TaxonomyStatus.READY;
      return;
    }

    try {
      List<Map<String, Object>> skillRows = db.rows(
          "SELECT id, canonical_name, normalized_name, category, description, source, version, active " +
          "FROM taxonomy_skills WHERE active = true"
      );

      Map<UUID, TaxonomySkill> skillsById = new HashMap<>();
      Map<String, TaxonomySkill> newExactCanonical = new HashMap<>();
      Map<String, TaxonomySkill> newNormCanonical = new HashMap<>();
      Set<String> newCollided = new HashSet<>();

      for (Map<String, Object> r : skillRows) {
        UUID id = db.id(r.get("id"));
        TaxonomySkill skill = new TaxonomySkill(
            id,
            db.text(r, "canonical_name"),
            db.text(r, "normalized_name"),
            db.text(r, "category"),
            db.text(r, "description"),
            db.text(r, "source"),
            db.text(r, "version"),
            Boolean.TRUE.equals(r.get("active"))
        );
        skillsById.put(id, skill);
        newExactCanonical.put(skill.canonicalName(), skill);
        if (!skill.normalizedName().isEmpty()) {
          TaxonomySkill existing = newNormCanonical.put(skill.normalizedName(), skill);
          if (existing != null && !existing.id().equals(skill.id())) {
            newCollided.add(skill.normalizedName());
            newNormCanonical.remove(skill.normalizedName());
          }
        }
      }

      List<Map<String, Object>> aliasRows = db.rows(
          "SELECT id, skill_id, alias, normalized_alias, source, active " +
          "FROM taxonomy_aliases WHERE active = true"
      );

      Map<String, TaxonomySkill> newExactAlias = new HashMap<>();
      Map<String, TaxonomySkill> newNormAlias = new HashMap<>();

      for (Map<String, Object> r : aliasRows) {
        UUID skillId = db.id(r.get("skill_id"));
        TaxonomySkill skill = skillsById.get(skillId);
        if (skill != null) {
          String alias = db.text(r, "alias");
          String normAlias = db.text(r, "normalized_alias");
          newExactAlias.put(alias, skill);
          if (!normAlias.isEmpty()) {
            TaxonomySkill existing = newNormAlias.put(normAlias, skill);
            if (existing != null && !existing.id().equals(skill.id())) {
              newCollided.add(normAlias);
              newNormAlias.remove(normAlias);
            }
          }
        }
      }

      exactCanonicalMap.clear();
      exactCanonicalMap.putAll(newExactCanonical);

      exactAliasMap.clear();
      exactAliasMap.putAll(newExactAlias);

      normCanonicalMap.clear();
      normCanonicalMap.putAll(newNormCanonical);

      normAliasMap.clear();
      normAliasMap.putAll(newNormAlias);

      collidedKeys.clear();
      collidedKeys.addAll(newCollided);

      if (skillsById.isEmpty()) {
        this.status = TaxonomyStatus.EMPTY;
        log.info("TaxonomyService: Database contains 0 active skills (TaxonomyStatus.EMPTY)");
      } else {
        this.status = TaxonomyStatus.READY;
        log.info("TaxonomyService: Loaded {} skills and {} aliases from database (TaxonomyStatus.READY)",
            skillsById.size(), newExactAlias.size());
      }
      this.lastError = null;

    } catch (Exception e) {
      this.status = TaxonomyStatus.UNAVAILABLE;
      this.lastError = e.getMessage();
      log.error("TaxonomyService: Failed to load from database: {}", e.getMessage(), e);
      throw e;
    }
  }

  public int skillCount() {
    return exactCanonicalMap.size();
  }

  public int aliasCount() {
    return exactAliasMap.size();
  }
}
