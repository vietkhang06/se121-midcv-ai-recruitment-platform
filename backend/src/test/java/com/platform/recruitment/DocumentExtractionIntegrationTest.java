package com.platform.recruitment;

import com.platform.recruitment.ai.AiWorkerClient;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.cv.*;
import com.platform.recruitment.document.Documents;
import com.platform.recruitment.user.User;
import com.platform.recruitment.user.Role;
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

import java.io.IOException;
import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DocumentExtractionIntegrationTest {

    @Mock private CVRepository cvRepository;
    @Mock private CVVersionRepository cvVersionRepository;
    @Mock private CVSectionRepository cvSectionRepository;
    @Mock private CandidateProfileRepository candidateProfileRepository;
    @Mock private Documents documents;
    @Mock private TextReader textReader;
    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private AiWorkerClient aiWorkerClient;

    private CVService cvService;
    private User testUser;
    private CandidateProfile testCandidate;

    @BeforeEach
    void setUp() {
        cvService = new CVService(
                cvRepository,
                cvVersionRepository,
                cvSectionRepository,
                candidateProfileRepository,
                documents,
                textReader,
                jdbcTemplate
        );

        UUID userId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();

        testUser = User.builder()
                .email("candidate@midcv.com")
                .role(Role.CANDIDATE)
                .build();
        testUser.setId(userId);

        testCandidate = CandidateProfile.builder()
                .user(testUser)
                .fullName("Nguyen Van Test")
                .build();
        testCandidate.setId(candidateId);

        lenient().when(candidateProfileRepository.findByUserId(userId)).thenReturn(Optional.of(testCandidate));
    }

    @Test
    @DisplayName("CV-EX-01: Valid text PDF upload extracts real text and persists into CV entity via native pipeline")
    void testValidPdfUpload_ExtractsAndPersistsRealText(@TempDir Path tempDir) throws IOException {
        byte[] pdfBytes = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nReal CV content: Java, Spring Boot, PostgreSQL".getBytes();
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "candidate_cv.pdf",
                "application/pdf",
                pdfBytes
        );

        UUID docId = UUID.randomUUID();
        UUID verId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        when(documents.upload(eq(testUser.getId()), eq("CV"), eq("My Real CV"), eq(file), isNull()))
                .thenReturn(new Documents.Saved(docId, verId, jobId, 1));
        when(documents.path(anyString())).thenReturn(tempDir.resolve("candidate_cv.pdf"));

        String realExtractedText = "Nguyen Van Test\nSenior Backend Engineer\nSkills: Java, Spring Boot, PostgreSQL";
        when(textReader.read(any())).thenReturn(new TextReader.Extracted(realExtractedText, "pdf-text"));

        when(cvRepository.save(any(CV.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(cvVersionRepository.save(any(CVVersion.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        CVResponse response = cvService.uploadCV(testUser, file, "My Real CV", "TECH", true);

        // Then
        assertNotNull(response);
        assertEquals(docId, response.getId());
        assertEquals(jobId, response.getJobId());
        assertEquals(verId, response.getDocumentVersionId());

        ArgumentCaptor<CV> cvCaptor = ArgumentCaptor.forClass(CV.class);
        verify(cvRepository).save(cvCaptor.capture());
        CV savedCv = cvCaptor.getValue();

        // Must persist the REAL extracted text, NOT the filename
        assertEquals(realExtractedText, savedCv.getRawText());
        assertNotEquals("My Real CV", savedCv.getRawText());
        assertNotEquals("candidate_cv.pdf", savedCv.getRawText());
        assertEquals("PARSED", savedCv.getStatus());

        ArgumentCaptor<CVVersion> versionCaptor = ArgumentCaptor.forClass(CVVersion.class);
        verify(cvVersionRepository).save(versionCaptor.capture());
        assertEquals(realExtractedText, versionCaptor.getValue().getRawTextContent());

        // ZERO calls to AiWorkerClient!
        verifyNoInteractions(aiWorkerClient);
    }

    @Test
    @DisplayName("CV-EX-02: Valid DOCX upload extracts real text from paragraphs and tables via native pipeline")
    void testValidDocxUpload_ExtractsAndPersistsRealText(@TempDir Path tempDir) throws IOException {
        byte[] docxBytes = new byte[]{0x50, 0x4B, 0x03, 0x04, 0x00, 0x01, 0x02, 0x03};
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "resume.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                docxBytes
        );

        UUID docId = UUID.randomUUID();
        UUID verId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        when(documents.upload(eq(testUser.getId()), eq("CV"), eq("DOCX Resume"), eq(file), isNull()))
                .thenReturn(new Documents.Saved(docId, verId, jobId, 1));
        when(documents.path(anyString())).thenReturn(tempDir.resolve("resume.docx"));

        String realDocxText = "Tran Thi B\nExperience: 4 years\nSkills | TypeScript | React | Node.js";
        when(textReader.read(any())).thenReturn(new TextReader.Extracted(realDocxText, "docx"));

        when(cvRepository.save(any(CV.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(cvVersionRepository.save(any(CVVersion.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        CVResponse response = cvService.uploadCV(testUser, file, "DOCX Resume", "TECH", false);

        // Then
        assertNotNull(response);
        ArgumentCaptor<CV> cvCaptor = ArgumentCaptor.forClass(CV.class);
        verify(cvRepository).save(cvCaptor.capture());
        assertEquals(realDocxText, cvCaptor.getValue().getRawText());

        // ZERO calls to AiWorkerClient!
        verifyNoInteractions(aiWorkerClient);
    }

    @Test
    @DisplayName("CV-EX-05: Empty file (0 bytes) is rejected with FILE_EMPTY error")
    void testUploadEmptyFile_ThrowsException() throws IOException {
        MockMultipartFile emptyFile = new MockMultipartFile(
                "file",
                "empty.pdf",
                "application/pdf",
                new byte[0]
        );

        when(documents.upload(any(), any(), any(), eq(emptyFile), any()))
                .thenThrow(new CustomException(ErrorCode.INVALID_FILE, "FILE_EMPTY: Uploaded file is empty (0 bytes)"));

        CustomException ex = assertThrows(CustomException.class, () ->
                cvService.uploadCV(testUser, emptyFile, "Empty", "TECH", false)
        );

        assertEquals(ErrorCode.INVALID_FILE, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("FILE_EMPTY"));
        verifyNoInteractions(aiWorkerClient);
        verifyNoInteractions(cvRepository);
    }

    @Test
    @DisplayName("CV-EX-06 / CV-EX-07: Spoofed or corrupted file extension is rejected by magic byte inspection")
    void testUploadSpoofedFile_ThrowsException() throws IOException {
        byte[] fakePdfBytes = "This is not a PDF file at all, just plain text".getBytes();
        MockMultipartFile spoofedFile = new MockMultipartFile(
                "file",
                "fake.pdf",
                "application/pdf",
                fakePdfBytes
        );

        when(documents.upload(any(), any(), any(), eq(spoofedFile), any()))
                .thenThrow(new CustomException(ErrorCode.INVALID_FILE, "UNSUPPORTED_FILE_TYPE: File declared as PDF does not have valid %PDF header"));

        CustomException ex = assertThrows(CustomException.class, () ->
                cvService.uploadCV(testUser, spoofedFile, "Fake", "TECH", false)
        );

        assertEquals(ErrorCode.INVALID_FILE, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("UNSUPPORTED_FILE_TYPE"));
        verifyNoInteractions(aiWorkerClient);
        verifyNoInteractions(cvRepository);
    }

    @Test
    @DisplayName("CV-EX-08: Document extraction failure throws exception and does NOT persist fake CV")
    void testUploadFailedExtraction_ThrowsException(@TempDir Path tempDir) throws IOException {
        byte[] pdfBytes = "%PDF-1.4\nValid header but image-only scan with failed OCR".getBytes();
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "scanned.pdf",
                "application/pdf",
                pdfBytes
        );

        UUID docId = UUID.randomUUID();
        UUID verId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        when(documents.upload(eq(testUser.getId()), eq("CV"), eq("Scanned CV"), eq(file), isNull()))
                .thenReturn(new Documents.Saved(docId, verId, jobId, 1));
        when(documents.path(anyString())).thenReturn(tempDir.resolve("scanned.pdf"));

        when(textReader.read(any())).thenThrow(new CustomException(
                ErrorCode.INVALID_FILE,
                "OCR_FAILED: Tesseract không nhận dạng được ảnh. Kiểm tra định dạng và bộ ngôn ngữ."
        ));

        CustomException ex = assertThrows(CustomException.class, () ->
                cvService.uploadCV(testUser, file, "Scanned CV", "TECH", false)
        );

        assertEquals(ErrorCode.INVALID_FILE, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("OCR_FAILED"));
        verify(cvRepository, never()).save(any());
        verifyNoInteractions(aiWorkerClient);
    }

    @Test
    @DisplayName("CV-EX-09: Oversized file exceeding limit is rejected")
    void testUploadOversizedFile_ThrowsException() throws IOException {
        byte[] largeBytes = new byte[10 * 1024 * 1024 + 1];
        MockMultipartFile largeFile = new MockMultipartFile(
                "file",
                "large.pdf",
                "application/pdf",
                largeBytes
        );

        when(documents.upload(any(), any(), any(), eq(largeFile), any()))
                .thenThrow(new CustomException(ErrorCode.FILE_SIZE_EXCEEDED, "FILE_TOO_LARGE: File size exceeds maximum limit of 10MB"));

        CustomException ex = assertThrows(CustomException.class, () ->
                cvService.uploadCV(testUser, largeFile, "Large", "TECH", false)
        );

        assertEquals(ErrorCode.FILE_SIZE_EXCEEDED, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("FILE_TOO_LARGE"));
        verifyNoInteractions(aiWorkerClient);
        verifyNoInteractions(cvRepository);
    }
}
