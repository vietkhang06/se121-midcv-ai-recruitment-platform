package com.platform.recruitment;

import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.cv.*;
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
class CVMultiRecordTest {

    @Mock
    private CVRepository cvRepository;

    @Mock
    private CVVersionRepository versionRepository;

    private CandidateProfile candidateProfile;

    @BeforeEach
    void setUp() {
        User user = User.builder()
                .email("multi.cv@example.com")
                .role(Role.CANDIDATE)
                .build();
        user.setId(UUID.randomUUID());

        candidateProfile = CandidateProfile.builder()
                .user(user)
                .fullName("Le Multi CV Candidate")
                .build();
        candidateProfile.setId(UUID.randomUUID());
    }

    @Test
    void testCandidate_HoldsMultipleDistinctCVsWithoutCollision() {
        CV backendCV = CV.builder()
                .candidate(candidateProfile)
                .title("Senior Backend Developer CV")
                .targetIndustry("Technology")
                .creationPath(CVCreationPath.BUILDER)
                .build();
        backendCV.setId(UUID.randomUUID());

        CV marketingCV = CV.builder()
                .candidate(candidateProfile)
                .title("Digital Marketing Specialist CV")
                .targetIndustry("Marketing")
                .creationPath(CVCreationPath.UPLOAD)
                .build();
        marketingCV.setId(UUID.randomUUID());

        when(cvRepository.findByCandidateId(candidateProfile.getId()))
                .thenReturn(List.of(backendCV, marketingCV));

        List<CV> cvs = cvRepository.findByCandidateId(candidateProfile.getId());
        assertEquals(2, cvs.size());
        assertEquals("Technology", cvs.get(0).getTargetIndustry());
        assertEquals("Marketing", cvs.get(1).getTargetIndustry());
    }
}
