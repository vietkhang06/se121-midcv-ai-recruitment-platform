package com.platform.recruitment.company.service;

import com.platform.recruitment.admin.dto.CompanyAdminDto;
import com.platform.recruitment.admin.service.AdminAuditLogService;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.company.Company;
import com.platform.recruitment.company.CompanyOperationalStatus;
import com.platform.recruitment.company.CompanyRepository;
import com.platform.recruitment.company.CompanyVerification;
import com.platform.recruitment.company.RecruiterProfile;
import com.platform.recruitment.company.RecruiterProfileRepository;
import com.platform.recruitment.job.JobRepository;
import com.platform.recruitment.job.JobStatus;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
public class CompanyVerificationService {

    private final CompanyRepository companyRepository;
    private final RecruiterProfileRepository recruiterProfileRepository;
    private final JobRepository jobRepository;
    private final AdminAuditLogService adminAuditLogService;
    private final com.platform.recruitment.suspension.SuspensionRecordRepository suspensionRecordRepository;

    @Autowired
    public CompanyVerificationService(CompanyRepository companyRepository,
                                      RecruiterProfileRepository recruiterProfileRepository,
                                      JobRepository jobRepository,
                                      AdminAuditLogService adminAuditLogService,
                                      @org.springframework.lang.Nullable com.platform.recruitment.suspension.SuspensionRecordRepository suspensionRecordRepository) {
        this.companyRepository = companyRepository;
        this.recruiterProfileRepository = recruiterProfileRepository;
        this.jobRepository = jobRepository;
        this.adminAuditLogService = adminAuditLogService;
        this.suspensionRecordRepository = suspensionRecordRepository;
    }

    public CompanyVerificationService(CompanyRepository companyRepository,
                                      RecruiterProfileRepository recruiterProfileRepository,
                                      JobRepository jobRepository,
                                      AdminAuditLogService adminAuditLogService) {
        this(companyRepository, recruiterProfileRepository, jobRepository, adminAuditLogService, null);
    }

    @Transactional(readOnly = true)
    public Page<CompanyAdminDto> listCompanies(String query, CompanyVerification status, Pageable pageable) {
        Page<Company> companies;
        if (query != null && !query.isBlank() && status != null) {
            companies = companyRepository.findByNameContainingIgnoreCaseAndVerificationStatus(query.trim(), status, pageable);
        } else if (query != null && !query.isBlank()) {
            companies = companyRepository.findByNameContainingIgnoreCase(query.trim(), pageable);
        } else if (status != null) {
            companies = companyRepository.findByVerificationStatus(status, pageable);
        } else {
            companies = companyRepository.findAll(pageable);
        }

        return companies.map(this::mapToCompanyAdminDto);
    }

