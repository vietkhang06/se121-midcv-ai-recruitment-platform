package com.platform.recruitment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.application.Application;
import com.platform.recruitment.application.ApplicationRepository;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.cv.*;
import com.platform.recruitment.job.*;
import com.platform.recruitment.matching.GitHubScoringService;
import com.platform.recruitment.matching.MatchResult;
import com.platform.recruitment.matching.MatchResultRepository;
import com.platform.recruitment.matching.MatchingEngineService;
import com.platform.recruitment.taxonomy.TaxonomyController;
import com.platform.recruitment.taxonomy.TaxonomyService;
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
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class CandidateCvDraftAndEvidenceIntegrationTest {

    @Mock private CVRepository cvRepository;
    @Mock private CVVersionRepository cvVersionRepository;
    @Mock private CVSectionRepository cvSectionRepository;
    @Mock private CandidateProfileRepository candidateProfileRepository;
    @Mock private CVEvidenceAttachmentRepository evidenceAttachmentRepository;
    @Mock private com.platform.recruitment.document.Documents documents;
    @Mock private TextReader textReader;
    @Mock private JdbcTemplate jdbcTemplate;

    @Mock private JobRepository jobRepository;
    @Mock private JobRequirementRepository jobRequirementRepository;
    @Mock private ApplicationRepository applicationRepository;
    @Mock private MatchResultRepository matchResultRepository;
    @Mock private com.platform.recruitment.matching.MatchFactorRepository matchFactorRepository;
    @Mock private com.platform.recruitment.github.GitHubProfileRepository gitHubProfileRepository;
    @Mock private com.platform.recruitment.github.GitHubAssessmentRepository gitHubAssessmentRepository;

    private ObjectMapper objectMapper;
    private CVService cvService;
    private TaxonomyService taxonomyService;
    private TaxonomyController taxonomyController;
    private MatchingEngineService matchingEngineService;

    private User candidateUser;
    private CandidateProfile candidateProfile;
    private CV cv;
    private CVVersion draftVersion;
    private UUID cvId;
    private UUID versionId;
    private UUID certId;

    @BeforeEach
    void setUp() {
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
        cvService.setCvEvidenceAttachmentRepository(evidenceAttachmentRepository);

        taxonomyService = new TaxonomyService(jdbcTemplate);
        taxonomyController = new TaxonomyController(taxonomyService);

        GitHubScoringService gitHubScoringService =
                new GitHubScoringService(gitHubProfileRepository, gitHubAssessmentRepository);

        matchingEngineService = new MatchingEngineService(
                jobRepository,
                jobRequirementRepository,
                candidateProfileRepository,
                applicationRepository,
                cvRepository,
                matchResultRepository,
                matchFactorRepository,
                new com.platform.recruitment.matching.RequiredSkillMatcher(),
                new com.platform.recruitment.matching.PreferredSkillMatcher(),
                new com.platform.recruitment.matching.ExperienceMatcher(),
                new com.platform.recruitment.matching.EducationMatcher(),
                new com.platform.recruitment.matching.ProjectRelevanceMatcher(),
                gitHubScoringService
        );
        matchingEngineService.setCvVersionRepository(cvVersionRepository);

        candidateUser = User.builder()
                .email("candidate@midcv.io")
                .role(Role.CANDIDATE)
                .build();
        candidateUser.setId(UUID.randomUUID());

        candidateProfile = CandidateProfile.builder()
                .user(candidateUser)
                .headline("Software Engineer")
                .build();
        candidateProfile.setId(UUID.randomUUID());

        cvId = UUID.randomUUID();
        cv = CV.builder()
                .candidate(candidateProfile)
                .title("Software Engineer CV")
                .creationPath(CVCreationPath.UPLOAD)
                .fileName("cv_candidate.pdf")
                .fileType("application/pdf")
                .fileSize(102400)
                .rawText("Original immutable text with Java and Spring Boot.")
                .filePath("/uploads/cv_candidate.pdf")
                .status("COMPLETED")
                .build();
        cv.setId(cvId);

        versionId = UUID.randomUUID();
        certId = UUID.randomUUID();
        String initialJson = "{" +
                "\"personalInfo\":{\"fullName\":\"Doan Viet Khang\",\"email\":\"doanvietkhang06@gmail.com\",\"phone\":\"0762654245\",\"address\":\"Thu Duc, TP.HCM\",\"headline\":\"Software Engineer\",\"githubUrl\":\"https://github.com/vietkhang06\"}," +
                "\"summary\":\"Passionate backend developer with experience in Spring Boot.\"," +
                "\"skills\":[{\"name\":\"Java\",\"category\":\"backend\"},{\"name\":\"Spring Boot\",\"category\":\"backend\"}]," +
                "\"education\":[{\"institution\":\"University of Information Technology\",\"degree\":\"Bachelor\",\"fieldOfStudy\":\"Software Engineering\",\"gpa\":8.3,\"gpa_scale\":10.0,\"gpa_display\":\"8.3/10\"}]," +
                "\"experience\":[{\"company\":\"Tech Corp\",\"role\":\"Backend Developer\",\"technologies\":[\"Java\",\"PostgreSQL\"],\"description\":\"Developed RESTful APIs.\"}]," +
                "\"projects\":[{\"name\":\"CineMax App\",\"role\":\"Full-stack Developer\",\"techStack\":[\"Java\",\"Spring Boot\"],\"description\":\"Cinema management application.\"}]," +
                "\"certifications\":[{\"id\":\"" + certId + "\",\"name\":\"AWS Certified Developer\",\"issuer\":\"Amazon\",\"issueDate\":\"2024-01-15\"}]," +
                "\"languages\":[{\"language\":\"English\",\"proficiency\":\"Fluent\"}]" +
                "}";

        draftVersion = CVVersion.builder()
                .cv(cv)
                .versionNumber(1)
                .title("Initial Draft")
                .rawTextContent(cv.getRawText())
                .structuredJsonContent(initialJson)
                .status("DRAFT")
                .build();
        draftVersion.setId(versionId);

        when(candidateProfileRepository.findByUserId(candidateUser.getId())).thenReturn(Optional.of(candidateProfile));
        when(cvRepository.findById(cvId)).thenReturn(Optional.of(cv));
        when(cvVersionRepository.findById(versionId)).thenReturn(Optional.of(draftVersion));
        when(cvVersionRepository.findByCvIdOrderByVersionNumberDesc(cvId)).thenReturn(new ArrayList<>(List.of(draftVersion)));
        when(cvVersionRepository.save(any(CVVersion.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("Test 1: Retrieve draft successfully preserving structured JSON fields")
    void testGetCVDraft() {
        CVDraftResponse draft = cvService.getCVDraft(candidateUser, cvId);
        assertNotNull(draft);
        assertEquals(cvId, draft.getCvId());
        assertEquals(versionId, draft.getVersionId());
        assertEquals("DRAFT", draft.getStatus());
        assertNotNull(draft.getPersonalInfo());
        assertEquals(8.3, ((Map<?, ?>) draft.getEducation().get(0)).get("gpa"));
        assertEquals(10.0, ((Map<?, ?>) draft.getEducation().get(0)).get("gpa_scale"));
        assertEquals("8.3/10", ((Map<?, ?>) draft.getEducation().get(0)).get("gpa_display"));
        assertEquals(2, draft.getSkills().size());
    }

    @Test
    @DisplayName("Test 2 & 3: Update draft saves new data while keeping original raw text and file immutable")
    void testUpdateCVDraftAndImmutability() {
        String originalRawText = cv.getRawText();
        String originalFilePath = cv.getFilePath();

        UpdateCVDraftRequest updateRequest = new UpdateCVDraftRequest();
        updateRequest.setSummary(Map.of("summary", "<p>Updated <strong>rich text</strong> summary</p>"));

        Map<String, Object> personalInfo = new HashMap<>();
        personalInfo.put("fullName", "Khang Doan");
        personalInfo.put("email", "doanvietkhang06@gmail.com");
        personalInfo.put("headline", "Senior Backend Engineer");
        personalInfo.put("githubUrl", "https://github.com/vietkhang06");
        updateRequest.setPersonalInfo(personalInfo);

        List<Map<String, Object>> skills = new ArrayList<>();
        skills.add(Map.of("name", "Java"));
        skills.add(Map.of("name", "Kubernetes", "isCustom", true));
        updateRequest.setSkills(skills);

        List<Map<String, Object>> education = new ArrayList<>();
        Map<String, Object> edu = new HashMap<>();
        edu.put("institution", "UIT");
        edu.put("degree", "Engineer");
        edu.put("fieldOfStudy", "Software Engineering");
        edu.put("gpa", 3.8);
        edu.put("gpaScale", 4.0);
        edu.put("gpaDisplay", "3.8/4.0");
        education.add(edu);
        updateRequest.setEducation(education);

        when(cvVersionRepository.save(any(CVVersion.class))).thenAnswer(inv -> inv.getArgument(0));

        CVDraftResponse response = cvService.updateCVDraft(candidateUser, cvId, updateRequest);

        assertNotNull(response);
        assertEquals(3.8, ((Map<?, ?>) response.getEducation().get(0)).get("gpa"));
        assertEquals(4.0, ((Map<?, ?>) response.getEducation().get(0)).get("gpa_scale"));
        assertEquals("3.8/4.0", ((Map<?, ?>) response.getEducation().get(0)).get("gpa_display"));

        // Immutability verification: Original CV remains untouched
        assertEquals(originalRawText, cv.getRawText());
        assertEquals(originalFilePath, cv.getFilePath());
        verify(cvRepository, never()).save(any(CV.class));
    }

    @Test
    @DisplayName("Test 4: GPA validation rejects value greater than scale")
    void testGpaValidation_ValueGreaterThanScale() {
        UpdateCVDraftRequest updateRequest = new UpdateCVDraftRequest();
        List<Map<String, Object>> education = new ArrayList<>();
        Map<String, Object> edu = new HashMap<>();
        edu.put("institution", "UIT");
        edu.put("gpa", 10.5);
        edu.put("gpaScale", 10.0);
        education.add(edu);
        updateRequest.setEducation(education);

        CustomException ex = assertThrows(CustomException.class, () ->
                cvService.updateCVDraft(candidateUser, cvId, updateRequest));
        assertEquals(ErrorCode.VALIDATION_ERROR, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("không được lớn hơn"));
    }

    @Test
    @DisplayName("Test 5: GPA validation rejects negative value")
    void testGpaValidation_NegativeValue() {
        UpdateCVDraftRequest updateRequest = new UpdateCVDraftRequest();
        List<Map<String, Object>> education = new ArrayList<>();
        Map<String, Object> edu = new HashMap<>();
        edu.put("institution", "UIT");
        edu.put("gpa", -1.0);
        education.add(edu);
        updateRequest.setEducation(education);

        CustomException ex = assertThrows(CustomException.class, () ->
                cvService.updateCVDraft(candidateUser, cvId, updateRequest));
        assertEquals(ErrorCode.VALIDATION_ERROR, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("không được là số âm"));
    }

    @Test
    @DisplayName("Test 6: Evidence upload validates magic bytes and persists UNVERIFIED attachment")
    void testEvidenceUploadValidatesMagicBytes() {
        byte[] pdfMagic = "%PDF-1.4 header content".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile validPdf = new MockMultipartFile("file", "cert.pdf", "application/pdf", pdfMagic);

        java.nio.file.Path tempMockPath = java.nio.file.Path.of(System.getProperty("java.io.tmpdir"), "test-evidence.pdf");
        when(documents.path(anyString())).thenReturn(tempMockPath);
        when(evidenceAttachmentRepository.save(any(CVEvidenceAttachment.class))).thenAnswer(inv -> {
            CVEvidenceAttachment att = inv.getArgument(0);
            att.setId(UUID.randomUUID());
            return att;
        });

        CVEvidenceAttachmentResponse response = cvService.uploadEvidenceAttachment(
                candidateUser, cvId, validPdf, "CERTIFICATION", certId.toString());

        assertNotNull(response);
        assertEquals("UNVERIFIED", response.getStatus());
        assertEquals("cert.pdf", response.getFileName());
        assertEquals("CERTIFICATION", response.getItemType());

        // Invalid itemId (legacy or non-UUID cert_1 rejects with VALIDATION_ERROR -> 400)
        CustomException invalidIdEx = assertThrows(CustomException.class, () ->
                cvService.uploadEvidenceAttachment(candidateUser, cvId, validPdf, "CERTIFICATION", "cert_1"));
        assertEquals(ErrorCode.VALIDATION_ERROR, invalidIdEx.getErrorCode());

        // Invalid file (magic byte spoofing)
        byte[] fakePdf = "NOT A REAL PDF FILE HEADER".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile invalidPdf = new MockMultipartFile("file", "fake.pdf", "application/pdf", fakePdf);

        CustomException spoofEx = assertThrows(CustomException.class, () ->
                cvService.uploadEvidenceAttachment(candidateUser, cvId, invalidPdf, "CERTIFICATION", certId.toString()));
        assertEquals(ErrorCode.INVALID_FILE, spoofEx.getErrorCode());
    }

    @Test
    @DisplayName("Test 7: Evidence attachment ownership check prevents other candidates from accessing")
    void testEvidenceAttachmentOwnership() {
        UUID attachmentId = UUID.randomUUID();
        CVEvidenceAttachment attachment = CVEvidenceAttachment.builder()
                .cv(cv)
                .candidate(candidateProfile)
                .fileName("cert.pdf")
                .storageKey("mock-storage-key.pdf")
                .fileType("application/pdf")
                .fileSize(100)
                .build();
        attachment.setId(attachmentId);

        when(evidenceAttachmentRepository.findById(attachmentId)).thenReturn(Optional.of(attachment));

        User otherUser = User.builder().email("other@midcv.io").role(Role.CANDIDATE).build();
        otherUser.setId(UUID.randomUUID());
        CandidateProfile otherProfile = CandidateProfile.builder().user(otherUser).build();
        otherProfile.setId(UUID.randomUUID());
        when(candidateProfileRepository.findByUserId(otherUser.getId())).thenReturn(Optional.of(otherProfile));

        assertThrows(UnauthorizedAccessException.class, () ->
                cvService.getEvidenceAttachmentFile(otherUser, cvId, attachmentId));
    }

    @Test
    @DisplayName("Test 8: Confirm CV draft updates status to CONFIRMED and records confirmedAt")
    void testConfirmCVDraft() {
        when(cvVersionRepository.save(any(CVVersion.class))).thenAnswer(inv -> inv.getArgument(0));

        CVConfirmResponse confirmed = cvService.confirmCV(candidateUser, cvId);

        assertNotNull(confirmed);
        assertEquals("CONFIRMED", confirmed.getStatus());
        assertNotNull(confirmed.getConfirmedAt());
        assertEquals("CONFIRMED", draftVersion.getStatus());
    }

    @Test
    @DisplayName("Test 9: Matching engine prioritizes confirmed profile skills over raw text")
    void testMatchingEngineUsesConfirmedProfile() {
        Job job = Job.builder()
                .title("Kubernetes Platform Engineer")
                .description("We need an engineer experienced with Kubernetes and Cloud infrastructure.")
                .status(JobStatus.PUBLISHED)
                .build();
        job.setId(UUID.randomUUID());

        JobRequirement k8sReq = JobRequirement.builder()
                .job(job)
                .skillName("Kubernetes")
                .requirementType(RequirementType.REQUIRED)
                .build();

        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(candidateProfileRepository.findById(candidateProfile.getId())).thenReturn(Optional.of(candidateProfile));
        when(cvRepository.findByCandidateId(candidateProfile.getId())).thenReturn(List.of(cv));
        when(jobRequirementRepository.findByJobId(job.getId())).thenReturn(List.of(k8sReq));

        Application application = Application.builder().job(job).candidate(candidateProfile).build();
        application.setId(UUID.randomUUID());
        when(applicationRepository.findByJobIdAndCandidateId(job.getId(), candidateProfile.getId())).thenReturn(Optional.of(application));
        when(matchResultRepository.findByApplicationId(application.getId())).thenReturn(Optional.empty());
        when(matchResultRepository.save(any(MatchResult.class))).thenAnswer(inv -> inv.getArgument(0));

        // When CV is still in draft without confirmed status, the raw text does not contain Kubernetes -> reqMissing = 1
        draftVersion.setStatus("DRAFT");
        when(cvVersionRepository.findByCvIdOrderByVersionNumberDesc(cvId)).thenReturn(List.of(draftVersion));

        MatchResult draftResult = matchingEngineService.calculateAndPersistMatchResult(job.getId(), candidateProfile.getId());
        assertEquals(1, draftResult.getRequiredSkillsMissing());
        assertEquals(0, draftResult.getRequiredSkillsMatched());

        // Now candidate edits and CONFIRMS CV with Kubernetes added in structured JSON
        String confirmedJson = "{" +
                "\"skills\":[{\"name\":\"Kubernetes\"},{\"name\":\"Java\"}]" +
                "}";
        draftVersion.setStatus("CONFIRMED");
        draftVersion.setStructuredJsonContent(confirmedJson);
        MatchResult confirmedResult = matchingEngineService.calculateAndPersistMatchResult(job.getId(), candidateProfile.getId());
        assertEquals(0, confirmedResult.getRequiredSkillsMissing());
        assertEquals(1, confirmedResult.getRequiredSkillsMatched());
    }

    @Test
    @DisplayName("Test 10: Taxonomy skill search returns suggestions and handles query")
    void testTaxonomySkillSearch() {
        UUID skill1Id = UUID.randomUUID();
        UUID skill2Id = UUID.randomUUID();
        TaxonomyService.TaxonomySkill skill1 = new TaxonomyService.TaxonomySkill(
                skill1Id, "React", "react", "Frontend", null, "SEED", "v1.0", true);
        TaxonomyService.TaxonomySkill skill2 = new TaxonomyService.TaxonomySkill(
                skill2Id, "React Native", "react native", "Mobile", null, "SEED", "v1.0", true);

        taxonomyService.loadFromMemory(List.of(skill1, skill2), Collections.emptyList());

        ResponseEntity<com.platform.recruitment.common.ApiResponse<Map<String, Object>>> response =
                taxonomyController.searchSkills("react", 10);

        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        Map<String, Object> data = response.getBody().getData();
        assertEquals("react", data.get("query"));
        assertEquals(2, data.get("total"));
        List<?> skills = (List<?>) data.get("skills");
        assertEquals(2, skills.size());
    }
}
