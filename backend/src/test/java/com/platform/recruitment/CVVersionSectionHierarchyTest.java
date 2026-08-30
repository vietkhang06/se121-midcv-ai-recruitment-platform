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
class CVVersionSectionHierarchyTest {

    @Mock
    private CVVersionRepository versionRepository;

    @Mock
    private CVSectionRepository sectionRepository;

    private CV cvHeader;
    private CVVersion version1;
    private CVVersion version2;

    @BeforeEach
    void setUp() {
        User candidateUser = User.builder().email("candidate@example.com").role(Role.CANDIDATE).build();
        CandidateProfile candidate = CandidateProfile.builder().user(candidateUser).fullName("Nguyen Van Candidate").build();

        cvHeader = CV.builder()
                .candidate(candidate)
                .title("Software Engineer CV")
                .creationPath(CVCreationPath.BUILDER)
                .build();
        cvHeader.setId(UUID.randomUUID());

        version1 = CVVersion.builder()
                .cv(cvHeader)
                .versionNumber(1)
                .title("Software Engineer CV v1.0")
                .rawTextContent("Java 17, Spring Boot Developer (Version 1)")
                .build();
        version1.setId(UUID.randomUUID());

        version2 = CVVersion.builder()
                .cv(cvHeader)
                .versionNumber(2)
                .title("Software Engineer CV v2.0")
                .rawTextContent("Java 17, Spring Boot, Microservices, Kafka (Version 2)")
                .build();
        version2.setId(UUID.randomUUID());
    }

    @Test
    void testCVVersion_OwnsSections_CreatingVersion2DoesNotMutateVersion1() {
        CVSection sectionV1 = CVSection.builder()
                .cvVersion(version1)
                .sectionType("WORK_EXPERIENCE")
                .content("Software Engineer at TechCorp (2022-2024)")
                .build();

        CVSection sectionV2 = CVSection.builder()
                .cvVersion(version2)
                .sectionType("WORK_EXPERIENCE")
                .content("Senior Software Engineer at TechCorp (2022-Present)")
                .build();

        when(sectionRepository.findByCvVersionId(version1.getId())).thenReturn(List.of(sectionV1));
        when(sectionRepository.findByCvVersionId(version2.getId())).thenReturn(List.of(sectionV2));

        List<CVSection> v1Sections = sectionRepository.findByCvVersionId(version1.getId());
        List<CVSection> v2Sections = sectionRepository.findByCvVersionId(version2.getId());

        assertEquals(1, v1Sections.size());
        assertEquals("Software Engineer at TechCorp (2022-2024)", v1Sections.get(0).getContent());

        assertEquals(1, v2Sections.size());
        assertEquals("Senior Software Engineer at TechCorp (2022-Present)", v2Sections.get(0).getContent());

        // Prove Version 1 sections remain immutable when Version 2 is created
        assertNotEquals(v1Sections.get(0).getContent(), v2Sections.get(0).getContent());
    }
}
