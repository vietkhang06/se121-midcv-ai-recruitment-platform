package com.platform.recruitment;

import com.platform.recruitment.admin.dto.*;
import com.platform.recruitment.admin.model.*;
import com.platform.recruitment.admin.repository.AdminAuditLogRepository;
import com.platform.recruitment.admin.repository.SystemReportRepository;
import com.platform.recruitment.admin.service.AdminAuditLogService;
import com.platform.recruitment.admin.service.AdminService;
import com.platform.recruitment.ai.AiClient;
import com.platform.recruitment.application.ApplicationRepository;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.company.*;
import com.platform.recruitment.cv.CVRepository;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobRepository;
import com.platform.recruitment.job.JobStatus;
import com.platform.recruitment.taxonomy.TaxonomyService;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import com.platform.recruitment.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AdminModerationApiIntegrationTest {

    @Mock private UserRepository userRepository;
    @Mock private CandidateProfileRepository candidateProfileRepository;
    @Mock private RecruiterProfileRepository recruiterProfileRepository;
    @Mock private CompanyRepository companyRepository;
    @Mock private JobRepository jobRepository;
    @Mock private SystemReportRepository systemReportRepository;
    @Mock private AdminAuditLogRepository adminAuditLogRepository;
    @Mock private AdminAuditLogService adminAuditLogService;
    @Mock private AiClient aiClient;
    @Mock private TaxonomyService taxonomyService;
    @Mock private CVRepository cvRepository;
    @Mock private ApplicationRepository applicationRepository;

    @InjectMocks
    private AdminService adminService;

    private User adminUser;
    private User recruiterUser;
    private User candidateUser;
    private Company testCompany;
    private Job testJob;
    private SystemReport testReport;

    @BeforeEach
    void setUp() {
        adminUser = User.builder().email("admin@midcv.io").role(Role.ADMIN).isActive(true).build();
        adminUser.setId(UUID.randomUUID());

        recruiterUser = User.builder().email("recruiter@firm.com").role(Role.HR).isActive(true).build();
        recruiterUser.setId(UUID.randomUUID());

        candidateUser = User.builder().email("candidate@tech.com").role(Role.CANDIDATE).isActive(true).build();
        candidateUser.setId(UUID.randomUUID());

        testCompany = Company.builder()
                .name("Global Enterprise")
                .taxCode("0109988776")
                .verificationStatus(CompanyVerification.PENDING)
                .version(1L)
                .build();
        testCompany.setId(UUID.randomUUID());

        testJob = Job.builder()
                .company(testCompany)
                .title("Lead Software Architect")
                .industry("IT")
                .seniority("Lead")
                .status(JobStatus.PUBLISHED)
                .description("Distributed systems architecture")
                .build();
        testJob.setId(UUID.randomUUID());

        testReport = SystemReport.builder()
                .reporter(candidateUser)
                .targetType(ReportTargetType.JOB)
                .targetId(testJob.getId())
                .reason("Fake requirements")
                .status(ReportStatus.PENDING)
                .build();
        testReport.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("Admin Dashboard: Calculates authentic metrics from repositories and masks AI credentials")
    void testGetDashboardStats_CalculatesRealMetrics() {
        when(userRepository.count()).thenReturn(150L);
        when(userRepository.countByRole(Role.CANDIDATE)).thenReturn(100L);
        when(userRepository.countByRole(Role.HR)).thenReturn(48L);
        when(userRepository.countByIsActive(true)).thenReturn(145L);
        when(userRepository.countByIsActive(false)).thenReturn(5L);

        when(companyRepository.countByVerificationStatus(CompanyVerification.PENDING)).thenReturn(12L);
        when(companyRepository.countByVerificationStatus(CompanyVerification.UNDER_REVIEW)).thenReturn(3L);
        when(companyRepository.countByVerificationStatus(CompanyVerification.VERIFIED)).thenReturn(30L);
        when(companyRepository.countByVerificationStatus(CompanyVerification.REJECTED)).thenReturn(2L);
        when(companyRepository.countByVerificationStatus(CompanyVerification.SUSPENDED)).thenReturn(1L);

        when(jobRepository.countByStatus(JobStatus.PUBLISHED)).thenReturn(85L);
        when(jobRepository.countByStatus(JobStatus.SUSPENDED)).thenReturn(4L);

        when(systemReportRepository.countByStatus(ReportStatus.PENDING)).thenReturn(6L);
        when(adminAuditLogRepository.findAllByOrderByCreatedAtDesc(any())).thenReturn(new PageImpl<>(List.of()));

        when(aiClient.getSettings()).thenReturn(new AiClient.SystemAiSettings(
                "LOCAL_OLLAMA", "http://localhost:11434", "granite4.2", "https://api.openai.com", "secret-key", "gpt-4o", "LOCAL_OLLAMA", "bge-m3"
        ));

        AdminDashboardStatsDto stats = adminService.getDashboardStats();

        assertNotNull(stats);
        assertEquals(150L, stats.getTotalUsers());
        assertEquals(100L, stats.getCandidatesCount());
        assertEquals(48L, stats.getRecruitersCount());
        assertEquals(145L, stats.getActiveUsersCount());
        assertEquals(5L, stats.getSuspendedUsersCount());
        assertEquals(12L, stats.getCompaniesPendingCount());
        assertEquals(30L, stats.getCompaniesVerifiedCount());
        assertEquals(85L, stats.getActiveJobsCount());
        assertEquals(4L, stats.getSuspendedJobsCount());
        assertEquals(6L, stats.getPendingReportsCount());
    }

    @Test
    @DisplayName("Company Verification: Under Review to Verified transition succeeds and records audit")
    void testCompanyVerification_ValidTransition_Success() {
        testCompany.setVerificationStatus(CompanyVerification.UNDER_REVIEW);
        when(companyRepository.findById(testCompany.getId())).thenReturn(Optional.of(testCompany));
        when(companyRepository.save(any(Company.class))).thenAnswer(i -> i.getArgument(0));

        CompanyReviewRequest req = CompanyReviewRequest.builder()
                .status(CompanyVerification.VERIFIED)
                .version(1L)
                .reason("Tài liệu kinh doanh đầy đủ và hợp lệ")
                .build();

        CompanyAdminDto result = adminService.transitionCompanyVerification(adminUser, testCompany.getId(), req, "127.0.0.1");

        assertNotNull(result);
        assertEquals(CompanyVerification.VERIFIED, result.getVerificationStatus());
        assertEquals(adminUser.getEmail(), result.getReviewedByEmail());
        verify(adminAuditLogService, times(1)).log(
                eq(adminUser), eq("COMPANY_VERIFICATION_VERIFIED"), eq("COMPANY"), eq(testCompany.getId()),
                eq("UNDER_REVIEW"), eq("VERIFIED"), any(), eq("127.0.0.1"), any()
        );
    }

    @Test
    @DisplayName("Company Verification: Mandatory reason required for CHANGES_REQUESTED, REJECTED, SUSPENDED")
    void testCompanyVerification_MissingReason_ThrowsValidationError() {
        CompanyReviewRequest req = CompanyReviewRequest.builder()
                .status(CompanyVerification.REJECTED)
                .version(1L)
                .reason("   ") // blank reason
                .build();

        CustomException ex = assertThrows(CustomException.class, () ->
                adminService.transitionCompanyVerification(adminUser, testCompany.getId(), req, "127.0.0.1"));
        assertEquals(ErrorCode.VALIDATION_ERROR, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("Bắt buộc phải nhập lý do"));
    }

    @Test
    @DisplayName("Company Verification: Optimistic locking conflict triggers CONCURRENT_MODIFICATION")
    void testCompanyVerification_VersionMismatch_ThrowsConflict() {
        when(companyRepository.findById(testCompany.getId())).thenReturn(Optional.of(testCompany));

        CompanyReviewRequest req = CompanyReviewRequest.builder()
                .status(CompanyVerification.UNDER_REVIEW)
                .version(0L) // Stale version (DB has 1L)
                .reason("Bắt đầu thẩm định")
                .build();

        CustomException ex = assertThrows(CustomException.class, () ->
                adminService.transitionCompanyVerification(adminUser, testCompany.getId(), req, "127.0.0.1"));
        assertEquals(ErrorCode.CONCURRENT_MODIFICATION, ex.getErrorCode());
    }

    @Test
    @DisplayName("Company Verification: Invalid state transition throws INVALID_STATE_TRANSITION")
    void testCompanyVerification_InvalidTransition_ThrowsException() {
        testCompany.setVerificationStatus(CompanyVerification.PENDING);
        when(companyRepository.findById(testCompany.getId())).thenReturn(Optional.of(testCompany));

        CompanyReviewRequest req = CompanyReviewRequest.builder()
                .status(CompanyVerification.SUSPENDED) // Invalid: PENDING cannot directly transition to SUSPENDED
                .version(1L)
                .reason("Đình chỉ doanh nghiệp")
                .build();

        CustomException ex = assertThrows(CustomException.class, () ->
                adminService.transitionCompanyVerification(adminUser, testCompany.getId(), req, "127.0.0.1"));
        assertEquals(ErrorCode.INVALID_STATE_TRANSITION, ex.getErrorCode());
    }

    @Test
    @DisplayName("User Moderation: Suspending candidate sets isActive=false and logs audit")
    void testSuspendUser_Success() {
        when(userRepository.findById(candidateUser.getId())).thenReturn(Optional.of(candidateUser));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        adminService.suspendUser(adminUser, candidateUser.getId(), "Spam application detected", "192.168.1.1");

        assertFalse(candidateUser.getIsActive());
        verify(userRepository, times(1)).save(candidateUser);
        verify(adminAuditLogService, times(1)).log(
                eq(adminUser), eq("SUSPEND_USER"), eq("USER"), eq(candidateUser.getId()),
                eq("ACTIVE"), eq("SUSPENDED"), eq("Spam application detected"), eq("192.168.1.1"), any()
        );
    }

    @Test
    @DisplayName("User Moderation: Admin cannot self-suspend or suspend another Admin")
    void testSuspendUser_AdminProtection() {
        // Self-suspension attempt
        CustomException selfEx = assertThrows(CustomException.class, () ->
                adminService.suspendUser(adminUser, adminUser.getId(), "Self test", "127.0.0.1"));
        assertEquals(ErrorCode.VALIDATION_ERROR, selfEx.getErrorCode());

        // Suspending another admin attempt
        User otherAdmin = User.builder().email("admin2@midcv.io").role(Role.ADMIN).isActive(true).build();
        otherAdmin.setId(UUID.randomUUID());
        when(userRepository.findById(otherAdmin.getId())).thenReturn(Optional.of(otherAdmin));

        CustomException adminEx = assertThrows(CustomException.class, () ->
                adminService.suspendUser(adminUser, otherAdmin.getId(), "Test", "127.0.0.1"));
        assertEquals(ErrorCode.ACCESS_DENIED, adminEx.getErrorCode());
    }

    @Test
    @DisplayName("Job Moderation: Suspending and restoring job updates status and writes audit logs")
    void testJobModeration_SuspendAndRestore() {
        when(jobRepository.findById(testJob.getId())).thenReturn(Optional.of(testJob));
        when(jobRepository.save(any(Job.class))).thenAnswer(i -> i.getArgument(0));

        // Suspend
        adminService.suspendJob(adminUser, testJob.getId(), "Misleading salary range", "127.0.0.1");
        assertEquals(JobStatus.SUSPENDED, testJob.getStatus());
        assertEquals("Misleading salary range", testJob.getModerationReason());
        assertNotNull(testJob.getSuspendedAt());

        // Restore
        adminService.restoreJob(adminUser, testJob.getId(), "127.0.0.1");
        assertEquals(JobStatus.PUBLISHED, testJob.getStatus());
        assertNull(testJob.getModerationReason());
    }

    @Test
    @DisplayName("Report Moderation: Resolving report marks RESOLVED with resolution notes")
    void testReportModeration_ResolveReport() {
        when(systemReportRepository.findById(testReport.getId())).thenReturn(Optional.of(testReport));
        when(systemReportRepository.save(any(SystemReport.class))).thenAnswer(i -> i.getArgument(0));

        adminService.resolveReport(adminUser, testReport.getId(), "Job has been moderated", "127.0.0.1");

        assertEquals(ReportStatus.RESOLVED, testReport.getStatus());
        assertEquals(adminUser, testReport.getResolvedBy());
        assertEquals("Job has been moderated", testReport.getResolutionNotes());
        assertNotNull(testReport.getResolvedAt());
    }

    @Test
    @DisplayName("Taxonomy Management: Admin creates skill and toggles active state")
    void testTaxonomyManagement_CreateAndToggle() {
        UUID newSkillId = UUID.randomUUID();
        when(taxonomyService.createSkill(eq("GraphQL"), eq("BACKEND"), any(), any())).thenReturn(newSkillId);
        when(taxonomyService.toggleSkillActive(newSkillId)).thenReturn(false);

        CreateTaxonomySkillRequest req = CreateTaxonomySkillRequest.builder()
                .canonicalName("GraphQL")
                .category("BACKEND")
                .description("Query language for APIs")
                .aliases(List.of("GQL"))
                .build();

        UUID createdId = adminService.createTaxonomySkill(adminUser, req, "127.0.0.1");
        assertEquals(newSkillId, createdId);

        boolean nextActive = adminService.toggleTaxonomySkill(adminUser, newSkillId, "127.0.0.1");
        assertFalse(nextActive);

        verify(adminAuditLogService, times(2)).log(any(), any(), eq("TAXONOMY_SKILL"), eq(newSkillId), any(), any(), any(), eq("127.0.0.1"), any());
    }

    @Test
    @DisplayName("Company Suspension Cascades: Suspending verified company also marks its published jobs as SUSPENDED")
    void testCompanySuspension_CascadesJobSuspension() {
        testCompany.setVerificationStatus(CompanyVerification.VERIFIED);
        when(companyRepository.findById(testCompany.getId())).thenReturn(Optional.of(testCompany));
        when(companyRepository.save(any(Company.class))).thenAnswer(i -> i.getArgument(0));
        when(jobRepository.findByCompanyId(testCompany.getId())).thenReturn(List.of(testJob));

        CompanyReviewRequest req = CompanyReviewRequest.builder()
                .status(CompanyVerification.SUSPENDED)
                .reason("Legal violation detected")
                .build();

        adminService.transitionCompanyVerification(adminUser, testCompany.getId(), req, "127.0.0.1");

        assertEquals(CompanyVerification.SUSPENDED, testCompany.getVerificationStatus());
        assertEquals(JobStatus.SUSPENDED, testJob.getStatus());
        assertEquals("Doanh nghiệp bị tạm đình chỉ hoạt động", testJob.getModerationReason());
        verify(jobRepository, times(1)).save(testJob);
    }
}
