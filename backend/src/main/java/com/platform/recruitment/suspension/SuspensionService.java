package com.platform.recruitment.suspension;

import com.platform.recruitment.admin.service.AdminAuditLogService;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.company.Company;
import com.platform.recruitment.company.CompanyOperationalStatus;
import com.platform.recruitment.company.CompanyRepository;
import com.platform.recruitment.job.JobRepository;
import com.platform.recruitment.job.JobStatus;
import com.platform.recruitment.user.AccountStatus;
import com.platform.recruitment.user.User;
import com.platform.recruitment.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SuspensionService {

    private final SuspensionRecordRepository suspensionRecordRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final JobRepository jobRepository;
    private final AdminAuditLogService adminAuditLogService;

    /**
     * Periodic reconciliation: checks for active suspensions that have expired (expiresAt < now)
     * and safely marks them EXPIRED, reactivating the entity if no other active suspensions remain.
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void reconcileExpiredSuspensions() {
        ZonedDateTime now = ZonedDateTime.now();
        List<SuspensionRecord> expiredRecords = suspensionRecordRepository.findByStatusAndExpiresAtBefore(
                SuspensionStatus.ACTIVE, now
        );

        if (expiredRecords.isEmpty()) {
            return;
        }

        log.info("Found {} expired suspension records to reconcile.", expiredRecords.size());

        for (SuspensionRecord record : expiredRecords) {
            record.setStatus(SuspensionStatus.EXPIRED);
            record.setResolutionNote("Lệnh đình chỉ tự động hết hạn vào " + record.getExpiresAt());
            suspensionRecordRepository.save(record);

            long remainingActive = suspensionRecordRepository.countByTargetTypeAndTargetIdAndStatus(
                    record.getTargetType(), record.getTargetId(), SuspensionStatus.ACTIVE
            );

            if (remainingActive == 0) {
                if (record.getTargetType() == SuspensionTargetType.USER) {
                    userRepository.findById(record.getTargetId()).ifPresent(user -> {
                        if (user.isSuspended()) {
                            user.reactivate();
                            userRepository.save(user);
                            log.info("User {} reactivated following suspension expiry.", user.getId());
                        }
                    });
                } else if (record.getTargetType() == SuspensionTargetType.COMPANY) {
                    companyRepository.findById(record.getTargetId()).ifPresent(company -> {
                        if (company.isSuspended()) {
                            company.setOperationalStatus(CompanyOperationalStatus.ACTIVE);
                            companyRepository.save(company);
                            log.info("Company {} reactivated following suspension expiry.", company.getId());

                            // Restore jobs suspended due to company suspension
                            jobRepository.findByCompanyId(company.getId()).forEach(job -> {
                                if (job.getStatus() == JobStatus.SUSPENDED &&
                                    "Doanh nghiệp bị tạm đình chỉ hoạt động".equals(job.getModerationReason())) {
                                    job.setStatus(JobStatus.PUBLISHED);
                                    job.setModerationReason(null);
                                    job.setSuspendedAt(null);
                                    jobRepository.save(job);
                                }
                            });
                        }
                    });
                }
            }
        }
    }

    /**
     * Suspends a user account with explicit audit trail and expiration.
     */
    @Transactional
    public SuspensionRecord suspendUser(User adminUser, UUID targetUserId, String reasonCode, String reasonText, ZonedDateTime expiresAt, String ipAddress) {
        if (reasonText == null || reasonText.trim().isBlank()) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Bắt buộc phải nhập lý do đình chỉ tài khoản.");
        }

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", targetUserId));

        // Prevent suspending the last remaining active admin
        if (targetUser.getRole() == com.platform.recruitment.user.Role.ADMIN) {
            long activeAdmins = userRepository.countByRoleAndIsActive(com.platform.recruitment.user.Role.ADMIN, true);
            if (activeAdmins <= 1 && targetUser.getAccountStatus() == AccountStatus.ACTIVE) {
                throw new CustomException(ErrorCode.ACCESS_DENIED, "Không thể đình chỉ quản trị viên duy nhất còn lại của hệ thống.");
            }
        }

        targetUser.suspend();
        userRepository.save(targetUser);

        SuspensionRecord record = SuspensionRecord.builder()
                .targetType(SuspensionTargetType.USER)
                .targetId(targetUserId)
                .reasonCode(reasonCode != null ? reasonCode : "POLICY_VIOLATION")
                .reasonText(reasonText.trim())
                .previousStatus("ACTIVE")
                .suspendedBy(adminUser)
                .suspendedAt(ZonedDateTime.now())
                .expiresAt(expiresAt)
                .status(SuspensionStatus.ACTIVE)
                .build();

        SuspensionRecord saved = suspensionRecordRepository.save(record);

        adminAuditLogService.log(
                adminUser,
                "USER_SUSPENDED",
                "USER",
                targetUserId,
                "ACTIVE",
                "SUSPENDED",
                reasonText,
                ipAddress,
                null
        );

        return saved;
    }

    /**
     * Lifts all active suspensions for a user.
     */
    @Transactional
    public void liftUserSuspension(User adminUser, UUID targetUserId, String resolutionNote, String ipAddress) {
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", targetUserId));

        ZonedDateTime now = ZonedDateTime.now();
        List<SuspensionRecord> activeRecords = suspensionRecordRepository.findByTargetTypeAndTargetIdAndStatus(
                SuspensionTargetType.USER, targetUserId, SuspensionStatus.ACTIVE
        );

        for (SuspensionRecord rec : activeRecords) {
            rec.setStatus(SuspensionStatus.LIFTED);
            rec.setLiftedBy(adminUser);
            rec.setLiftedAt(now);
            rec.setResolutionNote(resolutionNote != null ? resolutionNote.trim() : "Quản trị viên gỡ đình chỉ");
            suspensionRecordRepository.save(rec);
        }

        targetUser.reactivate();
        userRepository.save(targetUser);

        adminAuditLogService.log(
                adminUser,
                "USER_LIFT_SUSPENSION",
                "USER",
                targetUserId,
                "SUSPENDED",
                "ACTIVE",
                resolutionNote,
                ipAddress,
                null
        );
    }

    /**
     * Gets the current active suspension notice for a user or company.
     */
    @Transactional(readOnly = true)
    public Optional<SuspensionRecord> getActiveSuspension(SuspensionTargetType targetType, UUID targetId) {
        return suspensionRecordRepository.findFirstByTargetTypeAndTargetIdAndStatusOrderBySuspendedAtDesc(
                targetType, targetId, SuspensionStatus.ACTIVE
        );
    }
}
