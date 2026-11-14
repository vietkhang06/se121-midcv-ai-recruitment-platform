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
@RequestMapping("/api/v1/recruiter/campaigns")
@RequiredArgsConstructor
public class CampaignController {
  private final JdbcTemplate db;
  private final CompanyService companies;

  public record Edit(
      @NotBlank @Size(max = 180) String name,
      @Size(max = 5000) String notes,
      @NotNull @Pattern(regexp = "ACTIVE|PAUSED|ARCHIVED") String status,
      @NotNull @Size(max = 200) List<UUID> jobIds) {}

  @GetMapping
  @Transactional(readOnly = true)
  public ApiResponse<List<Map<String, Object>>> list(@AuthenticationPrincipal User user) {
    UUID company = companies.getCompanyEntity(user).getId();
    var rows =
        db.queryForList(
            "SELECT c.*, (SELECT count(*) FROM recruitment_campaign_jobs cj WHERE"
                + " cj.campaign_id=c.id) AS job_count, (SELECT count(*) FROM"
                + " recruitment_campaign_jobs cj JOIN applications a ON a.job_id=cj.job_id WHERE"
                + " cj.campaign_id=c.id) AS application_count FROM recruitment_campaigns c WHERE"
                + " c.company_id=? ORDER BY c.created_at DESC",
            company);
    for (var row : rows)
      row.put(
          "job_ids",
          db.queryForList(
              "SELECT job_id FROM recruitment_campaign_jobs WHERE campaign_id=?",
              UUID.class,
              row.get("id")));
    return ApiResponse.success(rows);
  }

  @PostMapping
  @Transactional
  public ApiResponse<Map<String, Object>> create(
      @AuthenticationPrincipal User user, @Valid @RequestBody Edit request) {
    UUID company = companies.getCompanyEntity(user).getId(), id = UUID.randomUUID();
    db.update(
        "INSERT INTO recruitment_campaigns(id,company_id,name,notes,status) VALUES (?,?,?,?,?)",
        id,
        company,
        request.name().strip(),
        request.notes() == null ? "" : request.notes(),
        request.status());
    jobs(id, company, request.jobIds());
    return ApiResponse.success(Map.of("id", id));
  }

  @PutMapping("/{id}")
  @Transactional
  public ApiResponse<Map<String, Object>> update(
      @AuthenticationPrincipal User user, @PathVariable UUID id, @Valid @RequestBody Edit request) {
    UUID company = companies.getCompanyEntity(user).getId();
    if (db.update(
            "UPDATE recruitment_campaigns SET name=?,notes=?,status=?,updated_at=now() WHERE id=?"
                + " AND company_id=?",
            request.name().strip(),
            request.notes() == null ? "" : request.notes(),
            request.status(),
            id,
            company)
        != 1) throw new ResourceNotFoundException("Campaign", "id", id);
    jobs(id, company, request.jobIds());
    return ApiResponse.success(Map.of("id", id));
  }

  @DeleteMapping("/{id}")
  @Transactional
  public ApiResponse<Boolean> delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
    if (db.update(
            "DELETE FROM recruitment_campaigns WHERE id=? AND company_id=?",
            id,
            companies.getCompanyEntity(user).getId())
        != 1) throw new ResourceNotFoundException("Campaign", "id", id);
    return ApiResponse.success(true);
  }

  private void jobs(UUID campaign, UUID company, List<UUID> jobs) {
    db.update("DELETE FROM recruitment_campaign_jobs WHERE campaign_id=?", campaign);
    for (UUID job : new LinkedHashSet<>(jobs)) {
      if (!Boolean.TRUE.equals(
          db.queryForObject(
              "SELECT EXISTS(SELECT 1 FROM jobs WHERE id=? AND company_id=?)",
              Boolean.class,
              job,
              company)))
        throw new CustomException(
            ErrorCode.ACCESS_DENIED, "Tin tuyển dụng không thuộc doanh nghiệp.");
      db.update(
          "INSERT INTO recruitment_campaign_jobs(campaign_id,job_id) VALUES (?,?)", campaign, job);
    }
  }
}
