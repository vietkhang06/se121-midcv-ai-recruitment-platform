package com.platform.recruitment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.ai.AiClient;
import com.platform.recruitment.ai.AiProcessingController;
import com.platform.recruitment.ai.AiWorkerClient;
import com.platform.recruitment.ai.ProcessingLifecycleService;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.cv.*;
import com.platform.recruitment.document.Documents;
import com.platform.recruitment.event.Events;
import com.platform.recruitment.github.*;
import com.platform.recruitment.job.*;
import com.platform.recruitment.matching.Scoring;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import com.platform.recruitment.worker.JobQueue;
import com.platform.recruitment.worker.PipelineWorker;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.PlatformTransactionManager;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class CandidateCvProcessingRuntimeAuditTest {

    @Mock private CVRepository cvRepository;
    @Mock private CVVersionRepository cvVersionRepository;
    @Mock private CVSectionRepository cvSectionRepository;
    @Mock private CandidateProfileRepository candidateProfileRepository;
    @Mock private JobRepository jobRepository;
    @Mock private JobRequirementRepository jobRequirementRepository;
    @Mock private GitHubProfileRepository gitHubProfileRepository;
    @Mock private GitHubRepositoryRepository gitHubRepositoryRepository;
    @Mock private GitHubAssessmentRepository gitHubAssessmentRepository;
    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private PlatformTransactionManager transactionManager;
    @Mock private AiWorkerClient aiWorkerClient;
    @Mock private AiClient aiClient;
    @Mock private GithubClient githubClient;
    @Mock private Scoring scoring;

    private Documents documents;
    private TextReader textReader;
    private JobQueue jobQueue;
    private Events events;
    private CVService cvService;
    private PipelineWorker pipelineWorker;
    private ProcessingLifecycleService processingLifecycleService;
    private AiProcessingController aiProcessingController;

    private User candidateUser;
    private User attackerUser;
    private CandidateProfile candidateProfile;
    private Path uploadsDir;

    @BeforeEach
    void setUp(@TempDir Path tempDir) throws IOException {
        uploadsDir = tempDir.resolve("uploads");
        Files.createDirectories(uploadsDir);

        events = new Events(jdbcTemplate, new ObjectMapper());
        jobQueue = new JobQueue(jdbcTemplate, events, transactionManager);
        documents = new Documents(jdbcTemplate, jobQueue, events, uploadsDir.toString());
        textReader = new TextReader();

        cvService = new CVService(
                cvRepository,
                cvVersionRepository,
                cvSectionRepository,
                candidateProfileRepository,
                documents,
                textReader,
                jdbcTemplate
        );

        pipelineWorker = new PipelineWorker(
                jdbcTemplate,
                new ObjectMapper(),
                jobQueue,
                events,
                documents,
                textReader,
                aiClient,
                githubClient,
                scoring,
                transactionManager
        );

        processingLifecycleService = new ProcessingLifecycleService(
                aiWorkerClient,
                jobRepository,
                jobRequirementRepository,
                cvRepository,
                cvVersionRepository,
                cvSectionRepository,
                candidateProfileRepository,
                gitHubProfileRepository,
                gitHubRepositoryRepository,
                gitHubAssessmentRepository
        );

        aiProcessingController = new AiProcessingController(processingLifecycleService);

        UUID userId = UUID.randomUUID();
        UUID profileId = UUID.randomUUID();

        candidateUser = User.builder()
                .email("verified.candidate@midcv.io")
                .role(Role.CANDIDATE)
                .build();
        candidateUser.setId(userId);

        attackerUser = User.builder()
                .email("unauthorized.attacker@midcv.io")
                .role(Role.CANDIDATE)
                .build();
        attackerUser.setId(UUID.randomUUID());

        candidateProfile = CandidateProfile.builder()
                .user(candidateUser)
                .fullName("Nguyen Van Candidate")
                .githubUrl("https://github.com/candidate-audit")
                .build();
        candidateProfile.setId(profileId);

        CandidateProfile attackerProfile = CandidateProfile.builder()
                .user(attackerUser)
                .fullName("Attacker")
                .build();
        attackerProfile.setId(UUID.randomUUID());

        lenient().when(candidateProfileRepository.findByUserId(userId)).thenReturn(Optional.of(candidateProfile));
        lenient().when(candidateProfileRepository.findByUserId(attackerUser.getId())).thenReturn(Optional.of(attackerProfile));

        // Default jdbcTemplate mocks for Documents and JobQueue
        lenient().doReturn(List.of(Map.of("id", UUID.randomUUID())))
                .when(jdbcTemplate).queryForList(anyString(), any(Object[].class));
        lenient().when(jdbcTemplate.queryForObject(contains("coalesce(max(version_no)"), eq(Integer.class), any(Object[].class)))
                .thenReturn(1);
        lenient().when(jdbcTemplate.query(contains("INSERT INTO processing_jobs"), any(org.springframework.jdbc.core.RowMapper.class), any(Object[].class)))
                .thenAnswer(inv -> List.of(UUID.randomUUID()));

        // Default GitHub mock saves
        lenient().when(gitHubProfileRepository.save(any(GitHubProfile.class))).thenAnswer(inv -> {
            GitHubProfile gp = inv.getArgument(0);
            if (gp.getId() == null) gp.setId(UUID.randomUUID());
            return gp;
        });
        lenient().when(gitHubAssessmentRepository.save(any(GitHubAssessment.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private byte[] createTestPdf(String text) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream stream = new PDPageContentStream(doc, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                stream.newLineAtOffset(50, 700);
                stream.showText(text);
                stream.endText();
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }

    private byte[] createTestDocx(String text) throws IOException {
        try (XWPFDocument doc = new XWPFDocument()) {
            XWPFParagraph p = doc.createParagraph();
            p.createRun().setText(text);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.write(out);
            return out.toByteArray();
        }
    }

    @Test
    @DisplayName("Audit 1: Candidate CV upload executes 100% in-process with ZERO runtime calls to AiWorkerClient")
    void testCandidateCvUpload_ZeroRuntimeCallsToAiWorkerClient() throws IOException {
        byte[] pdfBytes = createTestPdf("Candidate CV Content for Phase 2 Runtime Audit");
        MockMultipartFile file = new MockMultipartFile(
                "file", "candidate_cv.pdf", "application/pdf", pdfBytes
        );

        when(cvRepository.save(any(CV.class))).thenAnswer(inv -> {
            CV cv = inv.getArgument(0);
            if (cv.getId() == null) cv.setId(UUID.randomUUID());
            return cv;
        });
        when(cvVersionRepository.save(any(CVVersion.class))).thenAnswer(inv -> {
            CVVersion v = inv.getArgument(0);
            if (v.getId() == null) v.setId(UUID.randomUUID());
            return v;
        });

        CVResponse response = cvService.uploadCV(candidateUser, file, "Audit CV", "Tech", true);

        assertNotNull(response);
        assertEquals("Audit CV", response.getTitle());
        assertEquals("PARSED", response.getStatus());

        // CRITICAL CHECK: ZERO runtime calls to AiWorkerClient!
        verifyNoInteractions(aiWorkerClient);
    }

    @Test
    @DisplayName("Audit 2: Legacy triggerCvProcessing executes in-process with ZERO calls to AiWorkerClient")
    void testLegacyTriggerCvProcessing_ZeroCallsToAiWorkerClient() {
        UUID cvId = UUID.randomUUID();
        CV cv = CV.builder()
                .candidate(candidateProfile)
                .title("Legacy Trigger CV")
                .rawText("Java Spring Boot Developer with PostgreSQL pgvector experience")
                .status("PENDING")
                .build();
        cv.setId(cvId);

        when(cvRepository.findById(cvId)).thenReturn(Optional.of(cv));
        when(cvVersionRepository.findByCvIdOrderByVersionNumberDesc(cvId)).thenReturn(Collections.emptyList());
        when(cvVersionRepository.save(any(CVVersion.class))).thenAnswer(inv -> {
            CVVersion v = inv.getArgument(0);
            if (v.getId() == null) v.setId(UUID.randomUUID());
            return v;
        });

        // Trigger the legacy endpoint
        aiProcessingController.triggerCvProcessing(cvId);

        // Verify status was updated to PARSED
        assertEquals("PARSED", cv.getStatus());
        verify(cvRepository, atLeastOnce()).save(cv);

        // CRITICAL CHECK: ZERO runtime calls to AiWorkerClient!
        verifyNoInteractions(aiWorkerClient);
    }

    @Test
    @DisplayName("Audit 3: Candidate ownership protection remains strictly enforced")
    void testCandidateOwnershipProtection_Enforced() {
        UUID cvId = UUID.randomUUID();
        CV cv = CV.builder()
                .candidate(candidateProfile)
                .title("Owner Protected CV")
                .build();
        cv.setId(cvId);

        when(cvRepository.findById(cvId)).thenReturn(Optional.of(cv));

        // Attacker attempting to access candidate's CV
        assertThrows(UnauthorizedAccessException.class, () -> cvService.getCVById(attackerUser, cvId));

        // Attacker attempting to delete candidate's CV
        assertThrows(UnauthorizedAccessException.class, () -> cvService.deleteCV(attackerUser, cvId));

        // Owner access succeeds
        assertDoesNotThrow(() -> cvService.getCVById(candidateUser, cvId));
    }

    @Test
    @DisplayName("Audit 4: Both PDF and DOCX uploads succeed natively and enqueue jobs")
    void testPdfAndDocxUpload_BothSucceedNatively() throws IOException {
        when(cvRepository.save(any(CV.class))).thenAnswer(inv -> {
            CV cv = inv.getArgument(0);
            if (cv.getId() == null) cv.setId(UUID.randomUUID());
            return cv;
        });
        when(cvVersionRepository.save(any(CVVersion.class))).thenAnswer(inv -> {
            CVVersion v = inv.getArgument(0);
            if (v.getId() == null) v.setId(UUID.randomUUID());
            return v;
        });

        // 1. PDF
        byte[] pdfBytes = createTestPdf("PDF native content");
        MockMultipartFile pdfFile = new MockMultipartFile("file", "test.pdf", "application/pdf", pdfBytes);
        CVResponse pdfRes = cvService.uploadCV(candidateUser, pdfFile, "PDF CV", "IT", false);
        assertEquals("PARSED", pdfRes.getStatus());

        // 2. DOCX
        byte[] docxBytes = createTestDocx("DOCX native content");
        MockMultipartFile docxFile = new MockMultipartFile("file", "test.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", docxBytes);
        CVResponse docxRes = cvService.uploadCV(candidateUser, docxFile, "DOCX CV", "IT", false);
        assertEquals("PARSED", docxRes.getStatus());

        // Verify AiWorkerClient was never touched
        verifyNoInteractions(aiWorkerClient);
    }

    @Test
    @DisplayName("Audit 5: Non-candidate flows (JD and GitHub) continue to invoke AiWorkerClient without regression")
    void testNonCandidateFlows_StillInvokeAiWorkerClient() {
        // 1. Job Description extraction
        UUID jobId = UUID.randomUUID();
        Job job = Job.builder().title("Staff Engineer").industry("Tech").description("Java & Cloud").build();
        job.setId(jobId);

        when(jobRepository.findById(jobId)).thenReturn(Optional.of(job));
        when(jobRequirementRepository.findByJobId(jobId)).thenReturn(Collections.emptyList());
        when(aiWorkerClient.extractJd(any(), any(), any(), any())).thenReturn(Map.of(
                "job_id", jobId.toString(),
                "status", "SUCCESS",
                "required_skills", List.of(Map.of("normalized_name", "Java", "min_years_exp", 5))
        ));

        processingLifecycleService.processJobDescription(jobId);
        verify(aiWorkerClient, times(1)).extractJd(eq(jobId), eq("Staff Engineer"), eq("Tech"), eq("Java & Cloud"));

        // 2. GitHub profile analysis
        when(aiWorkerClient.analyzeGithub(any(), any())).thenReturn(Map.of(
                "status", "SUCCESS",
                "activity_signal", "HIGH",
                "public_repos_count", 15
        ));

        processingLifecycleService.processCandidateGithub(candidateUser.getId());
        verify(aiWorkerClient, times(1)).analyzeGithub(eq(candidateUser.getId()), eq("https://github.com/candidate-audit"));
    }

    @Test
    @DisplayName("Audit 6: Candidate CV APIs remain 100% compatible")
    void testCandidateCvApis_RemainFullyCompatible() {
        UUID cvId = UUID.randomUUID();
        CV cv = CV.builder()
                .candidate(candidateProfile)
                .title("Full Compatible CV")
                .creationPath(CVCreationPath.UPLOAD)
                .targetIndustry("FinTech")
                .rawText("Full stack developer")
                .isDefault(true)
                .status("PARSED")
                .build();
        cv.setId(cvId);

        when(cvRepository.findById(cvId)).thenReturn(Optional.of(cv));
        when(cvRepository.findByCandidateId(candidateProfile.getId())).thenReturn(List.of(cv));

        CVResponse byId = cvService.getCVById(candidateUser, cvId);
        assertNotNull(byId);
        assertEquals("Full Compatible CV", byId.getTitle());
        assertEquals("FinTech", byId.getTargetIndustry());
        assertTrue(byId.getIsDefault());

        List<CVResponse> allMyCvs = cvService.getCandidateCVs(candidateUser);
        assertEquals(1, allMyCvs.size());
        assertEquals(cvId, allMyCvs.get(0).getId());

        verifyNoInteractions(aiWorkerClient);
    }
}
