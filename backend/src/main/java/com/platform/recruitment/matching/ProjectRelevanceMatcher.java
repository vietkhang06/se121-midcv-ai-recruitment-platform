package com.platform.recruitment.matching;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class ProjectRelevanceMatcher {

    public BigDecimal evaluateProjectRelevance(String jdDescription, String cvRawText) {
        if (cvRawText == null || cvRawText.isBlank()) {
            return BigDecimal.valueOf(50.00);
        }

        String cvLower = cvRawText.toLowerCase();
        if (cvLower.contains("project") || cvLower.contains("microservices") || cvLower.contains("platform")) {
            return BigDecimal.valueOf(90.00);
        }

        return BigDecimal.valueOf(60.00);
    }
}
