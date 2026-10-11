package com.platform.recruitment.candidate;

import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CandidateService {

    private final CandidateProfileRepository candidateProfileRepository;
    private final CandidateTargetIndustryRepository candidateTargetIndustryRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.platform.recruitment.worker.JobQueue jobQueue;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.platform.recruitment.ai.ProcessingLifecycleService processingLifecycleService;

    @Transactional
    public CandidateProfile getMyProfile(User candidateUser) {
        CandidateProfile profile = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseGet(() -> {
                    String defaultName = candidateUser.getEmail() != null ? candidateUser.getEmail().split("@")[0] : "Candidate";
                    CandidateProfile newProfile = CandidateProfile.builder()
                            .user(candidateUser)
                            .fullName(defaultName)
                            .targetIndustry("Technology")
                            .build();
                    return candidateProfileRepository.save(newProfile);
                });
        
        java.util.List<CandidateTargetIndustry> industries = candidateTargetIndustryRepository.findByCandidateId(profile.getId());
        java.util.List<String> industryNames = industries.stream()
                .map(CandidateTargetIndustry::getIndustryName)
                .toList();
        profile.setTargetIndustries(industryNames.isEmpty() && profile.getTargetIndustry() != null
                ? java.util.List.of(profile.getTargetIndustry())
                : industryNames);
        return profile;
    }

    @Transactional
    public CandidateProfile updateProfile(User candidateUser, CandidateProfile updateData) {
        CandidateProfile profile = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        String oldGithubUrl = profile.getGithubUrl();
        profile.setFullName(updateData.getFullName());
        profile.setAge(updateData.getAge());
        profile.setPhone(updateData.getPhone());
        profile.setHeadline(updateData.getHeadline());
        profile.setBio(updateData.getBio());
        profile.setGithubUrl(updateData.getGithubUrl());

        if (updateData.getTargetIndustries() != null && !updateData.getTargetIndustries().isEmpty()) {
            profile.setTargetIndustry(updateData.getTargetIndustries().get(0));
            // Delete old industries and persist new ones
            java.util.List<CandidateTargetIndustry> oldIndustries = candidateTargetIndustryRepository.findByCandidateId(profile.getId());
            candidateTargetIndustryRepository.deleteAll(oldIndustries);

            for (int i = 0; i < updateData.getTargetIndustries().size(); i++) {
                String ind = updateData.getTargetIndustries().get(i);
                if (ind != null && !ind.isBlank()) {
                    candidateTargetIndustryRepository.save(CandidateTargetIndustry.builder()
                            .candidate(profile)
                            .industryName(ind.trim())
                            .isPrimary(i == 0)
                            .build());
                }
            }
            profile.setTargetIndustries(updateData.getTargetIndustries());
        } else if (updateData.getTargetIndustry() != null) {
            profile.setTargetIndustry(updateData.getTargetIndustry());
        }

        CandidateProfile saved = candidateProfileRepository.save(profile);

        // Auto-enqueue background GitHub analysis when valid githubUrl is provided/updated
        boolean isNewUrl = saved.getGithubUrl() != null && !saved.getGithubUrl().isBlank()
                && !saved.getGithubUrl().trim().equalsIgnoreCase(oldGithubUrl != null ? oldGithubUrl.trim() : "");
        if (isNewUrl) {
            if (jobQueue != null) {
                jobQueue.enqueue(candidateUser.getId(), "GITHUB_ANALYSIS", saved.getId());
                log.info("Enqueued background GITHUB_ANALYSIS task for candidate {}", saved.getId());
            } else if (processingLifecycleService != null) {
                try {
                    processingLifecycleService.processCandidateGithub(candidateUser.getId());
                } catch (Exception ex) {
                    log.warn("Non-blocking GitHub analysis failed for candidate user {}: {}", candidateUser.getId(), ex.getMessage());
                }
            }
        }

        return saved;
    }
}
