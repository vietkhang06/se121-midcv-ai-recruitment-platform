package com.platform.recruitment.application;

import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.DuplicateApplicationException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.company.RecruiterProfile;
import com.platform.recruitment.company.RecruiterProfileRepository;
import com.platform.recruitment.cv.CV;
import com.platform.recruitment.cv.CVRepository;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobRepository;
import com.platform.recruitment.job.JobStatus;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.UUID;

import com.platform.recruitment.cv.CVVersion;
import com.platform.recruitment.cv.CVVersionRepository;
import com.platform.recruitment.matching.CandidateRankingService;
import com.platform.recruitment.matching.MatchResult;
import com.platform.recruitment.matching.MatchResultRepository;
import com.platform.recruitment.matching.MatchingEngineService;

import java.math.BigDecimal;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor(onConstructor_ = @Autowired)
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final ApplicationCVSnapshotRepository snapshotRepository;
    private final JobRepository jobRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final RecruiterProfileRepository recruiterProfileRepository;
    private final CVRepository cvRepository;
    private final CVVersionRepository cvVersionRepository;
    private final MatchingEngineService matchingEngineService;
    private final CandidateRankingService candidateRankingService;
    private final MatchResultRepository matchResultRepository;
    private final ApplicationAuditLogRepository auditLogRepository;

    public ApplicationService(
            ApplicationRepository applicationRepository,
            ApplicationCVSnapshotRepository snapshotRepository,
            JobRepository jobRepository,
            CandidateProfileRepository candidateProfileRepository,
            RecruiterProfileRepository recruiterProfileRepository,
            CVRepository cvRepository,
            CVVersionRepository cvVersionRepository,
            MatchingEngineService matchingEngineService) {
        this(applicationRepository, snapshotRepository, jobRepository, candidateProfileRepository,
                recruiterProfileRepository, cvRepository, cvVersionRepository, matchingEngineService,
                null, null, null);
    }

    @Transactional
    public ApplicationResponse submitApplication(User candidateUser, SubmitApplicationRequest request) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        Job job = jobRepository.findById(request.getJobId())
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", request.getJobId()));

        // Business Rule Enforcement: Candidate can ONLY apply to PUBLISHED jobs
        if (job.getStatus() != JobStatus.PUBLISHED) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR,
                    String.format(
                            "Cannot submit application for job '%s' with status '%s'. Only PUBLISHED jobs accept applications.",
                            job.getTitle(), job.getStatus()));
        }

        CV cv = cvRepository.findById(request.getCvId())
                .orElseThrow(() -> new ResourceNotFoundException("CV", "id", request.getCvId()));

        // Ownership check: Candidate must own the selected CV
        if (!cv.getCandidate().getId().equals(candidate.getId())) {
            throw new UnauthorizedAccessException("Candidate does not own the selected CV");
        }

        // Duplicate Application Check
        if (applicationRepository.existsByJobIdAndCandidateId(job.getId(), candidate.getId())) {
            throw new DuplicateApplicationException("Candidate has already submitted an application for this job");
        }

        // Get or initialize CVVersion
        List<CVVersion> versions = cvVersionRepository.findByCvIdOrderByVersionNumberDesc(cv.getId());
        CVVersion appliedVersion;
        if (versions.isEmpty()) {
            appliedVersion = cvVersionRepository.save(CVVersion.builder()
                    .cv(cv)
                    .versionNumber(1)
                    .title(cv.getTitle() + " v1.0")
                    .rawTextContent(cv.getRawText())
                    .build());
        } else {
            appliedVersion = versions.get(0);
        }

        // AC-P3-04: Block application submission if CV is in DRAFT status
        if ("DRAFT".equalsIgnoreCase(cv.getStatus())
                || (appliedVersion.getStatus() != null && "DRAFT".equalsIgnoreCase(appliedVersion.getStatus()))) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR,
                    "Hồ sơ CV đang ở trạng thái DRAFT. Vui lòng xác nhận hồ sơ trước khi nộp ứng tuyển.");
        }

        // Atomic Transaction: Create Application + Immutable ApplicationCVSnapshot
        Application application = Application.builder()
                .job(job)
                .candidate(candidate)
                .appliedCv(cv)
                .appliedCvVersion(appliedVersion)
                .status(ApplicationStatus.SUBMITTED)
                .build();
        Application savedApplication = applicationRepository.save(application);

        String rawTextContent = cv.getRawText() != null ? cv.getRawText() : "";
        String jsonSnapshotContent = String.format("{\"cvId\":\"%s\",\"title\":\"%s\",\"path\":\"%s\"}",
                cv.getId(), cv.getTitle(), cv.getCreationPath());

        ApplicationCVSnapshot snapshot = ApplicationCVSnapshot.builder()
                .application(savedApplication)
                .cvTitle(cv.getTitle())
                .rawTextSnapshot(rawTextContent)
                .structuredJsonSnapshot(jsonSnapshotContent)
                .build();
        snapshotRepository.save(snapshot);

        // Immediate matching persistence (match_results, match_factors, evidences)
        try {
            matchingEngineService.calculateAndPersistMatchResult(job.getId(), candidate.getId());
        } catch (Exception ignored) {
        }

        return mapToResponse(savedApplication, snapshot);
    }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> getApplicationsForJob(User recruiterUser, UUID jobId) {
        RecruiterProfile recruiter = recruiterProfileRepository.findByUserId(recruiterUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("RecruiterProfile", "userId", recruiterUser.getId()));

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        // Ownership Check: Recruiter can only view applications for jobs belonging to
        // their company
        if (!job.getCompany().getId().equals(recruiter.getCompany().getId())) {
            throw new UnauthorizedAccessException("Recruiter does not own the company for this job posting");
        }

        List<Application> applications = applicationRepository.findByJobId(jobId);
        return applications.stream()
                .map(app -> {
                    ApplicationCVSnapshot snap = snapshotRepository.findByApplicationId(app.getId()).orElse(null);
                    return mapToResponse(app, snap);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> getCandidateApplications(User candidateUser) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        List<Application> applications = applicationRepository.findByCandidateId(candidate.getId());
        return applications.stream()
                .map(app -> {
                    ApplicationCVSnapshot snap = snapshotRepository.findByApplicationId(app.getId()).orElse(null);
                    return mapToResponse(app, snap);
                })
                .toList();
    }

    @Transactional
    public ApplicationResponse updateApplicationStatus(User recruiterUser, UUID applicationId,
            UpdateApplicationStatusRequest request) {
        RecruiterProfile recruiter = recruiterProfileRepository.findByUserId(recruiterUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("RecruiterProfile", "userId", recruiterUser.getId()));

        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application", "id", applicationId));

        // Ownership Check: Recruiter can only modify applications for jobs belonging to
        // their company
        if (recruiter.getCompany() == null
                || !application.getJob().getCompany().getId().equals(recruiter.getCompany().getId())) {
            throw new UnauthorizedAccessException("Recruiter does not have permission to manage this application");
        }

        ApplicationStatus previousStatus = application.getStatus();
        application.setStatus(request.getStatus());
        Application savedApplication = applicationRepository.save(application);

        // AC-P9-02: Record human decision in Audit Log
        ApplicationAuditLog auditLog = ApplicationAuditLog.builder()
                .application(savedApplication)
                .recruiterUser(recruiterUser)
                .previousStatus(previousStatus)
                .newStatus(request.getStatus())
                .decisionNote(request.getDecisionNote())
                .build();
        auditLogRepository.save(auditLog);

        ApplicationCVSnapshot snap = snapshotRepository.findByApplicationId(savedApplication.getId()).orElse(null);
        return mapToResponse(savedApplication, snap);
    }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> getRankedApplicationsForJob(User recruiterUser, UUID jobId,
            BigDecimal minScoreFilter) {
        RecruiterProfile recruiter = recruiterProfileRepository.findByUserId(recruiterUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("RecruiterProfile", "userId", recruiterUser.getId()));

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        // Ownership Check: Recruiter can only view applications for jobs belonging to
        // their company
        if (recruiter.getCompany() == null || !job.getCompany().getId().equals(recruiter.getCompany().getId())) {
            throw new UnauthorizedAccessException("Recruiter does not own the company for this job posting");
        }

        List<MatchResult> rankedResults = candidateRankingService.getRankedCandidatesForJob(jobId, minScoreFilter);
        List<UUID> rankedAppIds = rankedResults.stream().map(r -> r.getApplication().getId()).toList();

        List<ApplicationResponse> responses = new ArrayList<>();
        for (MatchResult mr : rankedResults) {
            Application app = mr.getApplication();
            ApplicationCVSnapshot snap = snapshotRepository.findByApplicationId(app.getId()).orElse(null);
            ApplicationResponse resp = mapToResponse(app, snap);
            resp.setMatchScore(mr.getOverallScore());
            resp.setMatchStatus(mr.getStatus());
            responses.add(resp);
        }

        // Include any remaining applications for this job if no minScoreFilter is set
        if (minScoreFilter == null) {
            List<Application> allApps = applicationRepository.findByJobId(jobId);
            for (Application app : allApps) {
                if (!rankedAppIds.contains(app.getId())) {
                    ApplicationCVSnapshot snap = snapshotRepository.findByApplicationId(app.getId()).orElse(null);
                    responses.add(mapToResponse(app, snap));
                }
            }
        }

        return responses;
    }

    @Transactional(readOnly = true)
    public List<ApplicationAuditLogResponse> getApplicationAuditLogs(User recruiterUser, UUID applicationId) {
        RecruiterProfile recruiter = recruiterProfileRepository.findByUserId(recruiterUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("RecruiterProfile", "userId", recruiterUser.getId()));

        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application", "id", applicationId));

        if (recruiter.getCompany() == null
                || !application.getJob().getCompany().getId().equals(recruiter.getCompany().getId())) {
            throw new UnauthorizedAccessException(
                    "Recruiter does not have permission to view audit logs for this application");
        }

        List<ApplicationAuditLog> logs = auditLogRepository.findByApplicationIdOrderByCreatedAtDesc(applicationId);
        return logs.stream()
                .map(l -> ApplicationAuditLogResponse.builder()
                        .id(l.getId())
                        .applicationId(l.getApplication().getId())
                        .recruiterUserId(l.getRecruiterUser().getId())
                        .previousStatus(l.getPreviousStatus())
                        .newStatus(l.getNewStatus())
                        .decisionNote(l.getDecisionNote())
                        .createdAt(l.getCreatedAt())
                        .build())
                .toList();
    }

    public ApplicationResponse mapToResponse(Application app, ApplicationCVSnapshot snap) {
        ApplicationResponse.SnapshotInfo snapshotInfo = null;
        if (snap != null) {
            snapshotInfo = ApplicationResponse.SnapshotInfo.builder()
                    .cvTitle(snap.getCvTitle())
                    .rawTextSnapshot(snap.getRawTextSnapshot())
                    .snapshotCreatedAt(snap.getSnapshotCreatedAt())
                    .build();
        }

        BigDecimal matchScore = null;
        String matchStatus = null;
        if (matchResultRepository != null) {
            var matchOpt = matchResultRepository.findByApplicationId(app.getId());
            if (matchOpt.isPresent()) {
                matchScore = matchOpt.get().getOverallScore();
                matchStatus = matchOpt.get().getStatus();
            }
        }

        return ApplicationResponse.builder()
                .id(app.getId())
                .jobId(app.getJob().getId())
                .jobTitle(app.getJob().getTitle())
                .candidateId(app.getCandidate().getId())
                .candidateName(app.getCandidate().getFullName())
                .appliedCvId(app.getAppliedCv() != null ? app.getAppliedCv().getId() : null)
                .status(app.getStatus())
                .matchScore(matchScore)
                .matchStatus(matchStatus)
                .appliedAt(app.getAppliedAt())
                .snapshot(snapshotInfo)
                .build();
    }
}
