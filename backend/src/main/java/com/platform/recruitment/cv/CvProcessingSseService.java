package com.platform.recruitment.cv;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
@RequiredArgsConstructor
public class CvProcessingSseService {

    private final JdbcTemplate jdbcTemplate;

    // Active emitters keyed by processing job ID
    private final Map<UUID, List<SseEmitter>> emittersByJobId = new ConcurrentHashMap<>();

    private static final long SSE_TIMEOUT = 180_000L; // 3 minutes timeout

    /**
     * Subscribes a client to SSE events for a specific processing job.
     */
    public SseEmitter subscribe(UUID jobId, User currentUser) {
        // Verify job ownership
        List<Map<String, Object>> jobs = jdbcTemplate.queryForList(
                "SELECT id, owner_id, state, step, progress FROM processing_jobs WHERE id = ?",
                jobId
        );

        if (jobs.isEmpty()) {
            throw new ResourceNotFoundException("ProcessingJob", "id", jobId);
        }

        Map<String, Object> job = jobs.get(0);
        UUID ownerId = (UUID) job.get("owner_id");
        if (currentUser != null && !currentUser.getId().equals(ownerId) && currentUser.getRole() != com.platform.recruitment.user.Role.ADMIN) {
            throw new CustomException(ErrorCode.ACCESS_DENIED, "FORBIDDEN_RESOURCE: You do not own this processing job");
        }

        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);

        // Register lifecycle callbacks
        registerCallbacks(jobId, emitter);

        // Immediately replay historical events so client doesn't miss early stages
        replayHistoricalEvents(jobId, job, emitter);

        String state = Objects.toString(job.get("state"), "");
        if ("SUCCEEDED".equalsIgnoreCase(state) || "FAILED".equalsIgnoreCase(state) || "COMPLETED".equalsIgnoreCase(state)) {
            // Already finalized - complete immediately
            emitter.complete();
            return emitter;
        }

        // Add to active subscribers
        emittersByJobId.computeIfAbsent(jobId, k -> new CopyOnWriteArrayList<>()).add(emitter);
        log.info("Client subscribed to SSE for processing job: {}", jobId);

