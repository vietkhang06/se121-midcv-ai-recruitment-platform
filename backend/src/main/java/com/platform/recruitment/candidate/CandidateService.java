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

    @Transactional(readOnly = true)
    public CandidateProfile getMyProfile(User candidateUser) {
        return candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));
    }

    @Transactional
    public CandidateProfile updateProfile(User candidateUser, CandidateProfile updateData) {
        CandidateProfile profile = getMyProfile(candidateUser);
        profile.setFullName(updateData.getFullName());
        profile.setAge(updateData.getAge());
        profile.setTargetIndustry(updateData.getTargetIndustry());
        profile.setPhone(updateData.getPhone());
        profile.setHeadline(updateData.getHeadline());
        profile.setBio(updateData.getBio());
        profile.setGithubUrl(updateData.getGithubUrl());
        return candidateProfileRepository.save(profile);
    }
}
