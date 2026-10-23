package com.platform.recruitment.candidate;

import com.platform.recruitment.common.ApiResponse;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.cv.CV;
import com.platform.recruitment.cv.CVRepository;
import com.platform.recruitment.cv.CVVersion;
import com.platform.recruitment.cv.CVVersionRepository;
import com.platform.recruitment.matching.MatchResult;
import com.platform.recruitment.matching.MatchingEngineService;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/candidate/match")
@RequiredArgsConstructor
public class CandidateMatchController {

    private final CandidateProfileRepository candidateProfileRepository;
    private final CVRepository cvRepository;
    private final CVVersionRepository cvVersionRepository;
    private final MatchingEngineService matchingEngineService;

    @PostMapping("/{jobId}")
    public ResponseEntity<ApiResponse<com.platform.recruitment.matching.MatchScoreResponse>> matchCandidateToJob(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID jobId,
            @RequestParam(required = false) UUID cvId) {

        CandidateProfile candidate = candidateProfileRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", currentUser.getId()));

        CV targetCv;
        if (cvId != null) {
            targetCv = cvRepository.findById(cvId)
                    .orElseThrow(() -> new ResourceNotFoundException("CV", "id", cvId));
        } else {
            List<CV> cvs = cvRepository.findByCandidateId(candidate.getId());
            if (cvs.isEmpty()) {
                throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "Ứng viên chưa tải lên CV nào.");
            }
            targetCv = cvs.stream().filter(c -> Boolean.TRUE.equals(c.getIsDefault())).findFirst().orElse(cvs.get(0));
        }

        if (targetCv.getCandidate() == null || !targetCv.getCandidate().getId().equals(candidate.getId())) {
            throw new com.platform.recruitment.common.UnauthorizedAccessException("Candidate does not own this CV");
        }
        List<CVVersion> versions = cvVersionRepository.findByCvIdOrderByVersionNumberDesc(targetCv.getId());
        CVVersion latestVersion = versions.isEmpty() ? null : versions.get(0);
        com.platform.recruitment.cv.ConfirmedCvInput.requireConfirmed(latestVersion, candidate.getId());
        MatchResult result = matchingEngineService.previewMatch(jobId, candidate.getId(), latestVersion.getId());
        return ResponseEntity.ok(ApiResponse.success("Preview calculated without submitting an application", com.platform.recruitment.matching.MatchScoreResponse.fromEntity(result)));
    }
}
