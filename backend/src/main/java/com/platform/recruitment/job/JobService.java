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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JobService {

    private final JobRepository jobRepository;
    private final RecruiterProfileRepository recruiterProfileRepository;

    @Transactional
    public JobResponse createDraftJob(User recruiterUser, CreateJobRequest request) {
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
                .seniority(request.getSeniority())
                .status(JobStatus.DRAFT)
                .minSalary(request.getMinSalary())
                .maxSalary(request.getMaxSalary())
                .location(request.getLocation())
                .employmentType(request.getEmploymentType())
                .description(request.getDescription())
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
        RecruiterProfile recruiter = recruiterProfileRepository.findByUserId(recruiterUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("RecruiterProfile", "userId", recruiterUser.getId()));

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        // Ownership check
        if (!job.getCompany().getId().equals(recruiter.getCompany().getId())) {
            throw new UnauthorizedAccessException("Recruiter does not own this job posting");
        }

        // Company Verification Business Rule
        Company company = job.getCompany();
        if (company.getVerificationStatus() != CompanyVerification.VERIFIED) {
            throw new CompanyNotVerifiedException(
                    String.format("Company '%s' has verification status '%s'. Only VERIFIED companies can publish jobs.",
                            company.getName(), company.getVerificationStatus()));
        }

        job.setStatus(JobStatus.PUBLISHED);
        Job publishedJob = jobRepository.save(job);
        return mapToResponse(publishedJob);
    }

    @Transactional(readOnly = true)
    public JobResponse getJobById(UUID jobId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));
        return mapToResponse(job);
    }

    @Transactional(readOnly = true)
    public List<JobResponse> getPublishedJobs(String industry) {
        List<Job> jobs;
        if (industry != null && !industry.isBlank()) {
            jobs = jobRepository.findByStatusAndIndustry(JobStatus.PUBLISHED, industry);
        } else {
            jobs = jobRepository.findByStatus(JobStatus.PUBLISHED);
        }
        return jobs.stream().map(this::mapToResponse).toList();
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
                .seniority(job.getSeniority())
                .status(job.getStatus())
                .minSalary(job.getMinSalary())
                .maxSalary(job.getMaxSalary())
                .location(job.getLocation())
                .employmentType(job.getEmploymentType())
                .description(job.getDescription())
                .requirements(reqResponses)
                .createdAt(job.getCreatedAt())
                .build();
    }
}
