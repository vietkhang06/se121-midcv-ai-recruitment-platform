package com.platform.recruitment.product;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.application.Application;
import com.platform.recruitment.company.Company;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobStatus;
import com.platform.recruitment.matching.CandidateRankingResponse;
import com.platform.recruitment.matching.MatchScoreResponse;
import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Exercises the real policy objects and production taxonomy without mocks or fixture services. */
class AiScreeningAccessPolicyTest {
  private AiScreeningAccessService policy;

  @BeforeEach
  void setUp() throws Exception {
    policy = new AiScreeningAccessService(new OccupationCatalog(new ObjectMapper()));
  }

  @Test
  void candidateConsentIsMandatoryEvenForAnEligibleProJob() {
    var company = Company.builder()
        .name("Doanh nghiệp đã mua Pro")
        .recruiterPlan("PRO")
        .recruiterProUntil(ZonedDateTime.now().plusDays(30))
        .build();
    var application = Application.builder().job(eligibleJob(company, "MIDCV_IT_001"))
        .aiAnalysisConsent(false).build();

    var access = policy.evaluate(application);

    assertFalse(access.available());
    assertEquals("CONSENT_NOT_GIVEN", access.code());
    assertTrue(access.proDetail());
  }

  @Test
  void consentedPositionsAcrossIndustriesAreScoredWhilePostingPackageRemainsRequired() {
    var company = Company.builder().name("Doanh nghiệp Standard").build();
    var eligible = policy.evaluate(eligibleJob(company, "MIDCV_REF_001"), true);
    assertTrue(eligible.available());
    assertFalse(eligible.proDetail());
    assertEquals("STANDARD", eligible.recruiterPlan());

    var unsupported = policy.evaluate(eligibleJob(company, "0110"), true);
    assertTrue(unsupported.available());
    assertEquals("AVAILABLE", unsupported.code());
    assertFalse(unsupported.itPriority());

    var noPackage = eligibleJob(company, "MIDCV_IT_001");
    noPackage.setAiScreeningPackageCode(null);
    var withoutPackage = policy.evaluate(noPackage, true);
    assertFalse(withoutPackage.available());
    assertEquals("PACKAGE_NOT_ELIGIBLE", withoutPackage.code());
  }

  @Test
  void itPositionsReceivePriorityAndClassificationUsesPublishedThresholds() {
    var company = Company.builder().name("Doanh nghiệp Standard").build();
    var access = policy.evaluate(eligibleJob(company, "MIDCV_IT_041"), true);

    assertTrue(access.available());
    assertTrue(access.itPriority());
    assertEquals("PHU_HOP", policy.classify(new BigDecimal("70")));
    assertEquals("CAN_NHAC", policy.classify(new BigDecimal("50")));
    assertEquals("KHONG_PHU_HOP", policy.classify(new BigDecimal("49.99")));
    assertEquals("CHUA_KHA_DUNG", policy.classify(null));
  }

  @Test
  void standardApiResponsesKeepClassificationButRemoveNumericDetails() {
    var score = MatchScoreResponse.builder()
        .overallScore(new BigDecimal("82"))
        .coreScore(new BigDecimal("80"))
        .githubScore(new BigDecimal("90"))
        .detailAccess(true)
        .build();
    score.redactForStandardPlan(policy);
    assertEquals("PHU_HOP", score.getMatchClassification());
    assertFalse(score.isDetailAccess());
    assertNull(score.getOverallScore());
    assertNull(score.getGithubScore());

    var ranking = CandidateRankingResponse.builder()
        .overallScore(new BigDecimal("55"))
        .coreScore(new BigDecimal("60"))
        .requiredSkillsMatched(4)
        .build();
    ranking.redactForStandardPlan(policy);
    assertEquals("CAN_NHAC", ranking.getStatus());
    assertNull(ranking.getOverallScore());
    assertNull(ranking.getRequiredSkillsMatched());
  }

  private Job eligibleJob(Company company, String occupationCode) {
    return Job.builder()
        .company(company)
        .title("Vị trí chuyên môn")
        .industry("Technology")
        .seniority("MID")
        .description("Mô tả công việc")
        .status(JobStatus.PUBLISHED)
        .aiScreeningPolicyVersion(1)
        .aiScreeningPackageCode("STANDARD_POSTING")
        .occupationCodes(List.of(occupationCode))
        .build();
  }
}
