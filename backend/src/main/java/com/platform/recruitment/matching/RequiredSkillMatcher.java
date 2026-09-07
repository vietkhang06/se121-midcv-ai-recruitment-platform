package com.platform.recruitment.matching;

import com.platform.recruitment.job.JobRequirement;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Component
public class RequiredSkillMatcher {

    private final SkillNormalizer skillNormalizer;

    public RequiredSkillMatcher() {
        this.skillNormalizer = new SkillNormalizer();
    }

    public RequiredSkillMatcher(SkillNormalizer skillNormalizer) {
        this.skillNormalizer = skillNormalizer != null ? skillNormalizer : new SkillNormalizer();
    }

    public BigDecimal evaluateRequiredSkills(List<JobRequirement> reqSkills, String cvRawText) {
        if (reqSkills == null || reqSkills.isEmpty()) {
            return BigDecimal.valueOf(100.00);
        }

        if (cvRawText == null || cvRawText.isBlank()) {
            return BigDecimal.ZERO;
        }

        int matchedCount = 0;

        for (JobRequirement req : reqSkills) {
            String targetSkill = req.getSkillName();
            if (skillNormalizer.matchesSkill(targetSkill, cvRawText)) {
                matchedCount++;
            }
        }

        double ratio = (double) matchedCount / reqSkills.size();
        return BigDecimal.valueOf(ratio * 100.0).setScale(2, RoundingMode.HALF_UP);
    }
}
