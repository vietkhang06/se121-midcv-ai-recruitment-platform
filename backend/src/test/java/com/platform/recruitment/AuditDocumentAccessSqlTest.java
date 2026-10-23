package com.platform.recruitment;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.document.Documents;
import com.platform.recruitment.event.Events;
import com.platform.recruitment.worker.JobQueue;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import java.nio.file.Path;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Executes the production authorization SQL against H2; not a PostgreSQL/pgvector acceptance test. */
class AuditDocumentAccessSqlTest {
    @TempDir Path storage;
    JdbcTemplate jdbc; Documents documents; JobQueue queue;
    UUID owner=UUID.randomUUID(),foreign=UUID.randomUUID(),hr=UUID.randomUUID(),otherHr=UUID.randomUUID();
    UUID company=UUID.randomUUID(),job=UUID.randomUUID(),doc=UUID.randomUUID(),version=UUID.randomUUID();
    @BeforeEach void setup() throws Exception {
        var ds=new DriverManagerDataSource("jdbc:h2:mem:"+UUID.randomUUID()+";MODE=PostgreSQL;DB_CLOSE_DELAY=-1","sa","");
        jdbc=new JdbcTemplate(ds);
        jdbc.execute("CREATE TABLE documents(id UUID PRIMARY KEY,owner_id UUID,kind VARCHAR,title VARCHAR)");
        jdbc.execute("CREATE TABLE document_versions(id UUID PRIMARY KEY,document_id UUID,version_no INT,filename VARCHAR,storage_key VARCHAR,media_type VARCHAR,size_bytes BIGINT,raw_text VARCHAR,normalized VARCHAR,state VARCHAR,error_code VARCHAR,error_message VARCHAR,created_at TIMESTAMP,extraction_method VARCHAR,llm_model VARCHAR,embedding_model VARCHAR,pipeline_version VARCHAR)");
        jdbc.execute("CREATE TABLE jobs(id UUID PRIMARY KEY,company_id UUID)");
        jdbc.execute("CREATE TABLE recruiter_profiles(user_id UUID,company_id UUID)");
        jdbc.execute("CREATE TABLE applications(id UUID PRIMARY KEY,job_id UUID,applied_cv_version_id UUID)");
        jdbc.execute("CREATE TABLE screening_runs(id UUID PRIMARY KEY,job_id UUID,cv_version_id UUID,jd_version_id UUID)");
        jdbc.execute("CREATE TABLE processing_jobs(id UUID PRIMARY KEY,owner_id UUID,kind VARCHAR,entity_id UUID)");
        jdbc.update("INSERT INTO documents VALUES (?,?,?,?)",doc,owner,"CV","Synthetic CV");
        jdbc.update("INSERT INTO document_versions(id,document_id) VALUES (?,?)",version,doc);
        jdbc.update("INSERT INTO jobs VALUES (?,?)",job,company);
        jdbc.update("INSERT INTO recruiter_profiles VALUES (?,?)",hr,company);
        jdbc.update("INSERT INTO recruiter_profiles VALUES (?,?)",otherHr,UUID.randomUUID());
        queue=new JobQueue(jdbc,mock(Events.class),new DataSourceTransactionManager(ds));
        documents=new Documents(jdbc,queue,mock(Events.class),storage.toString());
    }
    @Test void ownerAllowedAndForeignCandidateDenied() {
        assertEquals(version,documents.accessibleVersion(version,new JobQueue.Actor(owner,"CANDIDATE")).get("id"));
        assertThrows(CustomException.class,()->documents.accessibleVersion(version,new JobQueue.Actor(foreign,"CANDIDATE")));
    }
    @Test void hrCanAccessOnlyAppliedVersionForTheirCompany() {
        jdbc.update("INSERT INTO applications VALUES (?,?,?)",UUID.randomUUID(),job,version);
        assertEquals(version,documents.accessibleVersion(version,new JobQueue.Actor(hr,"HR")).get("id"));
        assertThrows(CustomException.class,()->documents.accessibleVersion(version,new JobQueue.Actor(otherHr,"HR")));
    }
    @Test void unrelatedJdIsNotGrantedByExistenceOfAnOpenJob() {
        jdbc.update("UPDATE documents SET kind='JD' WHERE id=?",doc);
        assertThrows(CustomException.class,()->documents.accessibleVersion(version,new JobQueue.Actor(foreign,"CANDIDATE")));
        jdbc.update("INSERT INTO screening_runs VALUES (?,?,?,?)",UUID.randomUUID(),job,UUID.randomUUID(),version);
        assertEquals(version,documents.accessibleVersion(version,new JobQueue.Actor(hr,"HR")).get("id"));
        assertThrows(CustomException.class,()->documents.accessibleVersion(version,new JobQueue.Actor(otherHr,"HR")));
    }
    @Test void applicationTaskAuthorizationUsesCompanyRelation() {
        UUID app=UUID.randomUUID(),task=UUID.randomUUID();
        jdbc.update("INSERT INTO applications VALUES (?,?,?)",app,job,version);
        jdbc.update("INSERT INTO processing_jobs VALUES (?,?,?,?)",task,owner,"MATCH",app);
        assertEquals(task,queue.authorized(task,new JobQueue.Actor(hr,"HR")).get("id"));
        assertThrows(CustomException.class,()->queue.authorized(task,new JobQueue.Actor(otherHr,"HR")));
    }
    @Test void screeningTaskAuthorizationUsesCompanyRelation() {
        UUID screen=UUID.randomUUID(),task=UUID.randomUUID();
        jdbc.update("INSERT INTO screening_runs VALUES (?,?,?,?)",screen,job,version,UUID.randomUUID());
        jdbc.update("INSERT INTO processing_jobs VALUES (?,?,?,?)",task,owner,"SCREEN_MATCH",screen);
        assertEquals(task,queue.authorized(task,new JobQueue.Actor(hr,"HR")).get("id"));
        assertThrows(CustomException.class,()->queue.authorized(task,new JobQueue.Actor(otherHr,"HR")));
    }
}
