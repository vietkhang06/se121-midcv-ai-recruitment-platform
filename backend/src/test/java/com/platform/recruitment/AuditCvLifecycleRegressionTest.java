package com.platform.recruitment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.ai.*;
import com.platform.recruitment.candidate.*;
import com.platform.recruitment.common.*;
import com.platform.recruitment.cv.*;
import com.platform.recruitment.github.*;
import com.platform.recruitment.job.*;
import com.platform.recruitment.user.*;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class AuditCvLifecycleRegressionTest {
    CVRepository cvs=mock(CVRepository.class);
    CVVersionRepository versions=mock(CVVersionRepository.class);
    CVSectionRepository sections=mock(CVSectionRepository.class);
    CandidateProfileRepository candidates=mock(CandidateProfileRepository.class);
    AiWorkerClient ai=mock(AiWorkerClient.class);
    JobRepository jobs=mock(JobRepository.class);
    JobRequirementRepository requirements=mock(JobRequirementRepository.class);
    User user;CandidateProfile candidate;CV cv;CVVersion version;CVService svc;
    @BeforeEach void setup() {
        user=User.builder().role(Role.CANDIDATE).build();user.setId(UUID.randomUUID());
        candidate=CandidateProfile.builder().user(user).build();candidate.setId(UUID.randomUUID());
        cv=CV.builder().candidate(candidate).title("CV").status("DRAFT").build();cv.setId(UUID.randomUUID());
        version=CVVersion.builder().cv(cv).versionNumber(1).status("DRAFT").structuredJsonContent("{\"skills\":[{\"name\":\"Python\"}]}").build();version.setId(UUID.randomUUID());
        when(candidates.findByUserId(user.getId())).thenReturn(Optional.of(candidate));
        when(cvs.findByIdForUpdate(cv.getId())).thenReturn(Optional.of(cv));
        when(cvs.findById(cv.getId())).thenReturn(Optional.of(cv));
        when(versions.findByCvIdOrderByVersionNumberDesc(cv.getId())).thenReturn(List.of(version));
        svc=new CVService(cvs,versions,sections,candidates,null,null,null,null,new ObjectMapper());
    }
    @Test void cannotConfirmProcessingOrFailedCv() {
        for(String state:List.of("PROCESSING","FAILED")) {
            cv.setStatus(state);assertThrows(CustomException.class,()->svc.confirmCV(user,cv.getId()));
        }
        verify(versions,never()).save(any());
    }
    @Test void emptyContentCannotBeConfirmed() {
        version.setStructuredJsonContent("{}");assertThrows(CustomException.class,()->svc.confirmCV(user,cv.getId()));
        verify(versions,never()).save(any());
    }
    @Test void activeExtractionCannotBeConfirmed() {
        JdbcTemplate jdbc=mock(JdbcTemplate.class);
        when(jdbc.queryForObject(anyString(),eq(Integer.class),eq(cv.getId()))).thenReturn(1);
        svc=new CVService(cvs,versions,sections,candidates,null,null,jdbc,null,new ObjectMapper());
        assertThrows(CustomException.class,()->svc.confirmCV(user,cv.getId()));
        verify(versions,never()).save(any());
    }
    @Test void confirmingAgainIsIdempotent() {
        svc.confirmCV(user,cv.getId());assertEquals("CONFIRMED",version.getStatus());
        var time=version.getConfirmedAt();svc.confirmCV(user,cv.getId());
        assertEquals(time,version.getConfirmedAt());verify(versions,times(1)).save(version);
    }
    ProcessingLifecycleService legacy() {
        return new ProcessingLifecycleService(ai,jobs,requirements,cvs,versions,sections,candidates,
                mock(GitHubProfileRepository.class),mock(GitHubRepositoryRepository.class),mock(GitHubAssessmentRepository.class));
    }
    @Test void legacyCvDeniesForeignCandidateBeforeChanges() {
        User other=User.builder().role(Role.CANDIDATE).build();other.setId(UUID.randomUUID());
        assertThrows(UnauthorizedAccessException.class,()->legacy().processCvDocument(other,cv.getId()));
        verifyNoInteractions(ai);verify(versions,never()).save(any());verify(cvs,never()).save(any());
    }
    @Test void legacyJdDeniesCandidateBeforeProviderOrDelete() {
        Job job=Job.builder().build();job.setId(UUID.randomUUID());when(jobs.findById(job.getId())).thenReturn(Optional.of(job));
        assertThrows(UnauthorizedAccessException.class,()->legacy().processJobDescription(user,job.getId()));
        verifyNoInteractions(ai,requirements);
    }

    @Test void readingConfirmedLegacyJsonDoesNotRewriteItsVersion() {
        version.setStatus("CONFIRMED");cv.setStatus("CONFIRMED");
        String original=version.getStructuredJsonContent();
        assertNotNull(svc.getCVDraft(user,cv.getId()));
        assertEquals(original,version.getStructuredJsonContent());
        verify(versions,never()).save(any());
    }

}
