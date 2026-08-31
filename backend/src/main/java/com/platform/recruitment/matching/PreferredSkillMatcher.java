package com.platform.recruitment.matching;

import com.platform.recruitment.job.JobRequirement;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Component
public class PreferredSkillMatcher {

    public BigDecimal evaluatePreferredSkills(List<JobRequirement> prefSkills, String cvRawText) {
        if (prefSkills == null || prefSkills.isEmpty()) {
            return BigDecimal.valueOf(100.00);
        }

        if (cvRawText == null || cvRawText.isBlank()) {
            return BigDecimal.valueOf(50.00); // Missing preferred skill does NOT equal hard failure
        }

        String cvLower = cvRawText.toLowerCase();
        int matchedCount = 0;

        for (JobRequirement pref : prefSkills) {
            if (cvLower.contains(pref.getSkillName().toLowerCase())) {
                matchedCount++;
            }
        }

        double ratio = (double) matchedCount / prefSkills.size();
        return BigDecimal.valueOf(ratio * 100.0).setScale(2, RoundingMode.HALF_UP);
    }
}
