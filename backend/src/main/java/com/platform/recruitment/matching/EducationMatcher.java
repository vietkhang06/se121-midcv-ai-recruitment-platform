package com.platform.recruitment.matching;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class EducationMatcher {

    public BigDecimal evaluateEducation(String jdDescription, String cvRawText) {
        if (cvRawText == null || cvRawText.isBlank()) {
            return BigDecimal.ZERO;
        }

        String cvLower = cvRawText.toLowerCase();
        String jdLower = (jdDescription != null) ? jdDescription.toLowerCase() : "";

        boolean jdRequiresDegree = jdLower.contains("bachelor") || jdLower.contains("master") ||
                jdLower.contains("university") || jdLower.contains("degree") ||
                jdLower.contains("đại học") || jdLower.contains("thạc sĩ") || jdLower.contains("kỹ sư");

        boolean cvHasDegree = cvLower.contains("bachelor") || cvLower.contains("master") ||
                cvLower.contains("university") || cvLower.contains("degree") ||
                cvLower.contains("đại học") || cvLower.contains("thạc sĩ") || cvLower.contains("kỹ sư");

        boolean cvHasCollegeOrCert = cvLower.contains("college") || cvLower.contains("cao đẳng") ||
                cvLower.contains("certificate") || cvLower.contains("chứng chỉ");

        if (jdRequiresDegree) {
            if (cvHasDegree) {
                return BigDecimal.valueOf(100.00);
            } else if (cvHasCollegeOrCert) {
                return BigDecimal.valueOf(50.00);
            } else {
                return BigDecimal.ZERO;
            }
        } else {
            // JD has no formal degree requirement; having degree is bonus 100, neutral is 80, no data is 0
            if (cvHasDegree) {
                return BigDecimal.valueOf(100.00);
            } else if (cvHasCollegeOrCert) {
                return BigDecimal.valueOf(90.00);
            } else {
                return BigDecimal.valueOf(80.00);
            }
        }
    }
}
