package com.platform.recruitment.product;

import com.platform.recruitment.admin.service.AdminAuditLogService;
import com.platform.recruitment.common.*;
import com.platform.recruitment.company.*;
import com.platform.recruitment.company.dto.CompanyResponse;
import com.platform.recruitment.user.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.ZonedDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ProductController {
  private final com.platform.recruitment.ai.AiWorkerClient ai;
  private final CompanyService companies;
  private final CompanyRepository repository;
  private final JdbcTemplate db;
  private final AdminAuditLogService audit;

  public record DraftJob(
      @NotBlank @Size(max = 250) String title,
      @NotBlank @Size(max = 100) String industry,
      @Size(max = 12000) String notes,
      @Size(max = 100) List<@Size(max = 120) String> skills) {}

  @PostMapping("/recruiter/jobs/draft-suggestion")
  public ApiResponse<Map<String, Object>> draft(
      @AuthenticationPrincipal User user, @Valid @RequestBody DraftJob request) {
    companies.getMyCompany(user);
    return ApiResponse.success(
        ai.draftJd(
            Map.of(
                "title",
                request.title(),
                "industry",
                request.industry(),
                "notes",
                request.notes() == null ? "" : request.notes(),
                "skills",
                request.skills() == null ? List.of() : request.skills())));
  }

  @PostMapping("/recruiter/company/business-license")
  @Transactional
  public ApiResponse<CompanyResponse> license(
      @AuthenticationPrincipal User user, @RequestParam("file") MultipartFile file)
      throws java.io.IOException {
    Company company = companies.getCompanyEntity(user);
    if (company.getVerificationStatus() == CompanyVerification.UNDER_REVIEW
        || company.getVerificationStatus() == CompanyVerification.VERIFIED)
      throw invalid(
          "Hồ sơ đang được duyệt hoặc đã xác minh. Liên hệ quản trị viên để cập nhật giấy phép.");
    byte[] data = file.getBytes();
    if (data.length == 0 || data.length > 5 * 1024 * 1024) throw invalid("Giấy phép tối đa 5 MB.");
    String mime;
    if (data.length > 5
        && data[0] == '%'
        && data[1] == 'P'
        && data[2] == 'D'
        && data[3] == 'F'
        && data[4] == '-') mime = "application/pdf";
    else if (data.length > 8
        && data[0] == (byte) 0x89
        && data[1] == 'P'
        && data[2] == 'N'
        && data[3] == 'G') mime = "image/png";
    else if (data.length > 3
        && data[0] == (byte) 0xff
        && data[1] == (byte) 0xd8
        && data[2] == (byte) 0xff) mime = "image/jpeg";
    else throw invalid("Giấy phép cần là PDF, PNG hoặc JPEG hợp lệ.");
    String name =
        Optional.ofNullable(file.getOriginalFilename())
            .orElse("business-license")
            .replaceAll("[\\\\/\\r\\n\\x00]", "_");
    company.setBusinessLicense(data);
    company.setBusinessLicenseName(name.substring(0, Math.min(name.length(), 250)));
    company.setBusinessLicenseType(mime);
    company.setLicenseSubmittedAt(ZonedDateTime.now());
    repository.save(company);
    audit.log(
        user,
        "UPLOAD_BUSINESS_LICENSE",
        "COMPANY",
        company.getId(),
        null,
        null,
        "Tải giấy phép thẩm định",
        null,
        null);
    return ApiResponse.success(CompanyResponse.fromEntity(company));
  }

  @GetMapping("/admin/companies/{id}/business-license")
  @Transactional(readOnly = true)
  public ResponseEntity<byte[]> license(@PathVariable UUID id) {
    Company c =
        repository
            .findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Company", "id", id));
    if (c.getBusinessLicense() == null)
      throw new ResourceNotFoundException("Chưa có giấy phép kinh doanh");
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(c.getBusinessLicenseType()))
        .header("X-Content-Type-Options", "nosniff")
        .header("Cache-Control", "no-store")
        .header(
            "Content-Disposition",
            ContentDisposition.attachment()
                .filename(c.getBusinessLicenseName(), java.nio.charset.StandardCharsets.UTF_8)
                .build()
                .toString())
        .body(c.getBusinessLicense());
  }

  public record Trust(@Min(2) @Max(3) int level, @NotBlank @Size(max = 2000) String reason) {}

  @PutMapping("/admin/companies/{id}/trust-level")
  @Transactional
  public ApiResponse<CompanyResponse> trust(
      @AuthenticationPrincipal User admin,
      @PathVariable UUID id,
      @Valid @RequestBody Trust request) {
    Company c =
        repository
            .findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Company", "id", id));
    if (c.getVerificationStatus() != CompanyVerification.VERIFIED || !c.isOperational())
      throw invalid("Chỉ cấp uy tín cho doanh nghiệp đã xác minh và đang hoạt động.");
    int previous = c.getTrustLevel();
    c.setTrustLevel(request.level());
    repository.save(c);
    audit.log(
        admin,
        "SET_COMPANY_TRUST_LEVEL",
        "COMPANY",
        id,
        String.valueOf(previous),
        String.valueOf(request.level()),
        request.reason(),
        null,
        null);
    return ApiResponse.success(CompanyResponse.fromEntity(c));
  }

  @GetMapping("/recruiter/product/entitlements")
  @Transactional(readOnly = true)
  public ApiResponse<Map<String, Object>> entitlements(@AuthenticationPrincipal User user) {
    Company c = companies.getCompanyEntity(user);
    int level = c.getVerificationStatus() == CompanyVerification.VERIFIED ? c.getTrustLevel() : 1;
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("level", level);
    result.put("jobLimit", level == 3 ? -1 : level == 2 ? 5 : 0);
    result.put("cvViewLimit", level == 3 ? -1 : level == 2
        ? 100 + db.queryForObject("SELECT extra_cv_views FROM companies WHERE id=?",
            Integer.class, c.getId()) : 0);
    result.put("publishedJobs", db.queryForObject(
        "SELECT count(*) FROM jobs WHERE company_id=? AND status='PUBLISHED'",
        Long.class, c.getId()));
    result.put("cvViews", db.queryForObject(
        "SELECT count(*) FROM company_cv_views WHERE company_id=?", Long.class, c.getId()));
    boolean pro = c.hasActiveRecruiterPro();
    result.put("recruiterPlan", pro ? "PRO" : "STANDARD");
    result.put("proUntil", pro ? c.getRecruiterProUntil() : null);
    result.put("proFeatures", pro
        ? List.of("AI_SCORE_DETAILS", "AI_EVIDENCE", "ADVANCED_CANDIDATE_FILTERS")
        : List.of("AI_MATCH_CLASSIFICATION"));
    return ApiResponse.success(result);
  }

  private static CustomException invalid(String m) {
    return new CustomException(ErrorCode.VALIDATION_ERROR, m);
  }
}
