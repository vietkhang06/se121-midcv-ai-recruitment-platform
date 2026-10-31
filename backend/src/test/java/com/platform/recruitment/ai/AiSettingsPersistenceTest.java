package com.platform.recruitment.ai;

import com.fasterxml.jackson.databind.*;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.*;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

/** H2 persistence and loopback HTTP model contract, not a live LLM/provider test. */
class AiSettingsPersistenceTest {
    JdbcTemplate db;TransactionTemplate tx;ObjectMapper mapper=new ObjectMapper();
    AiClient client() throws Exception {return new AiClient(db,mapper,"http://127.0.0.1:11434","local-model","bge-m3",5);}
    @BeforeEach void fixture() {
        var ds=new DriverManagerDataSource("jdbc:h2:mem:"+UUID.randomUUID()+";MODE=PostgreSQL;DB_CLOSE_DELAY=-1","sa","");
        db=new JdbcTemplate(ds);tx=new TransactionTemplate(new DataSourceTransactionManager(ds));
        db.execute("CREATE TABLE system_ai_settings(id VARCHAR PRIMARY KEY,provider VARCHAR,ollama_url VARCHAR,ollama_model VARCHAR,cloud_base_url VARCHAR,cloud_api_key VARCHAR,cloud_model VARCHAR,embedding_provider VARCHAR,embedding_model VARCHAR,updated_at TIMESTAMP)");
        db.update("INSERT INTO system_ai_settings VALUES('current','LOCAL_OLLAMA','http://127.0.0.1:11434','local-model','https://example.invalid/v1','fixture-key','cloud-a','LOCAL_OLLAMA','bge-m3',CURRENT_TIMESTAMP)");
    }
    @Test void changedModelPersistsAfterClientRecreation() throws Exception {
        var c=client();assertEquals("local-model",c.activeLlmModel());
        tx.execute(status->{c.updateSettings("CLOUD_OPENAI_COMPATIBLE","http://127.0.0.1:11434","local-model","https://example.invalid/v1","","cloud-b");return null;});
        assertEquals("cloud-b",client().activeLlmModel());assertEquals("fixture-key",client().getSettings().cloudApiKey());
    }
    @Test void uncommittedSettingsAreNotPublishedThroughSharedCache() throws Exception {
        var c=client();c.getSettings();var pool=Executors.newSingleThreadExecutor();
        try {
            tx.execute(status->{
                c.updateSettings("CLOUD_OPENAI_COMPATIBLE","http://127.0.0.1:11434","local-model","https://example.invalid/v1","","not-committed");
                assertEquals("not-committed",c.activeLlmModel());
                try {assertEquals("local-model",pool.submit(c::activeLlmModel).get(5,TimeUnit.SECONDS));}catch(Exception failure){throw new RuntimeException(failure);}
                status.setRollbackOnly();return null;
            });
            assertEquals("local-model",c.activeLlmModel());assertEquals("local-model",client().activeLlmModel());
        } finally {pool.shutdownNow();}
    }
    @Test void actualHttpRequestAfterRecreationUsesPersistedModelAndRecordsResolvedName() throws Exception {
        AtomicReference<JsonNode> request=new AtomicReference<>();HttpServer server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/v1/chat/completions",exchange->{
            request.set(mapper.readTree(exchange.getRequestBody()));
            byte[] bytes="{\"model\":\"provider-resolved-fixture\",\"choices\":[{\"message\":{\"content\":\"{}\"}}]}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type","application/json");exchange.sendResponseHeaders(200,bytes.length);exchange.getResponseBody().write(bytes);exchange.close();
        });server.start();
        try {
            String base="http://127.0.0.1:"+server.getAddress().getPort()+"/v1";var before=client();
            before.updateSettings("CLOUD_OPENAI_COMPATIBLE","http://127.0.0.1:11434","local-model",base,"fixture-key","selected-fixture-model");
            var after=client();assertEquals("{}",after.callCloudOpenAi(after.getSettings(),"Fixture contract","Fixture input"));
            assertEquals("selected-fixture-model",request.get().path("model").asText());
            assertEquals("provider-resolved-fixture",after.lastModelTrace().get("resolvedModel"));
            assertFalse(after.lastModelTrace().toString().contains("fixture-key"));assertFalse(after.lastModelTrace().toString().contains("Fixture input"));
        } finally {server.stop(0);}
    }
}
