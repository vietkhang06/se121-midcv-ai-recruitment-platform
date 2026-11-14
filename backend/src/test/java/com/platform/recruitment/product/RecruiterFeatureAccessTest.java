package com.platform.recruitment.product;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.company.Company;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobStatus;
import com.platform.recruitment.application.Application;
import com.platform.recruitment.matching.MatchInspectionResponse;
import java.time.ZonedDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class RecruiterFeatureAccessTest {
  private final Company standard = Company.builder().name("Demo Standard")
      .recruiterPlan("STANDARD").build();

  @Test
  void devFlagOpensOnlyMatchingDetailsAndStillRequiresCandidateConsent() throws Exception {
    var environment = new MockEnvironment();
    environment.setActiveProfiles("dev");
    var access = new RecruiterFeatureAccess(environment, true);
    assertTrue(access.isDevelopmentOverride(standard));
    assertTrue(access.hasProFeatures(standard));
    assertEquals("STANDARD", standard.getRecruiterPlan());

    var policy = new AiScreeningAccessService(new OccupationCatalog(new ObjectMapper()));
    policy.setFeatureAccess(access);
    var job = Job.builder().company(standard).status(JobStatus.PUBLISHED).build();
    assertFalse(policy.evaluate(job, false).available());
    assertEquals("CONSENT_NOT_GIVEN", policy.evaluate(job, false).code());
    assertTrue(policy.evaluate(job, true).proDetail());
  }

  @Test
  void overrideIsOffByDefaultAndForbiddenInProdEvenIfFlagIsTrue() {
    var dev = new MockEnvironment();
    dev.setActiveProfiles("dev");
    assertFalse(new RecruiterFeatureAccess(dev, false).hasProFeatures(standard));
    var prod = new MockEnvironment();
    prod.setActiveProfiles("prod");
    assertFalse(new RecruiterFeatureAccess(prod, true).hasProFeatures(standard));
    var mixed = new MockEnvironment();
    mixed.setActiveProfiles("dev", "prod");
    assertFalse(new RecruiterFeatureAccess(mixed, true).hasProFeatures(standard));
    assertFalse(new RecruiterFeatureAccess(dev, true).hasProFeatures(null));
  }

  @Test
  void realProKeepsItsFeaturesWithoutDevelopmentFlag() {
    var pro = Company.builder().name("Real Pro").recruiterPlan("PRO")
        .recruiterProUntil(ZonedDateTime.now().plusDays(1)).build();
    var prod = new MockEnvironment();
    prod.setActiveProfiles("prod");
    var access = new RecruiterFeatureAccess(prod, true);
    assertTrue(access.hasProFeatures(pro));
    assertFalse(access.isDevelopmentOverride(pro));
  }

  @Test
  void consentIsRequiredEvenWhenDevelopmentOverrideIsEnabled() throws Exception {
    var environment = new MockEnvironment();
    environment.setActiveProfiles("dev");
    var policy = new AiScreeningAccessService(new OccupationCatalog(new ObjectMapper()));
    policy.setFeatureAccess(new RecruiterFeatureAccess(environment, true));
    var application = Application.builder().job(Job.builder().company(standard).status(JobStatus.PUBLISHED).build())
        .aiAnalysisConsent(false).build();
    assertFalse(policy.evaluate(application).available());
    assertEquals("CONSENT_NOT_GIVEN", policy.evaluate(application).code());
  }

  @Test
  void redactedInspectionSignalsNoDetailAndRemovesScoreEvidenceAndProvenance() {
    var response = MatchInspectionResponse.builder().overallScore(new java.math.BigDecimal("79.26"))
        .calculationStatus("PGVECTOR_READY").semanticMethod("PGVECTOR_COSINE_SIMILARITY")
        .matchFactors(java.util.List.of()).evidences(java.util.List.of()).detailAccess(true).build();
    response.redactForStandardPlan();
    assertFalse(response.getDetailAccess());
    assertNull(response.getOverallScore());
    assertNull(response.getSemanticMethod());
    assertNull(response.getEvidences());
  }
}
