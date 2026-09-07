package com.platform.recruitment.candidate;

import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CandidateService {

    private final CandidateProfileRepository candidateProfileRepository;
    private final CandidateTargetIndustryRepository candidateTargetIndustryRepository;

    @Transactional(readOnly = true)
    public CandidateProfile getMyProfile(User candidateUser) {
        CandidateProfile profile = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));
        
        java.util.List<CandidateTargetIndustry> industries = candidateTargetIndustryRepository.findByCandidateId(profile.getId());
        java.util.List<String> industryNames = industries.stream()
                .map(CandidateTargetIndustry::getIndustryName)
                .toList();
        profile.setTargetIndustries(industryNames);
        return profile;
    }

    @Transactional
    public CandidateProfile updateProfile(User candidateUser, CandidateProfile updateData) {
        CandidateProfile profile = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

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

        return candidateProfileRepository.save(profile);
    }
}
