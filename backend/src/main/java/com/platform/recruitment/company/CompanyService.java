package com.platform.recruitment.company;

import com.platform.recruitment.admin.service.AdminAuditLogService;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.company.dto.CompanyResponse;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final RecruiterProfileRepository recruiterProfileRepository;
    private final AdminAuditLogService adminAuditLogService;

    @Transactional(readOnly = true)
    public CompanyResponse getMyCompany(User recruiterUser) {
        Company company = getCompanyEntity(recruiterUser);
        return CompanyResponse.fromEntity(company);
    }

    @Transactional(readOnly = true)
    public Company getCompanyEntity(User recruiterUser) {
        RecruiterProfile recruiter = recruiterProfileRepository.findByUserId(recruiterUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("RecruiterProfile", "userId", recruiterUser.getId()));

        Company company = recruiter.getCompany();
        if (company == null) {
            throw new ResourceNotFoundException("Company not linked to recruiter profile");
        }
        return company;
    }

    @Transactional
    public CompanyResponse submitVerification(User recruiterUser, String ipAddress) {
        RecruiterProfile recruiter = recruiterProfileRepository.findByUserId(recruiterUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("RecruiterProfile", "userId", recruiterUser.getId()));

        Company company = recruiter.getCompany();
        if (company == null) {
            throw new ResourceNotFoundException("Company not linked to recruiter profile");
        }

        if (company.getName() == null || company.getName().trim().isBlank()) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Tên doanh nghiệp là bắt buộc khi nộp thẩm định.");
        }
        if (company.getTaxCode() == null || company.getTaxCode().trim().isBlank()) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Mã số thuế là bắt buộc khi nộp thẩm định.");
        }

        CompanyVerification currentStatus = company.getVerificationStatus();
        if (currentStatus == CompanyVerification.VERIFIED) {
            throw new CustomException(ErrorCode.INVALID_STATE_TRANSITION, "Doanh nghiệp đã được xác minh thành công.");
        }
        if (currentStatus == CompanyVerification.UNDER_REVIEW) {
            throw new CustomException(ErrorCode.INVALID_STATE_TRANSITION, "Hồ sơ đang trong quá trình thẩm định.");
        }

        company.setVerificationStatus(CompanyVerification.PENDING);
        company.setReviewNotes(null);
        company.setReviewedBy(null);
        company.setReviewedAt(null);
        Company saved = companyRepository.save(company);

        adminAuditLogService.log(
                recruiterUser,
                "RECRUITER_SUBMIT_VERIFICATION",
                "COMPANY",
                saved.getId(),
                currentStatus.name(),
                CompanyVerification.PENDING.name(),
                "Nhà tuyển dụng gửi hồ sơ yêu cầu thẩm định doanh nghiệp",
                ipAddress,
                null
        );

        return CompanyResponse.fromEntity(saved);
    }

    @Transactional
    public CompanyResponse updateMyCompany(User recruiterUser, Company updateData) {
        RecruiterProfile recruiter = recruiterProfileRepository.findByUserId(recruiterUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("RecruiterProfile", "userId", recruiterUser.getId()));

        Company company = recruiter.getCompany();
        if (company == null) {
            company = new Company();
            company.setName(updateData.getName() != null ? updateData.getName() : "My Company");
            company.setVerificationStatus(CompanyVerification.PENDING);
            company = companyRepository.save(company);
            recruiter.setCompany(company);
            recruiterProfileRepository.save(recruiter);
        }

        if (updateData.getName() != null) company.setName(updateData.getName());
        if (updateData.getTaxCode() != null) company.setTaxCode(updateData.getTaxCode());
        if (updateData.getWebsite() != null) company.setWebsite(updateData.getWebsite());
        if (updateData.getSize() != null) company.setSize(updateData.getSize());
        if (updateData.getIndustry() != null) company.setIndustry(updateData.getIndustry());
        if (updateData.getDescription() != null) company.setDescription(updateData.getDescription());

        Company saved = companyRepository.save(company);
        return CompanyResponse.fromEntity(saved);
    }
}
