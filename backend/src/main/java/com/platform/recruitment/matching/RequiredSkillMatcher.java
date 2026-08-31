package com.platform.recruitment.matching;

import com.platform.recruitment.job.JobRequirement;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Component
public class RequiredSkillMatcher {

    public BigDecimal evaluateRequiredSkills(List<JobRequirement> reqSkills, String cvRawText) {
        if (reqSkills == null || reqSkills.isEmpty()) {
            return BigDecimal.valueOf(100.00);
        }

        if (cvRawText == null || cvRawText.isBlank()) {
            return BigDecimal.ZERO;
        }

        String cvLower = cvRawText.toLowerCase();
        int matchedCount = 0;

        for (JobRequirement req : reqSkills) {
            String targetSkill = req.getSkillName().toLowerCase();
            
            // Explicit check to prevent false equivalence: Java != JavaScript
            if (targetSkill.equals("java")) {
                if (cvLower.contains("java") && !cvLower.contains("javascript only")) {
                    // Check if it's not just javascript
                    String cleanCv = cvLower.replace("javascript", "");
                    if (cleanCv.contains("java")) {
                        matchedCount++;
                    }
                }
            } else if (cvLower.contains(targetSkill)) {
                matchedCount++;
            }
        }

        double ratio = (double) matchedCount / reqSkills.size();
        return BigDecimal.valueOf(ratio * 100.0).setScale(2, RoundingMode.HALF_UP);
    }
}
