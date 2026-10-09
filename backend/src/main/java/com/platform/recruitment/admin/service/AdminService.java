package com.platform.recruitment.admin.service;

import com.platform.recruitment.admin.dto.*;
import com.platform.recruitment.admin.model.*;
import com.platform.recruitment.admin.repository.AdminAuditLogRepository;
import com.platform.recruitment.admin.repository.SystemReportRepository;
import com.platform.recruitment.ai.AiClient;
import com.platform.recruitment.application.ApplicationRepository;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.company.*;
import com.platform.recruitment.cv.CVRepository;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobRepository;
import com.platform.recruitment.job.JobStatus;
import com.platform.recruitment.taxonomy.TaxonomyService;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import com.platform.recruitment.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.*;

@Slf4j
@Service
public class AdminService {

    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final RecruiterProfileRepository recruiterProfileRepository;
    private final CompanyRepository companyRepository;
    private final JobRepository jobRepository;
    private final SystemReportRepository systemReportRepository;
    private final AdminAuditLogRepository adminAuditLogRepository;
    private final AdminAuditLogService adminAuditLogService;
    private final AiClient aiClient;
    private final TaxonomyService taxonomyService;
    private final CVRepository cvRepository;
    private final ApplicationRepository applicationRepository;
    private final com.platform.recruitment.company.service.CompanyVerificationService companyVerificationService;
    private final com.platform.recruitment.suspension.SuspensionRecordRepository suspensionRecordRepository;

    @org.springframework.beans.factory.annotation.Autowired
    public AdminService(UserRepository userRepository, CandidateProfileRepository candidateProfileRepository,
                        RecruiterProfileRepository recruiterProfileRepository, CompanyRepository companyRepository,
                        JobRepository jobRepository, SystemReportRepository systemReportRepository,
                        AdminAuditLogRepository adminAuditLogRepository, AdminAuditLogService adminAuditLogService,
                        AiClient aiClient, TaxonomyService taxonomyService, CVRepository cvRepository,
                        ApplicationRepository applicationRepository,
                        com.platform.recruitment.company.service.CompanyVerificationService companyVerificationService,
                        @org.springframework.lang.Nullable com.platform.recruitment.suspension.SuspensionRecordRepository suspensionRecordRepository) {
        this.userRepository = userRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.recruiterProfileRepository = recruiterProfileRepository;
        this.companyRepository = companyRepository;
        this.jobRepository = jobRepository;
        this.systemReportRepository = systemReportRepository;
        this.adminAuditLogRepository = adminAuditLogRepository;
        this.adminAuditLogService = adminAuditLogService;
        this.aiClient = aiClient;
        this.taxonomyService = taxonomyService;
        this.cvRepository = cvRepository;
        this.applicationRepository = applicationRepository;
        this.companyVerificationService = companyVerificationService;
        this.suspensionRecordRepository = suspensionRecordRepository;
    }

    public AdminService(UserRepository userRepository, CandidateProfileRepository candidateProfileRepository,
                        RecruiterProfileRepository recruiterProfileRepository, CompanyRepository companyRepository,
                        JobRepository jobRepository, SystemReportRepository systemReportRepository,
                        AdminAuditLogRepository adminAuditLogRepository, AdminAuditLogService adminAuditLogService,
                        AiClient aiClient, TaxonomyService taxonomyService, CVRepository cvRepository,
                        ApplicationRepository applicationRepository,
                        com.platform.recruitment.company.service.CompanyVerificationService companyVerificationService) {
        this(userRepository, candidateProfileRepository, recruiterProfileRepository, companyRepository, jobRepository,
             systemReportRepository, adminAuditLogRepository, adminAuditLogService, aiClient, taxonomyService,
             cvRepository, applicationRepository, companyVerificationService, null);
    }

