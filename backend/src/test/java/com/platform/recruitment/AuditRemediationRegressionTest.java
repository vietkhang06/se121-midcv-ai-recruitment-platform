package com.platform.recruitment;

import com.platform.recruitment.application.*;
import com.platform.recruitment.candidate.*;
import com.platform.recruitment.common.*;
import com.platform.recruitment.cv.*;
import com.platform.recruitment.job.*;
import com.platform.recruitment.matching.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class AuditRemediationRegressionTest {
    JobRepository jobs=mock(JobRepository.class);
    JobRequirementRepository requirements=mock(JobRequirementRepository.class);
    CandidateProfileRepository candidates=mock(CandidateProfileRepository.class);
    ApplicationRepository applications=mock(ApplicationRepository.class);
    CVRepository cvs=mock(CVRepository.class);
    CVVersionRepository versions=mock(CVVersionRepository.class);
    MatchResultRepository results=mock(MatchResultRepository.class);
    MatchFactorRepository factors=mock(MatchFactorRepository.class);
    GitHubScoringService github=mock(GitHubScoringService.class);
    MatchingEngineService engine;
    CandidateProfile candidate; CV cv; CVVersion version; Job job; Application application;

    @BeforeEach void setup() {
        candidate=CandidateProfile.builder().fullName("Synthetic Candidate").build();candidate.setId(UUID.randomUUID());
        cv=CV.builder().candidate(candidate).title("CV B").status("CONFIRMED").rawText("Java Kubernetes").build();cv.setId(UUID.randomUUID());
        version=CVVersion.builder().cv(cv).versionNumber(2).title("B v2").status("CONFIRMED")
                .rawTextContent("Java Kubernetes")
                .structuredJsonContent("{\"skills\":[{\"name\":{\"value\":\"Python\",\"origin\":\"USER_ADDED\"}}]}").build();
        version.setId(UUID.randomUUID());
        job=Job.builder().title("Python engineer").description("Python backend engineer").industry("IT").status(JobStatus.PUBLISHED).build();job.setId(UUID.randomUUID());
        application=Application.builder().job(job).candidate(candidate).appliedCv(cv).appliedCvVersion(version).build();application.setId(UUID.randomUUID());
        engine=new MatchingEngineService(jobs,requirements,candidates,applications,cvs,results,factors,
                new RequiredSkillMatcher(),new PreferredSkillMatcher(),new ExperienceMatcher(),new EducationMatcher(),new ProjectRelevanceMatcher(),github);
        engine.setCvVersionRepository(versions);
        when(jobs.findById(job.getId())).thenReturn(Optional.of(job));
        when(candidates.findById(candidate.getId())).thenReturn(Optional.of(candidate));
        when(applications.findByJobIdAndCandidateId(job.getId(),candidate.getId())).thenReturn(Optional.of(application));
        when(versions.findById(version.getId())).thenReturn(Optional.of(version));
        when(results.save(any())).thenAnswer(i -> {MatchResult r=i.getArgument(0);r.setId(UUID.randomUUID());return r;});
        when(github.calculateGitHubSupportingScore(any(),any(),any())).thenReturn(Optional.empty());
        when(requirements.findByJobId(job.getId())).thenReturn(List.of(
            JobRequirement.builder().job(job).skillName("Python").requirementType(RequirementType.REQUIRED).build(),
            JobRequirement.builder().job(job).skillName("Java").requirementType(RequirementType.REQUIRED).build()));
    }
    @Test void usesAppliedReviewedVersionAndDoesNotResurrectDeletedRawSkills() {
        MatchResult r=engine.calculateAndPersistMatchResult(job.getId(),candidate.getId());
        assertEquals(1,r.getRequiredSkillsMatched());assertEquals(1,r.getRequiredSkillsMissing());
        verifyNoInteractions(cvs);assertSame(application,r.getApplication());
    }
    @Test void previewDoesNotWriteApplicationResultOrFactors() {
        MatchResult r=engine.previewMatch(job.getId(),candidate.getId(),version.getId());
        assertEquals("COMPLETED",r.getStatus());assertNull(r.getId());
        verifyNoInteractions(applications,results,factors);
        MatchScoreResponse dto=MatchScoreResponse.fromEntity(r);assertNull(dto.getApplicationId());assertEquals(job.getId(),dto.getJobId());
    }
    @Test void missingApplicationCannotBeCreatedByRecalculation() {
        when(applications.findByJobIdAndCandidateId(any(),any())).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class,() -> engine.calculateAndPersistMatchResult(job.getId(),candidate.getId()));
        verify(applications,never()).save(any());verifyNoInteractions(results,factors);
    }
    @ParameterizedTest @NullAndEmptySource @ValueSource(strings={"DRAFT","PROCESSING","FAILED","PARSED"})
    void unconfirmedStatesAreRejected(String status) {
        version.setStatus(status);
        assertThrows(CustomException.class,() -> engine.calculateAndPersistMatchResult(job.getId(),candidate.getId()));
        verifyNoInteractions(results,factors);
    }
    @Test void foreignVersionCannotBePreviewed() {
        CandidateProfile other=CandidateProfile.builder().build();other.setId(UUID.randomUUID());cv.setCandidate(other);
        assertThrows(CustomException.class,() -> engine.previewMatch(job.getId(),candidate.getId(),version.getId()));
        verifyNoInteractions(applications,results,factors);
    }
    @Test void ninetyTenPolicyIsUsed() {
        JobMatchingPolicyRepository policies=mock(JobMatchingPolicyRepository.class);
        JobMatchingPolicy policy=JobMatchingPolicy.createDefaultPolicy(job);
        policy.setCoreWeight(new BigDecimal("0.90"));policy.setGithubWeight(new BigDecimal("0.10"));policy.setIsGithubActive(true);
        when(policies.findByJobId(job.getId())).thenReturn(Optional.of(policy));ReflectionTestUtils.setField(engine,"jobMatchingPolicyRepository",policies);
        when(github.calculateGitHubSupportingScore(any(),any(),any())).thenReturn(Optional.of(new BigDecimal("100")));
        MatchResult r=engine.calculateAndPersistMatchResult(job.getId(),candidate.getId());
        assertEquals(0,new BigDecimal("0.90").compareTo(r.getCoreWeight()));assertEquals(0,new BigDecimal("0.10").compareTo(r.getGithubWeight()));
        BigDecimal expected=r.getCoreScore().multiply(new BigDecimal("0.90")).add(new BigDecimal("10")).setScale(2,RoundingMode.HALF_UP);
        assertEquals(0,expected.compareTo(r.getOverallScore()));
    }
    @Test void absentGithubIsNeutral() {
        MatchResult r=engine.calculateAndPersistMatchResult(job.getId(),candidate.getId());
        assertEquals(0,BigDecimal.ONE.compareTo(r.getCoreWeight()));assertEquals(0,r.getCoreScore().compareTo(r.getOverallScore()));
    }

    @Test void submitSavesActualStructuredVersionAndReturnsItsNumber() {
        var actor=com.platform.recruitment.user.User.builder().role(com.platform.recruitment.user.Role.CANDIDATE).build();actor.setId(UUID.randomUUID());
        when(candidates.findByUserIdForUpdate(actor.getId())).thenReturn(Optional.of(candidate));
        when(cvs.findByIdForUpdate(cv.getId())).thenReturn(Optional.of(cv));
        when(versions.findByCvIdOrderByVersionNumberDesc(cv.getId())).thenReturn(List.of(version));
        when(jobs.findByIdForApply(job.getId())).thenReturn(Optional.of(job));
        when(applications.save(any())).thenReturn(application);
        var snapshots=mock(ApplicationCVSnapshotRepository.class);
        var scorer=mock(MatchingEngineService.class);
        var svc=new ApplicationService(applications,snapshots,jobs,candidates,
                mock(com.platform.recruitment.company.RecruiterProfileRepository.class),cvs,versions,scorer);
        var request=new SubmitApplicationRequest();request.setJobId(job.getId());request.setCvId(cv.getId());
        ApplicationResponse response=svc.submitApplication(actor,request);
        var captured=org.mockito.ArgumentCaptor.forClass(ApplicationCVSnapshot.class);
        verify(snapshots).save(captured.capture());
        assertEquals(version.getStructuredJsonContent(),captured.getValue().getStructuredJsonSnapshot());
        assertEquals(version.getRawTextContent(),captured.getValue().getRawTextSnapshot());
        assertEquals(version.getId(),response.getAppliedCvVersionId());
        assertEquals(2,response.getAppliedCvVersionNumber());
    }
    @Test void submitDoesNotHideMatchingFailure() {
        var actor=com.platform.recruitment.user.User.builder().role(com.platform.recruitment.user.Role.CANDIDATE).build();actor.setId(UUID.randomUUID());
        when(candidates.findByUserId(actor.getId())).thenReturn(Optional.of(candidate));
        when(cvs.findById(cv.getId())).thenReturn(Optional.of(cv));
        when(versions.findByCvIdOrderByVersionNumberDesc(cv.getId())).thenReturn(List.of(version));
        when(applications.save(any())).thenReturn(application);
        var scorer=mock(MatchingEngineService.class);
        when(scorer.calculateAndPersistMatchResult(any(),any())).thenThrow(new CustomException(ErrorCode.SERVICE_UNAVAILABLE,"Synthetic failure"));
        var svc=new ApplicationService(applications,mock(ApplicationCVSnapshotRepository.class),jobs,candidates,
                mock(com.platform.recruitment.company.RecruiterProfileRepository.class),cvs,versions,scorer);
        var request=new SubmitApplicationRequest();request.setJobId(job.getId());request.setCvId(cv.getId());
        assertThrows(CustomException.class,()->svc.submitApplication(actor,request));
        // This unit test proves propagation, not database rollback. Transaction acceptance is separate.
    }

    @Test void githubPolicyCapAndDisabledSumAreValidated() {
        var svc=new JobMatchingPolicyService(null,null,null,null,null,null);
        var dto=JobMatchingPolicyDto.fromEntity(JobMatchingPolicy.createDefaultPolicy(job));
        dto.setCoreWeight(new BigDecimal("0.80"));dto.setGithubWeight(new BigDecimal("0.20"));
        assertThrows(CustomException.class,()->svc.validateWeights(dto));
        dto.setCoreWeight(new BigDecimal("0.90"));dto.setGithubWeight(new BigDecimal("0.10"));
        assertDoesNotThrow(()->svc.validateWeights(dto));
        dto.setIsGithubActive(false);dto.setCoreWeight(new BigDecimal("0.80"));
        assertThrows(CustomException.class,()->svc.validateWeights(dto));
    }
}
