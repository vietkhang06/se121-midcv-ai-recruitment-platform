package com.platform.recruitment.matching;

import com.platform.recruitment.application.Application;
import com.platform.recruitment.application.ApplicationRepository;
import com.platform.recruitment.common.ApiResponse;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.company.RecruiterProfile;
import com.platform.recruitment.company.RecruiterProfileRepository;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobRepository;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;

@RestController
@RequestMapping("/api/v1/matching")
public class MatchingController {

    private final MatchingEngineService matchingEngineService;
    private final CandidateRankingService candidateRankingService;
    private final JobRepository jobRepository;
    private final RecruiterProfileRepository recruiterProfileRepository;
    private final ApplicationRepository applicationRepository;
    private final com.platform.recruitment.suspension.SuspensionGuard suspensionGuard;

    @Autowired
    public MatchingController(MatchingEngineService matchingEngineService,
                              CandidateRankingService candidateRankingService,
                              JobRepository jobRepository,
                              RecruiterProfileRepository recruiterProfileRepository,
                              ApplicationRepository applicationRepository,
                              @org.springframework.lang.Nullable com.platform.recruitment.suspension.SuspensionGuard suspensionGuard) {
        this.matchingEngineService = matchingEngineService;
        this.candidateRankingService = candidateRankingService;
        this.jobRepository = jobRepository;
        this.recruiterProfileRepository = recruiterProfileRepository;
        this.applicationRepository = applicationRepository;
        this.suspensionGuard = suspensionGuard;
    }

    public MatchingController(MatchingEngineService matchingEngineService,
                              CandidateRankingService candidateRankingService,
                              JobRepository jobRepository,
                              RecruiterProfileRepository recruiterProfileRepository,
                              ApplicationRepository applicationRepository) {
        this(matchingEngineService, candidateRankingService, jobRepository, recruiterProfileRepository, applicationRepository, null);
    }

    @PostMapping("/jobs/{jobId}/candidates/{candidateId}")
    public ResponseEntity<ApiResponse<MatchScoreResponse>> calculateMatchScore(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID jobId,
            @PathVariable UUID candidateId) {
        validateRecruiterJobAccess(currentUser, jobId);
        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(jobId, candidateId);
        return ResponseEntity.ok(ApiResponse.success("Match score calculated successfully", MatchScoreResponse.fromEntity(result)));
    }

    @GetMapping("/jobs/{jobId}/rankings")
    public ResponseEntity<ApiResponse<com.platform.recruitment.common.PageResponse<CandidateRankingResponse>>> getCandidateRankings(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID jobId,
            @RequestParam(required = false) BigDecimal minScore,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "overallScore") String sort,
            @RequestParam(defaultValue = "desc") String direction) {
        validateRecruiterJobAccess(currentUser, jobId);
        com.platform.recruitment.common.PageResponse<CandidateRankingResponse> ranked =
                candidateRankingService.getRankedCandidatesPage(jobId, minScore, page, size, sort, direction);
        return ResponseEntity.ok(ApiResponse.success("Candidate rankings retrieved successfully", ranked));
    }

    public ResponseEntity<ApiResponse<com.platform.recruitment.common.PageResponse<CandidateRankingResponse>>> getCandidateRankings(
            User currentUser, UUID jobId, BigDecimal minScore) {
        validateRecruiterJobAccess(currentUser, jobId);
        candidateRankingService.getRankedCandidatesForJob(jobId, minScore);
        return getCandidateRankings(currentUser, jobId, minScore, 0, 20, "overallScore", "desc");
    }

    @GetMapping("/applications/{id}/inspection")
    public ResponseEntity<ApiResponse<MatchInspectionResponse>> getMatchInspection(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {
        validateApplicationAccess(currentUser, id);
        MatchInspectionResponse response = matchingEngineService.getMatchInspection(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    private void validateRecruiterJobAccess(User currentUser, UUID jobId) {
        if (currentUser == null) {
            throw new UnauthorizedAccessException("Vui lòng đăng nhập để tiếp tục.");
        }
        if (currentUser.getRole() == Role.ADMIN) {
            return;
        }
        if (currentUser.getRole() == Role.CANDIDATE) {
            throw new UnauthorizedAccessException("Ứng viên không có quyền truy cập xếp hạng ứng viên của nhà tuyển dụng.");
        }
        if (suspensionGuard != null) {
            suspensionGuard.checkRecruiterOperationAllowed(currentUser);
        }
        RecruiterProfile recruiter = recruiterProfileRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new UnauthorizedAccessException("Không tìm thấy thông tin nhà tuyển dụng."));
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));
        if (job.getCompany() == null || recruiter.getCompany() == null ||
                !job.getCompany().getId().equals(recruiter.getCompany().getId())) {
            throw new UnauthorizedAccessException("Recruiter does not own the company for this job posting");
        }
    }

    private void validateApplicationAccess(User currentUser, UUID applicationId) {
        if (currentUser == null) {
            throw new UnauthorizedAccessException("Vui lòng đăng nhập để tiếp tục.");
        }
        if (currentUser.getRole() == Role.ADMIN) {
            return;
        }
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application", "id", applicationId));

        if (currentUser.getRole() == Role.CANDIDATE) {
            if (application.getCandidate() == null || application.getCandidate().getUser() == null ||
                    !application.getCandidate().getUser().getId().equals(currentUser.getId())) {
                throw new UnauthorizedAccessException("Candidate cannot inspect another candidate's application");
            }
            return;
        }

        if (currentUser.getRole() == Role.HR) {
            if (suspensionGuard != null) {
                suspensionGuard.checkRecruiterOperationAllowed(currentUser);
            }
            RecruiterProfile recruiter = recruiterProfileRepository.findByUserId(currentUser.getId())
                    .orElseThrow(() -> new UnauthorizedAccessException("Không tìm thấy thông tin nhà tuyển dụng."));
            if (application.getJob() == null || application.getJob().getCompany() == null ||
                    recruiter.getCompany() == null ||
                    !application.getJob().getCompany().getId().equals(recruiter.getCompany().getId())) {
                throw new UnauthorizedAccessException("Recruiter does not own the company for this application");
            }
            return;
        }

        throw new UnauthorizedAccessException("Vai trò không hợp lệ.");
    }
}
