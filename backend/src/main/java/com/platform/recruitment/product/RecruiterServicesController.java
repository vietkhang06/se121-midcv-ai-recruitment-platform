package com.platform.recruitment.product;

import com.platform.recruitment.common.*;
import com.platform.recruitment.company.CompanyService;
import com.platform.recruitment.user.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class RecruiterServicesController {
  private final JdbcTemplate db;
  private final CompanyService companies;

  public record Purchase(
      @NotNull UUID requestId, @NotBlank String packageCode, @NotNull UUID jobId) {}

  public record Credit(
      @NotNull UUID requestId,
      @Min(1) @Max(1000000) int amount,
      @NotBlank @Size(max = 2000) String reason) {}

  @GetMapping("/recruiter/services")
  @Transactional(readOnly = true)
  public ApiResponse<Map<String, Object>> catalog(@AuthenticationPrincipal User user) {
    UUID company = companies.getCompanyEntity(user).getId();
    Integer balance =
        db.query(
            "SELECT credits FROM recruiter_wallets WHERE company_id=?",
            rs -> rs.next() ? rs.getInt(1) : 0,
            company);
    return ApiResponse.success(
        Map.of(
            "credits",
            balance,
            "packages",
            db.queryForList(
                "SELECT * FROM recruiter_service_packages WHERE active=true ORDER BY credit_cost"),
            "transactions",
            db.queryForList(
                "SELECT * FROM recruiter_credit_transactions WHERE company_id=? ORDER BY created_at"
                    + " DESC LIMIT 100",
                company)));
  }

  @PostMapping("/recruiter/services/purchase")
  @Transactional
  public ApiResponse<Map<String, Object>> buy(
      @AuthenticationPrincipal User user, @Valid @RequestBody Purchase request) {
    var company = companies.getCompanyEntity(user);
    UUID id = company.getId();
    if (company.getVerificationStatus()
            != com.platform.recruitment.company.CompanyVerification.VERIFIED
        || !company.isOperational()) throw error("Xác minh doanh nghiệp trước khi mua dịch vụ.");
    int balance = wallet(id);
    var previous =
        db.queryForList(
            "SELECT * FROM recruiter_credit_transactions WHERE id=?", request.requestId());
    if (!previous.isEmpty()) {
      var row = previous.getFirst();
      if (!id.equals(row.get("company_id"))
          || !request.packageCode().equals(row.get("package_code"))
          || !request.jobId().equals(row.get("job_id")))
        throw error("Mã giao dịch đã được sử dụng cho nội dung khác.");
      return ApiResponse.success(row);
    }
    var packages =
        db.queryForList(
            "SELECT * FROM recruiter_service_packages WHERE code=? AND active=true",
            request.packageCode());
    if (packages.isEmpty()) throw error("Gói dịch vụ không khả dụng.");
    var pack = packages.getFirst();
    int cost = ((Number) pack.get("credit_cost")).intValue();
    if (balance < cost)
      throw error(
          "Không đủ credit. Liên hệ quản trị viên để đối soát và cấp credit; hệ thống chưa tích hợp"
              + " thanh toán ngân hàng.");
    if (!Boolean.TRUE.equals(
        db.queryForObject(
            "SELECT EXISTS(SELECT 1 FROM jobs WHERE id=? AND company_id=? AND status='PUBLISHED')",
            Boolean.class,
            request.jobId(),
            id))) throw error("Chọn tin đang đăng thuộc doanh nghiệp.");
    int after = balance - cost;
    db.update("UPDATE recruiter_wallets SET credits=? WHERE company_id=?", after, id);
    db.update(
        "UPDATE companies SET extra_cv_views=extra_cv_views+? WHERE id=?",
        pack.get("cv_views"),
        id);
    db.update(
        "UPDATE jobs SET promoted_until=greatest(coalesce(promoted_until,now()),now()) + (? *"
            + " interval '1 day'), ai_screening_package_code=? WHERE id=?",
        pack.get("boost_days"),
        request.packageCode(),
        request.jobId());
    java.time.ZonedDateTime serviceUntil = db.queryForObject(
        "SELECT promoted_until FROM jobs WHERE id=?", java.time.ZonedDateTime.class,
        request.jobId());
    if (Boolean.TRUE.equals(pack.get("pro_access"))) {
      db.update(
          "UPDATE companies SET recruiter_plan='PRO', recruiter_pro_until="
              + "greatest(coalesce(recruiter_pro_until,now()),?) WHERE id=?",
          serviceUntil,
          id);
    }
    db.update(
        "INSERT INTO"
            + " recruiter_credit_transactions(id,company_id,actor_id,delta,balance_after,package_code,job_id,reason)"
            + " VALUES (?,?,?,?,?,?,?,?)",
        request.requestId(),
        id,
        user.getId(),
        -cost,
        after,
        request.packageCode(),
        request.jobId(),
        "Mua gói " + pack.get("name"));
    return ApiResponse.success(Map.of("id", request.requestId(), "credits", after));
  }

  @PostMapping("/admin/companies/{id}/credits")
  @Transactional
  public ApiResponse<Map<String, Object>> credit(
      @AuthenticationPrincipal User admin,
      @PathVariable UUID id,
      @Valid @RequestBody Credit request) {
    int balance = wallet(id);
    var prior =
        db.queryForList(
            "SELECT * FROM recruiter_credit_transactions WHERE id=?", request.requestId());
    if (!prior.isEmpty()) {
      var row = prior.getFirst();
      if (!id.equals(row.get("company_id"))
          || ((Number) row.get("delta")).intValue() != request.amount())
        throw error("Mã giao dịch đã dùng.");
      return ApiResponse.success(row);
    }
    int after = Math.addExact(balance, request.amount());
    db.update("UPDATE recruiter_wallets SET credits=? WHERE company_id=?", after, id);
    db.update(
        "INSERT INTO"
            + " recruiter_credit_transactions(id,company_id,actor_id,delta,balance_after,reason)"
            + " VALUES (?,?,?,?,?,?)",
        request.requestId(),
        id,
        admin.getId(),
        request.amount(),
        after,
        request.reason());
    return ApiResponse.success(Map.of("credits", after));
  }

  private int wallet(UUID id) {
    db.update("INSERT INTO recruiter_wallets(company_id) VALUES (?) ON CONFLICT DO NOTHING", id);
    return db.queryForObject(
        "SELECT credits FROM recruiter_wallets WHERE company_id=? FOR UPDATE", Integer.class, id);
  }

  private static CustomException error(String message) {
    return new CustomException(ErrorCode.VALIDATION_ERROR, message);
  }
}
