package com.platform.recruitment.product;

import com.platform.recruitment.application.Application;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.company.Company;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobStatus;
import java.math.BigDecimal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Single source of truth for whether an application may be scored and disclosed to HR. */
@Service
@RequiredArgsConstructor
public class AiScreeningAccessService {
  private final OccupationCatalog occupations;
  private RecruiterFeatureAccess featureAccess;

  @org.springframework.beans.factory.annotation.Autowired(required = false)
  public void setFeatureAccess(RecruiterFeatureAccess featureAccess) {
    this.featureAccess = featureAccess;
  }

  public record Access(
      boolean available,
      String code,
      String message,
      boolean proDetail,
      String recruiterPlan,
      boolean itPriority) {}

  public Access evaluate(Application application) {
    if (application == null) return unavailable("APPLICATION_MISSING", "Không tìm thấy hồ sơ ứng tuyển.", false, null);
    return evaluate(application.getJob(), Boolean.TRUE.equals(application.getAiAnalysisConsent()));
  }

  public Access evaluate(Job job, boolean candidateConsent) {
    Company company = job == null ? null : job.getCompany();
    boolean pro = hasActivePro(company);
    String plan = pro ? "PRO" : "STANDARD";
    if (!candidateConsent) {
      return new Access(false, "CONSENT_NOT_GIVEN",
          "Ứng viên chưa cho phép midCV dùng AI để phân tích hồ sơ.", pro, plan, false);
    }
    if (job == null) return unavailable("JOB_MISSING", "Không tìm thấy tin tuyển dụng.", pro, company);

    // Null means a pre-V36 job. It is grandfathered so existing applications and
    // evaluation fixtures do not silently lose a capability they already had.
    if (job.getAiScreeningPolicyVersion() == null) {
      if (job.getStatus() != null && job.getStatus() != JobStatus.PUBLISHED) {
        return unavailable("JOB_NOT_ACTIVE", "Tin tuyển dụng không còn hoạt động.", pro, company);
      }
      return new Access(true, "AVAILABLE", "Đủ điều kiện chấm điểm AI.", pro, plan,
          isIt(job));
    }

    if (job.getStatus() != JobStatus.PUBLISHED
        || job.getAiScreeningPackageCode() == null
        || job.getAiScreeningPackageCode().isBlank()) {
      return unavailable("PACKAGE_NOT_ELIGIBLE",
          "Tin tuyển dụng chưa có gói đăng tin hỗ trợ chấm điểm AI.", pro, company);
    }
    // The semantic JD-CV pipeline is industry-agnostic. Occupation codes only
    // control prioritisation (IT first), never whether a consenting candidate is
    // scored. This prevents valid non-IT applications from being stranded in a
    // misleading "unsupported specialisation" bucket.
    return new Access(true, "AVAILABLE", "Đủ điều kiện chấm điểm AI.", pro, plan,
        occupations.hasItPriority(job.getOccupationCodes()));
  }

  public void requireScoring(Application application) {
    Access access = evaluate(application);
    if (!access.available()) {
      throw new CustomException(ErrorCode.ACCESS_DENIED, "Chưa khả dụng: " + access.message());
    }
  }

  public boolean hasActivePro(Company company) {
    return featureAccess != null ? featureAccess.hasProFeatures(company)
        : company != null && company.hasActiveRecruiterPro();
  }

  public String classify(BigDecimal score) {
    return classifyScore(score);
  }

  public static String classifyScore(BigDecimal score) {
    if (score == null) return "CHUA_KHA_DUNG";
    if (score.compareTo(BigDecimal.valueOf(70)) >= 0) return "PHU_HOP";
    if (score.compareTo(BigDecimal.valueOf(50)) >= 0) return "CAN_NHAC";
    return "KHONG_PHU_HOP";
  }

  private boolean isIt(Job job) {
    if (occupations.hasItPriority(job.getOccupationCodes())) return true;
    String industry = job.getIndustry();
    return industry != null && (industry.equalsIgnoreCase("Technology")
        || industry.equalsIgnoreCase("IT") || industry.equalsIgnoreCase("TECHNOLOGY"));
  }

  private Access unavailable(String code, String message, boolean pro, Company company) {
    return new Access(false, code, message, pro, pro ? "PRO" : "STANDARD", false);
  }
}
