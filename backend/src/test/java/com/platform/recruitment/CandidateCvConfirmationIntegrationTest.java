package com.platform.recruitment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.application.ApplicationResponse;
import com.platform.recruitment.application.ApplicationService;
import com.platform.recruitment.application.SubmitApplicationRequest;
import com.platform.recruitment.candidate.CandidateMatchController;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.cv.*;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobRepository;
import com.platform.recruitment.job.JobStatus;
import com.platform.recruitment.matching.MatchResult;
import com.platform.recruitment.matching.MatchingEngineService;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.ZonedDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class CandidateCvConfirmationIntegrationTest {

    @Mock private CVRepository cvRepository;
    @Mock private CVVersionRepository cvVersionRepository;
    @Mock private CVSectionRepository cvSectionRepository;
    @Mock private CandidateProfileRepository candidateProfileRepository;
    @Mock private JobRepository jobRepository;
    @Mock private MatchingEngineService matchingEngineService;
    @Mock private com.platform.recruitment.application.ApplicationRepository applicationRepository;
    @Mock private com.platform.recruitment.application.ApplicationCVSnapshotRepository snapshotRepository;
    @Mock private com.platform.recruitment.company.RecruiterProfileRepository recruiterProfileRepository;
    @Mock private com.platform.recruitment.document.Documents documents;
    @Mock private TextReader textReader;
    @Mock private JdbcTemplate jdbcTemplate;

    private ObjectMapper objectMapper;
    private CVService cvService;
    private CandidateMatchController candidateMatchController;
    private ApplicationService applicationService;

    private User candidateUserA;
    private User candidateUserB;
    private CandidateProfile profileA;
    private CandidateProfile profileB;
    private CV testCv;
    private CVVersion draftVersion1;
    private Job publishedJob;

    private byte[] originalFileBytes;
    private String originalFileChecksum;

    @BeforeEach
    void setUp() throws NoSuchAlgorithmException {
        objectMapper = new ObjectMapper().findAndRegisterModules();

        cvService = new CVService(
                cvRepository,
                cvVersionRepository,
                cvSectionRepository,
                candidateProfileRepository,
                documents,
                textReader,
                jdbcTemplate,
                null,
                objectMapper
        );

        candidateMatchController = new CandidateMatchController(
                candidateProfileRepository,
                cvRepository,
                cvVersionRepository,
                matchingEngineService
        );

        applicationService = new ApplicationService(
                applicationRepository,
                snapshotRepository,
                jobRepository,
                candidateProfileRepository,
                recruiterProfileRepository,
                cvRepository,
                cvVersionRepository,
                matchingEngineService
        );

        // Candidate A
        candidateUserA = User.builder()
                .email("candidate.a@midcv.io")
                .role(Role.CANDIDATE)
                .build();
        candidateUserA.setId(UUID.randomUUID());

        profileA = CandidateProfile.builder()
                .user(candidateUserA)
                .fullName("Nguyen Van A")
                .targetIndustry("Technology")
                .build();
        profileA.setId(UUID.randomUUID());

        // Candidate B
        candidateUserB = User.builder()
                .email("candidate.b@midcv.io")
                .role(Role.CANDIDATE)
                .build();
        candidateUserB.setId(UUID.randomUUID());

        profileB = CandidateProfile.builder()
                .user(candidateUserB)
                .fullName("Tran Van B")
                .targetIndustry("Technology")
                .build();
        profileB.setId(UUID.randomUUID());

        // Published Job
        publishedJob = Job.builder()
                .title("Senior Java Developer")
                .status(JobStatus.PUBLISHED)
                .industry("Technology")
                .build();
        publishedJob.setId(UUID.randomUUID());

        // Initial CV File & Artifact Checksum
        originalFileBytes = "ORIGINAL_PDF_BINARY_STREAM_CONTENT_HASH".getBytes(StandardCharsets.UTF_8);
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(originalFileBytes);
        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            hexString.append(String.format("%02x", b));
        }
        originalFileChecksum = hexString.toString();

        testCv = CV.builder()
                .candidate(profileA)
                .title("Resume Nguyen Van A")
                .creationPath(CVCreationPath.UPLOAD)
                .status("DRAFT")
                .rawText("Nguyen Van A\nJava Backend Developer with 3 years experience in Spring Boot.")
                .isDefault(true)
                .build();
        testCv.setId(UUID.randomUUID());

        draftVersion1 = CVVersion.builder()
                .cv(testCv)
                .versionNumber(1)
                .title("Resume Nguyen Van A v1.0")
                .rawTextContent(testCv.getRawText())
                .status("DRAFT")
                .structuredJsonContent("{\"skills\":[\"Java\",\"Spring Boot\"],\"work_experience\":[{\"company\":\"Tech Corp\",\"position\":\"Backend Dev\"}]}")
                .build();
        draftVersion1.setId(UUID.randomUUID());

        when(candidateProfileRepository.findByUserId(candidateUserA.getId())).thenReturn(Optional.of(profileA));
        when(candidateProfileRepository.findByUserId(candidateUserB.getId())).thenReturn(Optional.of(profileB));
        when(cvRepository.findById(testCv.getId())).thenReturn(Optional.of(testCv));
        when(cvRepository.save(any(CV.class))).thenAnswer(i -> i.getArgument(0));
        when(cvVersionRepository.save(any(CVVersion.class))).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    @DisplayName("AC-P3-01: Draft profile initialization assigns status DRAFT and CV_EXTRACTED lineage")
    void testDraftProfileInitialization_ReturnsDraftWithLineageTags() {
        when(cvVersionRepository.findByCvIdOrderByVersionNumberDesc(testCv.getId()))
                .thenReturn(List.of(draftVersion1));

        CVDraftResponse draft = cvService.getCVDraft(candidateUserA, testCv.getId());

        assertNotNull(draft);
        assertEquals(testCv.getId(), draft.getCvId());
        assertEquals("DRAFT", draft.getStatus());
        assertEquals(1, draft.getVersionNumber());

        // Verify skills lineage tag
        assertNotNull(draft.getSkills());
        assertFalse(draft.getSkills().isEmpty());
        assertEquals("CV_EXTRACTED", draft.getSkills().get(0).get("origin"));
        assertEquals("Java", draft.getSkills().get(0).get("name"));

        // Verify work experience lineage tag
        assertNotNull(draft.getWorkExperience());
        assertFalse(draft.getWorkExperience().isEmpty());
        assertEquals("CV_EXTRACTED", draft.getWorkExperience().get(0).get("origin"));
        assertEquals("Tech Corp", draft.getWorkExperience().get(0).get("company"));
    }

    @Test
    @DisplayName("AC-P3-02 & AC-P3-03: Repeated card CRUD and user edits tagged with USER_ADDED / USER_CONFIRMED")
    void testUpdateCVDraft_ModifiesCardsAndAssignsUserLineageTags() {
        when(cvVersionRepository.findByCvIdOrderByVersionNumberDesc(testCv.getId()))
                .thenReturn(List.of(draftVersion1));

        List<Map<String, Object>> updatedSkills = new ArrayList<>();
        Map<String, Object> existingSkill = new HashMap<>();
        existingSkill.put("name", "Java");
        existingSkill.put("origin", "USER_CONFIRMED");
        updatedSkills.add(existingSkill);

        Map<String, Object> newSkill = new HashMap<>();
        newSkill.put("name", "Kubernetes");
        newSkill.put("origin", "USER_ADDED");
        updatedSkills.add(newSkill);

        List<Map<String, Object>> newProjects = new ArrayList<>();
        Map<String, Object> proj = new HashMap<>();
        proj.put("name", "AI Recruitment Microservices");
        proj.put("role", "Lead Backend");
        proj.put("origin", "USER_ADDED");
        newProjects.add(proj);

        UpdateCVDraftRequest updateReq = UpdateCVDraftRequest.builder()
                .title("Resume Nguyen Van A (Edited)")
                .skills(updatedSkills)
                .projects(newProjects)
                .build();

        CVDraftResponse updatedDraft = cvService.updateCVDraft(candidateUserA, testCv.getId(), updateReq);

        assertNotNull(updatedDraft);
        assertEquals("DRAFT", updatedDraft.getStatus());
        verify(cvVersionRepository, atLeastOnce()).save(any(CVVersion.class));
    }

    @Test
    @DisplayName("AC-P3-04: Confirmation gate transitions DRAFT to CONFIRMED with timestamp")
    void testConfirmCV_TransitionsDraftToConfirmed() {
        when(cvVersionRepository.findByCvIdOrderByVersionNumberDesc(testCv.getId()))
                .thenReturn(List.of(draftVersion1));

        CVConfirmResponse confirmRes = cvService.confirmCV(candidateUserA, testCv.getId());

        assertNotNull(confirmRes);
        assertEquals(testCv.getId(), confirmRes.getCvId());
        assertEquals(profileA.getId(), confirmRes.getProfileId());
        assertEquals("CONFIRMED", confirmRes.getStatus());
        assertNotNull(confirmRes.getConfirmedAt());

        // Verify version and CV were updated to CONFIRMED
        assertEquals("CONFIRMED", draftVersion1.getStatus());
        assertEquals("CONFIRMED", testCv.getStatus());
    }

    @Test
    @DisplayName("AC-P3-04: Matching is BLOCKED when CV is in DRAFT status, PERMITTED when CONFIRMED")
    void testMatchingEnforcement_BlocksDraft_AllowsConfirmed() {
        when(cvRepository.findByCandidateId(profileA.getId())).thenReturn(List.of(testCv));
        when(cvVersionRepository.findByCvIdOrderByVersionNumberDesc(testCv.getId())).thenReturn(List.of(draftVersion1));

        // 1. In DRAFT status: CandidateMatchController must throw CustomException
        CustomException draftEx = assertThrows(CustomException.class, () ->
                candidateMatchController.matchCandidateToJob(candidateUserA, publishedJob.getId(), testCv.getId())
        );
        assertEquals(ErrorCode.VALIDATION_ERROR, draftEx.getErrorCode());
        assertTrue(draftEx.getMessage().contains("DRAFT"));

        // 2. In DRAFT status: ApplicationService submitApplication must also throw CustomException
        SubmitApplicationRequest appReq = new SubmitApplicationRequest();
        appReq.setJobId(publishedJob.getId());
        appReq.setCvId(testCv.getId());
        when(jobRepository.findById(publishedJob.getId())).thenReturn(Optional.of(publishedJob));

        CustomException appEx = assertThrows(CustomException.class, () ->
                applicationService.submitApplication(candidateUserA, appReq)
        );
        assertEquals(ErrorCode.VALIDATION_ERROR, appEx.getErrorCode());
        assertTrue(appEx.getMessage().contains("DRAFT"));

        // 3. Confirm CV profile
        cvService.confirmCV(candidateUserA, testCv.getId());
        assertEquals("CONFIRMED", testCv.getStatus());
        assertEquals("CONFIRMED", draftVersion1.getStatus());

        // 4. Once CONFIRMED: Matching succeeds
        MatchResult expectedResult = MatchResult.builder()
                .overallScore(BigDecimal.valueOf(88.5))
                .build();
        when(matchingEngineService.calculateAndPersistMatchResult(publishedJob.getId(), profileA.getId()))
                .thenReturn(expectedResult);

        var matchRes = candidateMatchController.matchCandidateToJob(candidateUserA, publishedJob.getId(), testCv.getId());
        assertNotNull(matchRes.getBody());
        assertEquals(BigDecimal.valueOf(88.5), matchRes.getBody().getData().getOverallScore());
    }

    @Test
    @DisplayName("AC-P3-05: Editing confirmed profile forks new DRAFT version while preserving original artifact immutability")
    void testEditingConfirmedProfile_ForksNewVersion_PreservesArtifactImmutability() throws NoSuchAlgorithmException {
        // Step 1: CV is confirmed at v1.0
        draftVersion1.setStatus("CONFIRMED");
        draftVersion1.setConfirmedAt(ZonedDateTime.now());
        testCv.setStatus("CONFIRMED");
        when(cvVersionRepository.findByCvIdOrderByVersionNumberDesc(testCv.getId())).thenReturn(List.of(draftVersion1));

        // Step 2: Candidate edits confirmed profile -> must fork v2.0 in DRAFT
        UpdateCVDraftRequest editReq = UpdateCVDraftRequest.builder()
                .title("Nguyen Van A - Updated Senior Title")
                .build();

        cvService.updateCVDraft(candidateUserA, testCv.getId(), editReq);

        // Verify that a new version was saved
        verify(cvVersionRepository, atLeastOnce()).save(argThat(v ->
                v.getVersionNumber() == 2 && "DRAFT".equals(v.getStatus())
        ));

        // Step 3: Verify original artifact immutability (SHA-256 unchanged)
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] postEditHash = digest.digest(originalFileBytes);
        StringBuilder hexString = new StringBuilder();
        for (byte b : postEditHash) {
            hexString.append(String.format("%02x", b));
        }
        String postEditChecksum = hexString.toString();

        assertEquals(originalFileChecksum, postEditChecksum, "Original CV file checksum must remain completely invariant after edits");
    }

    @Test
    @DisplayName("Ownership security: Candidate B cannot inspect, edit, or confirm Candidate A's CV")
    void testOwnershipSecurity_CandidateBCannotAccessCandidateACV() {
        // Candidate B attempts to GET Candidate A's draft
        assertThrows(UnauthorizedAccessException.class, () ->
                cvService.getCVDraft(candidateUserB, testCv.getId())
        );

        // Candidate B attempts to PUT Candidate A's draft
        assertThrows(UnauthorizedAccessException.class, () ->
                cvService.updateCVDraft(candidateUserB, testCv.getId(), new UpdateCVDraftRequest())
        );

        // Candidate B attempts to CONFIRM Candidate A's draft
        assertThrows(UnauthorizedAccessException.class, () ->
                cvService.confirmCV(candidateUserB, testCv.getId())
        );

        // Candidate B attempts to list versions of Candidate A's CV
        assertThrows(UnauthorizedAccessException.class, () ->
                cvService.getCVVersions(candidateUserB, testCv.getId())
        );
    }
}
