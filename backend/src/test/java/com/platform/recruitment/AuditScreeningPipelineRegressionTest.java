package com.platform.recruitment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.ai.*;
import com.platform.recruitment.cv.*;
import com.platform.recruitment.document.Documents;
import com.platform.recruitment.event.Events;
import com.platform.recruitment.github.GithubClient;
import com.platform.recruitment.matching.Scoring;
import com.platform.recruitment.worker.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class AuditScreeningPipelineRegressionTest {
    void extract(boolean screening) throws Exception {
        UUID job=UUID.randomUUID(), owner=UUID.randomUUID(),version=UUID.randomUUID();
        JdbcTemplate jdbc=mock(JdbcTemplate.class);JobQueue queue=mock(JobQueue.class);AiClient ai=mock(AiClient.class);
        AiWorkerClient worker=mock(AiWorkerClient.class);var manager=mock(PlatformTransactionManager.class);
        when(manager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        when(jdbc.queryForList("SELECT id FROM screening_runs WHERE cv_version_id=?",version))
                .thenReturn(screening ? List.of(Map.of("id",UUID.randomUUID())) : List.of());
        when(worker.structureCv(anyString(),eq(version),anyString())).thenReturn(Map.of("success",true,"data",Map.of(
                "skills",List.of(Map.of("name","Java")),"experience",List.of(),"education",List.of())));
        String vector="[1,"+"0,".repeat(1022)+"0]";
        when(ai.activeEmbeddingModel()).thenReturn("bge-m3");when(ai.semanticText(any())).thenReturn("Java");
        when(ai.embed(anyString(),eq("bge-m3"))).thenReturn(vector);
        var pipeline=new PipelineWorker(jdbc,new ObjectMapper(),queue,mock(Events.class),mock(Documents.class),
                mock(TextReader.class),ai,mock(GithubClient.class),new Scoring(),manager,worker,null,null,null);
        Map<String,Object> row=new HashMap<>();row.put("state","QUEUED");row.put("doc_id",UUID.randomUUID());row.put("raw_text","Java academic project");row.put("filename","synthetic.pdf");
        ReflectionTestUtils.invokeMethod(pipeline,"extractCvWithAiWorker",job,owner,version,row);
        if(screening) verify(ai).embed("Java","bge-m3");else verify(ai,never()).embed(any(),any());
        var writes=mockingDetails(jdbc).getInvocations().stream().filter(i->i.getMethod().getName().equals("update")
                && i.getArgument(0).toString().startsWith("UPDATE document_versions SET normalized=")).toList();
        assertEquals(1,writes.size());
        assertTrue(writes.get(0).getArgument(0).toString().contains("embedding_model=?"));
        assertEquals(screening ? vector : null,writes.get(0).getArgument(2));
        assertFalse(writes.get(0).getArgument(1).toString().contains("canonical"));
    }
    @Test void newScreeningHasVectorBeforeReady() throws Exception {extract(true);}
    @Test void candidateDraftIsReviewReadyWithoutPrematureEmbedding() throws Exception {extract(false);}
}
