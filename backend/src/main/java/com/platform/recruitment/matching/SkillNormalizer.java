package com.platform.recruitment.matching;

import com.platform.recruitment.taxonomy.TaxonomyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class SkillNormalizer {

    private final TaxonomyService taxonomyService;

    public SkillNormalizer() {
        this.taxonomyService = null;
    }

    @Autowired
    public SkillNormalizer(@Autowired(required = false) TaxonomyService taxonomyService) {
        this.taxonomyService = taxonomyService;
    }

    private static final Map<String, String> ALIAS_MAP = new HashMap<>();
    private static final Map<String, Set<String>> SYNONYMS_MAP = new HashMap<>();

    static {
        // Canonical alias mappings
        registerAlias("js", "javascript");
        registerAlias("javascript", "javascript");
        registerAlias("ts", "typescript");
        registerAlias("typescript", "typescript");
        registerAlias("postgres", "postgresql");
        registerAlias("postgresql", "postgresql");
        registerAlias("pgvector", "pgvector");
        registerAlias("k8s", "kubernetes");
        registerAlias("kubernetes", "kubernetes");
        registerAlias("react", "react");
        registerAlias("reactjs", "react");
        registerAlias("react.js", "react");
        registerAlias("vue", "vue.js");
        registerAlias("vuejs", "vue.js");
        registerAlias("vue.js", "vue.js");
        registerAlias("node", "node.js");
        registerAlias("nodejs", "node.js");
        registerAlias("node.js", "node.js");
        registerAlias("golang", "go");
        registerAlias("spring framework", "spring boot");
        registerAlias("spring", "spring boot");
        registerAlias("springboot", "spring boot");
        registerAlias("spring-boot", "spring boot");
        registerAlias("ga4", "google analytics 4");
        registerAlias("google analytics", "google analytics 4");
        registerAlias("google analytics 4", "google analytics 4");
        registerAlias("aws", "amazon web services");
        registerAlias("amazon web services", "amazon web services");
        registerAlias("docker", "docker");
    }

    private static void registerAlias(String alias, String canonical) {
        String cleanAlias = alias.toLowerCase().trim();
        String cleanCanonical = canonical.toLowerCase().trim();
        ALIAS_MAP.put(cleanAlias, cleanCanonical);
        SYNONYMS_MAP.computeIfAbsent(cleanCanonical, k -> new HashSet<>()).add(cleanAlias);
        SYNONYMS_MAP.computeIfAbsent(cleanCanonical, k -> new HashSet<>()).add(cleanCanonical);
    }

    public String getCanonicalName(String rawSkill) {
        if (rawSkill == null || rawSkill.isBlank()) {
            return "";
        }
        String lower = rawSkill.toLowerCase().trim();
        if (taxonomyService != null) {
            Optional<TaxonomyService.TaxonomyMatch> match = taxonomyService.lookup(rawSkill);
            if (match.isPresent()) {
                return match.get().canonicalName().toLowerCase().trim();
            }
        }
        return ALIAS_MAP.getOrDefault(lower, lower);
    }

    public boolean matchesSkill(String targetSkill, String text) {
        if (targetSkill == null || text == null) {
            return false;
        }
        String cleanTarget = targetSkill.toLowerCase().trim();
        String cleanText = text.toLowerCase();

        // Special protection: Java != JavaScript
        if (cleanTarget.equals("java")) {
            if (cleanText.contains("java") && !cleanText.contains("javascript only")) {
                String stripped = cleanText.replace("javascript", "");
                return stripped.contains("java");
            }
            return false;
        }

        // Direct containment
        if (cleanText.contains(cleanTarget)) {
            return true;
        }

        // Check canonical synonym containment
        String canonical = getCanonicalName(cleanTarget);
        Set<String> synonyms = SYNONYMS_MAP.getOrDefault(canonical, Set.of(cleanTarget));
        for (String syn : synonyms) {
            if (cleanText.contains(syn)) {
                return true;
            }
        }

        return false;
    }
}
