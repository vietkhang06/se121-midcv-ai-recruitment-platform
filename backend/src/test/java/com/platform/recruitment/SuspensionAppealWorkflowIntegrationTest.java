package com.platform.recruitment;

import com.platform.recruitment.admin.service.AdminAuditLogService;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.company.Company;
import com.platform.recruitment.company.CompanyRepository;
import com.platform.recruitment.company.CompanyVerification;
import com.platform.recruitment.company.RecruiterProfileRepository;
import com.platform.recruitment.job.JobRepository;
import com.platform.recruitment.suspension.*;
import com.platform.recruitment.suspension.dto.AppealResponse;
import com.platform.recruitment.suspension.dto.CreateAppealRequest;
import com.platform.recruitment.suspension.dto.ReviewAppealRequest;
import com.platform.recruitment.user.AccountStatus;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import com.platform.recruitment.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SuspensionAppealWorkflowIntegrationTest {

    @Mock
    private SuspensionAppealRepository appealRepository;

    @Mock
    private SuspensionRecordRepository suspensionRecordRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CompanyRepository companyRepository;

    @Mock
    private RecruiterProfileRepository recruiterProfileRepository;

    @Mock
    private JobRepository jobRepository;

    @Mock
    private AdminAuditLogService adminAuditLogService;

    private SuspensionAppealService appealService;

    private User suspendedUser;
    private User activeUser;
    private User adminUser;
    private SuspensionRecord activeSuspensionRecord;

    @BeforeEach
    void setUp() {
        appealService = new SuspensionAppealService(
                appealRepository,
                suspensionRecordRepository,
                userRepository,
                companyRepository,
                recruiterProfileRepository,
                jobRepository,
                adminAuditLogService
        );

        suspendedUser = User.builder()
                .email("suspended@example.com")
                .role(Role.HR)
                .accountStatus(AccountStatus.SUSPENDED)
                .isActive(false)
                .build();
        suspendedUser.setId(UUID.randomUUID());

        activeUser = User.builder()
                .email("active@example.com")
                .role(Role.HR)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .build();
        activeUser.setId(UUID.randomUUID());

        adminUser = User.builder()
                .email("admin@platform.com")
                .role(Role.ADMIN)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .build();
        adminUser.setId(UUID.randomUUID());

        activeSuspensionRecord = SuspensionRecord.builder()
                .targetType(SuspensionTargetType.USER)
                .targetId(suspendedUser.getId())
                .reasonCode("SPAM")
                .reasonText("Posting misleading jobs")
                .status(SuspensionStatus.ACTIVE)
                .build();
        activeSuspensionRecord.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("Suspended recruiter can submit appeal successfully")
    void testSubmitAppealSuccess() {
        when(suspensionRecordRepository.findFirstByTargetTypeAndTargetIdAndStatusOrderBySuspendedAtDesc(
                SuspensionTargetType.USER, suspendedUser.getId(), SuspensionStatus.ACTIVE))
                .thenReturn(Optional.of(activeSuspensionRecord));
        when(appealRepository.existsByTargetTypeAndTargetIdAndStatusIn(any(), any(), any()))
                .thenReturn(false);
        when(appealRepository.save(any(SuspensionAppeal.class))).thenAnswer(inv -> {
            SuspensionAppeal a = inv.getArgument(0);
            a.setId(UUID.randomUUID());
            return a;
        });

        CreateAppealRequest request = CreateAppealRequest.builder()
                .subject("Khiếu nại khóa tài khoản nhầm lẫn")
                .content("Doanh nghiệp của tôi có giấy phép kinh doanh đầy đủ, xin xem xét lại.")
                .build();

        AppealResponse response = appealService.submitAppeal(suspendedUser, request);
        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(AppealStatus.SUBMITTED);
        assertThat(response.getTargetType()).isEqualTo(SuspensionTargetType.USER);
        assertThat(response.getSubject()).isEqualTo("Khiếu nại khóa tài khoản nhầm lẫn");

        verify(appealRepository, times(1)).save(any(SuspensionAppeal.class));
    }

    @Test
    @DisplayName("Non-suspended user cannot submit appeal")
    void testNonSuspendedUserCannotSubmitAppeal() {
        CreateAppealRequest request = CreateAppealRequest.builder()
                .subject("Khiếu nại")
                .content("Nội dung")
                .build();

        assertThatThrownBy(() -> appealService.submitAppeal(activeUser, request))
                .isInstanceOf(CustomException.class)
                .satisfies(ex -> {
                    CustomException ce = (CustomException) ex;
                    assertThat(ce.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR);
                });

        verify(appealRepository, never()).save(any());
    }

    @Test
    @DisplayName("Cannot submit multiple open appeals for the same suspension")
    void testDuplicateOpenAppealBlocked() {
        when(suspensionRecordRepository.findFirstByTargetTypeAndTargetIdAndStatusOrderBySuspendedAtDesc(
                SuspensionTargetType.USER, suspendedUser.getId(), SuspensionStatus.ACTIVE))
                .thenReturn(Optional.of(activeSuspensionRecord));
        when(appealRepository.existsByTargetTypeAndTargetIdAndStatusIn(
                eq(SuspensionTargetType.USER), eq(suspendedUser.getId()), any()))
                .thenReturn(true);

        CreateAppealRequest request = CreateAppealRequest.builder()
                .subject("Khiếu nại lần 2")
                .content("Nội dung")
                .build();

        assertThatThrownBy(() -> appealService.submitAppeal(suspendedUser, request))
                .isInstanceOf(CustomException.class)
                .satisfies(ex -> {
                    CustomException ce = (CustomException) ex;
                    assertThat(ce.getErrorCode()).isEqualTo(ErrorCode.APPEAL_ALREADY_EXISTS);
                });

        verify(appealRepository, never()).save(any());
    }

    @Test
    @DisplayName("Admin approve lifts suspension and reactivates user in same transaction")
    void testAdminApproveLiftsSuspension() {
        UUID appealId = UUID.randomUUID();
        SuspensionAppeal appeal = SuspensionAppeal.builder()
                .appellantUser(suspendedUser)
                .suspension(activeSuspensionRecord)
                .targetType(SuspensionTargetType.USER)
                .targetId(suspendedUser.getId())
                .subject("Khiếu nại")
                .content("Nội dung giải trình")
                .status(AppealStatus.SUBMITTED)
                .build();
        appeal.setId(appealId);

        when(appealRepository.findById(appealId)).thenReturn(Optional.of(appeal));
        when(suspensionRecordRepository.countByTargetTypeAndTargetIdAndStatus(
                SuspensionTargetType.USER, suspendedUser.getId(), SuspensionStatus.ACTIVE))
                .thenReturn(0L);
        when(userRepository.findById(suspendedUser.getId())).thenReturn(Optional.of(suspendedUser));

        ReviewAppealRequest request = ReviewAppealRequest.builder()
                .resolutionNote("Đã xác minh thông tin đăng ký doanh nghiệp hợp lệ. Mở khóa tài khoản.")
                .build();

        AppealResponse response = appealService.approveAppealAdmin(adminUser, appealId, request, "127.0.0.1");

        assertThat(response.getStatus()).isEqualTo(AppealStatus.APPROVED);
        assertThat(response.getReviewedBy()).isEqualTo(adminUser.getId());
        assertThat(activeSuspensionRecord.getStatus()).isEqualTo(SuspensionStatus.LIFTED);
        assertThat(activeSuspensionRecord.getLiftedBy()).isEqualTo(adminUser);
        assertThat(suspendedUser.getAccountStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(suspendedUser.getIsActive()).isTrue();

        verify(adminAuditLogService, times(1)).log(
                eq(adminUser), eq("APPROVE_APPEAL"), eq("USER"), eq(suspendedUser.getId()),
                eq("SUSPENDED"), eq("ACTIVE"), any(), eq("127.0.0.1"), isNull());
    }

    @Test
    @DisplayName("Admin reject keeps user suspended with resolution note")
    void testAdminRejectKeepsSuspended() {
        UUID appealId = UUID.randomUUID();
        SuspensionAppeal appeal = SuspensionAppeal.builder()
                .appellantUser(suspendedUser)
                .suspension(activeSuspensionRecord)
                .targetType(SuspensionTargetType.USER)
                .targetId(suspendedUser.getId())
                .status(AppealStatus.SUBMITTED)
                .build();
        appeal.setId(appealId);

        when(appealRepository.findById(appealId)).thenReturn(Optional.of(appeal));

        ReviewAppealRequest request = ReviewAppealRequest.builder()
                .resolutionNote("Giấy tờ không đủ điều kiện chứng minh.")
                .build();

        AppealResponse response = appealService.rejectAppealAdmin(adminUser, appealId, request, "127.0.0.1");

        assertThat(response.getStatus()).isEqualTo(AppealStatus.REJECTED);
        assertThat(activeSuspensionRecord.getStatus()).isEqualTo(SuspensionStatus.ACTIVE);
        assertThat(suspendedUser.getAccountStatus()).isEqualTo(AccountStatus.SUSPENDED);

        verify(adminAuditLogService, times(1)).log(
                eq(adminUser), eq("REJECT_APPEAL"), eq("USER"), eq(suspendedUser.getId()),
                eq("SUSPENDED"), eq("SUSPENDED"), any(), eq("127.0.0.1"), isNull());
    }

    @Test
    @DisplayName("Cannot re-process an already approved or rejected appeal (idempotency guard)")
    void testCannotReProcessResolvedAppeal() {
        UUID appealId = UUID.randomUUID();
        SuspensionAppeal appeal = SuspensionAppeal.builder()
                .appellantUser(suspendedUser)
                .status(AppealStatus.APPROVED)
                .build();
        appeal.setId(appealId);

        when(appealRepository.findById(appealId)).thenReturn(Optional.of(appeal));

        ReviewAppealRequest request = ReviewAppealRequest.builder()
                .resolutionNote("Thử duyệt lại")
                .build();

        assertThatThrownBy(() -> appealService.approveAppealAdmin(adminUser, appealId, request, "127.0.0.1"))
                .isInstanceOf(CustomException.class)
                .satisfies(ex -> {
                    CustomException ce = (CustomException) ex;
                    assertThat(ce.getErrorCode()).isEqualTo(ErrorCode.INVALID_APPEAL_STATE);
                });
    }
}
