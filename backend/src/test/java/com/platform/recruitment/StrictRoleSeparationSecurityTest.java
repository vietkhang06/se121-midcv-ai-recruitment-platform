package com.platform.recruitment;

import com.platform.recruitment.application.Application;
import com.platform.recruitment.application.ApplicationRepository;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.company.Company;
import com.platform.recruitment.company.RecruiterProfile;
import com.platform.recruitment.company.RecruiterProfileRepository;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobRepository;
import com.platform.recruitment.matching.CandidateRankingService;
import com.platform.recruitment.matching.MatchingController;
import com.platform.recruitment.matching.MatchingEngineService;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class StrictRoleSeparationSecurityTest {

    @Mock
    private MatchingEngineService matchingEngineService;

    @Mock
    private CandidateRankingService candidateRankingService;

    @Mock
    private JobRepository jobRepository;

    @Mock
    private RecruiterProfileRepository recruiterProfileRepository;

    @Mock
    private ApplicationRepository applicationRepository;

    @InjectMocks
    private MatchingController matchingController;

    private User hrUserA;
    private User hrUserB;
    private User candidateUser1;
    private User candidateUser2;

    private Company companyA;
    private Company companyB;

    private RecruiterProfile recruiterProfileA;
    private RecruiterProfile recruiterProfileB;

    private Job jobA;
    private Application appCand1JobA;

    @BeforeEach
    void setUp() {
        companyA = Company.builder().name("Company A").build();
        companyA.setId(UUID.randomUUID());

        companyB = Company.builder().name("Company B").build();
        companyB.setId(UUID.randomUUID());

        hrUserA = User.builder().email("hr_a@comp-a.com").role(Role.HR).isActive(true).build();
        hrUserA.setId(UUID.randomUUID());

        hrUserB = User.builder().email("hr_b@comp-b.com").role(Role.HR).isActive(true).build();
        hrUserB.setId(UUID.randomUUID());

        candidateUser1 = User.builder().email("cand1@dev.io").role(Role.CANDIDATE).isActive(true).build();
        candidateUser1.setId(UUID.randomUUID());

        candidateUser2 = User.builder().email("cand2@dev.io").role(Role.CANDIDATE).isActive(true).build();
        candidateUser2.setId(UUID.randomUUID());

        recruiterProfileA = RecruiterProfile.builder().user(hrUserA).company(companyA).fullName("HR Lead A").build();
        recruiterProfileA.setId(UUID.randomUUID());

        recruiterProfileB = RecruiterProfile.builder().user(hrUserB).company(companyB).fullName("HR Lead B").build();
        recruiterProfileB.setId(UUID.randomUUID());

        jobA = Job.builder().company(companyA).title("Principal Backend Engineer").build();
        jobA.setId(UUID.randomUUID());

        CandidateProfile candProfile1 = CandidateProfile.builder().user(candidateUser1).fullName("Candidate One").build();
        candProfile1.setId(UUID.randomUUID());

        appCand1JobA = Application.builder().candidate(candProfile1).job(jobA).build();
        appCand1JobA.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("Role Boundary: Candidate calling HR ranking endpoint is strictly rejected (403)")
    void testCandidateAccessingHrRankingEndpoint_Rejected() {
        UnauthorizedAccessException ex = assertThrows(
                UnauthorizedAccessException.class,
                () -> matchingController.getCandidateRankings(candidateUser1, jobA.getId(), null)
        );
        assertTrue(ex.getMessage().contains("Ứng viên không có quyền truy cập xếp hạng ứng viên của nhà tuyển dụng"));
        verifyNoInteractions(candidateRankingService);
    }

    @Test
    @DisplayName("Role Boundary: Unauthenticated user calling HR ranking endpoint is rejected")
    void testUnauthenticatedAccess_Rejected() {
        UnauthorizedAccessException ex = assertThrows(
                UnauthorizedAccessException.class,
                () -> matchingController.getCandidateRankings(null, jobA.getId(), null)
        );
        assertTrue(ex.getMessage().contains("Vui lòng đăng nhập"));
    }

    @Test
    @DisplayName("Tenant Isolation: HR from Company B cannot access Company A rankings")
    void testCrossCompanyRankingAccess_Rejected() {
        when(recruiterProfileRepository.findByUserId(hrUserB.getId())).thenReturn(Optional.of(recruiterProfileB));
        when(jobRepository.findById(jobA.getId())).thenReturn(Optional.of(jobA));

        UnauthorizedAccessException ex = assertThrows(
                UnauthorizedAccessException.class,
                () -> matchingController.getCandidateRankings(hrUserB, jobA.getId(), null)
        );
        assertTrue(ex.getMessage().contains("Recruiter does not own the company"));
        verifyNoInteractions(candidateRankingService);
    }

    @Test
    @DisplayName("Authorized Access: HR from Company A can access Company A rankings")
    void testAuthorizedCompanyRankingAccess_Success() {
        when(recruiterProfileRepository.findByUserId(hrUserA.getId())).thenReturn(Optional.of(recruiterProfileA));
        when(jobRepository.findById(jobA.getId())).thenReturn(Optional.of(jobA));

        matchingController.getCandidateRankings(hrUserA, jobA.getId(), null);
        verify(candidateRankingService, times(1)).getRankedCandidatesForJob(jobA.getId(), null);
    }

    @Test
    @DisplayName("Ownership: Candidate 2 cannot inspect Candidate 1 application")
    void testCandidateCrossInspection_Rejected() {
        when(applicationRepository.findById(appCand1JobA.getId())).thenReturn(Optional.of(appCand1JobA));

        UnauthorizedAccessException ex = assertThrows(
                UnauthorizedAccessException.class,
                () -> matchingController.getMatchInspection(candidateUser2, appCand1JobA.getId())
        );
        assertTrue(ex.getMessage().contains("Candidate cannot inspect another candidate's application"));
        verifyNoInteractions(matchingEngineService);
    }

    @Test
    @DisplayName("Ownership: Candidate 1 can inspect own application")
    void testCandidateOwnInspection_Success() {
        when(applicationRepository.findById(appCand1JobA.getId())).thenReturn(Optional.of(appCand1JobA));

        matchingController.getMatchInspection(candidateUser1, appCand1JobA.getId());
        verify(matchingEngineService, times(1)).getMatchInspection(appCand1JobA.getId());
    }

    @Test
    @DisplayName("Tenant Isolation: HR from Company B cannot inspect Company A application")
    void testHrCrossCompanyInspection_Rejected() {
        when(applicationRepository.findById(appCand1JobA.getId())).thenReturn(Optional.of(appCand1JobA));
        when(recruiterProfileRepository.findByUserId(hrUserB.getId())).thenReturn(Optional.of(recruiterProfileB));

        UnauthorizedAccessException ex = assertThrows(
                UnauthorizedAccessException.class,
                () -> matchingController.getMatchInspection(hrUserB, appCand1JobA.getId())
        );
        assertTrue(ex.getMessage().contains("Recruiter does not own the company"));
        verifyNoInteractions(matchingEngineService);
    }

    @Test
    @DisplayName("Admin Isolation: HR calling AdminController is rejected with ACCESS_DENIED")
    void testHrAccessingAdminController_Rejected() {
        com.platform.recruitment.ai.AiClient mockAiClient = mock(com.platform.recruitment.ai.AiClient.class);
        com.platform.recruitment.event.Events mockEvents = mock(com.platform.recruitment.event.Events.class);
        com.platform.recruitment.admin.AdminController adminController = new com.platform.recruitment.admin.AdminController(mockAiClient, mockEvents);

        org.springframework.security.core.Authentication auth = mock(org.springframework.security.core.Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getPrincipal()).thenReturn(hrUserA);
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);

        try {
            com.platform.recruitment.common.CustomException ex = assertThrows(
                    com.platform.recruitment.common.CustomException.class,
                    adminController::getSettings
            );
            assertEquals(com.platform.recruitment.common.ErrorCode.ACCESS_DENIED, ex.getErrorCode());
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }

    @Test
    @DisplayName("Admin Isolation: ADMIN calling AdminController succeeds")
    void testAdminAccessingAdminController_Success() {
        com.platform.recruitment.ai.AiClient mockAiClient = mock(com.platform.recruitment.ai.AiClient.class);
        com.platform.recruitment.event.Events mockEvents = mock(com.platform.recruitment.event.Events.class);
        com.platform.recruitment.admin.AdminController adminController = new com.platform.recruitment.admin.AdminController(mockAiClient, mockEvents);

        User adminUser = User.builder().email("root@midcv.io").role(Role.ADMIN).isActive(true).build();
        adminUser.setId(UUID.randomUUID());

        org.springframework.security.core.Authentication auth = mock(org.springframework.security.core.Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getPrincipal()).thenReturn(adminUser);
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);

        when(mockAiClient.getSettings()).thenReturn(new com.platform.recruitment.ai.AiClient.SystemAiSettings(
                "LOCAL_OLLAMA", "http://localhost:11434", "granite", "https://api.openai.com/v1", null, "gpt-4o-mini", "LOCAL_OLLAMA", "bge-m3"
        ));

        try {
            var settings = adminController.getSettings();
            assertNotNull(settings);
            assertEquals("LOCAL_OLLAMA", settings.get("provider"));
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }

    @Test
    @DisplayName("PasswordEncoder: Verify BCryptPasswordEncoder strength 10 operates dynamically")
    void testDynamicBCryptPasswordEncoder() {
        org.springframework.security.crypto.password.PasswordEncoder encoder =
                new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder(10);
        String testPassword = "test-sample-password-fixture";
        String encoded = encoder.encode(testPassword);
        assertTrue(encoder.matches(testPassword, encoded));
    }
}
