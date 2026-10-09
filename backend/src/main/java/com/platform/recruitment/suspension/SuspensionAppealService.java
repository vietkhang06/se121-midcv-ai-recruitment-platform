package com.platform.recruitment.suspension;

import com.platform.recruitment.admin.service.AdminAuditLogService;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.company.Company;
import com.platform.recruitment.company.CompanyRepository;
import com.platform.recruitment.company.CompanyVerification;
import com.platform.recruitment.company.RecruiterProfile;
import com.platform.recruitment.company.RecruiterProfileRepository;
import com.platform.recruitment.job.JobRepository;
import com.platform.recruitment.job.JobStatus;
import com.platform.recruitment.suspension.dto.AppealResponse;
import com.platform.recruitment.suspension.dto.CreateAppealRequest;
import com.platform.recruitment.suspension.dto.ReviewAppealRequest;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import com.platform.recruitment.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SuspensionAppealService {

    private final SuspensionAppealRepository appealRepository;
    private final SuspensionRecordRepository suspensionRecordRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final RecruiterProfileRepository recruiterProfileRepository;
    private final JobRepository jobRepository;
    private final AdminAuditLogService adminAuditLogService;

    @Transactional
    public AppealResponse submitAppeal(User appellantUser, CreateAppealRequest request) {
        SuspensionTargetType targetType;
        UUID targetId;
        SuspensionRecord activeSuspension = null;

        if (appellantUser.isSuspended()) {
            targetType = SuspensionTargetType.USER;
            targetId = appellantUser.getId();
            activeSuspension = suspensionRecordRepository
                    .findFirstByTargetTypeAndTargetIdAndStatusOrderBySuspendedAtDesc(SuspensionTargetType.USER, targetId, SuspensionStatus.ACTIVE)
                    .orElse(null);
        } else if (appellantUser.getRole() == Role.HR) {
            RecruiterProfile profile = recruiterProfileRepository.findByUserId(appellantUser.getId()).orElse(null);
            if (profile != null && profile.getCompany() != null
                    && profile.getCompany().isSuspended()) {
                targetType = SuspensionTargetType.COMPANY;
                targetId = profile.getCompany().getId();
                activeSuspension = suspensionRecordRepository
                        .findFirstByTargetTypeAndTargetIdAndStatusOrderBySuspendedAtDesc(SuspensionTargetType.COMPANY, targetId, SuspensionStatus.ACTIVE)
                        .orElse(null);
            } else {
                throw new CustomException(
                        ErrorCode.VALIDATION_ERROR,
                        "Tài khoản hoặc doanh nghiệp của bạn hiện không trong trạng thái bị đình chỉ để gửi khiếu nại."
                );
            }
        } else {
            throw new CustomException(
                    ErrorCode.VALIDATION_ERROR,
                    "Tài khoản của bạn hiện không trong trạng thái bị đình chỉ để gửi khiếu nại."
            );
        }

        // Prevent duplicate open appeals
        boolean hasOpenAppeal = appealRepository.existsByTargetTypeAndTargetIdAndStatusIn(
                targetType,
                targetId,
                List.of(AppealStatus.SUBMITTED, AppealStatus.UNDER_REVIEW)
        );
        if (hasOpenAppeal) {
            throw new CustomException(
                    ErrorCode.APPEAL_ALREADY_EXISTS,
                    "Đã có một khiếu nại đang chờ xử lý cho trường hợp này. Vui lòng đợi quản trị viên phản hồi."
            );
        }

        SuspensionAppeal appeal = SuspensionAppeal.builder()
                .appellantUser(appellantUser)
                .suspension(activeSuspension)
                .targetType(targetType)
                .targetId(targetId)
                .subject(request.getSubject().trim())
                .content(request.getContent().trim())
                .evidenceAttachmentId(request.getEvidenceAttachmentId())
                .status(AppealStatus.SUBMITTED)
                .submittedAt(ZonedDateTime.now())
                .build();

        SuspensionAppeal saved = appealRepository.save(appeal);
        log.info("Suspension appeal submitted: id={}, appellant={}, targetType={}, targetId={}",
                saved.getId(), appellantUser.getEmail(), targetType, targetId);

        return AppealResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<AppealResponse> getMyAppeals(User appellantUser) {
        return appealRepository.findByAppellantUserIdOrderByCreatedAtDesc(appellantUser.getId())
                .stream()
                .map(AppealResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public AppealResponse getAppealById(User currentUser, UUID appealId) {
        SuspensionAppeal appeal = appealRepository.findById(appealId)
                .orElseThrow(() -> new CustomException(ErrorCode.APPEAL_NOT_FOUND, "Không tìm thấy hồ sơ khiếu nại."));

        if (currentUser.getRole() != Role.ADMIN && !appeal.getAppellantUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedAccessException("Bạn không có quyền xem thông tin khiếu nại này.");
        }

        return AppealResponse.fromEntity(appeal);
    }

    @Transactional
    public AppealResponse cancelAppeal(User currentUser, UUID appealId) {
        SuspensionAppeal appeal = appealRepository.findById(appealId)
                .orElseThrow(() -> new CustomException(ErrorCode.APPEAL_NOT_FOUND, "Không tìm thấy hồ sơ khiếu nại."));

        if (!appeal.getAppellantUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedAccessException("Bạn chỉ có thể hủy khiếu nại do chính mình tạo.");
        }

        if (appeal.getStatus() != AppealStatus.SUBMITTED) {
            throw new CustomException(
                    ErrorCode.INVALID_APPEAL_STATE,
                    "Chỉ có thể hủy khiếu nại khi đang ở trạng thái 'Chờ tiếp nhận' (SUBMITTED)."
            );
        }

        appeal.setStatus(AppealStatus.CANCELLED);
        appeal.setResolutionNote("Người gửi chủ động hủy khiếu nại.");
        return AppealResponse.fromEntity(appealRepository.save(appeal));
    }

    @Transactional(readOnly = true)
    public Page<AppealResponse> listAppealsAdmin(AppealStatus status, Pageable pageable) {
        Page<SuspensionAppeal> page = (status != null)
                ? appealRepository.findByStatus(status, pageable)
                : appealRepository.findAll(pageable);
        return page.map(AppealResponse::fromEntity);
    }

    @Transactional
    public AppealResponse startReviewAdmin(User admin, UUID appealId) {
        SuspensionAppeal appeal = appealRepository.findById(appealId)
                .orElseThrow(() -> new CustomException(ErrorCode.APPEAL_NOT_FOUND, "Không tìm thấy hồ sơ khiếu nại."));

        if (appeal.getStatus() != AppealStatus.SUBMITTED) {
            throw new CustomException(
                    ErrorCode.INVALID_APPEAL_STATE,
                    "Chỉ có thể tiếp nhận xử lý khiếu nại đang ở trạng thái SUBMITTED."
            );
        }

        appeal.setStatus(AppealStatus.UNDER_REVIEW);
        appeal.setReviewedBy(admin);
        return AppealResponse.fromEntity(appealRepository.save(appeal));
    }

    @Transactional
    public AppealResponse approveAppealAdmin(User admin, UUID appealId, ReviewAppealRequest request, String ipAddress) {
        SuspensionAppeal appeal = appealRepository.findById(appealId)
                .orElseThrow(() -> new CustomException(ErrorCode.APPEAL_NOT_FOUND, "Không tìm thấy hồ sơ khiếu nại."));

        if (appeal.getStatus() == AppealStatus.APPROVED || appeal.getStatus() == AppealStatus.REJECTED || appeal.getStatus() == AppealStatus.CANCELLED) {
            throw new CustomException(
                    ErrorCode.INVALID_APPEAL_STATE,
                    "Khiếu nại này đã được xử lý hoặc đã kết thúc (" + appeal.getStatus() + "), không thể duyệt lại."
            );
        }

        ZonedDateTime now = ZonedDateTime.now();
        String note = request.getResolutionNote().trim();

        // 1. Mark appeal as APPROVED
        appeal.setStatus(AppealStatus.APPROVED);
        appeal.setReviewedBy(admin);
        appeal.setReviewedAt(now);
        appeal.setResolutionNote(note);
        appealRepository.save(appeal);

        // 2. Lift associated SuspensionRecord in same transaction
        if (appeal.getSuspension() != null) {
            SuspensionRecord rec = appeal.getSuspension();
            rec.setStatus(SuspensionStatus.LIFTED);
            rec.setLiftedBy(admin);
            rec.setLiftedAt(now);
            rec.setResolutionNote("Chấp thuận khiếu nại: " + note);
            suspensionRecordRepository.save(rec);
        } else {
            suspensionRecordRepository.findByTargetTypeAndTargetIdAndStatus(
                    appeal.getTargetType(),
                    appeal.getTargetId(),
                    SuspensionStatus.ACTIVE
            ).forEach(record -> {
                record.setStatus(SuspensionStatus.LIFTED);
                record.setLiftedBy(admin);
                record.setLiftedAt(now);
                record.setResolutionNote("Chấp thuận khiếu nại: " + note);
                suspensionRecordRepository.save(record);
            });
        }

        // 3. Reactivate target entity ONLY IF no other active suspensions remain
        long remainingActive = suspensionRecordRepository.countByTargetTypeAndTargetIdAndStatus(
                appeal.getTargetType(), appeal.getTargetId(), SuspensionStatus.ACTIVE);

        if (remainingActive == 0) {
            if (appeal.getTargetType() == SuspensionTargetType.USER) {
                User user = userRepository.findById(appeal.getTargetId())
                        .orElseThrow(() -> new ResourceNotFoundException("User", "id", appeal.getTargetId()));
                user.reactivate();
                userRepository.save(user);
                log.info("Reactivated user via appeal approval: userId={}", user.getId());
            } else if (appeal.getTargetType() == SuspensionTargetType.COMPANY) {
                Company company = companyRepository.findById(appeal.getTargetId())
                        .orElseThrow(() -> new ResourceNotFoundException("Company", "id", appeal.getTargetId()));
                company.setOperationalStatus(com.platform.recruitment.company.CompanyOperationalStatus.ACTIVE);
                company.setReviewedBy(admin);
                company.setReviewedAt(now);
                company.setReviewNotes("Gỡ đình chỉ thông qua khiếu nại: " + note);
                companyRepository.save(company);
                log.info("Reactivated company operational status via appeal approval: companyId={}", company.getId());

                // Restore jobs that were suspended due to company suspension
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
        } else {
            log.warn("Target still has {} other active suspension(s); not reactivating target: id={}",
                    remainingActive, appeal.getTargetId());
        }

        // 4. Audit Log
        adminAuditLogService.log(
                admin,
                "APPROVE_APPEAL",
                appeal.getTargetType().name(),
                appeal.getTargetId(),
                "SUSPENDED",
                "ACTIVE",
                note,
                ipAddress,
                null
        );

        return AppealResponse.fromEntity(appeal);
    }

    @Transactional
    public AppealResponse rejectAppealAdmin(User admin, UUID appealId, ReviewAppealRequest request, String ipAddress) {
        SuspensionAppeal appeal = appealRepository.findById(appealId)
                .orElseThrow(() -> new CustomException(ErrorCode.APPEAL_NOT_FOUND, "Không tìm thấy hồ sơ khiếu nại."));

        if (appeal.getStatus() == AppealStatus.APPROVED || appeal.getStatus() == AppealStatus.REJECTED || appeal.getStatus() == AppealStatus.CANCELLED) {
            throw new CustomException(
                    ErrorCode.INVALID_APPEAL_STATE,
                    "Khiếu nại này đã được xử lý hoặc đã kết thúc (" + appeal.getStatus() + "), không thể từ chối lại."
            );
        }

        ZonedDateTime now = ZonedDateTime.now();
        String note = request.getResolutionNote().trim();

        appeal.setStatus(AppealStatus.REJECTED);
        appeal.setReviewedBy(admin);
        appeal.setReviewedAt(now);
        appeal.setResolutionNote(note);
        appealRepository.save(appeal);

        adminAuditLogService.log(
                admin,
                "REJECT_APPEAL",
                appeal.getTargetType().name(),
                appeal.getTargetId(),
                "SUSPENDED",
                "SUSPENDED",
                note,
                ipAddress,
                null
        );

        return AppealResponse.fromEntity(appeal);
    }
}
