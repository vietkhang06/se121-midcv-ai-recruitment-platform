package com.platform.recruitment;

import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.cv.*;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CVOwnershipTest {

    @Mock
    private CVRepository cvRepository;

    @Mock
    private CVVersionRepository cvVersionRepository;

    @Mock
    private CVSectionRepository cvSectionRepository;

    @Mock
    private CandidateProfileRepository candidateProfileRepository;

    @Mock
    private com.platform.recruitment.document.Documents documents;

    @Mock
    private com.platform.recruitment.cv.TextReader textReader;

    @Mock
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @InjectMocks
    private CVService cvService;

    private User candidateUserA;
    private CandidateProfile profileA;
    private CandidateProfile profileB;
    private CV cvOfCandidateB;

    @BeforeEach
    void setUp() {
        candidateUserA = User.builder()
                .email("candidateA@example.com")
                .passwordHash("hashed")
                .role(Role.CANDIDATE)
                .build();
        candidateUserA.setId(UUID.randomUUID());

        profileA = CandidateProfile.builder()
                .user(candidateUserA)
                .fullName("Candidate A")
                .build();
        profileA.setId(UUID.randomUUID());

        User candidateUserB = User.builder()
                .email("candidateB@example.com")
                .passwordHash("hashed")
                .role(Role.CANDIDATE)
                .build();
        candidateUserB.setId(UUID.randomUUID());

        profileB = CandidateProfile.builder()
                .user(candidateUserB)
                .fullName("Candidate B")
                .build();
        profileB.setId(UUID.randomUUID());

        cvOfCandidateB = CV.builder()
                .candidate(profileB)
                .title("Candidate B's Secret CV")
                .creationPath(CVCreationPath.BUILDER)
                .rawText("Private CV text of Candidate B")
                .build();
        cvOfCandidateB.setId(UUID.randomUUID());
    }

    @Test
    void testGetCVById_CandidateAAccessingCandidateBCV_ThrowsUnauthorizedException() {
        when(candidateProfileRepository.findByUserId(candidateUserA.getId())).thenReturn(Optional.of(profileA));
        when(cvRepository.findById(cvOfCandidateB.getId())).thenReturn(Optional.of(cvOfCandidateB));

        UnauthorizedAccessException ex = assertThrows(UnauthorizedAccessException.class, () -> {
            cvService.getCVById(candidateUserA, cvOfCandidateB.getId());
        });

        assertTrue(ex.getMessage().contains("Candidate does not own this CV"));
    }
}
