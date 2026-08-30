package com.platform.recruitment;

import com.platform.recruitment.application.Application;
import com.platform.recruitment.matching.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MatchingPersistenceTest {

    @Mock
    private MatchResultRepository matchResultRepository;

    @Mock
    private MatchFactorRepository factorRepository;

    @Mock
    private EvidenceRepository evidenceRepository;

    private Application application;
    private MatchResult matchResult;

    @BeforeEach
    void setUp() {
        application = Application.builder().build();
        application.setId(UUID.randomUUID());

        matchResult = MatchResult.builder()
                .application(application)
                .coreScore(new BigDecimal("88.00"))
                .githubScore(new BigDecimal("92.00"))
                .overallScore(new BigDecimal("88.60"))
                .coreWeight(new BigDecimal("0.85"))
                .githubWeight(new BigDecimal("0.15"))
                .isGithubActive(true)
                .githubFallbackApplied(false)
                .build();
        matchResult.setId(UUID.randomUUID());
    }

    @Test
    void testMatchResult_Persists3TierScoresAndFactors() {
        MatchFactor skillFactor = MatchFactor.builder()
                .matchResult(matchResult)
                .sourceType("CV")
                .factorType("REQUIRED_SKILL")
                .factorName("Java")
                .rawValue("3 years")
                .normalizedValue(new BigDecimal("100.00"))
                .weight(new BigDecimal("0.400"))
                .score(new BigDecimal("40.00"))
                .evidenceReference("Page 1 CV snippet")
                .build();

        Evidence evidence = Evidence.builder()
                .matchResult(matchResult)
                .sourceType("CV")
                .section("WORK_EXPERIENCE")
                .snippet("Built Spring Boot microservices with Java 17 for 3 years.")
                .normalizedValue(new BigDecimal("100.00"))
                .validationStatus("VERIFIED")
                .build();

        when(matchResultRepository.findByApplicationId(application.getId())).thenReturn(Optional.of(matchResult));
        when(factorRepository.findByMatchResultId(matchResult.getId())).thenReturn(List.of(skillFactor));
        when(evidenceRepository.findByMatchResultId(matchResult.getId())).thenReturn(List.of(evidence));

        MatchResult result = matchResultRepository.findByApplicationId(application.getId()).orElseThrow();
        assertEquals(new BigDecimal("88.00"), result.getCoreScore());
        assertEquals(new BigDecimal("92.00"), result.getGithubScore());
        assertEquals(new BigDecimal("88.60"), result.getOverallScore());
        assertEquals(1, factorRepository.findByMatchResultId(matchResult.getId()).size());
        assertEquals(1, evidenceRepository.findByMatchResultId(matchResult.getId()).size());
    }
}
