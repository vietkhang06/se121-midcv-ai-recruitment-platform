package com.platform.recruitment.suspension;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.company.Company;
import com.platform.recruitment.company.CompanyVerification;
import com.platform.recruitment.company.RecruiterProfile;
import com.platform.recruitment.company.RecruiterProfileRepository;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class SuspensionGuard {

    private final RecruiterProfileRepository recruiterProfileRepository;

    /**
     * Verifies that the user account is active and not suspended or deactivated.
     * Throws ACCOUNT_SUSPENDED or ACCESS_DENIED if not allowed.
     */
    public void checkUserActive(User user) {
        if (user == null) {
            throw new CustomException(ErrorCode.AUTHENTICATION_FAILED, "Yêu cầu xác thực tài khoản.");
        }

        if (user.isSuspended()) {
            log.warn("Blocked operation for suspended user: userId={}", user.getId());
            throw new CustomException(
                    ErrorCode.ACCOUNT_SUSPENDED,
                    "Tài khoản của bạn đã bị tạm đình chỉ. Bạn chỉ có thể cập nhật thông tin và gửi khiếu nại."
            );
        }

        if (user.isDeactivated()) {
            log.warn("Blocked operation for deactivated user: userId={}", user.getId());
            throw new CustomException(
                    ErrorCode.ACCESS_DENIED,
                    "Tài khoản của bạn đã bị vô hiệu hóa."
            );
        }
    }

    /**
     * Enforces that neither the recruiter user nor their associated company is suspended.
     * Must be called for all business mutation operations (Job, Application, Ranking, Matching).
     */
    public void checkRecruiterOperationAllowed(User user) {
        checkUserActive(user);

        if (user.getRole() == Role.HR) {
            Optional<RecruiterProfile> profileOpt = recruiterProfileRepository.findByUserId(user.getId());
            if (profileOpt.isPresent()) {
                Company company = profileOpt.get().getCompany();
                if (company != null && company.isSuspended()) {
                    log.warn("Blocked recruiter operation due to suspended company: userId={}, companyId={}",
                            user.getId(), company.getId());
                    throw new CustomException(
                            ErrorCode.COMPANY_SUSPENDED,
                            String.format("Doanh nghiệp '%s' đang bị tạm đình chỉ hoạt động. Tất cả tính năng tuyển dụng tạm thời bị khóa.",
                                    company.getName())
                    );
                }
            }
        }
    }

    /**
     * Checks if a candidate is allowed to perform applications or candidate mutations.
     */
    public void checkCandidateOperationAllowed(User user) {
        checkUserActive(user);
    }

    /**
     * Checks if a company is operational and not suspended.
     */
    public void checkCompanyOperationAllowed(Company company) {
        if (company != null && company.isSuspended()) {
            throw new CustomException(
                    ErrorCode.COMPANY_SUSPENDED,
                    String.format("Doanh nghiệp '%s' đang bị tạm đình chỉ hoạt động.", company.getName())
            );
        }
    }

    /**
     * Asserts that a recruiter can modify or manage a job, enforcing both suspension policy and ownership.
     */
    public void assertCanManageJob(User user, Job job) {
        checkRecruiterOperationAllowed(user);

        if (user.getRole() == Role.ADMIN) {
            return;
        }

        RecruiterProfile recruiter = recruiterProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy hồ sơ nhà tuyển dụng."));

        if (recruiter.getCompany() == null || !job.getCompany().getId().equals(recruiter.getCompany().getId())) {
            throw new UnauthorizedAccessException("Bạn không có quyền quản lý tin tuyển dụng này.");
        }
    }
}
