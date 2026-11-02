package com.platform.recruitment.matching;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
            for (var entry : entries) {
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

    private int extractMinYearsFromJD(String jdText) {
        if (jdText == null) return 0;
        Matcher matcher = Pattern.compile("(?i)(\\d+)\\s*\\+?\\s*(?:years?|năm)").matcher(jdText);
        return matcher.find() ? Integer.parseInt(matcher.group(1)) : 0;
    }

    private int extractRelevantYearsFromCV(String jdText, String cvText) {
        if (cvText == null || cvText.isBlank()) return 0;
        Matcher matcher = Pattern.compile("(?i)(\\d+)\\s*(?:years?|năm)").matcher(cvText);
        return matcher.find() ? Integer.parseInt(matcher.group(1)) : 0;
    }
}
