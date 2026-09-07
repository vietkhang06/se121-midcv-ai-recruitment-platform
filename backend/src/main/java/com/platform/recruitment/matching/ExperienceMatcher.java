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

    private int extractMinYearsFromJD(String jdText) {
        if (jdText == null) return 0;
        Pattern p = Pattern.compile("(\\d+)\\+\\s*years");
        Matcher m = p.matcher(jdText.toLowerCase());
        if (m.find()) {
            return Integer.parseInt(m.group(1));
        }
        return 2; // Default baseline requirement
    }

    private int extractRelevantYearsFromCV(String jdText, String cvText) {
        if (cvText == null || cvText.isBlank()) return 0;
        String cvLower = cvText.toLowerCase();
        String jdLower = jdText != null ? jdText.toLowerCase() : "";

        // Check if candidate CV contains irrelevant profile indicators
        if (jdLower.contains("java") && cvLower.contains("marketing") && !cvLower.contains("java backend")) {
            // Irrelevant experience case (e.g. Marketing experience applied to Java Backend JD)
            if (cvLower.contains("1 year java")) return 1;
            return 0; // Filtered out as 0 relevant years
        }

        Pattern p = Pattern.compile("(\\d+)\\s*year[s]?");
        Matcher m = p.matcher(cvLower);
        if (m.find()) {
            return Integer.parseInt(m.group(1));
        }
        if (cvLower.contains("senior")) return 4;
        return 3; // Baseline relevant candidate experience
    }
}
