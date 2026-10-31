package com.platform.recruitment.job;

import com.platform.recruitment.common.CompanyNotVerifiedException;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.company.Company;
import com.platform.recruitment.company.CompanyVerification;
import com.platform.recruitment.company.RecruiterProfile;
import com.platform.recruitment.company.RecruiterProfileRepository;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class JobService {

    private com.platform.recruitment.communication.InboxService inbox;
    @Autowired public void setInbox(com.platform.recruitment.communication.InboxService inbox) { this.inbox=inbox; }
    private final JobRepository jobRepository;
    private final RecruiterProfileRepository recruiterProfileRepository;
    private final com.platform.recruitment.suspension.SuspensionGuard suspensionGuard;

    @Autowired
    public JobService(JobRepository jobRepository,
                      RecruiterProfileRepository recruiterProfileRepository,
                      @org.springframework.lang.Nullable com.platform.recruitment.suspension.SuspensionGuard suspensionGuard) {
        this.jobRepository = jobRepository;
        this.recruiterProfileRepository = recruiterProfileRepository;
        this.suspensionGuard = suspensionGuard;
    }

    public JobService(JobRepository jobRepository, RecruiterProfileRepository recruiterProfileRepository) {
        this(jobRepository, recruiterProfileRepository, null);
    }

    @Transactional
    public JobResponse createDraftJob(User recruiterUser, CreateJobRequest request) {
        if (suspensionGuard != null) {
            suspensionGuard.checkRecruiterOperationAllowed(recruiterUser);
        }
        RecruiterProfile recruiter = recruiterProfileRepository.findByUserId(recruiterUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("RecruiterProfile", "userId", recruiterUser.getId()));

        Company company = recruiter.getCompany();
        if (company == null) {
            throw new ResourceNotFoundException("Company not linked to recruiter profile");
        }

        Job job = Job.builder()
                .company(company)
                .title(request.getTitle())
                .industry(request.getIndustry())
                .industryOther(trimToNull(request.getIndustryOther()))
                .seniority(request.getSeniority())
                .seniorityOther(trimToNull(request.getSeniorityOther()))
                .status(JobStatus.DRAFT)
                .minSalary(Boolean.TRUE.equals(request.getSalaryNegotiable()) ? null : request.getMinSalary())
                .maxSalary(Boolean.TRUE.equals(request.getSalaryNegotiable()) ? null : request.getMaxSalary())
                .salaryNegotiable(Boolean.TRUE.equals(request.getSalaryNegotiable()))
                .salaryCurrency(request.getSalaryCurrency() == null ? "VND" : request.getSalaryCurrency())
                .location(request.getLocation())
                .employmentType(request.getEmploymentType())
                .employmentTypeOther(trimToNull(request.getEmploymentTypeOther()))
                .description(request.getDescription())
                .responsibilities(request.getResponsibilities() == null ? List.of() : List.copyOf(request.getResponsibilities()))
                .build();

        if (request.getRequirements() != null) {
            List<JobRequirement> requirements = new ArrayList<>();
            for (CreateJobRequest.RequirementItem item : request.getRequirements()) {
                JobRequirement req = JobRequirement.builder()
                        .job(job)
                        .skillName(item.getSkillName())
                        .requirementType(item.getType() != null ? item.getType() : RequirementType.REQUIRED)
                        .minYearsExp(item.getMinYearsExp() != null ? item.getMinYearsExp() : 0)
                        .build();
                requirements.add(req);
            }
            job.setRequirements(requirements);
        }

        Job savedJob = jobRepository.save(job);
        return mapToResponse(savedJob);
    }

    @Transactional
    public JobResponse publishJob(User recruiterUser, UUID jobId) {
        if (suspensionGuard != null) {
            suspensionGuard.checkRecruiterOperationAllowed(recruiterUser);
        }

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        // Recruiter profile existence check
        recruiterProfileRepository.findByUserId(recruiterUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("RecruiterProfile", "userId", recruiterUser.getId()));

        // Company Verification and Operational Business Rule
        Company company = job.getCompany();
        if (company != null && (company.getVerificationStatus() != CompanyVerification.VERIFIED ||
                company.getOperationalStatus() != com.platform.recruitment.company.CompanyOperationalStatus.ACTIVE)) {
            throw new CompanyNotVerifiedException(
                    String.format("Company '%s' has verification status '%s' and operational status '%s'. Only VERIFIED and ACTIVE companies can publish jobs.",
                            company.getName(), company.getVerificationStatus(), company.getOperationalStatus()));
        }

        if (recruiterUser.getRole() != com.platform.recruitment.user.Role.ADMIN) {
            RecruiterProfile owner = recruiterProfileRepository.findByUserId(recruiterUser.getId())
                    .orElseThrow(() -> new UnauthorizedAccessException("Không có hồ sơ nhà tuyển dụng"));
            if (owner.getCompany() == null || job.getCompany() == null
                    || !owner.getCompany().getId().equals(job.getCompany().getId())) {
                throw new UnauthorizedAccessException("Tin tuyển dụng thuộc doanh nghiệp khác");
            }
        }
        if (suspensionGuard != null) {
            suspensionGuard.assertCanManageJob(recruiterUser, job);
        }

        if (job.getStatus() == JobStatus.SUSPENDED) {
            throw new com.platform.recruitment.common.CustomException(
                    com.platform.recruitment.common.ErrorCode.INVALID_STATE_TRANSITION,
                    "Tin đang bị đình chỉ; chỉ quản trị viên có thể khôi phục sau kiểm duyệt.");
        }
        boolean newlyPublished=job.getStatus()!=JobStatus.PUBLISHED;
        job.setStatus(JobStatus.PUBLISHED);
        Job publishedJob = jobRepository.save(job);
        if(inbox!=null && newlyPublished) inbox.publishedJob(publishedJob);
        return mapToResponse(publishedJob);
    }

    @Transactional
    public JobResponse closeJob(User recruiterUser, UUID jobId) {
        if (suspensionGuard != null) {
            suspensionGuard.checkRecruiterOperationAllowed(recruiterUser);
        }

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        if (recruiterUser.getRole() != com.platform.recruitment.user.Role.ADMIN) {
            RecruiterProfile owner = recruiterProfileRepository.findByUserId(recruiterUser.getId())
                    .orElseThrow(() -> new UnauthorizedAccessException("Không có hồ sơ nhà tuyển dụng"));
            if (owner.getCompany() == null || job.getCompany() == null
                    || !owner.getCompany().getId().equals(job.getCompany().getId())) {
                throw new UnauthorizedAccessException("Tin tuyển dụng thuộc doanh nghiệp khác");
            }
        }
        if (suspensionGuard != null) {
            suspensionGuard.assertCanManageJob(recruiterUser, job);
        }

        if (job.getStatus() != JobStatus.PUBLISHED && job.getStatus() != JobStatus.CLOSED) {
            throw new com.platform.recruitment.common.CustomException(
                    com.platform.recruitment.common.ErrorCode.INVALID_STATE_TRANSITION,
                    "Chỉ đóng tin đã đăng; không thể thay đổi trạng thái kiểm duyệt.");
        }
        job.setStatus(JobStatus.CLOSED);
        Job closedJob = jobRepository.save(job);
        return mapToResponse(closedJob);
    }

    @Transactional
    public JobResponse updateJob(User recruiterUser, UUID jobId, CreateJobRequest request) {
        if (suspensionGuard != null) {
            suspensionGuard.checkRecruiterOperationAllowed(recruiterUser);
        }

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        if (recruiterUser.getRole() != com.platform.recruitment.user.Role.ADMIN) {
            RecruiterProfile owner = recruiterProfileRepository.findByUserId(recruiterUser.getId())
                    .orElseThrow(() -> new UnauthorizedAccessException("Không có hồ sơ nhà tuyển dụng"));
            if (owner.getCompany() == null || job.getCompany() == null
                    || !owner.getCompany().getId().equals(job.getCompany().getId())) {
                throw new UnauthorizedAccessException("Tin tuyển dụng thuộc doanh nghiệp khác");
            }
        }
        if (suspensionGuard != null) {
            suspensionGuard.assertCanManageJob(recruiterUser, job);
        }

        job.setTitle(request.getTitle());
        job.setIndustry(request.getIndustry());
        job.setIndustryOther(trimToNull(request.getIndustryOther()));
        job.setSeniority(request.getSeniority());
        job.setSeniorityOther(trimToNull(request.getSeniorityOther()));
        job.setMinSalary(Boolean.TRUE.equals(request.getSalaryNegotiable()) ? null : request.getMinSalary());
        job.setMaxSalary(Boolean.TRUE.equals(request.getSalaryNegotiable()) ? null : request.getMaxSalary());
        job.setSalaryNegotiable(Boolean.TRUE.equals(request.getSalaryNegotiable()));
        job.setSalaryCurrency(request.getSalaryCurrency() == null ? "VND" : request.getSalaryCurrency());
        job.setLocation(request.getLocation());
        job.setEmploymentType(request.getEmploymentType());
        job.setEmploymentTypeOther(trimToNull(request.getEmploymentTypeOther()));
        job.setDescription(request.getDescription());
        job.setResponsibilities(request.getResponsibilities() == null ? List.of() : List.copyOf(request.getResponsibilities()));

        if (request.getRequirements() != null) {
            job.getRequirements().clear();
            for (CreateJobRequest.RequirementItem item : request.getRequirements()) {
                JobRequirement req = JobRequirement.builder()
                        .job(job)
                        .skillName(item.getSkillName())
                        .requirementType(item.getType() != null ? item.getType() : RequirementType.REQUIRED)
                        .minYearsExp(item.getMinYearsExp() != null ? item.getMinYearsExp() : 0)
                        .build();
                job.getRequirements().add(req);
            }
        }

        Job updatedJob = jobRepository.save(job);
        return mapToResponse(updatedJob);
    }

    @Transactional(readOnly = true)
    public JobResponse getJobById(UUID jobId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));
        if (job.getStatus() != JobStatus.PUBLISHED && job.getStatus() != JobStatus.CLOSED) {
            throw new ResourceNotFoundException("Job", "id", jobId);
        }
        if (job.getCompany() == null || job.getCompany().isSuspended()
                || job.getCompany().getOperationalStatus() != com.platform.recruitment.company.CompanyOperationalStatus.ACTIVE) {
            // Jobs of inactive companies should not be publicly accessible
            throw new com.platform.recruitment.common.CustomException(
                    com.platform.recruitment.common.ErrorCode.COMPANY_SUSPENDED,
                    "Công việc thuộc doanh nghiệp đang bị tạm đình chỉ hoạt động");
        }
        return mapToResponse(job);
    }

    @Transactional(readOnly = true)
    public JobResponse getRecruiterJob(User recruiterUser, UUID jobId) {
        RecruiterProfile recruiter = recruiterProfileRepository.findByUserId(recruiterUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("RecruiterProfile", "userId", recruiterUser.getId()));
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));
        if (recruiter.getCompany() == null || job.getCompany() == null
                || !job.getCompany().getId().equals(recruiter.getCompany().getId())) {
            throw new com.platform.recruitment.common.UnauthorizedAccessException(
                    "Recruiter does not own this job posting");
        }
        return mapToResponse(job);
    }

    public static final java.util.Set<String> ALLOWED_JOB_SORT_FIELDS = java.util.Set.of(
            "createdAt", "title", "minSalary", "maxSalary", "industry", "seniority", "status"
    );

    @Transactional(readOnly = true)
    public List<JobResponse> getPublishedJobs(String industry) {
        return getPublishedJobs(industry, 0, 100, "createdAt", "desc").getContent();
    }

    @Transactional(readOnly = true)
    public com.platform.recruitment.common.PageResponse<JobResponse> getPublishedJobs(
            String industry, int page, int size, String sort, String direction) {
        org.springframework.data.domain.Pageable pageable =
                com.platform.recruitment.common.PaginationUtils.createPageable(
                        page, size, sort, direction, ALLOWED_JOB_SORT_FIELDS, "createdAt");

        org.springframework.data.domain.Page<Job> jobs;
        if (industry != null && !industry.isBlank()) {
            jobs = jobRepository.findByStatusAndIndustryAndCompanyOperationalStatus(
                    JobStatus.PUBLISHED, industry, com.platform.recruitment.company.CompanyOperationalStatus.ACTIVE, pageable);
        } else {
            jobs = jobRepository.findByStatusAndCompanyOperationalStatus(
                    JobStatus.PUBLISHED, com.platform.recruitment.company.CompanyOperationalStatus.ACTIVE, pageable);
        }

        List<JobResponse> content = jobs.getContent().stream().map(this::mapToResponse).toList();
        String sortField = (sort == null || sort.isBlank()) ? "createdAt" : sort;
        String sortDir = (direction == null || direction.isBlank()) ? "desc" : direction.toLowerCase();
        return com.platform.recruitment.common.PageResponse.of(jobs, content, sortField, sortDir);
    }

    @Transactional(readOnly = true)
    public List<JobResponse> getRecruiterJobs(User recruiterUser) {
        return getRecruiterJobs(recruiterUser, 0, 100, "createdAt", "desc").getContent();
    }

    @Transactional(readOnly = true)
    public com.platform.recruitment.common.PageResponse<JobResponse> getRecruiterJobs(
            User recruiterUser, int page, int size, String sort, String direction) {
        org.springframework.data.domain.Pageable pageable =
                com.platform.recruitment.common.PaginationUtils.createPageable(
                        page, size, sort, direction, ALLOWED_JOB_SORT_FIELDS, "createdAt");

        RecruiterProfile recruiter = recruiterProfileRepository.findByUserId(recruiterUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("RecruiterProfile", "userId", recruiterUser.getId()));

        String sortField = (sort == null || sort.isBlank()) ? "createdAt" : sort;
        String sortDir = (direction == null || direction.isBlank()) ? "desc" : direction.toLowerCase();

        if (recruiter.getCompany() == null) {
            return com.platform.recruitment.common.PageResponse.of(
                    org.springframework.data.domain.Page.empty(pageable), List.of(), sortField, sortDir);
        }

        org.springframework.data.domain.Page<Job> jobs =
                jobRepository.findByCompanyId(recruiter.getCompany().getId(), pageable);
        List<JobResponse> content = jobs.getContent().stream().map(this::mapToResponse).toList();
        return com.platform.recruitment.common.PageResponse.of(jobs, content, sortField, sortDir);
    }

    @Transactional
    public void deleteDraftJob(User recruiterUser, UUID jobId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));
        // Always enforce tenant ownership even when instantiated without a suspension guard.
        getRecruiterJob(recruiterUser, jobId);
        if (suspensionGuard != null) suspensionGuard.assertCanManageJob(recruiterUser, job);
        if (job.getStatus() != JobStatus.DRAFT) {
            throw new com.platform.recruitment.common.CustomException(
                    com.platform.recruitment.common.ErrorCode.INVALID_STATE_TRANSITION,
                    "Chỉ xóa tin nháp; hãy đóng tin đã đăng để giữ lịch sử ứng tuyển.");
        }
        jobRepository.delete(job);
    }

    @Transactional(readOnly = true)
    public com.platform.recruitment.common.PageResponse<JobResponse> searchPublishedJobs(
            String industry, String query, String location, int page, int size, String sort, String direction) {
        if ((query != null && query.length() > 200) || (location != null && location.length() > 120)) {
            throw new com.platform.recruitment.common.CustomException(
                    com.platform.recruitment.common.ErrorCode.VALIDATION_ERROR, "Từ khóa tìm kiếm quá dài.");
        }
        var pageable = com.platform.recruitment.common.PaginationUtils.createPageable(
                page, size, sort, direction, ALLOWED_JOB_SORT_FIELDS, "createdAt");
        org.springframework.data.jpa.domain.Specification<Job> spec = (job, cq, cb) -> {
            var clauses = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
            clauses.add(cb.equal(job.get("status"), JobStatus.PUBLISHED));
            clauses.add(cb.equal(job.get("company").get("operationalStatus"),
                    com.platform.recruitment.company.CompanyOperationalStatus.ACTIVE));
            if (industry != null && !industry.isBlank())
                clauses.add(cb.equal(cb.lower(job.get("industry")), industry.strip().toLowerCase(java.util.Locale.ROOT)));
            if (query != null && !query.isBlank()) {
                String q = literalLike(query);
                clauses.add(cb.or(cb.like(cb.lower(job.get("title")), q, '!'),
                        cb.like(cb.lower(job.get("description")), q, '!'),
                        cb.like(cb.lower(job.get("company").get("name")), q, '!')));
            }
            if (location != null && !location.isBlank())
                clauses.add(cb.like(cb.lower(job.get("location")), literalLike(location), '!'));
            return cb.and(clauses.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
        var result = jobRepository.findAll(spec, pageable);
        return com.platform.recruitment.common.PageResponse.of(result,
                result.getContent().stream().map(this::mapToResponse).toList(),
                sort == null || sort.isBlank() ? "createdAt" : sort,
                direction == null || direction.isBlank() ? "desc" : direction.toLowerCase(java.util.Locale.ROOT));
    }

    private static String literalLike(String input) {
        return "%" + input.strip().toLowerCase(java.util.Locale.ROOT)
                .replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
    }

    public JobResponse mapToResponse(Job job) {
        List<JobResponse.RequirementResponse> reqResponses = job.getRequirements().stream()
                .map(req -> JobResponse.RequirementResponse.builder()
                        .id(req.getId())
                        .skillName(req.getSkillName())
                        .requirementType(req.getRequirementType())
                        .minYearsExp(req.getMinYearsExp())
                        .build())
                .toList();

        return JobResponse.builder()
                .id(job.getId())
                .companyId(job.getCompany().getId())
                .companyName(job.getCompany().getName())
                .title(job.getTitle())
                .industry(job.getIndustry())
                .industryOther(job.getIndustryOther())
                .seniority(job.getSeniority())
                .seniorityOther(job.getSeniorityOther())
                .status(job.getStatus())
                .minSalary(job.getMinSalary())
                .maxSalary(job.getMaxSalary())
                .salaryNegotiable(Boolean.TRUE.equals(job.getSalaryNegotiable()))
                .salaryCurrency(job.getSalaryCurrency() == null ? "VND" : job.getSalaryCurrency())
                .salaryPeriod("MONTH")
                .location(job.getLocation())
                .employmentType(job.getEmploymentType())
                .employmentTypeOther(job.getEmploymentTypeOther())
                .description(job.getDescription())
                .responsibilities(job.getResponsibilities())
                .requirements(reqResponses)
                .createdAt(job.getCreatedAt())
                .build();
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }
}