    // ==========================================
    // 1. DASHBOARD AGGREGATED METRICS
    // ==========================================
    @Transactional(readOnly = true)
    public AdminDashboardStatsDto getDashboardStats() {
        long totalUsers = userRepository.count();
        long candidatesCount = userRepository.countByRole(Role.CANDIDATE);
        long recruitersCount = userRepository.countByRole(Role.HR);
        long activeUsersCount = userRepository.countByIsActive(true);
        long suspendedUsersCount = userRepository.countByIsActive(false);

        long pendingCompanies = companyRepository.countByVerificationStatus(CompanyVerification.PENDING);
        long underReviewCompanies = companyRepository.countByVerificationStatus(CompanyVerification.UNDER_REVIEW);
        long verifiedCompanies = companyRepository.countByVerificationStatus(CompanyVerification.VERIFIED);
        long rejectedCompanies = companyRepository.countByVerificationStatus(CompanyVerification.REJECTED);
        long suspendedCompanies = companyRepository.countByOperationalStatus(com.platform.recruitment.company.CompanyOperationalStatus.SUSPENDED);

        long activeJobs = jobRepository.countByStatus(JobStatus.PUBLISHED);
        long suspendedJobs = jobRepository.countByStatus(JobStatus.SUSPENDED);

        long pendingReports = systemReportRepository.countByStatus(ReportStatus.PENDING);

        // Recent Audit Logs
        Page<AdminAuditLog> recentLogsPage = adminAuditLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 10));
        List<AdminAuditLogDto> recentLogs = recentLogsPage.getContent().stream()
                .map(this::mapToAuditLogDto)
                .toList();

        // AI Status (Masked)
        Map<String, Object> aiStatus = new LinkedHashMap<>();
        try {
            AiClient.SystemAiSettings s = aiClient.getSettings();
            aiStatus.put("provider", s.provider());
            aiStatus.put("ollamaModel", s.ollamaModel());
            aiStatus.put("cloudModel", s.cloudModel());
            aiStatus.put("hasCloudApiKey", s.cloudApiKey() != null && !s.cloudApiKey().isBlank());
        } catch (Exception e) {
            aiStatus.put("provider", "UNKNOWN");
        }

        return AdminDashboardStatsDto.builder()
                .totalUsers(totalUsers)
                .candidatesCount(candidatesCount)
                .recruitersCount(recruitersCount)
                .activeUsersCount(activeUsersCount)
                .suspendedUsersCount(suspendedUsersCount)
                .companiesPendingCount(pendingCompanies)
                .companiesUnderReviewCount(underReviewCompanies)
                .companiesVerifiedCount(verifiedCompanies)
                .companiesRejectedCount(rejectedCompanies)
                .companiesSuspendedCount(suspendedCompanies)
                .activeJobsCount(activeJobs)
                .suspendedJobsCount(suspendedJobs)
                .pendingReportsCount(pendingReports)
                .recentAuditLogs(recentLogs)
                .aiStatus(aiStatus)
                .build();
    }

    // ==========================================
    // 2. COMPANY VERIFICATION MANAGEMENT
    // ==========================================
    @Transactional(readOnly = true)
    public Page<CompanyAdminDto> listCompanies(String query, CompanyVerification status, Pageable pageable) {
        return companyVerificationService.listCompanies(query, status, pageable);
    }

    @Transactional(readOnly = true)
    public CompanyAdminDto getCompanyDetail(UUID companyId) {
        return companyVerificationService.getCompanyDetail(companyId);
    }

    @Transactional
    public CompanyAdminDto transitionCompanyVerification(User admin, UUID companyId, CompanyReviewRequest request, String ipAddress) {
        return companyVerificationService.transitionVerification(
                admin,
                companyId,
                request.getStatus(),
                request.getReason(),
                request.getVersion(),
                ipAddress
        );
    }

    // ==========================================
    // 3. CANDIDATE & RECRUITER MODERATION
    // ==========================================
    @Transactional(readOnly = true)
    public Page<UserAdminDto> listCandidates(String query, Boolean isActive, Pageable pageable) {
        Page<User> users;
        if (query != null && !query.isBlank()) {
            users = userRepository.findByEmailContainingIgnoreCaseAndRole(query.trim(), Role.CANDIDATE, pageable);
        } else if (isActive != null) {
            users = userRepository.findByRoleAndIsActive(Role.CANDIDATE, isActive, pageable);
        } else {
            users = userRepository.findByRole(Role.CANDIDATE, pageable);
        }

        return users.map(user -> {
            Optional<CandidateProfile> profileOpt = candidateProfileRepository.findByUserId(user.getId());
            int cvCount = (int) cvRepository.countByCandidateId(user.getId());
            int appCount = profileOpt.map(p -> (int) applicationRepository.countByCandidateId(p.getId())).orElse(0);

            return UserAdminDto.builder()
                    .id(user.getId())
                    .email(user.getEmail())
                    .role(user.getRole())
                    .isActive(user.getIsActive())
                    .accountStatus(user.getAccountStatus())
                    .emailVerified(user.getEmailVerified())
                    .fullName(profileOpt.map(CandidateProfile::getFullName).orElse(null))
                    .phone(profileOpt.map(CandidateProfile::getPhone).orElse(null))
                    .targetIndustry(profileOpt.map(CandidateProfile::getTargetIndustry).orElse(null))
                    .headline(profileOpt.map(CandidateProfile::getHeadline).orElse(null))
                    .githubUrl(profileOpt.map(CandidateProfile::getGithubUrl).orElse(null))
                    .cvCount(cvCount)
                    .applicationCount(appCount)
                    .createdAt(user.getCreatedAt())
                    .build();
        });
    }

    @Transactional(readOnly = true)
    public Page<UserAdminDto> listRecruiters(String query, Boolean isActive, Pageable pageable) {
        Page<User> users;
        if (query != null && !query.isBlank()) {
            users = userRepository.findByEmailContainingIgnoreCaseAndRole(query.trim(), Role.HR, pageable);
        } else if (isActive != null) {
            users = userRepository.findByRoleAndIsActive(Role.HR, isActive, pageable);
        } else {
            users = userRepository.findByRole(Role.HR, pageable);
        }

        return users.map(user -> {
            Optional<RecruiterProfile> profileOpt = recruiterProfileRepository.findByUserId(user.getId());
            Company company = profileOpt.map(RecruiterProfile::getCompany).orElse(null);

            return UserAdminDto.builder()
                    .id(user.getId())
                    .email(user.getEmail())
                    .role(user.getRole())
                    .isActive(user.getIsActive())
                    .accountStatus(user.getAccountStatus())
                    .emailVerified(user.getEmailVerified())
                    .fullName(profileOpt.map(RecruiterProfile::getFullName).orElse(null))
                    .phone(profileOpt.map(RecruiterProfile::getPhone).orElse(null))
                    .companyId(company != null ? company.getId() : null)
                    .companyName(company != null ? company.getName() : null)
                    .companyVerificationStatus(company != null ? company.getVerificationStatus().name() : null)
                    .companyOperationalStatus(company != null ? company.getOperationalStatus().name() : null)
                    .createdAt(user.getCreatedAt())
                    .build();
        });
    }

    @Transactional
    public void suspendUser(User admin, UUID userId, String reason, String ipAddress) {
        if (admin.getId().equals(userId)) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Quản trị viên không thể tự đình chỉ tài khoản của chính mình.");
        }
        if (reason == null || reason.trim().isBlank()) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Bắt buộc phải nhập lý do đình chỉ tài khoản.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (user.getRole() == Role.ADMIN) {
            throw new CustomException(ErrorCode.ACCESS_DENIED, "Không thể đình chỉ tài khoản mang quyền Quản trị viên.");
        }

        user.suspend();
        userRepository.save(user);

        if (suspensionRecordRepository != null) {
            com.platform.recruitment.suspension.SuspensionRecord record =
                    com.platform.recruitment.suspension.SuspensionRecord.builder()
                            .targetType(com.platform.recruitment.suspension.SuspensionTargetType.USER)
                            .targetId(user.getId())
                            .reasonCode("ADMIN_MODERATION")
                            .reasonText(reason.trim())
                            .suspendedBy(admin)
                            .suspendedAt(ZonedDateTime.now())
                            .status(com.platform.recruitment.suspension.SuspensionStatus.ACTIVE)
                            .build();
            suspensionRecordRepository.save(record);
        }

        adminAuditLogService.log(
                admin,
                "SUSPEND_USER",
                "USER",
                user.getId(),
                "ACTIVE",
                "SUSPENDED",
                reason.trim(),
                ipAddress,
                null
        );
    }

    @Transactional
    public void reactivateUser(User admin, UUID userId, String reason, String ipAddress) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        user.reactivate();
        userRepository.save(user);

        if (suspensionRecordRepository != null) {
            suspensionRecordRepository.findByTargetTypeAndTargetIdAndStatus(
                    com.platform.recruitment.suspension.SuspensionTargetType.USER,
                    user.getId(),
                    com.platform.recruitment.suspension.SuspensionStatus.ACTIVE
            ).forEach(activeRecord -> {
                activeRecord.setStatus(com.platform.recruitment.suspension.SuspensionStatus.LIFTED);
                activeRecord.setLiftedBy(admin);
                activeRecord.setLiftedAt(ZonedDateTime.now());
                activeRecord.setResolutionNote(reason != null ? reason.trim() : "Quản trị viên kích hoạt lại tài khoản");
                suspensionRecordRepository.save(activeRecord);
            });
        }

        adminAuditLogService.log(
                admin,
                "REACTIVATE_USER",
                "USER",
                user.getId(),
                "SUSPENDED",
                "ACTIVE",
                reason != null ? reason.trim() : "Quản trị viên kích hoạt lại tài khoản",
                ipAddress,
                null
        );
    }

    // ==========================================
    // 4. JOB MODERATION
    // ==========================================
    @Transactional(readOnly = true)
    public Page<JobAdminDto> listJobs(String query, JobStatus status, Pageable pageable) {
        Page<Job> jobs;
        if (query != null && !query.isBlank() && status != null) {
            jobs = jobRepository.findByTitleContainingIgnoreCaseAndStatus(query.trim(), status, pageable);
        } else if (query != null && !query.isBlank()) {
            jobs = jobRepository.findByTitleContainingIgnoreCase(query.trim(), pageable);
        } else if (status != null) {
            jobs = jobRepository.findByStatus(status, pageable);
        } else {
            jobs = jobRepository.findAll(pageable);
        }

        return jobs.map(this::mapToJobAdminDto);
    }

    @Transactional
    public void suspendJob(User admin, UUID jobId, String reason, String ipAddress) {
        if (reason == null || reason.trim().isBlank()) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Bắt buộc phải nhập lý do đình chỉ tin tuyển dụng.");
        }

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        String previousStatus = job.getStatus().name();
        job.setStatus(JobStatus.SUSPENDED);
        job.setModerationReason(reason.trim());
        job.setSuspendedAt(ZonedDateTime.now());
        jobRepository.save(job);

        adminAuditLogService.log(
                admin,
                "SUSPEND_JOB",
                "JOB",
                job.getId(),
                previousStatus,
                JobStatus.SUSPENDED.name(),
                reason.trim(),
                ipAddress,
                null
        );
    }

    @Transactional
    public void restoreJob(User admin, UUID jobId, String ipAddress) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        String previousStatus = job.getStatus().name();
        job.setStatus(JobStatus.PUBLISHED);
        job.setModerationReason(null);
        jobRepository.save(job);

        adminAuditLogService.log(
                admin,
                "RESTORE_JOB",
                "JOB",
                job.getId(),
                previousStatus,
                JobStatus.PUBLISHED.name(),
                "Khôi phục hiển thị tin tuyển dụng sau kiểm duyệt",
                ipAddress,
                null
        );
    }

    // ==========================================
    // 5. REPORTS MODERATION
    // ==========================================
    @Transactional(readOnly = true)
    public Page<ReportAdminDto> listReports(ReportStatus status, ReportTargetType targetType, Pageable pageable) {
        Page<SystemReport> reports;
        if (status != null && targetType != null) {
            reports = systemReportRepository.findByStatusAndTargetType(status, targetType, pageable);
        } else if (status != null) {
            reports = systemReportRepository.findByStatus(status, pageable);
        } else if (targetType != null) {
            reports = systemReportRepository.findByTargetType(targetType, pageable);
        } else {
            reports = systemReportRepository.findAll(pageable);
        }

        return reports.map(this::mapToReportAdminDto);
    }

    @Transactional
    public void resolveReport(User admin, UUID reportId, String notes, String ipAddress) {
        SystemReport report = systemReportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("SystemReport", "id", reportId));

        report.setStatus(ReportStatus.RESOLVED);
        report.setResolvedBy(admin);
        report.setResolvedAt(ZonedDateTime.now());
        report.setResolutionNotes(notes != null ? notes.trim() : "Đã xử lý thỏa đáng");
        systemReportRepository.save(report);

        adminAuditLogService.log(
                admin,
                "RESOLVE_REPORT",
                "REPORT",
                report.getId(),
                ReportStatus.PENDING.name(),
                ReportStatus.RESOLVED.name(),
                notes,
                ipAddress,
                null
        );
    }

    @Transactional
    public void dismissReport(User admin, UUID reportId, String notes, String ipAddress) {
        SystemReport report = systemReportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("SystemReport", "id", reportId));

        report.setStatus(ReportStatus.DISMISSED);
        report.setResolvedBy(admin);
        report.setResolvedAt(ZonedDateTime.now());
        report.setResolutionNotes(notes != null ? notes.trim() : "Báo cáo không có căn cứ vi phạm");
        systemReportRepository.save(report);

        adminAuditLogService.log(
                admin,
                "DISMISS_REPORT",
                "REPORT",
                report.getId(),
                ReportStatus.PENDING.name(),
                ReportStatus.DISMISSED.name(),
                notes,
                ipAddress,
                null
        );
    }

    // ==========================================
    // 6. TAXONOMY MANAGEMENT
    // ==========================================
    @Transactional(readOnly = true)
    public Map<String, Object> listTaxonomySkills(String query, Boolean active, int page, int size) {
        return taxonomyService.listSkillsForAdmin(query, active, page, size);
    }

    @Transactional
    public UUID createTaxonomySkill(User admin, CreateTaxonomySkillRequest request, String ipAddress) {
        UUID skillId = taxonomyService.createSkill(
                request.getCanonicalName(),
                request.getCategory(),
                request.getDescription(),
                request.getAliases()
        );

        adminAuditLogService.log(
                admin,
                "CREATE_TAXONOMY_SKILL",
                "TAXONOMY_SKILL",
                skillId,
                null,
                request.getCanonicalName(),
                "Tạo mới kỹ năng chuẩn hóa: " + request.getCanonicalName(),
                ipAddress,
                null
        );

        return skillId;
    }

    @Transactional
    public boolean toggleTaxonomySkill(User admin, UUID skillId, String ipAddress) {
        boolean nextActive = taxonomyService.toggleSkillActive(skillId);

        adminAuditLogService.log(
                admin,
                nextActive ? "ENABLE_TAXONOMY_SKILL" : "DISABLE_TAXONOMY_SKILL",
                "TAXONOMY_SKILL",
                skillId,
                String.valueOf(!nextActive),
                String.valueOf(nextActive),
                "Thay đổi trạng thái kích hoạt kỹ năng",
                ipAddress,
                null
        );

        return nextActive;
    }

    // ==========================================
    // 7. AUDIT LOGS QUERY
    // ==========================================
    @Transactional(readOnly = true)
    public Page<AdminAuditLogDto> listAuditLogs(Pageable pageable) {
        return adminAuditLogRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(this::mapToAuditLogDto);
    }

    // ==========================================
    // HELPERS & MAPPERS
    // ==========================================
    private JobAdminDto mapToJobAdminDto(Job job) {
        return JobAdminDto.builder()
                .id(job.getId())
                .companyId(job.getCompany().getId())
                .companyName(job.getCompany().getName())
                .companyVerificationStatus(job.getCompany().getVerificationStatus().name())
                .title(job.getTitle())
                .industry(job.getIndustry())
                .seniority(job.getSeniority())
                .status(job.getStatus())
                .minSalary(job.getMinSalary())
                .maxSalary(job.getMaxSalary())
                .location(job.getLocation())
                .employmentType(job.getEmploymentType())
                .description(job.getDescription())
                .moderationReason(job.getModerationReason())
                .suspendedAt(job.getSuspendedAt())
                .createdAt(job.getCreatedAt())
                .build();
    }

    private ReportAdminDto mapToReportAdminDto(SystemReport report) {
        return ReportAdminDto.builder()
                .id(report.getId())
                .reporterId(report.getReporter() != null ? report.getReporter().getId() : null)
                .reporterEmail(report.getReporter() != null ? report.getReporter().getEmail() : "Ẩn danh")
                .targetType(report.getTargetType())
                .targetId(report.getTargetId())
                .reason(report.getReason())
                .details(report.getDetails())
                .status(report.getStatus())
                .resolutionNotes(report.getResolutionNotes())
                .resolvedById(report.getResolvedBy() != null ? report.getResolvedBy().getId() : null)
                .resolvedByEmail(report.getResolvedBy() != null ? report.getResolvedBy().getEmail() : null)
                .resolvedAt(report.getResolvedAt())
                .createdAt(report.getCreatedAt())
                .build();
    }

    private AdminAuditLogDto mapToAuditLogDto(AdminAuditLog log) {
        return AdminAuditLogDto.builder()
                .id(log.getId())
                .adminId(log.getAdmin().getId())
                .adminEmail(log.getAdmin().getEmail())
                .action(log.getAction())
                .targetType(log.getTargetType())
                .targetId(log.getTargetId())
                .previousState(log.getPreviousState())
                .newState(log.getNewState())
                .reason(log.getReason())
                .ipAddress(log.getIpAddress())
                .correlationId(log.getCorrelationId())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