        return emitter;
    }

    /**
     * Subscribes by CV ID by looking up its latest processing job.
     */
    public SseEmitter subscribeByCvId(UUID cvId, User currentUser) {
        List<Map<String, Object>> jobs = jdbcTemplate.queryForList(
                "SELECT j.id FROM processing_jobs j " +
                        "WHERE j.entity_id IN (SELECT id FROM cv_versions WHERE cv_id = ?) " +
                        "ORDER BY j.created_at DESC LIMIT 1",
                cvId
        );

        if (jobs.isEmpty()) {
            throw new ResourceNotFoundException("ProcessingJob", "cvId", cvId);
        }

        UUID jobId = (UUID) jobs.get(0).get("id");
        return subscribe(jobId, currentUser);
    }

    /**
     * Called when a new pipeline event is emitted in Events.emit().
     */
    public void onEventEmitted(UUID jobId, UUID ownerId, String level, String step, String code, String message, Long duration) {
        if (jobId == null) {
            return;
        }

        List<SseEmitter> emitters = emittersByJobId.get(jobId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }

        int progress = calculateProgress(step, code);
        CvProcessingEvent event = CvProcessingEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .jobId(jobId)
                .step(step)
                .code(code)
                .level(level)
                .progress(progress)
                .message(message)
                .durationMs(duration)
                .timestamp(Instant.now())
                .build();

        boolean isTerminal = isTerminalStep(step, code);

        List<SseEmitter> deadEmitters = new ArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("cv-processing-progress")
                        .id(event.getEventId())
                        .data(event, MediaType.APPLICATION_JSON));

                if (isTerminal) {
                    emitter.complete();
                    deadEmitters.add(emitter);
                }
            } catch (Exception ex) {
                log.debug("Failed to deliver SSE event for job {}: {}", jobId, ex.getMessage());
                deadEmitters.add(emitter);
            }
        }

        if (!deadEmitters.isEmpty()) {
            emitters.removeAll(deadEmitters);
            if (emitters.isEmpty()) {
                emittersByJobId.remove(jobId);
            }
        }
    }

    private void registerCallbacks(UUID jobId, SseEmitter emitter) {
        emitter.onCompletion(() -> removeEmitter(jobId, emitter));
        emitter.onTimeout(() -> {
            log.debug("SSE connection timed out for job {}", jobId);
            removeEmitter(jobId, emitter);
        });
        emitter.onError((ex) -> {
            log.debug("SSE error on job {}: {}", jobId, ex.getMessage());
            removeEmitter(jobId, emitter);
        });
    }

    private void removeEmitter(UUID jobId, SseEmitter emitter) {
        List<SseEmitter> list = emittersByJobId.get(jobId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                emittersByJobId.remove(jobId);
            }
        }
    }

    private void replayHistoricalEvents(UUID jobId, Map<String, Object> job, SseEmitter emitter) {
        try {
            List<Map<String, Object>> events = jdbcTemplate.queryForList(
                    "SELECT step, code, level, message, duration_ms, created_at " +
                            "FROM job_events WHERE job_id = ? ORDER BY id ASC",
                    jobId
            );

            for (Map<String, Object> row : events) {
                String step = Objects.toString(row.get("step"), "");
                String code = Objects.toString(row.get("code"), "");
                String level = Objects.toString(row.get("level"), "INFO");
                String message = Objects.toString(row.get("message"), "");
                Long duration = row.get("duration_ms") != null ? ((Number) row.get("duration_ms")).longValue() : null;
                java.sql.Timestamp createdAt = (java.sql.Timestamp) row.get("created_at");

                CvProcessingEvent event = CvProcessingEvent.builder()
                        .eventId(UUID.randomUUID().toString())
                        .jobId(jobId)
                        .step(step)
                        .code(code)
                        .level(level)
                        .progress(calculateProgress(step, code))
                        .message(message)
                        .durationMs(duration)
                        .timestamp(createdAt != null ? createdAt.toInstant() : Instant.now())
                        .build();

                emitter.send(SseEmitter.event()
                        .name("cv-processing-progress")
                        .id(event.getEventId())
                        .data(event, MediaType.APPLICATION_JSON));
            }
        } catch (IOException ex) {
            log.warn("Error replaying past events for job {}: {}", jobId, ex.getMessage());
        }
    }

    public static int calculateProgress(String step, String code) {
        if (step == null) return 10;
        String s = step.toUpperCase();
        String c = code != null ? code.toUpperCase() : "";

        if (s.contains("FAILED") || c.contains("FAILED") || c.contains("ERROR")) return 0;
        if (s.contains("SUCCEEDED") || s.contains("COMPLETED") || s.contains("NEEDS_REVIEW") || s.contains("CONFIRMED")) return 100;
        if (s.contains("EMBEDDING_PERSISTED")) return 95;
        if (s.contains("EMBEDDING")) return 85;
        if (s.contains("EVIDENCE_VALIDATED") || s.contains("EVIDENCE")) return 75;
        if (s.contains("LLM_EXTRACTION") || s.contains("EXTRACTION")) return 60;
        if (s.contains("OCR")) return 45;
        if (s.contains("READ_DOCUMENT") || s.contains("PARSING")) return 30;
        if (s.contains("UPLOAD") || s.contains("UPLOADED")) return 15;
        if (s.contains("QUEUED")) return 5;
        return 20;
    }

    private static boolean isTerminalStep(String step, String code) {
        if (step == null) return false;
        String s = step.toUpperCase();
        String c = code != null ? code.toUpperCase() : "";
        return s.contains("SUCCEEDED") || s.contains("COMPLETED") || s.contains("FAILED") || s.contains("NEEDS_REVIEW")
                || c.contains("JOB_SUCCEEDED") || c.contains("JOB_FAILED");
    }
}
