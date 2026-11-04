package com.platform.recruitment.matching;

import com.platform.recruitment.taxonomy.TaxonomyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Explicit technology aliases only; substring similarity is NOT equivalent qualification. */
@Component
public class SkillNormalizer {
    private final TaxonomyService taxonomyService;

    public SkillNormalizer() { this.taxonomyService = null; }

    @Autowired
    public SkillNormalizer(@Autowired(required = false) TaxonomyService taxonomyService) {
        this.taxonomyService = taxonomyService;
    }

    private static final Map<String, String> ALIAS_MAP = new HashMap<>();
    private static final Map<String, Set<String>> SYNONYMS_MAP = new HashMap<>();

    static {
        registerAlias("js", "javascript");
        registerAlias("javascript", "javascript");
        registerAlias("ts", "typescript");
        registerAlias("typescript", "typescript");
        registerAlias("postgres", "postgresql");
        registerAlias("postgresql", "postgresql");
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
        registerAlias("springboot", "spring boot");
        registerAlias("spring-boot", "spring boot");
        registerAlias("spring boot", "spring boot");
        // Spring Framework is related to, but not automatically equivalent to Spring Boot.
        registerAlias("spring framework", "spring framework");
        registerAlias("ga4", "google analytics 4");
        registerAlias("google analytics 4", "google analytics 4");
        registerAlias("aws", "amazon web services");
        registerAlias("amazon web services", "amazon web services");
        registerAlias("docker", "docker");
    }

    private static void registerAlias(String alias, String canonical) {
        String lowerAlias = alias.toLowerCase(Locale.ROOT).trim();
        String lowerCanonical = canonical.toLowerCase(Locale.ROOT).trim();
        ALIAS_MAP.put(lowerAlias, lowerCanonical);
        SYNONYMS_MAP.computeIfAbsent(lowerCanonical, k -> new LinkedHashSet<>()).add(lowerAlias);
        SYNONYMS_MAP.get(lowerCanonical).add(lowerCanonical);
    }

    public String getCanonicalName(String skill) {
        if (skill == null || skill.isBlank()) return "";
        String lower = skill.toLowerCase(Locale.ROOT).trim();
        // Explicitly disallow unsafe historic taxonomy seed equivalences.
        if (lower.equals("spring framework") || lower.equals("pgvector")) return lower;
        if (ALIAS_MAP.containsKey(lower)) return ALIAS_MAP.get(lower);
        if (taxonomyService != null) {
            Optional<TaxonomyService.TaxonomyMatch> resolved = taxonomyService.lookup(skill);
            if (resolved.isPresent()) return resolved.get().canonicalName().toLowerCase(Locale.ROOT).trim();
        }
        return lower;
    }

    public boolean matchesSkill(String targetSkill, String sourceText) {
        return findEvidence(targetSkill, sourceText).isPresent();
    }

    /** Returns the exact substring observed in the CV, never a generated pseudo-quotation. */
    public Optional<String> findEvidence(String targetSkill, String sourceText) {
        if (targetSkill == null || targetSkill.isBlank() || sourceText == null || sourceText.isBlank())
            return Optional.empty();
        String target = targetSkill.toLowerCase(Locale.ROOT).trim();
        String canonical = getCanonicalName(target);
        LinkedHashSet<String> terms = new LinkedHashSet<>();
        terms.add(target);
        terms.add(canonical);
        terms.addAll(SYNONYMS_MAP.getOrDefault(canonical, Set.of()));
        for (String term : terms) {
            // Unicode-aware boundaries prevent C/C++, Java/JavaScript, React/ReactNative etc.
            String pattern = "(?<![\\p{L}\\p{N}_+.#])" + Pattern.quote(term)
                    + "(?![\\p{L}\\p{N}_+.#])";
            if (canonical.equals("react") && term.equals("react")) {
                // A bare React requirement is not proven by mentioning React Native alone.
                pattern += "(?!\\s+[Nn]ative\\b)";
            }
            Matcher match = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE)
                    .matcher(sourceText);
            if (match.find()) return Optional.of(sourceText.substring(match.start(), match.end()));
        }
        return Optional.empty();
    }
}
