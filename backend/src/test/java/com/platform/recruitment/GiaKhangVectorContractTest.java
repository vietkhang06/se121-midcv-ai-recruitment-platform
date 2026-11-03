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
class GiaKhangVectorContractTest {
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
    @Test void vectorCacheBindsVersionModelAndSourceAndInvalidatesOnlyWhenPersisting() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class); AiClient ai = mock(AiClient.class);
        when(ai.activeEmbeddingModel()).thenReturn("mock-1024");
        when(ai.embed(anyString(), eq("mock-1024"))).thenReturn("[1,0]");
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class))).thenReturn(List.of());
        when(jdbc.queryForObject(anyString(), eq(Number.class), any(Object[].class))).thenReturn(80.0);
        ConfirmedVectorService service = new ConfirmedVectorService(jdbc, ai);
        assertEquals(80.0, service.compare(version, job, List.of(), false).score().doubleValue());
        verify(jdbc, never()).update(anyString(), any(Object[].class));
        service.compare(version, job, List.of(), true);
        verify(jdbc).update(startsWith("UPDATE embeddings"), eq("CV_VERSION"), eq(version.getId()));
        ArgumentCaptor<Object[]> bindings = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc, times(2)).update(startsWith("INSERT INTO embeddings"), bindings.capture());
        Object[] first = bindings.getAllValues().get(0);
        assertEquals("CV_VERSION", first[0]); assertEquals(version.getId(), first[1]);
        assertEquals("mock-1024", first[2]); assertEquals(64, first[3].toString().length());
        verify(ai, times(2)).embed(eq("Java"), eq("mock-1024"));
    }
    @Test void unconfirmedVersionNeverReachesVectorProvider() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class); AiClient ai = mock(AiClient.class);
        version.setStatus("DRAFT");
        assertThrows(CustomException.class, () -> new ConfirmedVectorService(jdbc, ai).compare(version, job, List.of(), true));
        verifyNoInteractions(jdbc, ai);
    }
}
