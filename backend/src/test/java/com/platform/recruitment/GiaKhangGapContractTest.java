package com.platform.recruitment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.ai.*;
import com.platform.recruitment.candidate.*;
import com.platform.recruitment.common.*;
import com.platform.recruitment.cv.*;
import com.platform.recruitment.embedding.ConfirmedVectorService;
import com.platform.recruitment.job.*;
import com.platform.recruitment.user.User;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** Mock contracts for source binding and read-only guidance; not live DB/model acceptance. */
class GiaKhangGapContractTest {
    CandidateProfile candidate;
    CV cv;
    CVVersion version;
    Job job;
    @BeforeEach void setup() {
        candidate = CandidateProfile.builder().fullName("Synthetic").build(); candidate.setId(UUID.randomUUID());
        cv = CV.builder().candidate(candidate).build(); cv.setId(UUID.randomUUID());
        version = CVVersion.builder().cv(cv).status("CONFIRMED")
                .structuredJsonContent("{\"skills\":[{\"name\":\"Java\"}]}").build();
        version.setId(UUID.randomUUID());
        job = Job.builder().title("Java Engineer").description("Java API").status(JobStatus.PUBLISHED).build();
        job.setId(UUID.randomUUID());
    }
    @SuppressWarnings("unchecked")
    @Test void guidanceUsesSelectedConfirmedVersionAndDoesNotWriteRepositories() {
        var candidates = mock(CandidateProfileRepository.class); var cvs = mock(CVRepository.class);
        var versions = mock(CVVersionRepository.class); var jobs = mock(JobRepository.class);
        var requirements = mock(JobRequirementRepository.class); var worker = mock(AiWorkerClient.class);
        User user = User.builder().build(); user.setId(UUID.randomUUID());
        when(candidates.findByUserId(user.getId())).thenReturn(Optional.of(candidate));
        when(cvs.findById(cv.getId())).thenReturn(Optional.of(cv));
        when(versions.findByCvIdOrderByVersionNumberDesc(cv.getId())).thenReturn(List.of(version));
        when(jobs.findById(job.getId())).thenReturn(Optional.of(job));
        when(requirements.findByJobId(job.getId())).thenReturn(List.of(JobRequirement.builder()
                .skillName("Docker").requirementType(RequirementType.REQUIRED).build()));
        when(worker.skillGap(anyMap())).thenReturn(Map.of("gap_breakdown", List.of(), "tailored_roadmap", List.of()));
        var controller = new CandidateGapController(candidates, cvs, versions, jobs, requirements, worker, new ObjectMapper());
        String before = version.getStructuredJsonContent();
        var response = controller.analyze(user, job.getId(), cv.getId()).getData();
        assertEquals(version.getId(), response.get("cv_version_id"));
        assertEquals(job.getId(), response.get("job_id"));
        assertEquals("NOT_REQUESTED", response.get("evidence_assessment"));
        verify(worker).skillGap(argThat(payload -> payload.get("candidate_skills").equals(List.of("Java"))
                && payload.get("jd_required_skills").equals(List.of("Docker"))));
        assertEquals(before, version.getStructuredJsonContent());
        verify(cvs, never()).save(any()); verify(versions, never()).save(any());
        cv.setCandidate(CandidateProfile.builder().build());
        assertThrows(UnauthorizedAccessException.class, () -> controller.analyze(user, job.getId(), cv.getId()));
        verifyNoMoreInteractions(worker);
    }
}
