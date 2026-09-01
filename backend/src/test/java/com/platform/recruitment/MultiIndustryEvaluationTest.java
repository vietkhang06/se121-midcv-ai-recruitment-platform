package com.platform.recruitment;

import com.platform.recruitment.github.GitHubAssessmentRepository;
import com.platform.recruitment.github.GitHubProfileRepository;
import com.platform.recruitment.matching.GitHubScoringService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class MultiIndustryEvaluationTest {

    @Mock private GitHubProfileRepository gitHubProfileRepository;
    @Mock private GitHubAssessmentRepository gitHubAssessmentRepository;

    private GitHubScoringService gitHubScoringService;

    @BeforeEach
    void setUp() {
        gitHubScoringService = new GitHubScoringService(gitHubProfileRepository, gitHubAssessmentRepository);
    }

    @Test
    void testMultiIndustryGitHubBehavior() {
        UUID candidateId = UUID.randomUUID();

        // Marketing Industry -> Non-Technical -> Returns Optional.empty() (Disabled)
        Optional<BigDecimal> marketingScore = gitHubScoringService.calculateGitHubSupportingScore(candidateId, "Marketing", "Marketing description");
        assertTrue(marketingScore.isEmpty());

        // Finance Industry -> Non-Technical -> Returns Optional.empty() (Disabled)
        Optional<BigDecimal> financeScore = gitHubScoringService.calculateGitHubSupportingScore(candidateId, "Finance", "Finance description");
        assertTrue(financeScore.isEmpty());

        // Design Industry -> Non-Technical -> Returns Optional.empty() (Disabled)
        Optional<BigDecimal> designScore = gitHubScoringService.calculateGitHubSupportingScore(candidateId, "Design", "Design description");
        assertTrue(designScore.isEmpty());
    }
}
