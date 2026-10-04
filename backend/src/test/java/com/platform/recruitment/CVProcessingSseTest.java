package com.platform.recruitment;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.cv.CvProcessingSseService;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CVProcessingSseTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    private CvProcessingSseService sseService;

    private User candidateUser;
    private UUID jobId;

    @BeforeEach
    void setUp() {
        sseService = new CvProcessingSseService(jdbcTemplate);
        jobId = UUID.randomUUID();
        candidateUser = User.builder()
                .email("candidate@example.com")
                .role(Role.CANDIDATE)
                .isActive(true)
                .build();
        candidateUser.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("subscribe throws ResourceNotFoundException when processing job not found")
    void testSubscribe_JobNotFound_ThrowsException() {
        when(jdbcTemplate.queryForList(anyString(), eq(jobId)))
                .thenReturn(Collections.emptyList());

        assertThrows(ResourceNotFoundException.class, () ->
                sseService.subscribe(jobId, candidateUser)
        );
    }

    @Test
    @DisplayName("subscribe throws CustomException ACCESS_DENIED when user is not owner")
    void testSubscribe_UnauthorizedUser_ThrowsAccessDenied() {
        UUID otherUserId = UUID.randomUUID();
        Map<String, Object> jobRow = new HashMap<>();
        jobRow.put("id", jobId);
        jobRow.put("owner_id", otherUserId);
        jobRow.put("state", "RUNNING");
        jobRow.put("step", "LLM_EXTRACTION");
        jobRow.put("progress", 50);

        when(jdbcTemplate.queryForList(anyString(), eq(jobId)))
                .thenReturn(List.of(jobRow));

        assertThrows(CustomException.class, () ->
                sseService.subscribe(jobId, candidateUser)
        );
    }

    @Test
    @DisplayName("subscribe succeeds for owner, replays past events, returns active SseEmitter")
    void testSubscribe_OwnerSuccess_ReplaysPastEvents() {
        Map<String, Object> jobRow = new HashMap<>();
        jobRow.put("id", jobId);
        jobRow.put("owner_id", candidateUser.getId());
        jobRow.put("state", "RUNNING");
        jobRow.put("step", "LLM_EXTRACTION");
        jobRow.put("progress", 60);

        when(jdbcTemplate.queryForList(startsWith("SELECT id, owner_id"), eq(jobId)))
                .thenReturn(List.of(jobRow));

        Map<String, Object> eventRow1 = new HashMap<>();
        eventRow1.put("step", "UPLOAD");
        eventRow1.put("code", "FILE_STORED");
        eventRow1.put("level", "INFO");
        eventRow1.put("message", "File stored");
        eventRow1.put("duration_ms", 100L);
        eventRow1.put("created_at", new java.sql.Timestamp(System.currentTimeMillis()));

        Map<String, Object> eventRow2 = new HashMap<>();
        eventRow2.put("step", "READ_DOCUMENT");
        eventRow2.put("code", "STEP_STARTED");
        eventRow2.put("level", "INFO");
        eventRow2.put("message", "Reading text");
        eventRow2.put("duration_ms", 200L);
        eventRow2.put("created_at", new java.sql.Timestamp(System.currentTimeMillis()));

        when(jdbcTemplate.queryForList(startsWith("SELECT step, code"), eq(jobId)))
                .thenReturn(List.of(eventRow1, eventRow2));

        SseEmitter emitter = sseService.subscribe(jobId, candidateUser);
        assertNotNull(emitter);

        // Verify broadcast event does not throw
        assertDoesNotThrow(() ->
                sseService.onEventEmitted(jobId, candidateUser.getId(), "INFO", "EMBEDDING", "STEP_STARTED", "Generating embedding", 50L)
        );
    }

    @Test
    @DisplayName("calculateProgress accurately maps pipeline steps to percentage")
    void testCalculateProgress() {
        assertEquals(5, CvProcessingSseService.calculateProgress("QUEUED", "JOB_QUEUED"));
        assertEquals(15, CvProcessingSseService.calculateProgress("UPLOAD", "FILE_STORED"));
        assertEquals(30, CvProcessingSseService.calculateProgress("READ_DOCUMENT", "STEP_STARTED"));
        assertEquals(45, CvProcessingSseService.calculateProgress("OCR", "OCR_COMPLETED"));
        assertEquals(60, CvProcessingSseService.calculateProgress("LLM_EXTRACTION", "STEP_STARTED"));
        assertEquals(75, CvProcessingSseService.calculateProgress("EVIDENCE_VALIDATED", "STEP_STARTED"));
        assertEquals(85, CvProcessingSseService.calculateProgress("EMBEDDING", "STEP_STARTED"));
        assertEquals(95, CvProcessingSseService.calculateProgress("EMBEDDING_PERSISTED", "STEP_STARTED"));
        assertEquals(100, CvProcessingSseService.calculateProgress("SUCCEEDED", "JOB_SUCCEEDED"));
        assertEquals(0, CvProcessingSseService.calculateProgress("FAILED", "PIPELINE_FAILED"));
    }
}
