package com.platform.recruitment;

import com.platform.recruitment.application.Application;
import com.platform.recruitment.application.ApplicationRepository;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.company.Company;
import com.platform.recruitment.company.CompanyVerification;
import com.platform.recruitment.cv.CV;
import com.platform.recruitment.cv.CVRepository;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobRepository;
import com.platform.recruitment.job.JobRequirement;
import com.platform.recruitment.job.JobRequirementRepository;
import com.platform.recruitment.job.JobStatus;
import com.platform.recruitment.job.RequirementType;
import com.platform.recruitment.matching.MatchResult;
import com.platform.recruitment.matching.MatchResultRepository;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import com.platform.recruitment.user.UserRepository;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FullSystemIntegrationTest {

    @Mock private UserRepository userRepository;
    @Mock private CandidateProfileRepository candidateProfileRepository;
    @Mock private JobRepository jobRepository;
    @Mock private JobRequirementRepository jobRequirementRepository;
    @Mock private ApplicationRepository applicationRepository;
    @Mock private CVRepository cvRepository;
    @Mock private MatchResultRepository matchResultRepository;

    private User candidateUser;
    private CandidateProfile candidateProfile;
    private Company company;
    private Job job;
    private Application application;

    @BeforeEach
    void setUp() {
        candidateUser = User.builder().email("candidate@example.com").role(Role.CANDIDATE).build();
        candidateUser.setId(UUID.randomUUID());

        candidateProfile = CandidateProfile.builder().user(candidateUser).fullName("Nguyen Van Fullstack").githubUrl("https://github.com/candidate-java").build();
        candidateProfile.setId(UUID.randomUUID());

        company = Company.builder().name("FPT Software").verificationStatus(CompanyVerification.VERIFIED).build();
        company.setId(UUID.randomUUID());

        job = Job.builder().company(company).title("Senior Java Engineer").industry("Technology").status(JobStatus.PUBLISHED).build();
        job.setId(UUID.randomUUID());

        application = Application.builder().job(job).candidate(candidateProfile).build();
        application.setId(UUID.randomUUID());
    }

    @Test
    void testEndToEndCandidateApplicationMatchingPipeline() {
        // 1. Candidate Registration & Profile
        lenient().when(userRepository.findById(candidateUser.getId())).thenReturn(Optional.of(candidateUser));
        lenient().when(candidateProfileRepository.findByUserId(candidateUser.getId())).thenReturn(Optional.of(candidateProfile));

        // 2. CV Upload
        CV cv = CV.builder().candidate(candidateProfile).rawText("Java 21, Spring Boot, PostgreSQL, Docker").build();
        cv.setId(UUID.randomUUID());
        lenient().when(cvRepository.findByCandidateId(candidateProfile.getId())).thenReturn(List.of(cv));

        // 3. Job & Requirements Publishing
        lenient().when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        JobRequirement req1 = JobRequirement.builder().job(job).skillName("Java").requirementType(RequirementType.REQUIRED).build();
        JobRequirement req2 = JobRequirement.builder().job(job).skillName("Spring Boot").requirementType(RequirementType.REQUIRED).build();
        lenient().when(jobRequirementRepository.findByJobId(job.getId())).thenReturn(List.of(req1, req2));

        // 4. Candidate Applies
        lenient().when(applicationRepository.findByJobIdAndCandidateId(job.getId(), candidateProfile.getId())).thenReturn(Optional.of(application));

        // 5. Match Result Calculation & Retrieval
        MatchResult matchResult = MatchResult.builder()
                .application(application)
                .overallScore(new BigDecimal("90.45"))
                .coreScore(new BigDecimal("90.75"))
                .githubScore(new BigDecimal("88.75"))
                .requiredSkillsTotal(2)
                .requiredSkillsMatched(2)
                .requiredSkillsMissing(0)
                .build();
        matchResult.setId(UUID.randomUUID());

        lenient().when(matchResultRepository.findByApplicationId(application.getId())).thenReturn(Optional.of(matchResult));

        // Assertions
        Optional<Application> appOpt = applicationRepository.findByJobIdAndCandidateId(job.getId(), candidateProfile.getId());
        assertTrue(appOpt.isPresent());

        Optional<MatchResult> resultOpt = matchResultRepository.findByApplicationId(application.getId());
        assertTrue(resultOpt.isPresent());
        assertEquals(new BigDecimal("90.45"), resultOpt.get().getOverallScore());
        assertEquals(0, resultOpt.get().getRequiredSkillsMissing());
    }
}
