package com.platform.recruitment.candidate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.ai.AiWorkerClient;
import com.platform.recruitment.common.*;
import com.platform.recruitment.cv.*;
import com.platform.recruitment.job.*;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/candidate/match")
@RequiredArgsConstructor
public class CandidateGapController {
    private final CandidateProfileRepository candidates;
    private final CVRepository cvs;
    private final CVVersionRepository versions;
    private final JobRepository jobs;
    private final JobRequirementRepository requirements;
    private final AiWorkerClient worker;
    private final ObjectMapper mapper;

    @GetMapping("/{jobId}/gap-analysis")
    @Transactional(readOnly = true)
    public ApiResponse<Map<String, Object>> analyze(@AuthenticationPrincipal User user,
            @PathVariable UUID jobId, @RequestParam UUID cvId) {
        CandidateProfile candidate = candidates.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", user.getId()));
        CV cv = cvs.findById(cvId).orElseThrow(() -> new ResourceNotFoundException("CV", "id", cvId));
        if (cv.getCandidate() == null || !candidate.getId().equals(cv.getCandidate().getId())) {
            throw new UnauthorizedAccessException("Candidate does not own this CV");
        }
        CVVersion version = versions.findByCvIdOrderByVersionNumberDesc(cvId).stream().findFirst()
                .orElseThrow(() -> new CustomException(ErrorCode.VALIDATION_ERROR, "A confirmed CV is required"));
        ConfirmedCvInput.requireConfirmed(version, candidate.getId());
        Job job = jobs.findById(jobId).orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));
        if (job.getStatus() != JobStatus.PUBLISHED || (job.getCompany() != null && job.getCompany().isSuspended())) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "A published target job is required");
        }
        List<String> skills = new ArrayList<>();
        try {
            for (JsonNode skill : mapper.readTree(version.getStructuredJsonContent()).path("skills")) {
                JsonNode value = skill.isTextual() ? skill : skill.path("name");
                String name = value.isObject() ? value.path("value").asText() : value.asText();
                if (!name.isBlank()) skills.add(name);
            }
        } catch (java.io.IOException ex) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Invalid confirmed CV data");
        }
        List<JobRequirement> reqs = requirements.findByJobId(jobId);
        Map<String, Object> result = new LinkedHashMap<>(worker.skillGap(Map.of(
                "candidate_skills", skills,
                "jd_required_skills", reqs.stream().filter(r -> r.getRequirementType() == RequirementType.REQUIRED).map(JobRequirement::getSkillName).toList(),
                "jd_preferred_skills", reqs.stream().filter(r -> r.getRequirementType() == RequirementType.PREFERRED).map(JobRequirement::getSkillName).toList(),
                "target_job_title", job.getTitle())));
        result.put("job_id", jobId);
        result.put("cv_version_id", version.getId());
        result.put("evidence_assessment", "NOT_REQUESTED");
        // No save call: guidance must never mutate the confirmed profile or create an application.
        return ApiResponse.success(result);
    }
}
