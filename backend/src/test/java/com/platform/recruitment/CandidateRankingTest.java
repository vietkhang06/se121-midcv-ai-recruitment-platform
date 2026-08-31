package com.platform.recruitment;

import com.platform.recruitment.application.Application;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.matching.CandidateRankingService;
import com.platform.recruitment.matching.MatchResult;
import com.platform.recruitment.matching.MatchResultRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CandidateRankingTest {

    @Mock
    private MatchResultRepository matchResultRepository;

    private CandidateRankingService rankingService;
    private UUID jobId;

    @BeforeEach
    void setUp() {
        rankingService = new CandidateRankingService(matchResultRepository);
        jobId = UUID.randomUUID();
    }

    @Test
    void testCandidateRanking_OrdersByOverallScoreDesc_WithDeterministicTieBreaker() {
        Job job = Job.builder().title("Backend Developer").build();
        job.setId(jobId);

        CandidateProfile c1 = CandidateProfile.builder().fullName("Cand 1").build(); c1.setId(UUID.randomUUID());
        CandidateProfile c2 = CandidateProfile.builder().fullName("Cand 2").build(); c2.setId(UUID.randomUUID());

        Application app1 = Application.builder().job(job).candidate(c1).build(); app1.setId(UUID.randomUUID());
        Application app2 = Application.builder().job(job).candidate(c2).build(); app2.setId(UUID.randomUUID());

        MatchResult mr1 = MatchResult.builder().application(app1).requiredSkillsMissing(0).coreScore(BigDecimal.valueOf(80.0)).overallScore(BigDecimal.valueOf(82.0)).build();
        MatchResult mr2 = MatchResult.builder().application(app2).requiredSkillsMissing(0).coreScore(BigDecimal.valueOf(90.0)).overallScore(BigDecimal.valueOf(92.0)).build();

        when(matchResultRepository.findByApplicationJobId(jobId)).thenReturn(List.of(mr1, mr2));

        List<MatchResult> ranked = rankingService.getRankedCandidatesForJob(jobId, null);

        assertEquals(2, ranked.size());
        assertEquals("Cand 2", ranked.get(0).getApplication().getCandidate().getFullName()); // 92.0%
        assertEquals("Cand 1", ranked.get(1).getApplication().getCandidate().getFullName()); // 82.0%
    }

    @Test
    void testRankingSafety_CandidateWithAllRequiredOutranksCandidateMissingRequired_EvenIfPreferredIsFull() {
        Job job = Job.builder().title("Senior Java Developer").build();
        job.setId(jobId);

        CandidateProfile candA = CandidateProfile.builder().fullName("Candidate A (All Required, No Preferred)").build(); candA.setId(UUID.randomUUID());
        CandidateProfile candB = CandidateProfile.builder().fullName("Candidate B (Missing 1 Required, Full Preferred)").build(); candB.setId(UUID.randomUUID());

        Application appA = Application.builder().job(job).candidate(candA).build(); appA.setId(UUID.randomUUID());
        Application appB = Application.builder().job(job).candidate(candB).build(); appB.setId(UUID.randomUUID());

        // Candidate A: 0 missing required skills, S_overall = 80.0
        MatchResult mrA = MatchResult.builder().application(appA).requiredSkillsMissing(0).coreScore(BigDecimal.valueOf(80.0)).overallScore(BigDecimal.valueOf(80.0)).build();
        // Candidate B: 1 missing required skill, S_overall = 85.0 (due to full preferred skills)
        MatchResult mrB = MatchResult.builder().application(appB).requiredSkillsMissing(1).coreScore(BigDecimal.valueOf(85.0)).overallScore(BigDecimal.valueOf(85.0)).build();

        when(matchResultRepository.findByApplicationJobId(jobId)).thenReturn(List.of(mrA, mrB));

        List<MatchResult> ranked = rankingService.getRankedCandidatesForJob(jobId, null);

        // Candidate A MUST outrank Candidate B because requiredSkillsMissing = 0 < 1!
        assertEquals(2, ranked.size());
        assertEquals("Candidate A (All Required, No Preferred)", ranked.get(0).getApplication().getCandidate().getFullName());
        assertEquals("Candidate B (Missing 1 Required, Full Preferred)", ranked.get(1).getApplication().getCandidate().getFullName());
    }
}
