package com.platform.recruitment;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.document.Documents;
import com.platform.recruitment.event.Events;
import com.platform.recruitment.worker.JobQueue;
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

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class FileStorageRobustnessTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private Events events;

    @Mock
    private JobQueue queue;

    private Path storageRoot;
    private UUID ownerId;

    @BeforeEach
    void setUp(@TempDir Path tempDir) {
        storageRoot = tempDir.resolve("nested").resolve("storage").resolve("uploads");
        ownerId = UUID.randomUUID();

        lenient().doReturn(List.of(Map.of("id", UUID.randomUUID())))
                .when(jdbcTemplate).queryForList(anyString(), any(Object[].class));
        lenient().doReturn(1)
                .when(jdbcTemplate).queryForObject(anyString(), eq(Integer.class), any(Object[].class));
        lenient().doReturn(UUID.randomUUID())
                .when(queue).enqueue(any(), any(), any());
    }

    @Test
    @DisplayName("1 & 2. Storage root chưa tồn tại: Tự tạo thư mục lồng nhau thành công")
    void testStorageRootAutoCreation() throws IOException {
        assertFalse(Files.exists(storageRoot), "Storage root should not exist prior to initialization");
        Documents docs = new Documents(jdbcTemplate, queue, events, storageRoot.toString());
        assertTrue(Files.exists(storageRoot), "Storage root should be automatically created by Documents");
        assertTrue(Files.isDirectory(storageRoot));
    }

    @Test
    @DisplayName("3. Lưu PDF hợp lệ thành công và kiểm tra nội dung file thật trên disk")
    void testStoreValidPdf() throws IOException {
        Documents docs = new Documents(jdbcTemplate, queue, events, storageRoot.toString());

        byte[] pdfBytes = "%PDF-1.4 Minimal PDF Content".getBytes(StandardCharsets.ISO_8859_1);
        MockMultipartFile file = new MockMultipartFile(
                "file", "resume.pdf", "application/pdf", pdfBytes
        );

        Documents.Saved saved = docs.upload(ownerId, "CV", "Test Resume", file, UUID.randomUUID());
        assertNotNull(saved);
        assertNotNull(saved.versionId());

        Path target = docs.path(saved.versionId() + ".pdf");
        assertTrue(Files.exists(target), "Stored file must exist on disk");
        assertArrayEquals(pdfBytes, Files.readAllBytes(target), "Stored content must match uploaded bytes exactly");
    }

    @Test
    @DisplayName("4. Lưu DOCX hợp lệ thành công và kiểm tra nội dung file thật")
    void testStoreValidDocx() throws IOException {
        Documents docs = new Documents(jdbcTemplate, queue, events, storageRoot.toString());

        byte[] docxBytes = new byte[]{0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00};
        MockMultipartFile file = new MockMultipartFile(
                "file", "profile.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", docxBytes
        );

        Documents.Saved saved = docs.upload(ownerId, "CV", "DOCX Resume", file, UUID.randomUUID());
        assertNotNull(saved);

        Path target = docs.path(saved.versionId() + ".docx");
        assertTrue(Files.exists(target));
        assertArrayEquals(docxBytes, Files.readAllBytes(target));
    }

    @Test
    @DisplayName("5. Lưu ảnh PNG/JPG hợp lệ thành công")
    void testStoreValidImage() throws IOException {
        Documents docs = new Documents(jdbcTemplate, queue, events, storageRoot.toString());

        byte[] pngBytes = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00};
        MockMultipartFile file = new MockMultipartFile("file", "scan.png", "image/png", pngBytes);

        Documents.Saved saved = docs.upload(ownerId, "CV", "Scanned CV", file, UUID.randomUUID());
        assertNotNull(saved);

        Path target = docs.path(saved.versionId() + ".png");
        assertTrue(Files.exists(target));
        assertArrayEquals(pngBytes, Files.readAllBytes(target));
    }

    @Test
    @DisplayName("6. Lưu DOC (Word binary) hợp lệ thành công")
    void testStoreValidLegacyDoc() throws IOException {
        Documents docs = new Documents(jdbcTemplate, queue, events, storageRoot.toString());

        byte[] docBytes = new byte[]{(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1, 0x00, 0x00};
        MockMultipartFile file = new MockMultipartFile("file", "legacy.doc", "application/msword", docBytes);

        Documents.Saved saved = docs.upload(ownerId, "CV", "Legacy Doc CV", file, UUID.randomUUID());
        assertNotNull(saved);

        Path target = docs.path(saved.versionId() + ".doc");
        assertTrue(Files.exists(target));
        assertArrayEquals(docBytes, Files.readAllBytes(target));
    }

    @Test
    @DisplayName("7. Path traversal bị chặn, không thể ghi ra ngoài storage directory")
    void testPreventPathTraversal() throws IOException {
        Documents docs = new Documents(jdbcTemplate, queue, events, storageRoot.toString());
        assertThrows(CustomException.class, () -> docs.path("../../../evil.sh"));
        assertThrows(CustomException.class, () -> docs.path("..\\..\\windows\\system32\\calc.exe"));
    }

    @Test
    @DisplayName("8. Tệp rỗng (0 bytes) bị từ chối với INVALID_FILE")
    void testRejectEmptyFile() throws IOException {
        Documents docs = new Documents(jdbcTemplate, queue, events, storageRoot.toString());
        MockMultipartFile emptyFile = new MockMultipartFile("file", "empty.pdf", "application/pdf", new byte[0]);

        CustomException ex = assertThrows(CustomException.class, () -> docs.upload(ownerId, "CV", "Empty", emptyFile, null));
        assertEquals(ErrorCode.INVALID_FILE, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("FILE_EMPTY"));
    }

    @Test
    @DisplayName("9. Tệp vượt quá 10MB bị từ chối với FILE_SIZE_EXCEEDED")
    void testRejectOversizedFile() throws IOException {
        Documents docs = new Documents(jdbcTemplate, queue, events, storageRoot.toString());
        MockMultipartFile largeFile = new MockMultipartFile("file", "large.pdf", "application/pdf", new byte[11 * 1024 * 1024]);

        CustomException ex = assertThrows(CustomException.class, () -> docs.upload(ownerId, "CV", "Large", largeFile, null));
        assertEquals(ErrorCode.FILE_SIZE_EXCEEDED, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("FILE_TOO_LARGE"));
    }

    @Test
    @DisplayName("10. Loại tệp không hỗ trợ hoặc sai chữ ký bị từ chối với INVALID_FILE")
    void testRejectUnsupportedFileType() throws IOException {
        Documents docs = new Documents(jdbcTemplate, queue, events, storageRoot.toString());
        MockMultipartFile exeFile = new MockMultipartFile("file", "danger.exe", "application/octet-stream", "MZ...".getBytes(StandardCharsets.UTF_8));

        CustomException ex = assertThrows(CustomException.class, () -> docs.upload(ownerId, "CV", "Dangerous", exeFile, null));
        assertEquals(ErrorCode.INVALID_FILE, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("UNSUPPORTED_FILE_TYPE"));
    }

    @Test
    @DisplayName("11. Khôi phục thư mục nếu bị xóa lúc runtime mà không crash")
    void testRuntimeDirectoryRecreation() throws IOException {
        Documents docs = new Documents(jdbcTemplate, queue, events, storageRoot.toString());
        assertTrue(Files.exists(storageRoot));

        // Delete directory out from underneath the running service
        Files.delete(storageRoot);
        assertFalse(Files.exists(storageRoot));

        byte[] pdfBytes = "%PDF-1.4 Recovered".getBytes(StandardCharsets.ISO_8859_1);
        MockMultipartFile file = new MockMultipartFile("file", "resume.pdf", "application/pdf", pdfBytes);

        // Upload must automatically recreate the missing directory
        Documents.Saved saved = docs.upload(ownerId, "CV", "Resume", file, UUID.randomUUID());
        assertNotNull(saved);
        assertTrue(Files.exists(storageRoot), "Storage root must be recreated on-demand");
        assertTrue(Files.exists(docs.path(saved.versionId() + ".pdf")));
    }

    @Test
    @DisplayName("12. Dọn dẹp tệp nếu giao dịch database thất bại")
    void testCleanupFileOnDatabaseFailure() throws IOException {
        Documents docs = new Documents(jdbcTemplate, queue, events, storageRoot.toString());
        doThrow(new RuntimeException("Simulated Database Failure"))
                .when(jdbcTemplate).update(contains("document_versions"), any(Object[].class));

        byte[] pdfBytes = "%PDF-1.4 Fail Test".getBytes(StandardCharsets.ISO_8859_1);
        MockMultipartFile file = new MockMultipartFile("file", "resume.pdf", "application/pdf", pdfBytes);

        assertThrows(RuntimeException.class, () -> docs.upload(ownerId, "CV", "Resume", file, UUID.randomUUID()));

        // Verify no orphan files remain in directory
        try (var stream = Files.list(storageRoot)) {
            assertEquals(0, stream.count(), "Orphan file must be cleaned up if database insert fails");
        }
    }
}
