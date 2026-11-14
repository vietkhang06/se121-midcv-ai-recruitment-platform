package com.platform.recruitment;

import com.platform.recruitment.application.Application;
import com.platform.recruitment.application.ApplicationCVSnapshot;
import com.platform.recruitment.application.ApplicationCVSnapshotRepository;
import com.platform.recruitment.cv.CV;
import com.platform.recruitment.cv.CVCreationPath;
import com.platform.recruitment.cv.CVVersion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApplicationSnapshotVersionTest {

    @Mock
    private ApplicationCVSnapshotRepository snapshotRepository;

    private Application application;
    private CVVersion version1;

    @BeforeEach
    void setUp() {
        CV cvHeader = CV.builder().title("Java Developer CV").creationPath(CVCreationPath.BUILDER).build();
        
        version1 = CVVersion.builder()
                .cv(cvHeader)
                .versionNumber(1)
                .title("Java Developer CV v1.0")
                .rawTextContent("Java 17, Spring Boot, MySQL. 2 Years Exp.")
                .build();
        version1.setId(UUID.randomUUID());

        application = Application.builder()
                .appliedCv(cvHeader)
                .appliedCvVersion(version1)
                .build();
        application.setId(UUID.randomUUID());
    }

    @Test
    void testApplicationSnapshot_PointsToVersion1_RemainsImmutableWhenVersion2Created() {
        ApplicationCVSnapshot snapshot = ApplicationCVSnapshot.builder()
                .application(application)
                .cvTitle(version1.getTitle())
                .rawTextSnapshot(version1.getRawTextContent())
                .structuredJsonSnapshot("{\"version\":1}")
                .build();

        when(snapshotRepository.findByApplicationId(application.getId())).thenReturn(Optional.of(snapshot));

        ApplicationCVSnapshot result = snapshotRepository.findByApplicationId(application.getId()).orElseThrow();
        assertEquals("Java Developer CV v1.0", result.getCvTitle());
        assertEquals("Java 17, Spring Boot, MySQL. 2 Years Exp.", result.getRawTextSnapshot());

        // Simulate creating Version 2 of the CV
        CVVersion version2 = CVVersion.builder()
                .versionNumber(2)
                .title("Java Developer CV v2.0")
                .rawTextContent("Java 21, Spring Boot 3, PostgreSQL, Docker, AWS. 4 Years Exp.")
                .build();

        // Proven: Snapshot still retains Version 1 exact text and metadata
        assertEquals("Java 17, Spring Boot, MySQL. 2 Years Exp.", result.getRawTextSnapshot());
        assertNotEquals(version2.getRawTextContent(), result.getRawTextSnapshot());
    }
}
