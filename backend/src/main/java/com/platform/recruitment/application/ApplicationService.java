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

    @Autowired
    public ApplicationService(
            ApplicationRepository applicationRepository,
            ApplicationCVSnapshotRepository snapshotRepository,
            JobRepository jobRepository,
            CandidateProfileRepository candidateProfileRepository,
            RecruiterProfileRepository recruiterProfileRepository,
            CVRepository cvRepository,
            CVVersionRepository cvVersionRepository,
            MatchingEngineService matchingEngineService,
            CandidateRankingService candidateRankingService,
            MatchResultRepository matchResultRepository,
            ApplicationAuditLogRepository auditLogRepository) {
        this.applicationRepository = applicationRepository;
        this.snapshotRepository = snapshotRepository;
        this.jobRepository = jobRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.recruiterProfileRepository = recruiterProfileRepository;
        this.cvRepository = cvRepository;
        this.cvVersionRepository = cvVersionRepository;
        this.matchingEngineService = matchingEngineService;
        this.candidateRankingService = candidateRankingService;
        this.matchResultRepository = matchResultRepository;
        this.auditLogRepository = auditLogRepository;
    }

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

    public static final java.util.Set<String> ALLOWED_APPLICATION_SORT_FIELDS = java.util.Set.of(
            "createdAt", "status", "updatedAt"
    );

    @Transactional(readOnly = true)
    public List<ApplicationResponse> getApplicationsForJob(User recruiterUser, UUID jobId) {
        return getApplicationsForJob(recruiterUser, jobId, 0, 100, "createdAt", "desc").getContent();
    }

    @Transactional(readOnly = true)
    public com.platform.recruitment.common.PageResponse<ApplicationResponse> getApplicationsForJob(
            User recruiterUser, UUID jobId, int page, int size, String sort, String direction) {
        RecruiterProfile recruiter = recruiterProfileRepository.findByUserId(recruiterUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("RecruiterProfile", "userId", recruiterUser.getId()));

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        if (!job.getCompany().getId().equals(recruiter.getCompany().getId())) {
            throw new UnauthorizedAccessException("Recruiter does not own the company for this job posting");
        }

        org.springframework.data.domain.Pageable pageable =
                com.platform.recruitment.common.PaginationUtils.createPageable(
                        page, size, sort, direction, ALLOWED_APPLICATION_SORT_FIELDS, "createdAt");

        org.springframework.data.domain.Page<Application> appPage = applicationRepository.findByJobId(jobId, pageable);
        List<Application> appList = (appPage != null) ? appPage.getContent() : applicationRepository.findByJobId(jobId);
        if (appList == null) appList = List.of();
        List<ApplicationResponse> content = appList.stream()
                .map(app -> {
                    ApplicationCVSnapshot snap = snapshotRepository.findByApplicationId(app.getId()).orElse(null);
                    return mapToResponse(app, snap);
                })
                .toList();
        long total = (appPage != null) ? appPage.getTotalElements() : content.size();
        int totalPages = (appPage != null) ? appPage.getTotalPages() : (total > 0 ? 1 : 0);
        boolean first = (appPage != null) ? appPage.isFirst() : true;
        boolean last = (appPage != null) ? appPage.isLast() : true;
        String sortField = (sort == null || sort.isBlank()) ? "createdAt" : sort;
        String sortDir = (direction == null || direction.isBlank()) ? "desc" : direction.toLowerCase();
        return com.platform.recruitment.common.PageResponse.<ApplicationResponse>builder()
                .content(content)
                .page(page)
                .size(size)
                .totalElements(total)
                .totalPages(totalPages)
                .first(first)
                .last(last)
                .sort(new com.platform.recruitment.common.PageResponse.SortInfo(sortField, sortDir))
                .build();
    }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> getCandidateApplications(User candidateUser) {
        return getCandidateApplications(candidateUser, 0, 100, "createdAt", "desc").getContent();
    }

    @Transactional(readOnly = true)
    public com.platform.recruitment.common.PageResponse<ApplicationResponse> getCandidateApplications(
            User candidateUser, int page, int size, String sort, String direction) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        org.springframework.data.domain.Pageable pageable =
                com.platform.recruitment.common.PaginationUtils.createPageable(
                        page, size, sort, direction, ALLOWED_APPLICATION_SORT_FIELDS, "createdAt");

        org.springframework.data.domain.Page<Application> appPage = applicationRepository.findByCandidateId(candidate.getId(), pageable);
        List<Application> appList = (appPage != null) ? appPage.getContent() : applicationRepository.findByCandidateId(candidate.getId());
        if (appList == null) appList = List.of();
        List<ApplicationResponse> content = appList.stream()
                .map(app -> {
                    ApplicationCVSnapshot snap = snapshotRepository.findByApplicationId(app.getId()).orElse(null);
                    return mapToResponse(app, snap);
                })
                .toList();
        long total = (appPage != null) ? appPage.getTotalElements() : content.size();
        int totalPages = (appPage != null) ? appPage.getTotalPages() : (total > 0 ? 1 : 0);
        boolean first = (appPage != null) ? appPage.isFirst() : true;
        boolean last = (appPage != null) ? appPage.isLast() : true;
        String sortField = (sort == null || sort.isBlank()) ? "createdAt" : sort;
        String sortDir = (direction == null || direction.isBlank()) ? "desc" : direction.toLowerCase();
        return com.platform.recruitment.common.PageResponse.<ApplicationResponse>builder()
                .content(content)
                .page(page)
                .size(size)
                .totalElements(total)
                .totalPages(totalPages)
                .first(first)
                .last(last)
                .sort(new com.platform.recruitment.common.PageResponse.SortInfo(sortField, sortDir))
                .build();
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
    public com.platform.recruitment.common.PageResponse<ApplicationResponse> getRankedApplicationsForJob(
            User recruiterUser, UUID jobId, BigDecimal minScoreFilter, int page, int size, String sort, String direction) {
        List<ApplicationResponse> allRanked = getRankedApplicationsForJob(recruiterUser, jobId, minScoreFilter);
        org.springframework.data.domain.Pageable pageable =
                com.platform.recruitment.common.PaginationUtils.createPageable(
                        page, size, sort, direction, ALLOWED_APPLICATION_SORT_FIELDS, "createdAt");

        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), allRanked.size());
        List<ApplicationResponse> pagedContent = (start <= allRanked.size()) ? allRanked.subList(start, end) : List.of();
        org.springframework.data.domain.Page<ApplicationResponse> paged =
                new org.springframework.data.domain.PageImpl<>(pagedContent, pageable, allRanked.size());
        String sortField = (sort == null || sort.isBlank()) ? "createdAt" : sort;
        String sortDir = (direction == null || direction.isBlank()) ? "desc" : direction.toLowerCase();
        return com.platform.recruitment.common.PageResponse.of(paged, sortField, sortDir);
    }

    public static final java.util.Set<String> ALLOWED_AUDIT_LOG_SORT_FIELDS = java.util.Set.of("createdAt", "id");

    @Transactional(readOnly = true)
    public List<ApplicationAuditLogResponse> getApplicationAuditLogs(User recruiterUser, UUID applicationId) {
        return getApplicationAuditLogs(recruiterUser, applicationId, 0, 100, "createdAt", "desc").getContent();
    }

    @Transactional(readOnly = true)
    public com.platform.recruitment.common.PageResponse<ApplicationAuditLogResponse> getApplicationAuditLogs(
            User recruiterUser, UUID applicationId, int page, int size, String sort, String direction) {
        RecruiterProfile recruiter = recruiterProfileRepository.findByUserId(recruiterUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("RecruiterProfile", "userId", recruiterUser.getId()));

        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application", "id", applicationId));

        if (recruiter.getCompany() == null
                || !application.getJob().getCompany().getId().equals(recruiter.getCompany().getId())) {
            throw new UnauthorizedAccessException(
                    "Recruiter does not have permission to view audit logs for this application");
        }

        org.springframework.data.domain.Pageable pageable =
                com.platform.recruitment.common.PaginationUtils.createPageable(
                        page, size, sort, direction, ALLOWED_AUDIT_LOG_SORT_FIELDS, "createdAt");

        org.springframework.data.domain.Page<ApplicationAuditLog> logPage =
                auditLogRepository.findByApplicationId(applicationId, pageable);

        List<ApplicationAuditLog> logList = (logPage != null) ? logPage.getContent()
                : auditLogRepository.findByApplicationIdOrderByCreatedAtDesc(applicationId);
        if (logList == null) logList = List.of();

        List<ApplicationAuditLogResponse> content = logList.stream()
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

        long total = (logPage != null) ? logPage.getTotalElements() : content.size();
        int totalPages = (logPage != null) ? logPage.getTotalPages() : (total > 0 ? 1 : 0);
        boolean first = (logPage != null) ? logPage.isFirst() : true;
        boolean last = (logPage != null) ? logPage.isLast() : true;

        String sortField = (sort == null || sort.isBlank()) ? "createdAt" : sort;
        String sortDir = (direction == null || direction.isBlank()) ? "desc" : direction.toLowerCase();
        return com.platform.recruitment.common.PageResponse.<ApplicationAuditLogResponse>builder()
                .content(content)
                .page(page)
                .size(size)
                .totalElements(total)
                .totalPages(totalPages)
                .first(first)
                .last(last)
                .sort(new com.platform.recruitment.common.PageResponse.SortInfo(sortField, sortDir))
                .build();
    }

    @Transactional(readOnly = true)
    public ApplicationResponse getApplicationById(User recruiterUser, UUID applicationId) {
        RecruiterProfile recruiter = recruiterProfileRepository.findByUserId(recruiterUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("RecruiterProfile", "userId", recruiterUser.getId()));

        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application", "id", applicationId));

        if (recruiter.getCompany() == null
                || !application.getJob().getCompany().getId().equals(recruiter.getCompany().getId())) {
            throw new UnauthorizedAccessException("Recruiter does not have permission to view this application");
        }

        ApplicationCVSnapshot snap = snapshotRepository.findByApplicationId(application.getId()).orElse(null);
        return mapToResponse(application, snap);
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

        String candidateEmail = null;
        String candidatePhone = null;
        String candidateHeadline = null;
        String candidateGithubUrl = null;
        if (app.getCandidate() != null) {
            candidatePhone = app.getCandidate().getPhone();
            candidateHeadline = app.getCandidate().getHeadline();
            candidateGithubUrl = app.getCandidate().getGithubUrl();
            if (app.getCandidate().getUser() != null) {
                candidateEmail = app.getCandidate().getUser().getEmail();
            }
        }

        return ApplicationResponse.builder()
                .id(app.getId())
                .jobId(app.getJob().getId())
                .jobTitle(app.getJob().getTitle())
                .candidateId(app.getCandidate().getId())
                .candidateName(app.getCandidate().getFullName())
                .candidateEmail(candidateEmail)
                .candidatePhone(candidatePhone)
                .candidateHeadline(candidateHeadline)
                .candidateGithubUrl(candidateGithubUrl)
                .appliedCvId(app.getAppliedCv() != null ? app.getAppliedCv().getId() : null)
                .status(app.getStatus())
                .matchScore(matchScore)
                .matchStatus(matchStatus)
                .appliedAt(app.getAppliedAt())
                .snapshot(snapshotInfo)
                .build();
    }
}
