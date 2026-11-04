package com.platform.recruitment.embedding;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.ai.AiClient;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobRequirement;
import com.platform.recruitment.job.RequirementType;
import com.platform.recruitment.worker.JobQueue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VersionedEmbeddingLifecycleTest {
    @Mock JdbcTemplate jdbc;
    @Mock JobQueue queue;
    @Mock AiClient ai;

    @Test
    void canonicalTextIncludesRequiredPreferredAndIsDeterministic() {
        JobRequirement required = JobRequirement.builder().skillName("Java")
                .requirementType(RequirementType.REQUIRED).minYearsExp(2).build();
        JobRequirement preferred = JobRequirement.builder().skillName("Docker")
                .requirementType(RequirementType.PREFERRED).minYearsExp(0).build();
        Job job = Job.builder().title("Backend Engineer").industry("IT")
                .description("Develop REST APIs").requirements(List.of(required, preferred)).build();
        String first = VersionedEmbeddingLifecycle.canonicalJobText(job);
        assertTrue(first.contains("REQUIRED: Java (min years 2)"));
        assertTrue(first.contains("PREFERRED: Docker (min years 0)"));
        job.setRequirements(List.of(preferred, required));
        assertEquals(first, VersionedEmbeddingLifecycle.canonicalJobText(job));
    }

    @Test
    void rejectsTamperedEmbeddingSourceBeforeAnyProviderCall() {
        UUID versionId = UUID.randomUUID();
        when(jdbc.queryForList(startsWith("SELECT embedding_text"), eq(versionId)))
                .thenReturn(List.of(Map.of("embedding_text", "Java", "embedding_source_sha", "invalid")));
        VersionedEmbeddingLifecycle lifecycle = new VersionedEmbeddingLifecycle(jdbc, new ObjectMapper(), queue, ai);
        assertThrows(CustomException.class, () -> lifecycle.generate(versionId));
        verify(ai, never()).embed(anyString(), anyString());
    }
}
