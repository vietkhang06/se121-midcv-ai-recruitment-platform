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
    public ResponseEntity<ApiResponse<MatchResult>> matchCandidateToJob(
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

        // AC-P3-04: Block semantic matching if CV profile is still in DRAFT status!
        List<CVVersion> versions = cvVersionRepository.findByCvIdOrderByVersionNumberDesc(targetCv.getId());
        CVVersion latestVersion = versions.isEmpty() ? null : versions.get(0);
        String versionStatus = latestVersion != null && latestVersion.getStatus() != null ? latestVersion.getStatus() : targetCv.getStatus();

        if ("DRAFT".equalsIgnoreCase(versionStatus) || "DRAFT".equalsIgnoreCase(targetCv.getStatus())) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR,
                    "Hồ sơ CV đang ở trạng thái DRAFT. Vui lòng xác nhận hồ sơ trước khi đối sánh với JD.");
        }

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(jobId, candidate.getId());
        return ResponseEntity.ok(ApiResponse.success("Matching calculated successfully", result));
    }
}
