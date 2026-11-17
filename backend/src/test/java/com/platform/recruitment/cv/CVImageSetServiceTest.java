package com.platform.recruitment.cv;

import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.document.Documents;
import com.platform.recruitment.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Path;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CVImageSetServiceTest {
    @Mock JdbcTemplate jdbc;
    @Mock Documents documents;
    @Mock TextReader reader;
    @Mock CandidateProfileRepository candidates;
    @Mock CVRepository cvs;
    @Mock CVVersionRepository versions;
    CVImageSetService service;
    User owner;
    UUID setId;

    @BeforeEach void setUp() {
        service = new CVImageSetService(jdbc, documents, reader, candidates, cvs, versions);
        owner = User.builder().build(); owner.setId(UUID.randomUUID());
        setId = UUID.randomUUID();
    }

    @Test void createKeepsGoodPagesWhenOneOcrFailsAndPersistsEachPageState() throws Exception {
        uploadIndex = 0;
        List<org.springframework.web.multipart.MultipartFile> files = List.of(image("one.png"), image("two.png"), image("three.png"));
        when(documents.uploadSourceImage(eq(owner.getId()), anyString(), any())).thenAnswer(inv -> {
            int index = uploadIndex++;
            return new Documents.Saved(UUID.randomUUID(), UUID.randomUUID(), null, 1, "page" + index + ".png", "image/png", "page" + index + ".png");
        });
        when(documents.path(anyString())).thenAnswer(inv -> Path.of((String) inv.getArgument(0)));
        when(reader.read(any())).thenAnswer(inv -> {
            String path = inv.getArgument(0).toString();
            if (path.startsWith("page1")) throw new IllegalStateException("OCR temporarily failed");
            return new TextReader.Extracted(path.startsWith("page2") ? "last-page-only-skill" : "middle page", "ocr");
        });
        when(jdbc.queryForList(contains("SELECT * FROM cv_source_page_sets"), any(Object[].class)))
                .thenReturn(List.of(Map.of("id", setId, "title", "Three pages", "status", "UPLOADED")));
        when(jdbc.queryForList(contains("FROM cv_source_pages p JOIN document_versions"), any(Object[].class)))
                .thenReturn(List.of());

        service.create(owner, "Three pages", files);

        ArgumentCaptor<Object[]> args = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc, times(3)).update(contains("INSERT INTO cv_source_pages"), args.capture());
        List<Object[]> inserted = args.getAllValues();
        assertEquals(List.of("READY", "FAILED", "READY"), inserted.stream().map(row -> row[5]).toList());
        assertNull(inserted.get(1)[6]);
        assertEquals("last-page-only-skill", inserted.get(2)[6]);
    }

    @Test void retryUpdatesOnlyFailedPageWithRevisionCompareAndSet() throws Exception {
        UUID pageId = UUID.randomUUID();
        Map<String,Object> failedPage = new HashMap<>();
        failedPage.put("id", pageId); failedPage.put("revision", 4); failedPage.put("status", "FAILED");
        failedPage.put("storage_key", "failed.png"); failedPage.put("set_status", "UPLOADED"); failedPage.put("title", "CV");
        when(jdbc.queryForList(contains("FROM cv_source_pages p JOIN cv_source_page_sets"), any(Object[].class)))
                .thenReturn(List.of(failedPage));
        when(documents.path("failed.png")).thenReturn(Path.of("failed.png"));
        when(reader.read(any())).thenReturn(new TextReader.Extracted("recovered", "ocr"));
        when(jdbc.queryForList(contains("SELECT * FROM cv_source_page_sets"), any(Object[].class)))
                .thenReturn(List.of(Map.of("id", setId, "title", "CV", "status", "UPLOADED")));
        when(jdbc.queryForList(contains("FROM cv_source_pages p JOIN document_versions"), any(Object[].class)))
                .thenReturn(List.of());

        service.retry(owner, setId, pageId);

        verify(jdbc).update(contains("WHERE id=? AND revision=?"), eq(5), eq("READY"), eq("recovered"), isNull(), eq(pageId), eq(4));
    }

    @Test void replacementWritesNewPageOnlyAgainstTheRevisionItRead() throws Exception {
        UUID pageId = UUID.randomUUID(), newDocumentId = UUID.randomUUID(), newVersionId = UUID.randomUUID();
        Map<String,Object> failedPage = new HashMap<>();
        failedPage.put("id", pageId); failedPage.put("revision", 8); failedPage.put("status", "FAILED");
        failedPage.put("storage_key", "old.png"); failedPage.put("set_status", "UPLOADED"); failedPage.put("title", "CV");
        when(jdbc.queryForList(contains("FROM cv_source_pages p JOIN cv_source_page_sets"), any(Object[].class)))
                .thenReturn(List.of(failedPage));
        when(documents.uploadSourceImage(eq(owner.getId()), eq("CV"), any()))
                .thenReturn(new Documents.Saved(newDocumentId, newVersionId, null, 1, "replacement.png", "image/png", "replacement.png"));
        when(documents.path("replacement.png")).thenReturn(Path.of("replacement.png"));
        when(reader.read(any())).thenReturn(new TextReader.Extracted("skill only on final page", "ocr"));
        when(jdbc.queryForList(contains("SELECT * FROM cv_source_page_sets"), any(Object[].class)))
                .thenReturn(List.of(Map.of("id", setId, "title", "CV", "status", "UPLOADED")));
        when(jdbc.queryForList(contains("FROM cv_source_pages p JOIN document_versions"), any(Object[].class)))
                .thenReturn(List.of());

        service.replace(owner, setId, pageId, image("replacement.png"));

        verify(jdbc).update(contains("SET document_id=?"), eq(newDocumentId), eq(newVersionId), eq(9),
                eq("READY"), eq("skill only on final page"), isNull(), eq(pageId), eq(8));
    }

    @Test void mergesPageTextInSuppliedPageOrder() {
        assertEquals("first\n\nlast-page-only-skill", CVImageSetService.mergePageTexts(List.of("first", "last-page-only-skill")));
    }

    @Test void draftCannotBeCreatedWhileAnyRemainingPageFailed() {
        when(jdbc.queryForList(contains("SELECT * FROM cv_source_page_sets"), any(Object[].class)))
                .thenReturn(List.of(Map.of("id", setId, "title", "CV", "status", "UPLOADED")));
        when(jdbc.queryForList(contains("SELECT p.id,p.page_order,p.status,p.extracted_text"), any(Object[].class)))
                .thenReturn(List.of(Map.of("id", UUID.randomUUID(), "page_order", 1, "status", "READY", "extracted_text", "first", "size_bytes", 1L),
                        Map.of("id", UUID.randomUUID(), "page_order", 2, "status", "FAILED", "extracted_text", "", "size_bytes", 1L)));

        assertThrows(com.platform.recruitment.common.CustomException.class, () -> service.createDraft(owner, setId, false));
        verifyNoInteractions(candidates);
    }

    @Test void legacySingleFileMultipartUploadRouteRemainsAvailable() throws Exception {
        var method = CVController.class.getMethod("uploadCV", User.class,
                org.springframework.web.multipart.MultipartFile.class, String.class, String.class, Boolean.class);
        var mapping = method.getAnnotation(org.springframework.web.bind.annotation.PostMapping.class);
        assertNotNull(mapping);
        assertTrue(Arrays.asList(mapping.value()).contains("/upload"));
        assertTrue(Arrays.asList(mapping.consumes()).contains("multipart/form-data"));
    }

    @Test void unownedSetReadsAndMutationsAreDenied() {
        when(jdbc.queryForList(anyString(), any(Object[].class))).thenReturn(List.of());
        assertThrows(com.platform.recruitment.common.ResourceNotFoundException.class, () -> service.get(owner, setId));
        assertThrows(com.platform.recruitment.common.ResourceNotFoundException.class, () -> service.remove(owner, setId, UUID.randomUUID()));
    }

    private int uploadIndex;
    private MockMultipartFile image(String name) { return new MockMultipartFile("files", name, "image/png", new byte[]{1}); }
}
