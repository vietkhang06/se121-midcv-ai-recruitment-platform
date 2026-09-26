package com.platform.recruitment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.admin.AdminController;
import com.platform.recruitment.ai.AiClient;
import com.platform.recruitment.application.Application;
import com.platform.recruitment.application.ApplicationController;
import com.platform.recruitment.application.ApplicationRepository;
import com.platform.recruitment.application.ApplicationResponse;
import com.platform.recruitment.application.ApplicationService;
import com.platform.recruitment.auth.JwtTokenProvider;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.GlobalExceptionHandler;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.company.Company;
import com.platform.recruitment.company.RecruiterProfile;
import com.platform.recruitment.company.RecruiterProfileRepository;
import com.platform.recruitment.config.JwtAuthenticationFilter;
import com.platform.recruitment.config.SecurityConfig;
import com.platform.recruitment.event.Events;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobRepository;
import com.platform.recruitment.matching.CandidateRankingService;
import com.platform.recruitment.matching.MatchInspectionResponse;
import com.platform.recruitment.matching.MatchingController;
import com.platform.recruitment.matching.MatchingEngineService;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import com.platform.recruitment.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {
        AdminController.class,
        MatchingController.class,
        ApplicationController.class
})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, GlobalExceptionHandler.class})
class SpringSecurityRbacAndMultiTenantIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    // Security & Auth dependencies
    @MockBean
    private JwtTokenProvider tokenProvider;

    @MockBean
    private UserRepository userRepository;

    // AdminController dependencies
    @MockBean
    private AiClient aiClient;

    @MockBean
    private Events events;

    // MatchingController dependencies
    @MockBean
    private MatchingEngineService matchingEngineService;

    @MockBean
    private CandidateRankingService candidateRankingService;

    @MockBean
    private JobRepository jobRepository;

    @MockBean
    private RecruiterProfileRepository recruiterProfileRepository;

    @MockBean
    private ApplicationRepository applicationRepository;

    @MockBean
    private CandidateProfileRepository candidateProfileRepository;

    // ApplicationController dependencies
    @MockBean
    private ApplicationService applicationService;

    // Fixture Users
    private UUID adminUserId;
    private User adminUser;
    private String adminToken;

    private UUID hrUserAId;
    private User hrUserA;
    private String hrTokenA;

    private UUID hrUserBId;
    private User hrUserB;
    private String hrTokenB;

    private UUID candUser1Id;
    private User candUser1;
    private String candToken1;

    private UUID candUser2Id;
    private User candUser2;
    private String candToken2;

    // Multi-tenant Entities
    private Company companyA;
    private Company companyB;
    private RecruiterProfile recruiterA;
    private RecruiterProfile recruiterB;
    private Job jobA;
    private Application appCand1JobA;
    private CandidateProfile profileCand1;
    private CandidateProfile profileCand2;

    @BeforeEach
    void setUp() {
        adminUserId = UUID.randomUUID();
        adminUser = User.builder().email("admin@test.com").role(Role.ADMIN).isActive(true).build();
        adminUser.setId(adminUserId);
        adminToken = "admin-jwt-token";

        hrUserAId = UUID.randomUUID();
        hrUserA = User.builder().email("hrA@compA.com").role(Role.HR).isActive(true).build();
        hrUserA.setId(hrUserAId);
        hrTokenA = "hr-token-a";

        hrUserBId = UUID.randomUUID();
        hrUserB = User.builder().email("hrB@compB.com").role(Role.HR).isActive(true).build();
        hrUserB.setId(hrUserBId);
        hrTokenB = "hr-token-b";

        candUser1Id = UUID.randomUUID();
        candUser1 = User.builder().email("cand1@test.com").role(Role.CANDIDATE).isActive(true).build();
        candUser1.setId(candUser1Id);
        candToken1 = "cand-token-1";

        candUser2Id = UUID.randomUUID();
        candUser2 = User.builder().email("cand2@test.com").role(Role.CANDIDATE).isActive(true).build();
        candUser2.setId(candUser2Id);
        candToken2 = "cand-token-2";

        // Setup companies and jobs
        companyA = Company.builder().name("Company Alpha").build();
        companyA.setId(UUID.randomUUID());

        companyB = Company.builder().name("Company Beta").build();
        companyB.setId(UUID.randomUUID());

        recruiterA = RecruiterProfile.builder().user(hrUserA).company(companyA).fullName("HR A").build();
        recruiterA.setId(UUID.randomUUID());

        recruiterB = RecruiterProfile.builder().user(hrUserB).company(companyB).fullName("HR B").build();
        recruiterB.setId(UUID.randomUUID());

        jobA = Job.builder().company(companyA).title("Job A").build();
        jobA.setId(UUID.randomUUID());

        profileCand1 = CandidateProfile.builder().user(candUser1).fullName("Candidate One").build();
        profileCand1.setId(UUID.randomUUID());

        profileCand2 = CandidateProfile.builder().user(candUser2).fullName("Candidate Two").build();
        profileCand2.setId(UUID.randomUUID());

        appCand1JobA = Application.builder().candidate(profileCand1).job(jobA).build();
        appCand1JobA.setId(UUID.randomUUID());

        // Wire tokenProvider mock
        setupTokenMock(adminToken, adminUserId, "ADMIN", adminUser);
        setupTokenMock(hrTokenA, hrUserAId, "HR", hrUserA);
        setupTokenMock(hrTokenB, hrUserBId, "HR", hrUserB);
        setupTokenMock(candToken1, candUser1Id, "CANDIDATE", candUser1);
        setupTokenMock(candToken2, candUser2Id, "CANDIDATE", candUser2);
    }

    private void setupTokenMock(String token, UUID userId, String tokenRole, User userInDb) {
        when(tokenProvider.validateToken(token)).thenReturn(true);
        when(tokenProvider.getUserIdFromToken(token)).thenReturn(userId);
        when(tokenProvider.getRoleFromToken(token)).thenReturn(tokenRole);
        when(userRepository.findById(userId)).thenReturn(Optional.ofNullable(userInDb));
    }

    // =========================================================================
    // 1. RBAC Integration Tests via Spring Security Filter Chain
    // =========================================================================

    @Test
    @DisplayName("Filter Chain: ADMIN calling /api/admin/ai-settings is permitted (HTTP 200)")
    void testAdminEndpoint_CalledByAdmin_Permitted() throws Exception {
        when(aiClient.getSettings()).thenReturn(new AiClient.SystemAiSettings(
                "LOCAL_OLLAMA", "http://localhost:11434", "test-model",
                "https://api.openai.com/v1", "", "gpt-4o-mini", "LOCAL_OLLAMA", "bge-m3"
        ));

        mockMvc.perform(get("/api/admin/ai-settings")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ollamaModel").value("test-model"));
    }

    @Test
    @DisplayName("Filter Chain: HR calling /api/admin/ai-settings is blocked at HTTP filter level (HTTP 403)")
    void testAdminEndpoint_CalledByHr_BlockedByFilterChain() throws Exception {
        mockMvc.perform(get("/api/admin/ai-settings")
                        .header("Authorization", "Bearer " + hrTokenA)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());

        // Controller method must never be reached
        verifyNoInteractions(aiClient);
    }

    @Test
    @DisplayName("Filter Chain: Candidate calling /api/admin/ai-settings is blocked (HTTP 403)")
    void testAdminEndpoint_CalledByCandidate_Blocked() throws Exception {
        mockMvc.perform(get("/api/admin/ai-settings")
                        .header("Authorization", "Bearer " + candToken1)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());

        verifyNoInteractions(aiClient);
    }

    @Test
    @DisplayName("Filter Chain: Unauthenticated request to /api/admin/ai-settings is blocked (HTTP 403)")
    void testAdminEndpoint_Unauthenticated_Blocked() throws Exception {
        mockMvc.perform(get("/api/admin/ai-settings")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Filter Chain: Candidate calling /api/v1/recruiter/** is blocked (HTTP 403)")
    void testRecruiterEndpoint_CalledByCandidate_Blocked() throws Exception {
        mockMvc.perform(get("/api/v1/recruiter/jobs/" + jobA.getId() + "/applications")
                        .header("Authorization", "Bearer " + candToken1)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());

        verifyNoInteractions(applicationService);
    }

    @Test
    @DisplayName("Filter Chain: HR calling /api/v1/candidate/applications (POST) is blocked (HTTP 403)")
    void testCandidateEndpoint_CalledByHr_Blocked() throws Exception {
        mockMvc.perform(post("/api/v1/candidate/applications")
                        .header("Authorization", "Bearer " + hrTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"jobId\":\"" + jobA.getId() + "\",\"appliedCvId\":\"" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(applicationService);
    }

    @Test
    @DisplayName("Filter Chain: User in DB has null role -> Never fallback to token role -> HTTP 403")
    void testUserWithNullRoleInDatabase_AuthenticationRejected() throws Exception {
        UUID nullRoleUserId = UUID.randomUUID();
        User nullRoleUser = User.builder().email("nullrole@test.com").role(null).isActive(true).build();
        nullRoleUser.setId(nullRoleUserId);
        String spoofedAdminToken = "spoofed-admin-token";

        setupTokenMock(spoofedAdminToken, nullRoleUserId, "ADMIN", nullRoleUser);

        mockMvc.perform(get("/api/admin/ai-settings")
                        .header("Authorization", "Bearer " + spoofedAdminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());

        verifyNoInteractions(aiClient);
    }

    @Test
    @DisplayName("Filter Chain: User in DB is inactive (isActive=false) -> Authentication rejected -> HTTP 403")
    void testInactiveUser_AuthenticationRejected() throws Exception {
        UUID inactiveUserId = UUID.randomUUID();
        User inactiveUser = User.builder().email("inactive@test.com").role(Role.ADMIN).isActive(false).build();
        inactiveUser.setId(inactiveUserId);
        String inactiveAdminToken = "inactive-admin-token";

        setupTokenMock(inactiveAdminToken, inactiveUserId, "ADMIN", inactiveUser);

        mockMvc.perform(get("/api/admin/ai-settings")
                        .header("Authorization", "Bearer " + inactiveAdminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());

        verifyNoInteractions(aiClient);
    }

    // =========================================================================
    // 2. Multi-Tenant Ownership Verification via Real API Calls
    // =========================================================================

    @Test
    @DisplayName("Multi-Tenant: HR Company B cannot access Company A's job applications (HTTP 403)")
    void testMultiTenant_HrCompanyB_CannotAccess_CompanyA_Applications() throws Exception {
        when(applicationService.getApplicationsForJob(any(User.class), eq(jobA.getId())))
                .thenThrow(new UnauthorizedAccessException("Recruiter does not own the company for this job posting"));

        mockMvc.perform(get("/api/v1/recruiter/jobs/" + jobA.getId() + "/applications")
                        .header("Authorization", "Bearer " + hrTokenB)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Recruiter does not own the company")));
    }

    @Test
    @DisplayName("Multi-Tenant: HR Company A CAN access Company A's job applications (HTTP 200)")
    void testMultiTenant_HrCompanyA_CanAccess_CompanyA_Applications() throws Exception {
        when(applicationService.getApplicationsForJob(any(User.class), eq(jobA.getId())))
                .thenReturn(Collections.singletonList(ApplicationResponse.builder().id(appCand1JobA.getId()).jobId(jobA.getId()).build()));

        mockMvc.perform(get("/api/v1/recruiter/jobs/" + jobA.getId() + "/applications")
                        .header("Authorization", "Bearer " + hrTokenA)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].jobId").value(jobA.getId().toString()));
    }

    @Test
    @DisplayName("Multi-Tenant: HR Company B cannot access Company A's candidate rankings (HTTP 403)")
    void testMultiTenant_HrCompanyB_CannotAccess_CompanyA_Rankings() throws Exception {
        when(recruiterProfileRepository.findByUserId(hrUserBId)).thenReturn(Optional.of(recruiterB));
        when(jobRepository.findById(jobA.getId())).thenReturn(Optional.of(jobA));

        mockMvc.perform(get("/api/v1/matching/jobs/" + jobA.getId() + "/rankings")
                        .header("Authorization", "Bearer " + hrTokenB)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Recruiter does not own the company")));

        verifyNoInteractions(candidateRankingService);
    }

    @Test
    @DisplayName("Multi-Tenant: HR Company B cannot access Company A's match inspection (HTTP 403)")
    void testMultiTenant_HrCompanyB_CannotAccess_CompanyA_MatchInspection() throws Exception {
        when(applicationRepository.findById(appCand1JobA.getId())).thenReturn(Optional.of(appCand1JobA));
        when(recruiterProfileRepository.findByUserId(hrUserBId)).thenReturn(Optional.of(recruiterB));

        mockMvc.perform(get("/api/v1/matching/applications/" + appCand1JobA.getId() + "/inspection")
                        .header("Authorization", "Bearer " + hrTokenB)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Recruiter does not own the company")));

        verifyNoInteractions(matchingEngineService);
    }

    @Test
    @DisplayName("Multi-Tenant: HR Company A CAN access Company A's match inspection (HTTP 200)")
    void testMultiTenant_HrCompanyA_CanAccess_CompanyA_MatchInspection() throws Exception {
        when(applicationRepository.findById(appCand1JobA.getId())).thenReturn(Optional.of(appCand1JobA));
        when(recruiterProfileRepository.findByUserId(hrUserAId)).thenReturn(Optional.of(recruiterA));
        when(matchingEngineService.getMatchInspection(appCand1JobA.getId()))
                .thenReturn(MatchInspectionResponse.builder().applicationId(appCand1JobA.getId()).overallScore(java.math.BigDecimal.valueOf(88.5)).build());

        mockMvc.perform(get("/api/v1/matching/applications/" + appCand1JobA.getId() + "/inspection")
                        .header("Authorization", "Bearer " + hrTokenA)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.applicationId").value(appCand1JobA.getId().toString()))
                .andExpect(jsonPath("$.data.overallScore").value(88.5));
    }

    @Test
    @DisplayName("Candidate Privacy: Candidate 2 cannot access Candidate 1's match inspection (HTTP 403)")
    void testCandidatePrivacy_Candidate2_CannotAccess_Candidate1_Inspection() throws Exception {
        when(applicationRepository.findById(appCand1JobA.getId())).thenReturn(Optional.of(appCand1JobA));
        when(candidateProfileRepository.findByUserId(candUser2Id)).thenReturn(Optional.of(profileCand2));

        mockMvc.perform(get("/api/v1/matching/applications/" + appCand1JobA.getId() + "/inspection")
                        .header("Authorization", "Bearer " + candToken2)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Candidate cannot inspect another candidate's application")));

        verifyNoInteractions(matchingEngineService);
    }

    @Test
    @DisplayName("Candidate Privacy: Candidate 1 CAN access their own match inspection (HTTP 200)")
    void testCandidatePrivacy_Candidate1_CanAccess_Own_Inspection() throws Exception {
        when(applicationRepository.findById(appCand1JobA.getId())).thenReturn(Optional.of(appCand1JobA));
        when(candidateProfileRepository.findByUserId(candUser1Id)).thenReturn(Optional.of(profileCand1));
        when(matchingEngineService.getMatchInspection(appCand1JobA.getId()))
                .thenReturn(MatchInspectionResponse.builder().applicationId(appCand1JobA.getId()).overallScore(java.math.BigDecimal.valueOf(92.0)).build());

        mockMvc.perform(get("/api/v1/matching/applications/" + appCand1JobA.getId() + "/inspection")
                        .header("Authorization", "Bearer " + candToken1)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.applicationId").value(appCand1JobA.getId().toString()));
    }
}
