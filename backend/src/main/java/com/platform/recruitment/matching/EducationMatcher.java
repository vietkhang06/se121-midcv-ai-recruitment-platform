package com.platform.recruitment.matching;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class EducationMatcher {

    public BigDecimal evaluateEducation(String jdDescription, String cvRawText) {
        if (cvRawText == null || cvRawText.isBlank()) {
            return BigDecimal.valueOf(60.00);
        }

        String cvLower = cvRawText.toLowerCase();
        if (cvLower.contains("bachelor") || cvLower.contains("master") || cvLower.contains("university") || cvLower.contains("degree")) {
            return BigDecimal.valueOf(100.00);
        }

        return BigDecimal.valueOf(70.00); // Missing explicit degree is not automatic rejection
    }
}
