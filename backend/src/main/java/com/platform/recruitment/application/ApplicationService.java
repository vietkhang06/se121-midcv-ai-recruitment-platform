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
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.platform.recruitment.product.RecruiterEntitlements entitlements;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.platform.recruitment.product.AiScreeningAccessService aiScreeningAccess;


    private com.platform.recruitment.communication.InboxService inbox;
    @Autowired public void setInbox(com.platform.recruitment.communication.InboxService inbox) { this.inbox=inbox; }
    @Autowired(required = false)
    private com.platform.recruitment.embedding.VersionedEmbeddingLifecycle vectorLifecycle;

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
    private final com.platform.recruitment.suspension.SuspensionGuard suspensionGuard;

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
            ApplicationAuditLogRepository auditLogRepository,
            com.platform.recruitment.suspension.SuspensionGuard suspensionGuard) {
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
        this.suspensionGuard = suspensionGuard;
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
                null, null, null, null);
    }

    @Transactional
    public ApplicationResponse submitApplication(User candidateUser, SubmitApplicationRequest request) {
        if (suspensionGuard != null) {
            suspensionGuard.checkCandidateOperationAllowed(candidateUser);
        }

        CandidateProfile candidate = candidateProfileRepository.findByUserIdForUpdate(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        Job job = jobRepository.findByIdForApply(request.getJobId())
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", request.getJobId()));

        if (suspensionGuard != null && job.getCompany() != null) {
            suspensionGuard.checkCompanyOperationAllowed(job.getCompany());
        }

        // Business Rule Enforcement: Candidate can ONLY apply to PUBLISHED jobs
        if (job.getStatus() != JobStatus.PUBLISHED) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR,
                    String.format(
                            "Cannot submit application for job '%s' with status '%s'. Only PUBLISHED jobs accept applications.",
                            job.getTitle(), job.getStatus()));
        }

        if (job.getApplicationDeadline() != null && job.getApplicationDeadline().isBefore(java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")))) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Tin tuyển dụng đã hết hạn nộp hồ sơ.");
        }
        CV cv = cvRepository.findByIdForUpdate(request.getCvId())
                .orElseThrow(() -> new ResourceNotFoundException("CV", "id", request.getCvId()));

        // Ownership check: Candidate must own the selected CV
        if (!cv.getCandidate().getId().equals(candidate.getId())) {
            throw new UnauthorizedAccessException("Candidate does not own the selected CV");
        }

        // Duplicate Application Check
        if (applicationRepository.existsByJobIdAndCandidateId(job.getId(), candidate.getId())) {
            throw new DuplicateApplicationException("Candidate has already submitted an application for this job");
        }

        List<CVVersion> versions = cvVersionRepository.findByCvIdOrderByVersionNumberDesc(cv.getId());
        CVVersion appliedVersion = versions.isEmpty() ? null : versions.get(0);
        com.platform.recruitment.cv.ConfirmedCvInput.requireConfirmed(appliedVersion, candidate.getId());
        boolean scoringEligible = Boolean.TRUE.equals(request.getAiAnalysisConsent())
                && (aiScreeningAccess == null || aiScreeningAccess.evaluate(job, true).available());

        // Lazy backfill for CVs confirmed before this migration: an eligible Quick Apply
        // must trigger a real vector job for its exact pinned CV version.
        if (scoringEligible && vectorLifecycle != null) vectorLifecycle.prepareConfirmedCv(appliedVersion, candidateUser.getId());

        // Pin the exact JD version used at application time. Legacy jobs are lazily prepared.
        UUID appliedJdVersionId = scoringEligible && vectorLifecycle != null ? vectorLifecycle.prepareJob(job) : null;

        // Atomic Transaction: Create Application + Immutable ApplicationCVSnapshot
        Application application = Application.builder()
                .job(job)
                .candidate(candidate)
                .appliedCv(cv)
                .appliedCvVersion(appliedVersion)
                .appliedJdVersionId(appliedJdVersionId)
                .aiAnalysisConsent(Boolean.TRUE.equals(request.getAiAnalysisConsent()))
                .aiConsentAt(Boolean.TRUE.equals(request.getAiAnalysisConsent()) ? java.time.ZonedDateTime.now() : null)
                .aiConsentVersion(Boolean.TRUE.equals(request.getAiAnalysisConsent()) ? "midcv-ai-v1" : null)
                .coverLetter(request.getCoverLetter())
                .status(ApplicationStatus.SUBMITTED)
                .build();
        Application savedApplication = applicationRepository.save(application);

        String rawTextContent = appliedVersion.getRawTextContent() != null ? appliedVersion.getRawTextContent() : "";
        String jsonSnapshotContent = appliedVersion.getStructuredJsonContent();

        ApplicationCVSnapshot snapshot = ApplicationCVSnapshot.builder()
                .application(savedApplication)
                .cvTitle(appliedVersion.getTitle())
                .rawTextSnapshot(rawTextContent)
                .structuredJsonSnapshot(jsonSnapshotContent)
                .build();
        snapshotRepository.save(snapshot);

        // Immediate matching persistence (match_results, match_factors, evidences)
        // Matching failure propagates: the transaction rolls back application and snapshot together.
        if (scoringEligible) {
            matchingEngineService.calculateAndPersistMatchResult(job.getId(), candidate.getId());
        }
        // Once the true CV/JD vectors exist, recalculate using actual Pgvector; no mock.
        if (scoringEligible && vectorLifecycle != null) vectorLifecycle.enqueueMatchAfterCommit(candidateUser.getId(), savedApplication.getId());

        if(inbox!=null) inbox.applicationEvent(savedApplication,false);
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
        if (suspensionGuard != null) {
            suspensionGuard.checkRecruiterOperationAllowed(recruiterUser);
        }
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
                    return applyRecruiterDisclosure(mapToResponse(app, snap));
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

    /**
     * Lets the owner correct the cover letter and the AI-consent choice without
     * replacing the immutable CV snapshot that was submitted to the employer.
     */
    @Transactional
    public ApplicationResponse updateCandidateApplication(
            User candidateUser,
            UUID applicationId,
            UpdateCandidateApplicationRequest request) {
        if (suspensionGuard != null) {
            suspensionGuard.checkCandidateOperationAllowed(candidateUser);
        }

        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "CandidateProfile", "userId", candidateUser.getId()));
        Application application = applicationRepository.findByIdForUpdate(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application", "id", applicationId));

        if (application.getCandidate() == null
                || !application.getCandidate().getId().equals(candidate.getId())) {
            throw new UnauthorizedAccessException(
                    "Bạn không có quyền chỉnh sửa đơn ứng tuyển này.");
        }
        if (request.getExpectedStatus() != null
                && request.getExpectedStatus() != application.getStatus()) {
            throw new CustomException(ErrorCode.CONCURRENT_MODIFICATION,
                    "Trạng thái đơn đã thay đổi. Vui lòng tải lại trước khi chỉnh sửa.");
        }
        if (application.getStatus() != ApplicationStatus.SUBMITTED) {
            throw new CustomException(ErrorCode.INVALID_STATE_TRANSITION,
                    "Chỉ có thể chỉnh sửa thư ứng tuyển và lựa chọn AI khi đơn đang ở trạng thái Đã nộp.");
        }

        boolean previousConsent = Boolean.TRUE.equals(application.getAiAnalysisConsent());
        boolean nextConsent = Boolean.TRUE.equals(request.getAiAnalysisConsent());
        boolean matchingMissing = nextConsent && matchResultRepository != null
                && matchResultRepository.findByApplicationId(applicationId).isEmpty();
        boolean shouldCalculateMatch = nextConsent && (!previousConsent || matchingMissing);
        String coverLetter = request.getCoverLetter() == null
                ? null : request.getCoverLetter().trim();
        application.setCoverLetter(coverLetter == null || coverLetter.isEmpty() ? null : coverLetter);
        application.setAiAnalysisConsent(nextConsent);
        if (!nextConsent) {
            application.setAiConsentAt(null);
            application.setAiConsentVersion(null);
        } else if (!previousConsent || application.getAiConsentAt() == null) {
            application.setAiConsentAt(java.time.ZonedDateTime.now());
            application.setAiConsentVersion("midcv-ai-v1");
        }

        if (shouldCalculateMatch) {
            CVVersion appliedVersion = application.getAppliedCvVersion();
            com.platform.recruitment.cv.ConfirmedCvInput.requireConfirmed(
                    appliedVersion, candidate.getId());
            if (vectorLifecycle != null) {
                vectorLifecycle.prepareConfirmedCv(appliedVersion, candidateUser.getId());
                UUID jdVersionId = vectorLifecycle.prepareJob(application.getJob());
                if (application.getAppliedJdVersionId() == null) {
                    application.setAppliedJdVersionId(jdVersionId);
                }
            }
        }

        Application saved = applicationRepository.save(application);
        if (shouldCalculateMatch) {
            // Persist a real result in the same request. The vector lifecycle then
            // recalculates it after commit when the production embeddings are ready.
            matchingEngineService.calculateAndPersistMatchResult(
                    saved.getJob().getId(), candidate.getId());
            if (vectorLifecycle != null) {
                vectorLifecycle.enqueueMatchAfterCommit(candidateUser.getId(), saved.getId());
            }
        } else if (!nextConsent && previousConsent && matchResultRepository != null) {
            // Consent revocation also revokes the derived score and its cascaded evidence.
            matchResultRepository.deleteByApplicationId(saved.getId());
        }

        ApplicationCVSnapshot snapshot = snapshotRepository.findByApplicationId(saved.getId()).orElse(null);
        return mapToResponse(saved, snapshot);
    }

    @Transactional
    public ApplicationResponse updateApplicationStatus(User recruiterUser, UUID applicationId,
            UpdateApplicationStatusRequest request) {
        if (suspensionGuard != null) {
            suspensionGuard.checkRecruiterOperationAllowed(recruiterUser);
        }
        RecruiterProfile recruiter = recruiterProfileRepository.findByUserId(recruiterUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("RecruiterProfile", "userId", recruiterUser.getId()));

        Application application = applicationRepository.findByIdForUpdate(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application", "id", applicationId));

        // Ownership Check: Recruiter can only modify applications for jobs belonging to
        // their company
        if (recruiter.getCompany() == null
                || !application.getJob().getCompany().getId().equals(recruiter.getCompany().getId())) {
            throw new UnauthorizedAccessException("Recruiter does not have permission to manage this application");
        }

        ApplicationStatus previousStatus = application.getStatus();
        if (request.getExpectedStatus() != null && request.getExpectedStatus() != previousStatus) {
            throw new CustomException(ErrorCode.CONCURRENT_MODIFICATION,
                    "Trạng thái đơn đã thay đổi; hãy tải lại trước khi ra quyết định.");
        }
        if (previousStatus == request.getStatus()) {
            return applyRecruiterDisclosure(mapToResponse(application,
                    snapshotRepository.findByApplicationId(applicationId).orElse(null)));
        }
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
        if(inbox!=null && previousStatus!=savedApplication.getStatus()) inbox.applicationEvent(savedApplication,true);
        return applyRecruiterDisclosure(mapToResponse(savedApplication, snap));
    }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> getRankedApplicationsForJob(User recruiterUser, UUID jobId,
            BigDecimal minScoreFilter) {
        if (suspensionGuard != null) {
            suspensionGuard.checkRecruiterOperationAllowed(recruiterUser);
        }
        RecruiterProfile recruiter = recruiterProfileRepository.findByUserId(recruiterUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("RecruiterProfile", "userId", recruiterUser.getId()));

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        // Ownership Check: Recruiter can only view applications for jobs belonging to
        // their company
        if (recruiter.getCompany() == null || !job.getCompany().getId().equals(recruiter.getCompany().getId())) {
            throw new UnauthorizedAccessException("Recruiter does not own the company for this job posting");
        }

        if (aiScreeningAccess != null && !aiScreeningAccess.hasActivePro(job.getCompany())) {
            // A minimum numeric score is itself a score-detail entitlement. Standard
            // accounts keep the real classification without a query side channel.
            minScoreFilter = null;
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
            responses.add(applyRecruiterDisclosure(resp));
        }

        // Include any remaining applications for this job if no minScoreFilter is set
        if (minScoreFilter == null) {
            List<Application> allApps = applicationRepository.findByJobId(jobId);
            for (Application app : allApps) {
                if (!rankedAppIds.contains(app.getId())) {
                    ApplicationCVSnapshot snap = snapshotRepository.findByApplicationId(app.getId()).orElse(null);
                    responses.add(applyRecruiterDisclosure(mapToResponse(app, snap)));
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

    @Transactional
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
        if (entitlements != null) entitlements.view(recruiterUser, applicationId);
        if(inbox!=null) inbox.view(application,recruiterUser);
        ApplicationResponse response = applyRecruiterDisclosure(mapToResponse(application, snap));
        if (response.getSnapshot() != null && snap != null) {
            response.getSnapshot().setRawTextSnapshot(snap.getRawTextSnapshot());
            response.getSnapshot().setStructuredJsonSnapshot(snap.getStructuredJsonSnapshot());
        }
        return response;
    }

    /** Numeric scores and factor details are a Pro entitlement; Standard keeps only the classification. */
    private ApplicationResponse applyRecruiterDisclosure(ApplicationResponse response) {
        if (response == null || !response.isAiScoringAvailable() || !response.isProDetailAvailable()) {
            if (response != null) response.setMatchScore(null);
        }
        return response;
    }

    public ApplicationResponse mapToResponse(Application app, ApplicationCVSnapshot snap) {
        ApplicationResponse.SnapshotInfo snapshotInfo = null;
        if (snap != null) {
            snapshotInfo = ApplicationResponse.SnapshotInfo.builder()
                    .cvTitle(snap.getCvTitle())
                    .rawTextSnapshot(null)
                    .snapshotCreatedAt(snap.getSnapshotCreatedAt())
                    .build();
        }

        BigDecimal matchScore = null;
        String matchStatus = null;
        if (Boolean.TRUE.equals(app.getAiAnalysisConsent()) && matchResultRepository != null) {
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

        com.platform.recruitment.product.AiScreeningAccessService.Access access =
                aiScreeningAccess != null
                        ? aiScreeningAccess.evaluate(app)
                        : new com.platform.recruitment.product.AiScreeningAccessService.Access(
                                Boolean.TRUE.equals(app.getAiAnalysisConsent()),
                                Boolean.TRUE.equals(app.getAiAnalysisConsent()) ? "AVAILABLE" : "CONSENT_NOT_GIVEN",
                                Boolean.TRUE.equals(app.getAiAnalysisConsent()) ? "Đủ điều kiện chấm điểm AI."
                                        : "Ứng viên chưa cho phép midCV dùng AI để phân tích hồ sơ.",
                                true, "PRO", false);

        String classification = aiScreeningAccess != null
                ? aiScreeningAccess.classify(access.available() ? matchScore : null)
                : (matchScore == null ? "CHUA_KHA_DUNG" : "PHU_HOP");

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
                .appliedCvVersionId(app.getAppliedCvVersion() != null ? app.getAppliedCvVersion().getId() : null)
                .appliedCvVersionNumber(app.getAppliedCvVersion() != null ? app.getAppliedCvVersion().getVersionNumber() : null)
                .status(app.getStatus())
                .aiAnalysisConsent(Boolean.TRUE.equals(app.getAiAnalysisConsent()))
                .coverLetter(app.getCoverLetter())
                .matchScore(access.available() ? matchScore : null)
                .matchStatus(!access.available() ? access.code()
                        : matchStatus == null ? "PROCESSING" : matchStatus)
                .aiScoringAvailable(access.available())
                .aiScoringReasonCode(access.code())
                .aiScoringReason(access.message())
                .matchClassification(classification)
                .proDetailAvailable(access.proDetail())
                .recruiterPlan(access.recruiterPlan())
                .appliedAt(app.getAppliedAt())
                .snapshot(snapshotInfo)
                .build();
    }
}
