package com.platform.recruitment.product;

import com.platform.recruitment.application.Application;
import com.platform.recruitment.company.Company;
import com.platform.recruitment.company.dto.CompanyResponse;
import com.platform.recruitment.application.ApplicationResponse;
import com.platform.recruitment.job.Job;
import java.time.ZonedDateTime;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ProductEntityRulesTest {
    @Test
    void aiScreeningConsentDefaultsToFalseForNewApplications() {
        assertFalse(Application.builder().build().getAiAnalysisConsent());
    }

    @Test
    void recruiterProRequiresUnexpiredProPlan() {
        Company company = Company.builder().recruiterPlan("PRO")
                .recruiterProUntil(ZonedDateTime.now().plusDays(1)).build();
        assertTrue(company.hasActiveRecruiterPro());
        company.setRecruiterProUntil(ZonedDateTime.now().minusSeconds(1));
        assertFalse(company.hasActiveRecruiterPro());
        company.setRecruiterPlan("STANDARD");
        company.setRecruiterProUntil(ZonedDateTime.now().plusDays(1));
        assertFalse(company.hasActiveRecruiterPro());
    }

    @Test
    void companyResponseExposesLicenseMetadataButNeverLicenseBytes() {
        Company company = Company.builder().businessLicense(new byte[] {1, 2, 3})
                .businessLicenseName("license.pdf").build();
        CompanyResponse response = CompanyResponse.fromEntity(company);
        assertEquals("license.pdf", response.getBusinessLicenseName());
        assertFalse(java.util.Arrays.stream(CompanyResponse.class.getDeclaredFields())
                .anyMatch(field -> field.getType() == byte[].class));
    }

    @Test
    void newJobDefaultsToEmptyOccupationCodesUntilRecruiterSelectsTaxonomy() {
        Job job = Job.builder().build();
        assertNotNull(job.getOccupationCodes());
        assertTrue(job.getOccupationCodes().isEmpty());
    }

    @Test
    void standardRecruiterApplicationResponseContainsClassificationOnly() {
        ApplicationResponse response = ApplicationResponse.builder()
                .matchScore(new java.math.BigDecimal("68.5"))
                .matchStatus("PGVECTOR_READY")
                .build();
        response.redactMatchForStandardPlan();
        assertEquals("CAN_NHAC", response.getMatchClassification());
        assertEquals("CAN_NHAC", response.getMatchStatus());
        assertNull(response.getMatchScore());
    }

    @Test
    void declinedConsentIsNotPresentedAsAScoredClassification() {
        ApplicationResponse response = ApplicationResponse.builder()
                .matchStatus("CONSENT_NOT_GIVEN").build();
        response.redactMatchForStandardPlan();
        assertEquals("CONSENT_NOT_GIVEN", response.getMatchStatus());
        assertEquals("CHUA_KHA_DUNG", response.getMatchClassification());
        assertNull(response.getMatchScore());
    }
}
