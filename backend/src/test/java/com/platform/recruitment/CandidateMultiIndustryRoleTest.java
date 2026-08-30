package com.platform.recruitment;

import com.platform.recruitment.candidate.*;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CandidateMultiIndustryRoleTest {

    @Mock
    private CandidateTargetIndustryRepository targetIndustryRepository;

    @Mock
    private CandidateTargetRoleRepository targetRoleRepository;

    @Mock
    private CandidateLanguageRepository languageRepository;

    private CandidateProfile candidateProfile;

    @BeforeEach
    void setUp() {
        User user = User.builder()
                .email("multi.candidate@example.com")
                .role(Role.CANDIDATE)
                .build();
        user.setId(UUID.randomUUID());

        candidateProfile = CandidateProfile.builder()
                .user(user)
                .fullName("Tran Multi Candidate")
                .targetIndustry("Technology")
                .portfolioUrl("https://myportfolio.dev")
                .build();
        candidateProfile.setId(UUID.randomUUID());
    }

    @Test
    void testCandidate_MultiTargetIndustriesAndRoles() {
        CandidateTargetIndustry techInd = CandidateTargetIndustry.builder()
                .candidate(candidateProfile)
                .industryName("Technology")
                .isPrimary(true)
                .build();

        CandidateTargetIndustry dataInd = CandidateTargetIndustry.builder()
                .candidate(candidateProfile)
                .industryName("Data & Analytics")
                .isPrimary(false)
                .build();

        CandidateTargetRole backendRole = CandidateTargetRole.builder()
                .candidate(candidateProfile)
                .roleTitle("Backend Engineer")
                .build();

        CandidateLanguage englishLang = CandidateLanguage.builder()
                .candidate(candidateProfile)
                .languageName("English")
                .proficiencyLevel("ADVANCED")
                .build();

        when(targetIndustryRepository.findByCandidateId(candidateProfile.getId()))
                .thenReturn(List.of(techInd, dataInd));

        List<CandidateTargetIndustry> industries = targetIndustryRepository.findByCandidateId(candidateProfile.getId());
        assertEquals(2, industries.size());
        assertTrue(industries.stream().anyMatch(i -> i.getIndustryName().equals("Data & Analytics")));
    }
}
