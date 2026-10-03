package com.platform.recruitment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.admin.AdminCompanyVerificationController;
import com.platform.recruitment.admin.AdminPortalController;
import com.platform.recruitment.admin.dto.CompanyAdminDto;
import com.platform.recruitment.admin.dto.CompanyReviewRequest;
import com.platform.recruitment.admin.service.AdminService;
import com.platform.recruitment.common.GlobalExceptionHandler;
import com.platform.recruitment.company.CompanyController;
import com.platform.recruitment.company.CompanyService;
import com.platform.recruitment.company.CompanyVerification;
import com.platform.recruitment.company.dto.CompanyResponse;
import com.platform.recruitment.company.service.CompanyVerificationService;
import com.platform.recruitment.auth.JwtTokenProvider;
import com.platform.recruitment.config.JwtAuthenticationFilter;
import com.platform.recruitment.config.SecurityConfig;
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
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.time.ZonedDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {
        AdminCompanyVerificationController.class,
        AdminPortalController.class,
        CompanyController.class
})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, GlobalExceptionHandler.class})
public class CompanyVerificationContextLoadTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RequestMappingHandlerMapping handlerMapping;

    @MockBean
    private JwtTokenProvider tokenProvider;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private CompanyVerificationService companyVerificationService;

    @MockBean
    private AdminService adminService;

    @MockBean
    private CompanyService companyService;

    private User adminUser;
    private User recruiterUser;
    private UUID companyId;

    @BeforeEach
    void setUp() {
        companyId = UUID.randomUUID();

        adminUser = User.builder()
                .email("admin@midcv.io")
                .role(Role.ADMIN)
                .isActive(true)
                .build();
        adminUser.setId(UUID.randomUUID());

        recruiterUser = User.builder()
                .email("hr@fintech.vn")
                .role(Role.HR)
                .isActive(true)
                .build();
        recruiterUser.setId(UUID.randomUUID());

        when(userRepository.findByEmail("admin@midcv.io")).thenReturn(Optional.of(adminUser));
        when(userRepository.findByEmail("hr@fintech.vn")).thenReturn(Optional.of(recruiterUser));
    }

    @Test
    @DisplayName("Registry Audit: Exactly one handler exists for PUT /api/v1/admin/companies/{id}/verification")
    void testRegistryAudit_NoDuplicateVerificationMapping() {
        Map<RequestMappingInfo, HandlerMethod> handlerMethods = handlerMapping.getHandlerMethods();

        List<HandlerMethod> legacyPutHandlers = new ArrayList<>();
        List<HandlerMethod> companyControllerAdminHandlers = new ArrayList<>();

        for (Map.Entry<RequestMappingInfo, HandlerMethod> entry : handlerMethods.entrySet()) {
            RequestMappingInfo info = entry.getKey();
            HandlerMethod method = entry.getValue();

            // Check if CompanyController has any admin endpoints
            if (method.getBeanType().equals(CompanyController.class)) {
                info.getPatternValues().forEach(pattern -> {
                    if (pattern.contains("/admin/")) {
                        companyControllerAdminHandlers.add(method);
                    }
                });
            }

            // Check handlers matching PUT /api/v1/admin/companies/{id}/verification
            boolean hasPut = info.getMethodsCondition().getMethods().stream()
                    .anyMatch(m -> m.name().equalsIgnoreCase("PUT"));
            boolean matchesVerificationPath = info.getPatternValues().stream()
                    .anyMatch(p -> p.matches(".*/admin/companies/\\{id\\}/verification"));

            if (hasPut && matchesVerificationPath) {
                legacyPutHandlers.add(method);
            }
        }

        // 1. CompanyController must NOT own any /admin/** endpoints
        assertTrue(companyControllerAdminHandlers.isEmpty(),
                "CompanyController must not contain any /admin/** mapping handlers");

        // 2. Exactly one handler must exist for PUT .../admin/companies/{id}/verification
        assertEquals(1, legacyPutHandlers.size(),
                "Expected exactly 1 handler for PUT /api/v1/admin/companies/{id}/verification, but found " + legacyPutHandlers.size());

        // 3. That single handler must belong to AdminCompanyVerificationController
        assertEquals(AdminCompanyVerificationController.class, legacyPutHandlers.get(0).getBeanType(),
                "The single handler for PUT .../verification must belong to AdminCompanyVerificationController");
    }

    @Test
    @DisplayName("Security: Anonymous request to Admin company verification returns 401 or 403")
    void testAdminVerification_Anonymous_ReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/admin/companies"))
                .andExpect(status().is4xxClientError());

        mockMvc.perform(put("/api/v1/admin/companies/" + companyId + "/verification?status=VERIFIED"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("Security: Recruiter/Candidate request to Admin company verification returns 403 Forbidden")
    @WithMockUser(username = "hr@fintech.vn", roles = {"HR"})
    void testAdminVerification_RecruiterForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/admin/companies"))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/v1/admin/companies/" + companyId + "/verification?status=VERIFIED"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/admin/companies/" + companyId + "/verification/approve"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Admin: Legacy PUT /api/v1/admin/companies/{id}/verification delegates to CompanyVerificationService")
    @WithMockUser(username = "admin@midcv.io", roles = {"ADMIN"})
    void testAdminVerification_LegacyPut_DelegatesToService() throws Exception {
        CompanyAdminDto dto = CompanyAdminDto.builder()
                .id(companyId)
                .name("FinTech Innovations")
                .verificationStatus(CompanyVerification.VERIFIED)
                .reviewedAt(ZonedDateTime.now())
                .reviewNotes("Legacy review notes")
                .build();

        when(companyVerificationService.transitionVerification(any(), eq(companyId), eq(CompanyVerification.VERIFIED), any(), any(), any()))
                .thenReturn(dto);

        mockMvc.perform(put("/api/v1/admin/companies/" + companyId + "/verification")
                        .param("status", "VERIFIED")
                        .param("reason", "Approved via legacy API"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.verificationStatus").value("VERIFIED"));

        verify(companyVerificationService, times(1))
                .transitionVerification(any(), eq(companyId), eq(CompanyVerification.VERIFIED), eq("Approved via legacy API"), isNull(), any());
    }

    @Test
    @DisplayName("Admin: Canonical POST /api/v1/admin/companies/{id}/verification/approve succeeds")
    @WithMockUser(username = "admin@midcv.io", roles = {"ADMIN"})
    void testAdminVerification_CanonicalApprove_Success() throws Exception {
        CompanyAdminDto dto = CompanyAdminDto.builder()
                .id(companyId)
                .name("FinTech Innovations")
                .verificationStatus(CompanyVerification.VERIFIED)
                .reviewedAt(ZonedDateTime.now())
                .reviewNotes("Approved")
                .build();

        when(companyVerificationService.approve(any(), eq(companyId), any(), any(), any()))
                .thenReturn(dto);

        mockMvc.perform(post("/api/v1/admin/companies/" + companyId + "/verification/approve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CompanyReviewRequest.builder().reason("Approved").build())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.verificationStatus").value("VERIFIED"));

        verify(companyVerificationService, times(1))
                .approve(any(), eq(companyId), eq("Approved"), isNull(), any());
    }

    @Test
    @DisplayName("Recruiter: GET /api/v1/recruiter/company returns clean CompanyResponse without 500 error")
    @WithMockUser(username = "hr@fintech.vn", roles = {"HR"})
    void testRecruiterGetCompany_ReturnsCleanCompanyResponse() throws Exception {
        CompanyResponse response = CompanyResponse.builder()
                .id(companyId)
                .name("FinTech Innovations")
                .taxCode("0108877665")
                .website("https://fintech.vn")
                .verificationStatus(CompanyVerification.PENDING)
                .version(1L)
                .build();

        when(companyService.getMyCompany(any())).thenReturn(response);

        mockMvc.perform(get("/api/v1/recruiter/company"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("FinTech Innovations"))
                .andExpect(jsonPath("$.data.verificationStatus").value("PENDING"));

        verify(companyService, times(1)).getMyCompany(any());
    }
}
