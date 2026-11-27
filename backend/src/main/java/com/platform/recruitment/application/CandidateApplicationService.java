package com.platform.recruitment.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.matching.MatchResultRepository;
import com.platform.recruitment.cv.ConfirmedCvInput;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CandidateApplicationService {
    private final ApplicationRepository applications;
    private final ApplicationCVSnapshotRepository snapshots;
    private final ApplicationAuditLogRepository auditLogs;
    private final MatchResultRepository matches;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public record SkillRequirement(String skill, String type, int minimumYears) {}
    public record PinnedJd(UUID id, int version, String title, List<SkillRequirement> requirements) {}
    public record SubmittedCv(UUID versionId, Integer version, String title, ZonedDateTime capturedAt,
                              String rawText, String reviewedText, List<String> declaredSkills, boolean skillListAvailable) {}
    public record Transition(ApplicationStatus from, ApplicationStatus to, ZonedDateTime at) {}
    public record Detail(UUID id, ApplicationJobSummary job, ZonedDateTime appliedAt, ApplicationStatus status,
                         String coverLetter, Boolean aiConsent, ZonedDateTime consentAt, SubmittedCv cv,
                         PinnedJd pinnedJd, boolean skillGapAvailable, BigDecimal matchScore, String matchStatus, String aiProcessingStatus) {}
    public record History(List<Transition> items, boolean hasNext, int page) {}

    @Transactional(readOnly = true)
    public Detail detail(User user, UUID id) {
        var app = ownedApplication(user, id);
        var cv = submittedCv(app);
        var jd = pinnedJd(app);
        var match = Boolean.TRUE.equals(app.getAiAnalysisConsent()) && !Boolean.FALSE.equals(app.getAiScoringEligibleSnapshot())
                ? matches.findByApplicationId(id).orElse(null) : null;
        String processing = ApplicationAiState.resolve(app, match == null ? null : match.getStatus(), jdbc);
        return new Detail(id, ApplicationJobSummary.from(app.getJob()), app.getAppliedAt(), app.getStatus(),
                app.getCoverLetter(), app.getAiAnalysisConsent(), app.getAiConsentAt(), cv, jd,
                eligible(app, cv, jd), match == null || "INSUFFICIENT_DATA".equals(match.getStatus())
                        || "STALE_POLICY".equals(match.getStatus()) ? null : match.getOverallScore(),
                match == null ? processing : match.getStatus(), processing);
    }

    @Transactional(readOnly = true)
    public History history(User user, UUID id, int page) {
        ownedApplication(user, id);
        var rows = auditLogs.findByApplicationId(id, PageRequest.of(Math.max(0, page), 20,
                Sort.by(Sort.Direction.DESC, "createdAt", "id")));
        return new History(rows.stream().map(row -> new Transition(row.getPreviousStatus(), row.getNewStatus(),
                row.getCreatedAt())).toList(), rows.hasNext(), rows.getNumber());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> skillGapRequest(User user, UUID id) {
        var app = ownedApplication(user, id);
        if (!Boolean.TRUE.equals(app.getAiAnalysisConsent())) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "AI analysis consent is required");
        }
        var cv = submittedCv(app);
        var jd = pinnedJd(app);
        if (!eligible(app, cv, jd)) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Submitted skill sources are unavailable");
        }
        return Map.of("candidate_skills", cv.declaredSkills(),
                "jd_required_skills", skills(jd, "REQUIRED"),
                "jd_preferred_skills", skills(jd, "PREFERRED"),
                "target_job_title", jd.title());
    }

    private Application ownedApplication(User user, UUID id) {
        return applications.findByIdAndCandidate_User_Id(id, user.getId())
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "Application not found"));
    }

    private SubmittedCv submittedCv(Application app) {
        return snapshots.findByApplicationId(app.getId()).map(snapshot -> {
            var version = app.getAppliedCvVersion();
            var structured = json(snapshot.getStructuredJsonSnapshot());
            var skillNodes = structured.path("skills");
            var names = new LinkedHashSet<String>();
            if (skillNodes.isArray()) {
                for (var skill : skillNodes) {
                    var name = skill.isTextual() ? skill : skill.path("name");
                    String value = name.isObject() ? name.path("value").asText("") : name.asText("");
                    if (!value.isBlank()) names.add(value.strip());
                }
            }
            return new SubmittedCv(version == null ? null : version.getId(),
                    version == null ? null : version.getVersionNumber(), snapshot.getCvTitle(),
                    snapshot.getSnapshotCreatedAt(), snapshot.getRawTextSnapshot(),
                    ConfirmedCvInput.textFromSnapshot(structured.toString()), List.copyOf(names), skillNodes.isArray());
        }).orElse(null);
    }

    private PinnedJd pinnedJd(Application app) {
        if (app.getAppliedJdVersionId() == null) return null;
        return jdbc.query("SELECT version_no, normalized::text FROM document_versions WHERE id=? AND document_id=?",
                (rs, row) -> {
                    var payload = json(rs.getString(2));
                    var requirements = payload.path("requirements");
                    if (!requirements.isArray()) return null;
                    var skills = new ArrayList<SkillRequirement>();
                    for (var requirement : requirements) {
                        String skill = requirement.path("skill").asText("");
                        String type = requirement.path("type").asText("");
                        if (skill.isBlank() || !("REQUIRED".equals(type) || "PREFERRED".equals(type))) return null;
                        skills.add(new SkillRequirement(skill, type, requirement.path("minYears").asInt()));
                    }
                    return new PinnedJd(app.getAppliedJdVersionId(), rs.getInt(1), payload.path("title").asText(""),
                            List.copyOf(skills));
                }, app.getAppliedJdVersionId(), app.getJob().getId()).stream().filter(java.util.Objects::nonNull)
                .findFirst().orElse(null);
    }

    private JsonNode json(String raw) {
        if (raw != null && !raw.isBlank()) {
            try {
                var parsed = mapper.readTree(raw);
                return parsed == null ? mapper.createObjectNode() : parsed;
            } catch (JsonProcessingException ignored) {
                // Historical records may lack machine-readable snapshots.
            }
        }
        return mapper.createObjectNode();
    }

    private static boolean eligible(Application app, SubmittedCv cv, PinnedJd jd) {
        return Boolean.TRUE.equals(app.getAiAnalysisConsent()) && !Boolean.FALSE.equals(app.getAiScoringEligibleSnapshot())
                && !"WITHDRAWN".equals(String.valueOf(app.getStatus())) && cv != null && cv.skillListAvailable()
                && jd != null && !jd.requirements().isEmpty();
    }

    private static List<String> skills(PinnedJd jd, String type) {
        return jd.requirements().stream().filter(requirement -> type.equals(requirement.type()))
                .map(SkillRequirement::skill).distinct().toList();
    }
}
