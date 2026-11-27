package com.platform.recruitment.matching;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class ExperienceMatcher {
    private static final Pattern DURATION = Pattern.compile(
            "(?<![\\d.,-])(\\d{1,3})(?:[.,](\\d{1,2}))?\\s*\\+?\\s*(years?|months?|năm|tháng)(?![\\p{L}])");
    private static final Pattern EXPERIENCE = Pattern.compile("experience|kinh nghiệm");
    private static final Pattern CONTEXT_SPLIT = Pattern.compile("(?<![0-9])\\.|[!?;\\n]|\\b(?:and|và)\\b");
    private static final Pattern TERM = Pattern.compile("[\\p{L}][\\p{L}0-9+#.-]{1,}");

    public record Assessment(Integer requiredMonths, Integer observedMonths, BigDecimal score) {}

    public BigDecimal evaluateExperience(String jd, String cv) {
        return assess(jd, cv).score();
    }

    public Assessment assess(String jd, String cv) {
        String description = jd == null ? "" : jd.toLowerCase(Locale.ROOT);
        Integer required = explicitMonths(description, null);
        if (required == null || required == 0) {
            return new Assessment(null, null, BigDecimal.ZERO.setScale(2));
        }
        Integer observed = explicitMonths(cv == null ? "" : cv.toLowerCase(Locale.ROOT), description);
        BigDecimal score = observed == null ? BigDecimal.ZERO : BigDecimal.valueOf(Math.min(observed, required))
                .multiply(BigDecimal.valueOf(100)).divide(BigDecimal.valueOf(required), 2, RoundingMode.HALF_UP);
        return new Assessment(required, observed, score.setScale(2));
    }

    private Integer explicitMonths(String text, String jd) {
        Integer longest = null;
        for (String clause : CONTEXT_SPLIT.split(text)) {
            if (!EXPERIENCE.matcher(clause).find() || clause.contains("ưu tiên") || clause.contains("preferred")
                    || clause.contains("nice to have") || clause.contains("không yêu cầu")) continue;
            if (jd != null && !sharesExperienceContext(clause, jd)) continue;
            var duration = DURATION.matcher(clause);
            while (duration.find()) {
                BigDecimal amount = new BigDecimal(duration.group(1)
                        + (duration.group(2) == null ? "" : "." + duration.group(2)));
                String unit = duration.group(3);
                int months = amount.multiply(BigDecimal.valueOf(unit.startsWith("year") || unit.equals("năm") ? 12 : 1))
                        .setScale(0, RoundingMode.DOWN).intValueExact();
                longest = longest == null ? months : Math.max(longest, months);
            }
        }
        // Explicit durations can describe overlapping roles. Use the strongest single claim.
        return longest;
    }

    private boolean sharesExperienceContext(String clause, String jd) {
        var matcher = TERM.matcher(clause);
        while (matcher.find()) {
            String term = matcher.group().replaceAll("[.]+$", "");
            if (term.length() < 3 || term.matches("years?|months?|experience|kinh|nghiệm|with|for|năm|tháng"
                    + "|the|from|have|has|của|trong|làm|việc|với|minimum|required|professional|relevant")) continue;
            if (Pattern.compile("(?<![\\p{L}0-9])" + Pattern.quote(term) + "(?![\\p{L}0-9])").matcher(jd).find()) {
                return true;
            }
        }
        return false;
    }
}
