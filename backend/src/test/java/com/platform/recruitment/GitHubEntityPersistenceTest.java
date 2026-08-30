package com.platform.recruitment;

import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.github.*;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GitHubEntityPersistenceTest {

    @Mock
    private GitHubProfileRepository profileRepository;

    @Mock
    private GitHubRepositoryRepository repoRepository;

    @Mock
    private GitHubRepositoryLanguageRepository languageRepository;

    @Mock
    private GitHubAssessmentRepository assessmentRepository;

    private CandidateProfile candidateProfile;
    private GitHubProfile ghProfile;

    @BeforeEach
    void setUp() {
        User user = User.builder()
                .email("gh.user@example.com")
                .role(Role.CANDIDATE)
                .build();
        user.setId(UUID.randomUUID());

        candidateProfile = CandidateProfile.builder()
                .user(user)
                .fullName("Pham GitHub Dev")
                .build();
        candidateProfile.setId(UUID.randomUUID());

        ghProfile = GitHubProfile.builder()
                .candidate(candidateProfile)
                .username("phamdev")
                .githubUrl("https://github.com/phamdev")
                .publicReposCount(5)
                .activitySignal(GitHubActivitySignal.HIGH)
                .latestActivityAt(ZonedDateTime.now().minusDays(14))
                .observationWindowDays(180)
                .build();
        ghProfile.setId(UUID.randomUUID());
    }

    @Test
    void testGitHubModel_LanguagesAndTopicsAndAssessment() {
        GitHubRepository repo = GitHubRepository.builder()
                .githubProfile(ghProfile)
                .name("spring-boot-demo")
                .repoUrl("https://github.com/phamdev/spring-boot-demo")
                .primaryLanguage("Java")
                .starsCount(25)
                .forksCount(5)
                .build();
        repo.setId(UUID.randomUUID());

        GitHubRepositoryLanguage javaLang = GitHubRepositoryLanguage.builder()
                .repository(repo)
                .languageName("Java")
                .bytesCount(450000L)
                .percentageRatio(new BigDecimal("60.00"))
                .build();

        GitHubAssessment assessment = GitHubAssessment.builder()
                .githubProfile(ghProfile)
                .summaryNotes("High public activity observed 14 days ago.")
                .languageRankSummary("Rank #1: Java (60%), Rank #2: TypeScript (40%)")
                .overallSupportingRating("STRONG_SIGNAL")
                .build();

        when(profileRepository.findByCandidateId(candidateProfile.getId())).thenReturn(java.util.Optional.of(ghProfile));
        when(languageRepository.findByRepositoryId(repo.getId())).thenReturn(List.of(javaLang));
        when(assessmentRepository.findByGithubProfileId(ghProfile.getId())).thenReturn(java.util.Optional.of(assessment));

        assertTrue(profileRepository.findByCandidateId(candidateProfile.getId()).isPresent());
        assertEquals(GitHubActivitySignal.HIGH, ghProfile.getActivitySignal());
        assertEquals(180, ghProfile.getObservationWindowDays());
        assertEquals(1, languageRepository.findByRepositoryId(repo.getId()).size());
        assertTrue(assessmentRepository.findByGithubProfileId(ghProfile.getId()).isPresent());
    }
}