    @Transactional(readOnly = true)
    public CompanyAdminDto getCompanyDetail(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));
        return mapToCompanyAdminDto(company);
    }

    @Transactional
    public CompanyAdminDto transitionVerification(User adminUser, UUID companyId, CompanyVerification targetStatus, String reason, Long version, String ipAddress) {
        if (targetStatus == null) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Trạng thái thẩm định mới không được để trống.");
        }

        // Enforce mandatory reason for non-approved states
        if ((targetStatus == CompanyVerification.CHANGES_REQUESTED ||
             targetStatus == CompanyVerification.REJECTED) &&
            (reason == null || reason.trim().isBlank())) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR,
                    "Bắt buộc phải nhập lý do khi yêu cầu sửa đổi hoặc từ chối doanh nghiệp.");
        }

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));

        // Optimistic Locking validation (409 Conflict)
        if (version != null && !version.equals(company.getVersion())) {
            throw new CustomException(ErrorCode.CONCURRENT_MODIFICATION,
                    "Hồ sơ doanh nghiệp đã được cập nhật bởi một quản trị viên khác. Vui lòng làm mới dữ liệu.");
        }

        CompanyVerification currentStatus = company.getVerificationStatus();
        validateCompanyStateTransition(currentStatus, targetStatus);

        company.setVerificationStatus(targetStatus);
        company.setReviewedBy(adminUser);
        company.setReviewedAt(ZonedDateTime.now());
        company.setReviewNotes(reason != null ? reason.trim() : null);

        Company savedCompany = companyRepository.save(company);

        // Immutable Audit Log
        adminAuditLogService.log(
                adminUser,
                "COMPANY_VERIFICATION_" + targetStatus.name(),
                "COMPANY",
                savedCompany.getId(),
                currentStatus.name(),
                targetStatus.name(),
                reason,
                ipAddress,
                null
        );

        return mapToCompanyAdminDto(savedCompany);
    }

    @Transactional
    public CompanyAdminDto startReview(User adminUser, UUID companyId, String notes, Long version, String ipAddress) {
        return transitionVerification(adminUser, companyId, CompanyVerification.UNDER_REVIEW, notes, version, ipAddress);
    }

    @Transactional
    public CompanyAdminDto approve(User adminUser, UUID companyId, String notes, Long version, String ipAddress) {
        return transitionVerification(adminUser, companyId, CompanyVerification.VERIFIED, notes, version, ipAddress);
    }

    @Transactional
    public CompanyAdminDto requestChanges(User adminUser, UUID companyId, String reason, Long version, String ipAddress) {
        return transitionVerification(adminUser, companyId, CompanyVerification.CHANGES_REQUESTED, reason, version, ipAddress);
    }

    @Transactional
    public CompanyAdminDto reject(User adminUser, UUID companyId, String reason, Long version, String ipAddress) {
        return transitionVerification(adminUser, companyId, CompanyVerification.REJECTED, reason, version, ipAddress);
    }

    @Transactional
    public CompanyAdminDto suspend(User adminUser, UUID companyId, String reason, Long version, String ipAddress) {
        if (reason == null || reason.trim().isBlank()) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Bắt buộc phải nhập lý do khi đình chỉ doanh nghiệp.");
        }

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));

        if (version != null && !version.equals(company.getVersion())) {
            throw new CustomException(ErrorCode.CONCURRENT_MODIFICATION,
                    "Hồ sơ doanh nghiệp đã được cập nhật bởi một quản trị viên khác. Vui lòng làm mới dữ liệu.");
        }

        CompanyOperationalStatus previousOpStatus = company.getOperationalStatus();
        company.setOperationalStatus(CompanyOperationalStatus.SUSPENDED);
        company.setReviewedBy(adminUser);
        company.setReviewedAt(ZonedDateTime.now());
        company.setReviewNotes(reason.trim());

        Company savedCompany = companyRepository.save(company);

        if (suspensionRecordRepository != null) {
            com.platform.recruitment.suspension.SuspensionRecord record =
                    com.platform.recruitment.suspension.SuspensionRecord.builder()
                            .targetType(com.platform.recruitment.suspension.SuspensionTargetType.COMPANY)
                            .targetId(savedCompany.getId())
                            .reasonCode("ADMIN_MODERATION")
                            .reasonText(reason.trim())
                            .previousStatus(previousOpStatus != null ? previousOpStatus.name() : "ACTIVE")
                            .suspendedBy(adminUser)
                            .suspendedAt(ZonedDateTime.now())
                            .status(com.platform.recruitment.suspension.SuspensionStatus.ACTIVE)
                            .build();
            suspensionRecordRepository.save(record);
        }

        // Cascade suspend to all currently published jobs
        jobRepository.findByCompanyId(companyId).forEach(job -> {
            if (job.getStatus() == JobStatus.PUBLISHED) {
                job.setStatus(JobStatus.SUSPENDED);
                job.setModerationReason("Doanh nghiệp bị tạm đình chỉ hoạt động");
                job.setSuspendedAt(ZonedDateTime.now());
                jobRepository.save(job);
            }
        });

        adminAuditLogService.log(
                adminUser,
                "COMPANY_SUSPENDED",
                "COMPANY",
                savedCompany.getId(),
                previousOpStatus != null ? previousOpStatus.name() : "ACTIVE",
                CompanyOperationalStatus.SUSPENDED.name(),
                reason,
                ipAddress,
                null
        );

        return mapToCompanyAdminDto(savedCompany);
    }

    @Transactional
    public CompanyAdminDto restore(User adminUser, UUID companyId, String notes, Long version, String ipAddress) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));

        if (version != null && !version.equals(company.getVersion())) {
            throw new CustomException(ErrorCode.CONCURRENT_MODIFICATION,
                    "Hồ sơ doanh nghiệp đã được cập nhật bởi một quản trị viên khác. Vui lòng làm mới dữ liệu.");
        }

        CompanyOperationalStatus previousOpStatus = company.getOperationalStatus();
        company.setOperationalStatus(CompanyOperationalStatus.ACTIVE);
        // Note: verificationStatus is PRESERVED! Does not force VERIFIED!
        company.setReviewedBy(adminUser);
        company.setReviewedAt(ZonedDateTime.now());
        if (notes != null && !notes.isBlank()) {
            company.setReviewNotes(notes.trim());
        }

        Company savedCompany = companyRepository.save(company);

        if (suspensionRecordRepository != null) {
            suspensionRecordRepository.findByTargetTypeAndTargetIdAndStatus(
                    com.platform.recruitment.suspension.SuspensionTargetType.COMPANY,
                    savedCompany.getId(),
                    com.platform.recruitment.suspension.SuspensionStatus.ACTIVE
            ).forEach(activeRecord -> {
                activeRecord.setStatus(com.platform.recruitment.suspension.SuspensionStatus.LIFTED);
                activeRecord.setLiftedBy(adminUser);
                activeRecord.setLiftedAt(ZonedDateTime.now());
                activeRecord.setResolutionNote(notes != null ? notes.trim() : "Quản trị viên khôi phục doanh nghiệp");
                suspensionRecordRepository.save(activeRecord);
            });
        }

        // Restore jobs that were suspended due to company suspension
        jobRepository.findByCompanyId(companyId).forEach(job -> {
            if (job.getStatus() == JobStatus.SUSPENDED &&
                "Doanh nghiệp bị tạm đình chỉ hoạt động".equals(job.getModerationReason())) {
                job.setStatus(JobStatus.PUBLISHED);
                job.setModerationReason(null);
                job.setSuspendedAt(null);
                jobRepository.save(job);
            }
        });

        adminAuditLogService.log(
                adminUser,
                "COMPANY_LIFT_SUSPENSION",
                "COMPANY",
                savedCompany.getId(),
                previousOpStatus != null ? previousOpStatus.name() : "SUSPENDED",
                CompanyOperationalStatus.ACTIVE.name(),
                notes,
                ipAddress,
                null
        );

        return mapToCompanyAdminDto(savedCompany);
    }

    public void validateCompanyStateTransition(CompanyVerification current, CompanyVerification target) {
        if (current == target) {
            return;
        }

        boolean valid = switch (current) {
            case PENDING -> target == CompanyVerification.UNDER_REVIEW ||
                            target == CompanyVerification.VERIFIED ||
                            target == CompanyVerification.REJECTED;
            case UNDER_REVIEW -> target == CompanyVerification.VERIFIED ||
                                 target == CompanyVerification.CHANGES_REQUESTED ||
                                 target == CompanyVerification.REJECTED;
            case CHANGES_REQUESTED -> target == CompanyVerification.UNDER_REVIEW ||
                                      target == CompanyVerification.REJECTED;
            case VERIFIED -> false;
            case REJECTED -> target == CompanyVerification.UNDER_REVIEW;
        };

        if (!valid) {
            throw new CustomException(ErrorCode.INVALID_STATE_TRANSITION,
                    String.format("Không thể chuyển đổi trạng thái doanh nghiệp từ '%s' sang '%s'.", current, target));
        }
    }

    public CompanyAdminDto mapToCompanyAdminDto(Company company) {
        Optional<RecruiterProfile> recruiterOpt = recruiterProfileRepository.findTopByCompanyId(company.getId());
        return CompanyAdminDto.builder()
                .id(company.getId())
                .name(company.getName())
                .taxCode(company.getTaxCode())
                .website(company.getWebsite())
                .size(company.getSize())
                .industry(company.getIndustry())
                .description(company.getDescription())
                .verificationStatus(company.getVerificationStatus())
                .operationalStatus(company.getOperationalStatus())
                .reviewedById(company.getReviewedBy() != null ? company.getReviewedBy().getId() : null)
                .reviewedByEmail(company.getReviewedBy() != null ? company.getReviewedBy().getEmail() : null)
                .reviewedAt(company.getReviewedAt())
                .reviewNotes(company.getReviewNotes())
                .version(company.getVersion())
                .createdAt(company.getCreatedAt())
                .updatedAt(company.getUpdatedAt())
                .recruiterEmail(recruiterOpt.map(r -> r.getUser().getEmail()).orElse(null))
                .recruiterName(recruiterOpt.map(RecruiterProfile::getFullName).orElse(null))
                .recruiterPhone(recruiterOpt.map(RecruiterProfile::getPhone).orElse(null))
                .activeJobsCount(jobRepository.findByCompanyId(company.getId()).stream().filter(j -> j.getStatus() == JobStatus.PUBLISHED).count())
                .build();
    }
}
