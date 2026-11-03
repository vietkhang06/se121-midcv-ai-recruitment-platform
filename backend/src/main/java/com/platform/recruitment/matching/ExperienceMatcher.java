package com.platform.recruitment.matching;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class ExperienceMatcher {

    /**
     * Evaluates RELEVANT Experience matching.
     * Checks if candidate experience entries match JD target role/technology.
     * Irrelevant experience (e.g. 5 yrs Marketing for 2 yrs Java backend) is filtered out.
     */
    public BigDecimal evaluateExperience(String jdDescription, String cvRawText) {
        int requiredYears = extractMinYearsFromJD(jdDescription);
        int relevantCandidateYears = extractRelevantYearsFromCV(jdDescription, cvRawText);

        if (requiredYears <= 0) {
            return BigDecimal.valueOf(100.0).setScale(2, RoundingMode.HALF_UP);
        }

        if (relevantCandidateYears >= requiredYears) {
            return BigDecimal.valueOf(100.0).setScale(2, RoundingMode.HALF_UP);
        }

        double ratio = (double) relevantCandidateYears / requiredYears;
        double score = Math.max(0.0, Math.min(100.0, ratio * 100.0));
        return BigDecimal.valueOf(score).setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal evaluateExperience(String jdDescription, com.platform.recruitment.cv.CVVersion version) {
        int requiredYears = extractMinYearsFromJD(jdDescription);
        if (requiredYears <= 0) return BigDecimal.valueOf(100).setScale(2);
        try {
            var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            var root = mapper.readTree(version.getStructuredJsonContent());
            var entries = root.path("work_experience");
            if (!entries.isArray()) entries = root.path("experience");
            var normalized = mapper.createArrayNode();
            Set<String> targetTerms = relevanceTerms(jdDescription);
            for (var entry : entries) {
                if (!targetTerms.isEmpty() && Collections.disjoint(targetTerms, tokens(entry.toString()))) continue;
                var item = mapper.createObjectNode();
                item.put("startDate", entry.path("start_date").asText(entry.path("startDate").asText("")));
                item.put("endDate", entry.path("end_date").asText(entry.path("endDate").asText("")));
                normalized.add(item);
            }
            Double years = ScreeningCvAdapter.completedYears(normalized);
            if (years == null) return BigDecimal.ZERO;
            return BigDecimal.valueOf(Math.min(100, years / requiredYears * 100)).setScale(2, RoundingMode.HALF_UP);
        } catch (java.io.IOException ex) {
            return BigDecimal.ZERO;
        }
    }

    private static Set<String> relevanceTerms(String text) {
        Set<String> terms = tokens(text);
        terms.removeAll(Set.of("year", "years", "nam", "experience", "experienced", "kinh", "nghiem",
                "required", "requirement", "minimum", "min", "plus", "job", "role", "position",
                "work", "working", "developer", "engineer", "senior", "junior", "mid", "level",
                "with", "and", "the", "for", "from", "this", "that", "candidate", "skills", "skill",
                "in", "on", "of", "to", "at", "an"));
        return terms;
    }

    private static Set<String> tokens(String text) {
        if (text == null) return new HashSet<>();
        String folded = Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).replace('đ', 'd');
        Set<String> result = new HashSet<>();
        for (String token : folded.split("[^a-z0-9+#.]+")) {
            if (token.length() >= 2 && token.chars().anyMatch(Character::isLetter)) result.add(token);
        }
        return result;
    }

    private int extractMinYearsFromJD(String jdText) {
        if (jdText == null) return 0;
        Matcher matcher = Pattern.compile("(?i)(\\d+)\\s*\\+?\\s*(?:years?|năm)").matcher(jdText);
        return matcher.find() ? Integer.parseInt(matcher.group(1)) : 0;
    }

    private int extractRelevantYearsFromCV(String jdText, String cvText) {
        if (cvText == null || cvText.isBlank()) return 0;
        Matcher matcher = Pattern.compile("(?i)(\\d+)\\s*(?:years?|năm)").matcher(cvText);
        List<int[]> claims = new ArrayList<>();
        while (matcher.find()) claims.add(new int[]{matcher.start(), Integer.parseInt(matcher.group(1))});
        if (claims.isEmpty()) return 0;

        Set<String> targetTerms = relevanceTerms(jdText);
        int relevantYears = 0;
        for (int index = 0; index < claims.size(); index++) {
            int start = claims.get(index)[0];
            int end = index + 1 < claims.size() ? claims.get(index + 1)[0] : cvText.length();
            String claim = cvText.substring(start, end);
            if (targetTerms.isEmpty() || !Collections.disjoint(targetTerms, tokens(claim))) {
                // Raw prose cannot prove non-overlapping intervals. Use the strongest
                // relevant claim instead of adding possibly overlapping or unrelated years.
                relevantYears = Math.max(relevantYears, claims.get(index)[1]);
            }
        }
        return relevantYears;
    }
}
