package com.platform.recruitment.cv;

import com.platform.recruitment.common.*;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import jakarta.annotation.PreDestroy;
import java.time.Instant;
import java.sql.Timestamp;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class CvProcessingSseService {
    private final JdbcTemplate jdbcTemplate;
    private final Set<Subscription> subscribers = ConcurrentHashMap.newKeySet();
    @org.springframework.beans.factory.annotation.Autowired private com.platform.recruitment.auth.JwtTokenProvider tokens;
    @org.springframework.beans.factory.annotation.Autowired private com.platform.recruitment.auth.AuthSessionService sessions;

    private static class Subscription {
        final UUID jobId;
        final User user;
        final String token;
        final SseEmitter emitter = new SseEmitter(180_000L);
        long cursor;
        long heartbeat;
        Subscription(UUID jobId, User user, String token, long cursor) { this.jobId=jobId; this.user=user; this.token=token; this.cursor=cursor; }
    }

    public SseEmitter subscribe(UUID jobId, User user) { return subscribe(jobId,user,null,null); }
    public SseEmitter subscribe(UUID jobId, User user, String lastId, String token) {
        Map<String,Object> job = job(jobId);
        if (user == null || !user.getId().equals(job.get("owner_id")) && user.getRole() != com.platform.recruitment.user.Role.ADMIN)
            throw new CustomException(ErrorCode.ACCESS_DENIED,"Bạn không có quyền xem tiến trình này.");
        long cursor = 0;
        if (lastId != null && !lastId.isBlank()) {
            try { cursor=Long.parseLong(lastId); if(cursor<0) throw new NumberFormatException(); }
            catch(NumberFormatException ex) { throw new CustomException(ErrorCode.VALIDATION_ERROR,"Last-Event-ID không hợp lệ."); }
        }
        Subscription sub=new Subscription(jobId,user,token,cursor);
        sub.emitter.onCompletion(() -> subscribers.remove(sub));
        sub.emitter.onTimeout(() -> { subscribers.remove(sub); sub.emitter.complete(); });
        sub.emitter.onError(ex -> subscribers.remove(sub));
        // Register before reading history. Durable ID cursors and synchronized draining
        // close the replay/live race, including events written on another instance.
        subscribers.add(sub);
        drain(sub);
        return sub.emitter;
    }
    public SseEmitter subscribeByCvId(UUID cvId, User user) { return subscribeByCvId(cvId,user,null,null); }
    public SseEmitter subscribeByCvId(UUID cvId, User user, String lastId, String token) {
        List<Map<String,Object>> rows=jdbcTemplate.queryForList(
            "SELECT j.id FROM processing_jobs j WHERE j.entity_id IN (SELECT id FROM cv_versions WHERE cv_id = ?) ORDER BY j.created_at DESC LIMIT 1",cvId);
        if(rows.isEmpty()) throw new ResourceNotFoundException("ProcessingJob","cvId",cvId);
        return subscribe((UUID)rows.get(0).get("id"),user,lastId,token);
    }
    private Map<String,Object> job(UUID id) {
        List<Map<String,Object>> rows=jdbcTemplate.queryForList("SELECT id, owner_id, state, step, progress FROM processing_jobs WHERE id = ?",id);
        if(rows.isEmpty()) throw new ResourceNotFoundException("ProcessingJob","id",id);
        return rows.get(0);
    }
    @Scheduled(fixedDelay=1000)
    public void poll() { for(Subscription sub:subscribers) drain(sub); }

    // Events are read from committed storage by poll(), never broadcast before commit.
    public void onEventEmitted(UUID jobId, UUID ownerId, String level, String step, String code, String message, Long duration) { }

    private void drain(Subscription sub) {
        synchronized(sub) {
            if(!subscribers.contains(sub)) return;
            try {
                if(sub.token!=null && (!tokens.isAccessToken(sub.token)
                    || tokens.getSessionId(sub.token)!=null && !sessions.active(tokens.getSessionId(sub.token),sub.user.getId()))) {
                    close(sub); return;
                }
                if(sub.token!=null) {
                    Boolean valid=jdbcTemplate.queryForObject("SELECT EXISTS(SELECT 1 FROM users WHERE id=? AND is_active=true AND (auth_invalid_before IS NULL OR auth_invalid_before<?))",Boolean.class,sub.user.getId(),new Timestamp(tokens.getIssuedAtMillis(sub.token)));
                    if(!Boolean.TRUE.equals(valid)) { close(sub); return; }
                }
                Map<String,Object> job=job(sub.jobId);
                List<Map<String,Object>> rows;
                do {
                    rows=jdbcTemplate.queryForList("SELECT id,step,code,level,message,duration_ms,created_at FROM job_events WHERE job_id=? AND id>? ORDER BY id ASC LIMIT 1000",sub.jobId,sub.cursor);
                    for(Map<String,Object> row:rows) {
                        long id=((Number)row.get("id")).longValue();
                        String step=Objects.toString(row.get("step"),"");
                        String code=Objects.toString(row.get("code"),"");
                        CvProcessingEvent event=CvProcessingEvent.builder().eventId(Long.toString(id)).jobId(sub.jobId)
                            .step(step).code(code).level(Objects.toString(row.get("level"),"INFO"))
                            .message(Objects.toString(row.get("message"),"")).progress(calculateProgress(step,code))
                            .durationMs(row.get("duration_ms")==null?null:((Number)row.get("duration_ms")).longValue())
                            .timestamp(row.get("created_at") instanceof Timestamp t?t.toInstant():Instant.now()).build();
                        sub.emitter.send(SseEmitter.event().name("cv-processing-progress").id(Long.toString(id)).data(event,MediaType.APPLICATION_JSON));
                        sub.cursor=id;
                    }
                } while(rows.size()==1000);
                String state=Objects.toString(job.get("state"),"");
                if(Set.of("SUCCEEDED","FAILED","COMPLETED","CANCELLED").contains(state)) {
                    CvProcessingEvent snapshot=CvProcessingEvent.builder().eventId(sub.jobId+":"+state).jobId(sub.jobId)
                        .step(state).code("JOB_"+state).level(state.equals("FAILED")?"ERROR":"INFO")
                        .progress(state.equals("FAILED")?0:100).message("Trạng thái xử lý: "+state).timestamp(Instant.now()).build();
                    sub.emitter.send(SseEmitter.event().name("cv-processing-progress").data(snapshot,MediaType.APPLICATION_JSON));
                    close(sub); return;
                }
                if(System.currentTimeMillis()-sub.heartbeat>=15000) {
                    sub.emitter.send(SseEmitter.event().comment("heartbeat").reconnectTime(1500));
                    sub.heartbeat=System.currentTimeMillis();
                }
            } catch(Exception ex) { log.debug("SSE closed for job {}: {}",sub.jobId,ex.getClass().getSimpleName()); close(sub); }
        }
    }
    private void close(Subscription sub) { subscribers.remove(sub); sub.emitter.complete(); }
    @PreDestroy public void shutdown() { for(Subscription sub:subscribers) close(sub); }

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

}
