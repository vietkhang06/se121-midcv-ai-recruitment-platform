package com.platform.recruitment.matching;

import com.platform.recruitment.application.Application;
import com.platform.recruitment.application.ApplicationRepository;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.company.RecruiterProfile;
import com.platform.recruitment.company.RecruiterProfileRepository;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobRepository;
import com.platform.recruitment.suspension.SuspensionGuard;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class JobMatchingPolicyService {

    private final JobMatchingPolicyRepository policyRepository;
    private final JobRepository jobRepository;
    private final RecruiterProfileRepository recruiterProfileRepository;
    private final ApplicationRepository applicationRepository;
    private final MatchingEngineService matchingEngineService;
    private final SuspensionGuard suspensionGuard;

    @Transactional(readOnly = true)
    public JobMatchingPolicyDto getPolicy(User user, UUID jobId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        verifyJobOwnership(user, job);

        JobMatchingPolicy policy = policyRepository.findByJobId(jobId)
                .orElseGet(() -> JobMatchingPolicy.createDefaultPolicy(job));

        return JobMatchingPolicyDto.fromEntity(policy);
    }

    @Transactional
    public JobMatchingPolicyDto updatePolicy(User user, UUID jobId, JobMatchingPolicyDto dto) {
        if (suspensionGuard != null) {
            suspensionGuard.checkRecruiterOperationAllowed(user);
        }

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        verifyJobOwnership(user, job);
        validateWeights(dto);

        JobMatchingPolicy policy = policyRepository.findByJobId(jobId)
                .orElseGet(() -> JobMatchingPolicy.builder().job(job).policyVersion(0).build());

        policy.setSkillRequiredWeight(dto.getSkillRequiredWeight().setScale(4, RoundingMode.HALF_UP));
        policy.setSkillPreferredWeight(dto.getSkillPreferredWeight().setScale(4, RoundingMode.HALF_UP));
        policy.setExperienceWeight(dto.getExperienceWeight().setScale(4, RoundingMode.HALF_UP));
        policy.setEducationWeight(dto.getEducationWeight().setScale(4, RoundingMode.HALF_UP));
        policy.setProjectWeight(dto.getProjectWeight().setScale(4, RoundingMode.HALF_UP));
        policy.setSemanticWeight(dto.getSemanticWeight().setScale(4, RoundingMode.HALF_UP));
        policy.setCoreWeight(dto.getCoreWeight().setScale(4, RoundingMode.HALF_UP));
        policy.setGithubWeight(dto.getGithubWeight().setScale(4, RoundingMode.HALF_UP));
        policy.setIsGithubActive(dto.getIsGithubActive() != null ? dto.getIsGithubActive() : true);
        policy.setPolicyVersion(policy.getPolicyVersion() + 1);

        JobMatchingPolicy saved = policyRepository.save(policy);
        log.info("Updated JobMatchingPolicy for job {} to version {}", jobId, saved.getPolicyVersion());

        return JobMatchingPolicyDto.fromEntity(saved);
    }

    @Transactional
    public int recalculateMatching(User user, UUID jobId) {
        if (suspensionGuard != null) {
            suspensionGuard.checkRecruiterOperationAllowed(user);
        }

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        verifyJobOwnership(user, job);

        List<Application> applications = applicationRepository.findByJobId(jobId);
        int recalculatedCount = 0;

        for (Application app : applications) {
            try {
                matchingEngineService.calculateAndPersistMatchResult(jobId, app.getCandidate().getId());
                recalculatedCount++;
            } catch (Exception e) {
                log.error("Failed to recalculate matching for application {}", app.getId(), e);
            }
        }

        log.info("Recalculated {} applications for job {}", recalculatedCount, jobId);
        return recalculatedCount;
    }

    public void validateWeights(JobMatchingPolicyDto dto) {
        if (dto.getSkillRequiredWeight() == null || dto.getSkillPreferredWeight() == null ||
            dto.getExperienceWeight() == null || dto.getEducationWeight() == null ||
            dto.getProjectWeight() == null || dto.getSemanticWeight() == null ||
            dto.getCoreWeight() == null || dto.getGithubWeight() == null) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Tất cả các trọng số bắt buộc phải được cung cấp.");
        }

        BigDecimal coreSum = dto.getSkillRequiredWeight()
                .add(dto.getSkillPreferredWeight())
                .add(dto.getExperienceWeight())
                .add(dto.getEducationWeight())
                .add(dto.getProjectWeight())
                .add(dto.getSemanticWeight());

        if (coreSum.subtract(BigDecimal.ONE).abs().compareTo(new BigDecimal("0.005")) > 0) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR,
                    String.format("Tổng trọng số các tiêu chí cốt lõi phải bằng 1.0 (hoặc 100%%). Tổng hiện tại: %s", coreSum));
        }

        if (Boolean.TRUE.equals(dto.getIsGithubActive())) {
            BigDecimal overallSum = dto.getCoreWeight().add(dto.getGithubWeight());
            if (overallSum.subtract(BigDecimal.ONE).abs().compareTo(new BigDecimal("0.005")) > 0) {
                throw new CustomException(ErrorCode.VALIDATION_ERROR,
                        String.format("Tổng trọng số giữa Core CV và GitHub phải bằng 1.0 (hoặc 100%%). Tổng hiện tại: %s", overallSum));
            }
        }
    }

    private void verifyJobOwnership(User user, Job job) {
        if (user.getRole() == Role.ADMIN) {
            return;
        }
        if (user.getRole() != Role.HR) {
            throw new UnauthorizedAccessException("Chỉ nhà tuyển dụng hoặc quản trị viên mới có quyền xem/sửa chính sách đối sánh.");
        }

        RecruiterProfile profile = recruiterProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new UnauthorizedAccessException("Không tìm thấy hồ sơ nhà tuyển dụng."));

        if (profile.getCompany() == null || !profile.getCompany().getId().equals(job.getCompany().getId())) {
            throw new UnauthorizedAccessException("Bạn không có quyền quản lý công việc của doanh nghiệp khác.");
        }
    }
}
