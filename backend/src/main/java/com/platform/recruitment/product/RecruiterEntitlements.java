package com.platform.recruitment.product;

import com.platform.recruitment.common.*;
import com.platform.recruitment.company.*;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.user.User;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Quotas are company-wide; a parent row lock serializes concurrent publish/view requests. */
@Service
@RequiredArgsConstructor
public class RecruiterEntitlements {
  private final JdbcTemplate db;
  private final com.platform.recruitment.user.UserRepository users;

  @Transactional
  public void publish(User user, Job job) {
    if (!Boolean.TRUE.equals(user.getEmailVerified()))
      throw denied("Xác thực email trước khi đăng tin.");
    var c = lock(job.getCompany().getId());
    if (!"VERIFIED".equals(c.get("verification_status"))
        || !"ACTIVE".equals(c.get("operational_status")))
      throw denied("Doanh nghiệp cần được xác minh và đang hoạt động.");
    int level = ((Number) c.get("trust_level")).intValue();
    Long count =
        db.queryForObject(
            "SELECT count(*) FROM jobs WHERE company_id=? AND status='PUBLISHED' AND id<>?",
            Long.class,
            job.getCompany().getId(),
            job.getId());
    if (level < 3 && count != null && count >= 5)
      throw denied(
          "Cấp độ 2 được đăng tối đa 5 tin đang hoạt động. Đóng bớt tin hoặc đề nghị thẩm định cấp"
              + " độ 3.");
    if (job.getApplicationDeadline() != null
        && job.getApplicationDeadline()
            .isBefore(java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"))))
      throw denied("Hạn nộp hồ sơ đã qua.");
  }

  @Transactional
  public void view(User user, UUID application) {
    if (user.getRole() == com.platform.recruitment.user.Role.ADMIN) return;
    var rows =
        db.queryForList(
            "SELECT c.id FROM companies c JOIN recruiter_profiles r ON r.company_id=c.id JOIN jobs"
                + " j ON j.company_id=c.id JOIN applications a ON a.job_id=j.id WHERE r.user_id=?"
                + " AND a.id=?",
            user.getId(),
            application);
    if (rows.isEmpty()) throw denied("Bạn không có quyền xem hồ sơ này.");
    UUID company = (UUID) rows.getFirst().get("id");
    var c = lock(company);
    if (!Boolean.TRUE.equals(user.getEmailVerified())
        || !"VERIFIED".equals(c.get("verification_status"))
        || !"ACTIVE".equals(c.get("operational_status")))
      throw denied("Cần doanh nghiệp đã xác minh để xem nội dung CV.");
    Boolean seen =
        db.queryForObject(
            "SELECT EXISTS(SELECT 1 FROM company_cv_views WHERE company_id=? AND application_id=?)",
            Boolean.class,
            company,
            application);
    if (Boolean.TRUE.equals(seen)) return;
    Long count =
        db.queryForObject(
            "SELECT count(*) FROM company_cv_views WHERE company_id=?", Long.class, company);
    if (((Number) c.get("trust_level")).intValue() < 3
        && count != null
        && count >= 100 + ((Number) c.get("extra_cv_views")).intValue())
      throw denied(
          "Đã dùng 100 lượt xem CV khác nhau của cấp độ 2. Hồ sơ đã mở vẫn có thể xem lại.");
    db.update(
        "INSERT INTO company_cv_views(company_id,application_id) VALUES (?,?) ON CONFLICT DO"
            + " NOTHING",
        company,
        application);
  }

  @Transactional
  public void viewCv(User user, UUID cv) {
    if (user.getRole() != com.platform.recruitment.user.Role.HR) return;
    var rows =
        db.queryForList(
            "SELECT a.id FROM applications a JOIN jobs j ON j.id=a.job_id JOIN recruiter_profiles r"
                + " ON r.company_id=j.company_id WHERE a.applied_cv_id=? AND r.user_id=? ORDER BY"
                + " a.applied_at LIMIT 1",
            UUID.class,
            cv,
            user.getId());
    if (rows.isEmpty()) throw denied("Không có hồ sơ ứng tuyển thuộc doanh nghiệp.");
    view(user, rows.getFirst());
  }

  @Transactional
  public void viewDocument(UUID userId, UUID version) {
    User user = users.findById(userId).orElseThrow(() -> denied("Không tìm thấy tài khoản."));
    var rows =
        db.queryForList(
            "SELECT a.id FROM applications a JOIN jobs j ON j.id=a.job_id JOIN recruiter_profiles r"
                + " ON r.company_id=j.company_id WHERE a.applied_cv_version_id=? AND r.user_id=?"
                + " ORDER BY a.applied_at LIMIT 1",
            UUID.class,
            version,
            userId);
    if (!rows.isEmpty()) view(user, rows.getFirst());
  }

  private Map<String, Object> lock(UUID company) {
    var rows =
        db.queryForList(
            "SELECT verification_status,operational_status,trust_level,extra_cv_views FROM"
                + " companies WHERE id=? FOR UPDATE",
            company);
    if (rows.isEmpty()) throw denied("Không tìm thấy doanh nghiệp.");
    return rows.getFirst();
  }

  private static CustomException denied(String message) {
    return new CustomException(ErrorCode.ACCESS_DENIED, message);
  }
}
