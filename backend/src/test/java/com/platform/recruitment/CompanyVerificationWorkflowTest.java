package com.platform.recruitment;

import com.platform.recruitment.admin.service.AdminAuditLogService;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.company.*;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CompanyVerificationWorkflowTest {

    @Mock private CompanyRepository companyRepository;
    @Mock private RecruiterProfileRepository recruiterProfileRepository;
    @Mock private AdminAuditLogService adminAuditLogService;

    @InjectMocks
    private CompanyService companyService;

    private User recruiterUser;
    private RecruiterProfile recruiterProfile;
    private Company company;

    @BeforeEach
    void setUp() {
        recruiterUser = User.builder().email("hr@fintech.vn").role(Role.HR).isActive(true).build();
        recruiterUser.setId(UUID.randomUUID());

        company = Company.builder()
                .name("FinTech Innovations Vietnam")
                .taxCode("0108877665")
                .website("https://fintech.vn")
                .verificationStatus(CompanyVerification.CHANGES_REQUESTED)
                .reviewNotes("Vui lòng cung cấp mã số thuế chuẩn xác")
                .build();
        company.setId(UUID.randomUUID());

        recruiterProfile = RecruiterProfile.builder()
                .user(recruiterUser)
                .company(company)
                .build();
        recruiterProfile.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("Submit Verification: Recruiter resubmits after CHANGES_REQUESTED successfully")
    void testSubmitVerification_ResubmitAfterChangesRequested() {
        when(recruiterProfileRepository.findByUserId(recruiterUser.getId())).thenReturn(Optional.of(recruiterProfile));
        when(companyRepository.save(any(Company.class))).thenAnswer(i -> i.getArgument(0));

        com.platform.recruitment.company.dto.CompanyResponse submitted = companyService.submitVerification(recruiterUser, "192.168.1.1");

        assertNotNull(submitted);
        assertEquals(CompanyVerification.PENDING, submitted.getVerificationStatus());
        assertNull(submitted.getReviewNotes());
        assertNull(submitted.getReviewedAt());

        verify(adminAuditLogService, times(1)).log(
                eq(recruiterUser),
                eq("RECRUITER_SUBMIT_VERIFICATION"),
                eq("COMPANY"),
                eq(company.getId()),
                eq("CHANGES_REQUESTED"),
                eq("PENDING"),
                any(),
                eq("192.168.1.1"),
                any()
        );
    }

    @Test
    @DisplayName("Submit Verification: Throws VALIDATION_ERROR if legal name is missing")
    void testSubmitVerification_MissingNameThrowsValidationError() {
        company.setName("  ");
        when(recruiterProfileRepository.findByUserId(recruiterUser.getId())).thenReturn(Optional.of(recruiterProfile));

        CustomException ex = assertThrows(CustomException.class, () ->
                companyService.submitVerification(recruiterUser, "127.0.0.1")
        );
        assertEquals(ErrorCode.VALIDATION_ERROR, ex.getErrorCode());
    }

    @Test
    @DisplayName("Submit Verification: Throws VALIDATION_ERROR if taxCode is missing")
    void testSubmitVerification_MissingTaxCodeThrowsValidationError() {
        company.setTaxCode(null);
        when(recruiterProfileRepository.findByUserId(recruiterUser.getId())).thenReturn(Optional.of(recruiterProfile));

        CustomException ex = assertThrows(CustomException.class, () ->
                companyService.submitVerification(recruiterUser, "127.0.0.1")
        );
        assertEquals(ErrorCode.VALIDATION_ERROR, ex.getErrorCode());
    }

    @Test
    @DisplayName("Submit Verification: Throws INVALID_STATE_TRANSITION if already VERIFIED")
    void testSubmitVerification_AlreadyVerifiedThrowsInvalidStateTransition() {
        company.setVerificationStatus(CompanyVerification.VERIFIED);
        when(recruiterProfileRepository.findByUserId(recruiterUser.getId())).thenReturn(Optional.of(recruiterProfile));

        CustomException ex = assertThrows(CustomException.class, () ->
                companyService.submitVerification(recruiterUser, "127.0.0.1")
        );
        assertEquals(ErrorCode.INVALID_STATE_TRANSITION, ex.getErrorCode());
    }

    @Test
    @DisplayName("Submit Verification: Throws INVALID_STATE_TRANSITION if currently UNDER_REVIEW")
    void testSubmitVerification_UnderReviewThrowsInvalidStateTransition() {
        company.setVerificationStatus(CompanyVerification.UNDER_REVIEW);
        when(recruiterProfileRepository.findByUserId(recruiterUser.getId())).thenReturn(Optional.of(recruiterProfile));

        CustomException ex = assertThrows(CustomException.class, () ->
                companyService.submitVerification(recruiterUser, "127.0.0.1")
        );
        assertEquals(ErrorCode.INVALID_STATE_TRANSITION, ex.getErrorCode());
    }
}
