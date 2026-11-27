package com.platform.recruitment.matching;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.job.Job;

public final class ApplicationAiPolicy {
    private ApplicationAiPolicy() {}

    public static String encode(JobMatchingPolicy policy) {
        try { return new ObjectMapper().writeValueAsString(JobMatchingPolicyDto.fromEntity(policy)); }
        catch (Exception e) { throw new IllegalStateException("Cannot pin application scoring policy", e); }
    }

    public static JobMatchingPolicy decode(String snapshot, Job job) {
        try {
            var dto = new ObjectMapper().readValue(snapshot, JobMatchingPolicyDto.class);
            return JobMatchingPolicy.builder().job(job).policyVersion(dto.getPolicyVersion())
                    .skillRequiredWeight(dto.getSkillRequiredWeight()).skillPreferredWeight(dto.getSkillPreferredWeight())
                    .experienceWeight(dto.getExperienceWeight()).educationWeight(dto.getEducationWeight())
                    .projectWeight(dto.getProjectWeight()).semanticWeight(dto.getSemanticWeight())
                    .coreWeight(dto.getCoreWeight()).githubWeight(dto.getGithubWeight())
                    .isGithubActive(dto.getIsGithubActive()).build();
        } catch (Exception e) { throw new IllegalStateException("Invalid pinned scoring policy", e); }
    }
}
