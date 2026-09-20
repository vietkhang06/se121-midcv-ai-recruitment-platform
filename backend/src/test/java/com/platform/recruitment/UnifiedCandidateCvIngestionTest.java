package com.platform.recruitment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.ai.AiClient;
import com.platform.recruitment.ai.AiWorkerClient;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.cv.*;
import com.platform.recruitment.document.Documents;
import com.platform.recruitment.event.Events;
import com.platform.recruitment.github.GithubClient;
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
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
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

import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class UnifiedCandidateCvIngestionTest {

    @Mock private CVRepository cvRepository;
    @Mock private CVVersionRepository cvVersionRepository;
    @Mock private CVSectionRepository cvSectionRepository;
    @Mock private CandidateProfileRepository candidateProfileRepository;
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

    private User candidateUser;
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

        UUID userId = UUID.randomUUID();
        UUID profileId = UUID.randomUUID();

        candidateUser = User.builder()
                .email("candidate.unified@midcv.io")
                .role(Role.CANDIDATE)
                .build();
        candidateUser.setId(userId);

        candidateProfile = CandidateProfile.builder()
                .user(candidateUser)
                .fullName("Dang Thi Unified")
                .build();
        candidateProfile.setId(profileId);

        lenient().when(candidateProfileRepository.findByUserId(userId)).thenReturn(Optional.of(candidateProfile));
    }

    private byte[] createRealPdf(String text) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream stream = new PDPageContentStream(doc, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                stream.newLineAtOffset(50, 700);
                for (String line : text.split("\n")) {
                    stream.showText(line);
                    stream.newLineAtOffset(0, -15);
                }
                stream.endText();
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }

    private byte[] createRealDocx(String text) throws IOException {
        try (XWPFDocument doc = new XWPFDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XWPFParagraph p = doc.createParagraph();
            p.createRun().setText(text);
            doc.write(out);
            return out.toByteArray();
        }
    }

    @Test
    @DisplayName("REQ-1,4,5,7,8,10: Candidate uploads real PDF -> native document model created, job queued, 0 ai-worker calls")
    void testUploadPdf_UsesNativeDocumentPipeline_NoAiWorker() throws IOException {
        String pdfContent = "Candidate Name: Le Van Unified\nExperience: 5 years in Java and Spring Boot architecture.";
        byte[] pdfBytes = createRealPdf(pdfContent);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "le_van_unified_cv.pdf",
                "application/pdf",
                pdfBytes
        );

        // Mock JDBC interactions for documents & jobQueue
        doReturn(List.of(Map.of("id", UUID.randomUUID())))
                .when(jdbcTemplate).queryForList(anyString(), any(Object[].class));

        when(jdbcTemplate.queryForObject(contains("coalesce(max(version_no)"), eq(Integer.class), any(Object[].class)))
                .thenReturn(1);
        when(jdbcTemplate.query(contains("INSERT INTO processing_jobs"), any(org.springframework.jdbc.core.RowMapper.class), any(Object[].class)))
                .thenAnswer(inv -> List.of(UUID.randomUUID()));

        when(cvRepository.save(any(CV.class))).thenAnswer(inv -> inv.getArgument(0));
        when(cvVersionRepository.save(any(CVVersion.class))).thenAnswer(inv -> inv.getArgument(0));

        // When
        CVResponse response = cvService.uploadCV(candidateUser, file, "Le Van Unified CV", "Technology", true);

        // Then
        assertNotNull(response);
        assertEquals("Le Van Unified CV", response.getTitle());
        assertEquals("PARSED", response.getStatus());
        assertNotNull(response.getJobId(), "Job ID must be returned from native JobQueue");
        assertNotNull(response.getDocumentVersionId(), "Document Version ID must be returned");

        // Verify native documents & versions were inserted
        verify(jdbcTemplate).update(contains("INSERT INTO documents"), any(), eq(candidateUser.getId()), eq("CV"), eq("Le Van Unified CV"));
        verify(jdbcTemplate).update(contains("INSERT INTO document_versions"), any(), any(), eq(1), eq("le_van_unified_cv.pdf"), any(), eq("application/pdf"), any(), any());

        // Verify real text was extracted and updated on document_versions
        verify(jdbcTemplate).update(contains("UPDATE document_versions SET raw_text=?, extraction_method=?"), contains("5 years in Java and Spring Boot"), eq("pdf-text"), any());

        // Verify legacy CV entity was saved with matching text and ownership
        ArgumentCaptor<CV> cvCaptor = ArgumentCaptor.forClass(CV.class);
        verify(cvRepository).save(cvCaptor.capture());
        CV savedCv = cvCaptor.getValue();
        assertEquals(candidateProfile.getId(), savedCv.getCandidate().getId());
        assertTrue(savedCv.getRawText().contains("Java and Spring Boot"));

        // CRITICAL: Verify ZERO runtime calls to AiWorkerClient!
        verifyNoInteractions(aiWorkerClient);
    }

    @Test
    @DisplayName("REQ-9: Candidate uploads real DOCX -> native Apache POI extraction succeeds")
    void testUploadDocx_UsesNativePoiExtraction() throws IOException {
        String docxContent = "Senior Fullstack Engineer with React, TypeScript and Node.js expertise.";
        byte[] docxBytes = createRealDocx(docxContent);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "engineer_resume.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                docxBytes
        );

        doReturn(List.of(Map.of("id", UUID.randomUUID())))
                .when(jdbcTemplate).queryForList(anyString(), any(Object[].class));

        when(jdbcTemplate.queryForObject(contains("coalesce(max(version_no)"), eq(Integer.class), any(Object[].class)))
                .thenReturn(1);
        when(jdbcTemplate.query(contains("INSERT INTO processing_jobs"), any(org.springframework.jdbc.core.RowMapper.class), any(Object[].class)))
                .thenAnswer(inv -> List.of(UUID.randomUUID()));

        when(cvRepository.save(any(CV.class))).thenAnswer(inv -> inv.getArgument(0));
        when(cvVersionRepository.save(any(CVVersion.class))).thenAnswer(inv -> inv.getArgument(0));

        // When
        CVResponse response = cvService.uploadCV(candidateUser, file, "Engineer Resume", "Technology", false);

        // Then
        assertNotNull(response);
        ArgumentCaptor<CV> cvCaptor = ArgumentCaptor.forClass(CV.class);
        verify(cvRepository).save(cvCaptor.capture());
        assertTrue(cvCaptor.getValue().getRawText().contains("React, TypeScript and Node.js"));

        verifyNoInteractions(aiWorkerClient);
    }

    @Test
    @DisplayName("REQ-2: Candidate ownership protection prevents accessing or deleting other candidate's CV")
    void testOwnership_RejectsUnauthorizedAccess() {
        User otherUser = User.builder().email("attacker@bad.io").role(Role.CANDIDATE).build();
        otherUser.setId(UUID.randomUUID());
        CandidateProfile otherProfile = CandidateProfile.builder().user(otherUser).fullName("Attacker").build();
        otherProfile.setId(UUID.randomUUID());

        CV cvOfOriginalCandidate = CV.builder()
                .candidate(candidateProfile)
                .title("Original CV")
                .rawText("Private confidential info")
                .build();
        cvOfOriginalCandidate.setId(UUID.randomUUID());

        when(candidateProfileRepository.findByUserId(otherUser.getId())).thenReturn(Optional.of(otherProfile));
        when(cvRepository.findById(cvOfOriginalCandidate.getId())).thenReturn(Optional.of(cvOfOriginalCandidate));

        // Attempting to read another candidate's CV
        assertThrows(UnauthorizedAccessException.class, () ->
                cvService.getCVById(otherUser, cvOfOriginalCandidate.getId())
        );

        // Attempting to delete another candidate's CV
        assertThrows(UnauthorizedAccessException.class, () ->
                cvService.deleteCV(otherUser, cvOfOriginalCandidate.getId())
        );

        verify(cvRepository, never()).delete(any());
        verifyNoInteractions(aiWorkerClient);
    }

    @Test
    @DisplayName("REQ-3: Invalid, empty, or spoofed files are rejected defensively")
    void testInvalidFiles_RejectedProperly() {
        // 1. Empty file (0 bytes)
        MockMultipartFile emptyFile = new MockMultipartFile("file", "empty.pdf", "application/pdf", new byte[0]);
        CustomException emptyEx = assertThrows(CustomException.class, () ->
                cvService.uploadCV(candidateUser, emptyFile, "Empty", "TECH", false)
        );
        assertEquals(ErrorCode.INVALID_FILE, emptyEx.getErrorCode());
        assertTrue(emptyEx.getMessage().contains("FILE_EMPTY"));

        // 2. Spoofed header (txt renamed as pdf)
        byte[] fakeBytes = "This is a fake header without pdf magic bytes".getBytes();
        MockMultipartFile spoofedFile = new MockMultipartFile("file", "fake.pdf", "application/pdf", fakeBytes);
        CustomException spoofEx = assertThrows(CustomException.class, () ->
                cvService.uploadCV(candidateUser, spoofedFile, "Spoofed", "TECH", false)
        );
        assertEquals(ErrorCode.INVALID_FILE, spoofEx.getErrorCode());
        assertTrue(spoofEx.getMessage().contains("UNSUPPORTED_FILE_TYPE"));

        // 3. Oversized file (>10MB)
        byte[] oversizedBytes = new byte[10 * 1024 * 1024 + 1];
        MockMultipartFile largeFile = new MockMultipartFile("file", "large.pdf", "application/pdf", oversizedBytes);
        CustomException largeEx = assertThrows(CustomException.class, () ->
                cvService.uploadCV(candidateUser, largeFile, "Large", "TECH", false)
        );
        assertEquals(ErrorCode.FILE_SIZE_EXCEEDED, largeEx.getErrorCode());
        assertTrue(largeEx.getMessage().contains("FILE_TOO_LARGE"));

        verifyNoInteractions(aiWorkerClient);
        verifyNoInteractions(cvRepository);
    }

    @Test
    @DisplayName("REQ-6: PipelineWorker claims QUEUED job, performs AI extraction & embedding, and transitions to READY")
    void testPipelineWorker_ProcessesExtractJobSuccessfully() {
        UUID jobId = UUID.randomUUID();
        UUID versionId = UUID.randomUUID();
        UUID ownerId = candidateUser.getId();

        // 1. Mock Job claiming
        when(jdbcTemplate.queryForList(contains("SELECT * FROM processing_jobs WHERE state='QUEUED'")))
                .thenReturn(List.of(Map.of(
                        "id", jobId,
                        "owner_id", ownerId,
                        "kind", "EXTRACT",
                        "entity_id", versionId,
                        "request_id", "req-test-123"
                )));

        when(jdbcTemplate.queryForList(contains("SELECT * FROM processing_jobs WHERE id=?"), eq(jobId)))
                .thenReturn(List.of(Map.of(
                        "id", jobId,
                        "owner_id", ownerId,
                        "kind", "EXTRACT",
                        "entity_id", versionId,
                        "request_id", "req-test-123"
                )));

        // 2. Mock Document Version query
        when(jdbcTemplate.queryForList(contains("FROM document_versions v JOIN documents d"), eq(versionId)))
                .thenReturn(List.of(Map.of(
                        "id", versionId,
                        "document_id", UUID.randomUUID(),
                        "owner_id", ownerId,
                        "kind", "CV",
                        "state", "QUEUED",
                        "raw_text", "Experienced Senior Java Developer with Spring Boot and AWS.",
                        "extraction_method", "pdf-text"
                )));

        // Mock AI extraction & embedding
        com.fasterxml.jackson.databind.node.ObjectNode mockJson = new ObjectMapper().createObjectNode();
        mockJson.put("candidateName", "Dang Thi Unified");
        when(aiClient.extract(eq("CV"), anyString())).thenReturn(mockJson);
        when(aiClient.semanticText(any())).thenReturn("Experienced Senior Java Developer");
        StringBuilder validVec = new StringBuilder("[");
        for (int i = 0; i < 1024; i++) {
            if (i > 0) validVec.append(",");
            validVec.append("0.03125");
        }
        validVec.append("]");
        when(aiClient.embed(anyString(), anyString())).thenReturn(validVec.toString());

        // Mock lease asserting & updating
        when(jdbcTemplate.queryForList(contains("SELECT id FROM processing_jobs WHERE id=? AND locked_by=?"), eq(jobId), any()))
                .thenReturn(List.of(Map.of("id", jobId)));
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);
        when(jdbcTemplate.update(contains("UPDATE processing_jobs SET"), any(), any())).thenReturn(1);
        when(jdbcTemplate.update(contains("UPDATE processing_jobs SET step=?"), any(), any(), any(), any())).thenReturn(1);

        // Execute PipelineWorker tick
        pipelineWorker.tick();

        // Verify document_versions was transitioned to READY with embedding vector
        verify(jdbcTemplate).update(contains("UPDATE document_versions SET"), any(), any(), any(), any(), any(), eq(versionId));
        verify(aiClient).extract(eq("CV"), contains("Experienced Senior Java Developer"));
        verify(aiClient).embed(anyString(), anyString());

        // Zero calls to Python ai-worker
        verifyNoInteractions(aiWorkerClient);
    }

    @Test
    @DisplayName("REQ-11: Failure during AI extraction updates document_versions and processing_jobs to FAILED")
    void testPipelineWorker_ExtractionFailurePersistsFailedState() {
        UUID jobId = UUID.randomUUID();
        UUID versionId = UUID.randomUUID();
        UUID ownerId = candidateUser.getId();

        // 1. Claim job
        when(jdbcTemplate.queryForList(contains("SELECT * FROM processing_jobs WHERE state='QUEUED'")))
                .thenReturn(List.of(Map.of(
                        "id", jobId,
                        "owner_id", ownerId,
                        "kind", "EXTRACT",
                        "entity_id", versionId,
                        "request_id", "req-fail-456"
                )));

        when(jdbcTemplate.queryForList(contains("SELECT * FROM processing_jobs WHERE id=?"), eq(jobId)))
                .thenReturn(List.of(Map.of(
                        "id", jobId,
                        "owner_id", ownerId,
                        "kind", "EXTRACT",
                        "entity_id", versionId,
                        "request_id", "req-fail-456"
                )));

        // 2. Version query
        when(jdbcTemplate.queryForList(contains("FROM document_versions v JOIN documents d"), eq(versionId)))
                .thenReturn(List.of(Map.of(
                        "id", versionId,
                        "document_id", UUID.randomUUID(),
                        "owner_id", ownerId,
                        "kind", "CV",
                        "state", "QUEUED",
                        "raw_text", "Corrupted unparseable prompt injection text",
                        "extraction_method", "pdf-text"
                )));

        // AI client throws error (e.g. LLM timeout or validation failure)
        when(aiClient.extract(eq("CV"), anyString()))
                .thenThrow(new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "LLM_SERVICE_UNAVAILABLE: Connection refused"));

        when(jdbcTemplate.queryForList(contains("SELECT id FROM processing_jobs WHERE id=? AND locked_by=?"), eq(jobId), any()))
                .thenReturn(List.of(Map.of("id", jobId)));
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);
        when(jdbcTemplate.update(contains("UPDATE processing_jobs SET"), any(), any())).thenReturn(1);
        when(jdbcTemplate.update(contains("UPDATE processing_jobs SET"), any(), any(), any(), any())).thenReturn(1);

        // Execute worker tick
        pipelineWorker.tick();

        // Verify document_versions was set to state='FAILED' with error code
        verify(jdbcTemplate).update(
                contains("UPDATE document_versions SET state='FAILED'"),
                eq("INTERNAL_SERVER_ERROR"),
                contains("LLM_SERVICE_UNAVAILABLE"),
                eq(versionId)
        );

        // Verify processing_jobs was marked as state='FAILED'
        verify(jdbcTemplate).update(
                contains("UPDATE processing_jobs SET"),
                eq("INTERNAL_SERVER_ERROR"),
                contains("LLM_SERVICE_UNAVAILABLE"),
                eq(jobId),
                any()
        );

        verifyNoInteractions(aiWorkerClient);
    }
}
