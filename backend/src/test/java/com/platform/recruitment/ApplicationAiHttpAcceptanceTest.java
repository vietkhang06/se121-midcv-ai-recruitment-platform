package com.platform.recruitment;

import com.fasterxml.jackson.databind.*;
import com.platform.recruitment.auth.*;
import com.platform.recruitment.candidate.*;
import com.platform.recruitment.company.*;
import com.platform.recruitment.cv.*;
import com.platform.recruitment.document.Documents;
import com.platform.recruitment.email.EmailService;
import com.platform.recruitment.job.*;
import com.platform.recruitment.application.*;
import com.platform.recruitment.matching.*;
import com.platform.recruitment.user.*;
import com.platform.recruitment.admin.model.ReportStatus;
import com.platform.recruitment.admin.model.ReportTargetType;
import com.platform.recruitment.admin.model.SystemReport;
import com.platform.recruitment.admin.repository.SystemReportRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.*;
import org.springframework.util.LinkedMultiValueMap;
import java.nio.file.*;
import java.util.*;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;

/** Opt-in HTTP + PostgreSQL transaction test on a newly created isolated database.
 * Worker and mail provider disabled; queue failure is injected only into this fixture's MATCH insert. */
@EnabledIfEnvironmentVariable(named="MIDCV_APP_AI_HTTP",matches="true")
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
    "app.worker-enabled=false","spring.jpa.open-in-view=false","app.email-mode=MOCK",
    "jwt.secret=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "jwt.expiration-ms=600000","jwt.refresh-expiration-ms=1200000"})
class ApplicationAiHttpAcceptanceTest {
    @DynamicPropertySource static void isolated(DynamicPropertyRegistry properties) throws Exception {
        String url=System.getenv("DATABASE_URL");
        if(url==null || !url.matches("jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/midcv_app_ai_[0-9a-f]+"))
            throw new IllegalStateException("Use Test-MidcvAppAi.ps1 with a fresh local database only.");
        Path storage=Files.createTempDirectory("midcv-app-ai-uploads-");
        properties.add("app.upload-dir",()->storage.toString()); properties.add("app.file-storage-path",()->storage.toString());
    }
    @Autowired TestRestTemplate http; @Autowired ObjectMapper json; @Autowired JdbcTemplate db;
    @Autowired UserRepository users; @Autowired CandidateProfileRepository candidates; @Autowired PasswordEncoder passwords;
    @Autowired EmailService email; @Autowired CompanyRepository companies; @Autowired RecruiterProfileRepository recruiters;
    @Autowired JobRepository jobs; @Autowired CVRepository cvs; @Autowired CVVersionRepository versions;
    @Autowired ApplicationRepository applications; @Autowired MatchResultRepository results;
    @Autowired SystemReportRepository reports;
    @Autowired Documents documents;
    @Autowired ApplicationAiDispatch dispatcher;
    User user; CandidateProfile candidate;
    final String password="Task-Fixture#2026";
    @BeforeEach void fixture() {
        user=users.saveAndFlush(User.builder().email("task-"+UUID.randomUUID()+"@example.invalid").passwordHash(passwords.encode(password)).role(Role.CANDIDATE).emailVerified(true).build());
        candidate=candidates.saveAndFlush(CandidateProfile.builder().user(user).fullName("Task acceptance fixture").build());
    }
    ResponseEntity<String> call(HttpMethod method,String path,Object body,String token) throws Exception {
        HttpHeaders headers=new HttpHeaders(); headers.setContentType(MediaType.APPLICATION_JSON); if(token!=null) headers.setBearerAuth(token);
        ResponseEntity<String> response=http.exchange(path,method,new HttpEntity<>(body==null?null:json.writeValueAsString(body),headers),String.class);
        System.out.println("HTTP_ACCEPTANCE "+method+" "+path+" status="+response.getStatusCode().value()+" requestId="+response.getHeaders().getFirst("X-Request-ID"));
        return response;
    }
    JsonNode data(ResponseEntity<String> response) throws Exception { return json.readTree(response.getBody()).path("data"); }
    JsonNode login(User actor) throws Exception {
        var response=call(HttpMethod.POST,"/api/v1/auth/login",Map.of("email",actor.getEmail(),"password",password),null);
        assertEquals(200,response.getStatusCode().value());return data(response);
    }
    String access() throws Exception { return login(user).path("accessToken").asText(); }
    User actor(Role role) {
        return users.saveAndFlush(User.builder().email("business-"+UUID.randomUUID()+"@example.invalid")
                .passwordHash(passwords.encode(password)).role(role).emailVerified(true).build());
    }
    record Hiring(User hr, Company company, Job job, CV cv, CVVersion version) {}
    Hiring hiring(String versionStatus) {
        User hr=actor(Role.HR);
        Company company=companies.saveAndFlush(Company.builder().name("Acceptance "+UUID.randomUUID())
                .verificationStatus(CompanyVerification.VERIFIED).operationalStatus(CompanyOperationalStatus.ACTIVE).build());
        recruiters.saveAndFlush(RecruiterProfile.builder().user(hr).company(company).fullName("HR fixture").build());
        Job job=jobs.saveAndFlush(Job.builder().company(company).title("Java "+UUID.randomUUID()).industry("TECHNOLOGY")
                .seniority("JUNIOR").description("Java backend Spring Boot").status(JobStatus.PUBLISHED).location("Hồ Chí Minh").build());
        CV cv=cvs.saveAndFlush(CV.builder().candidate(candidate).title("Business CV").status(versionStatus).creationPath(CVCreationPath.BUILDER).build());
        CVVersion version=versions.saveAndFlush(CVVersion.builder().cv(cv).versionNumber(1).title("CV v1").status(versionStatus)
                .rawTextContent("Java backend").structuredJsonContent("{\"summary\":\"Java Spring Boot backend\",\"skills\":[{\"name\":\"Java\"}]}").build());
        return new Hiring(hr,company,job,cv,version);
    }
    private static final String APPLY = "/api/v1/candidate/applications";
    private long count(String sql, Object... args) { return db.queryForObject(sql, Long.class, args); }
    private Map<String,Object> selected(Hiring h, boolean consent) {
        return Map.of("jobId",h.job().getId(),"cvId",h.cv().getId(),"aiAnalysisConsent",consent,
                "expectedCvVersionId",h.version().getId());
    }

    @Test void previewGuardsRevisionsAndDurableDispatchSurvivesQueueFailure() throws Exception {
        Hiring h=hiring("CONFIRMED"); String token=access();
        UUID jobId=h.job().getId();
        var declinedPreview=call(HttpMethod.POST,APPLY+"/match-preview",selected(h,false),token);
        assertEquals(400,declinedPreview.getStatusCode().value());
        User otherActor=actor(Role.CANDIDATE);
        candidates.saveAndFlush(CandidateProfile.builder().user(otherActor).fullName("Other candidate").build());
        String other=login(otherActor).path("accessToken").asText();
        // Authenticated candidate with a separate profile cannot preview the first candidate’s CV.
        assertTrue(call(HttpMethod.POST,APPLY+"/match-preview",selected(h,true),other).getStatusCode().is4xxClientError());
        var stale=new HashMap<>(selected(h,true));stale.put("expectedCvVersionId",UUID.randomUUID());
        assertEquals(409,call(HttpMethod.POST,APPLY,stale,token).getStatusCode().value());
        stale=new HashMap<>(selected(h,true));stale.put("expectedJobRevision","stale");
        assertEquals(409,call(HttpMethod.POST,APPLY,stale,token).getStatusCode().value());
        assertEquals(0L,count("SELECT count(*) FROM applications WHERE job_id=?",jobId));

        var submitted=call(HttpMethod.POST,APPLY,selected(h,true),token);
        assertEquals(201,submitted.getStatusCode().value(),submitted.getBody());
        var body=data(submitted);UUID id=UUID.fromString(body.path("id").asText());
        assertEquals("SUBMITTED",body.path("status").asText());
        assertEquals("AI_WAITING_DISPATCH",body.path("aiProcessingStatus").asText());
        assertEquals(1L,count("SELECT count(*) FROM applications WHERE id=? AND ai_dispatch_pending AND ai_analysis_consent AND ai_policy_snapshot IS NOT NULL AND applied_jd_version_id IS NOT NULL",id));
        assertEquals(1L,count("SELECT count(*) FROM application_cv_snapshots WHERE application_id=?",id));
        assertEquals(0L,count("SELECT count(*) FROM processing_jobs WHERE kind='MATCH' AND entity_id=?",id));
        UUID jd=db.queryForObject("SELECT applied_jd_version_id FROM applications WHERE id=?",UUID.class,id);
        // Scope failure to this application; no production database or external provider is touched.
        db.execute("CREATE FUNCTION app_ai_fixture_queue_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='MATCH' AND NEW.entity_id='"+id+"'::uuid THEN RAISE EXCEPTION 'injected MATCH enqueue fault'; END IF; RETURN NEW; END; $$");
        try {
            db.execute("CREATE TRIGGER app_ai_fixture_queue_fault BEFORE INSERT ON processing_jobs FOR EACH ROW EXECUTE FUNCTION app_ai_fixture_queue_fault()");
            assertThrows(RuntimeException.class,dispatcher::dispatchOne);
            assertEquals(1L,count("SELECT count(*) FROM applications WHERE id=? AND ai_dispatch_pending",id));
            assertEquals(0L,count("SELECT count(*) FROM processing_jobs WHERE entity_id IN (?,?,?)",id,h.version().getId(),jd));
        } finally {
            db.execute("DROP TRIGGER IF EXISTS app_ai_fixture_queue_fault ON processing_jobs");
            db.execute("DROP FUNCTION IF EXISTS app_ai_fixture_queue_fault()");
        }
        dispatcher.dispatchOne();dispatcher.dispatchOne();
        assertEquals(1L,count("SELECT count(*) FROM applications WHERE id=? AND NOT ai_dispatch_pending",id));
        assertEquals(1L,count("SELECT count(*) FROM processing_jobs WHERE entity_id=? AND kind='MATCH'",id));
        assertEquals(2L,count("SELECT count(*) FROM processing_jobs WHERE entity_id IN (?,?) AND kind='EMBED'",h.version().getId(),jd));
        var detail=data(call(HttpMethod.GET,APPLY+"/"+id,null,token));
        assertEquals("SUBMITTED",detail.path("status").asText());
        assertEquals("AI_QUEUED",detail.path("aiProcessingStatus").asText());
        assertTrue(detail.path("matchScore").isNull() || detail.path("matchScore").isMissingNode());
        var inspection=call(HttpMethod.GET,"/api/v1/matching/applications/"+id+"/inspection",null,login(h.hr()).path("accessToken").asText());
        assertEquals(200,inspection.getStatusCode().value());
        assertEquals(0L,count("SELECT count(*) FROM match_results WHERE application_id=?",id));
        System.out.println("APP_AI_ACCEPTANCE application="+id+" cv="+h.version().getId()+" jd="+jd+" queue fault rolled back; application retained");
    }

    @Test void explicitDeclineAndPackageIneligibleStillCommitWithoutMatching() throws Exception {
        Hiring h=hiring("CONFIRMED");String token=access();
        var optOut=call(HttpMethod.POST,APPLY,selected(h,false),token);assertEquals(201,optOut.getStatusCode().value());
        UUID first=UUID.fromString(data(optOut).path("id").asText());
        assertEquals("CONSENT_NOT_GIVEN",data(optOut).path("aiProcessingStatus").asText());
        Hiring denied=hiring("CONFIRMED");
        db.update("UPDATE jobs SET ai_screening_policy_version=1,ai_screening_package_code=NULL WHERE id=?",denied.job().getId());
        assertEquals(403,call(HttpMethod.POST,APPLY+"/match-preview",selected(denied,true),token).getStatusCode().value());
        var second=call(HttpMethod.POST,APPLY,selected(denied,true),token);assertEquals(201,second.getStatusCode().value(),second.getBody());
        UUID secondId=UUID.fromString(data(second).path("id").asText());
        assertEquals("PACKAGE_NOT_ELIGIBLE",data(second).path("aiProcessingStatus").asText());
        assertEquals(2L,count("SELECT count(*) FROM applications WHERE id IN (?,?) AND NOT ai_dispatch_pending AND ai_scoring_eligible_snapshot=false",first,secondId));
        assertEquals(0L,count("SELECT count(*) FROM processing_jobs WHERE kind='MATCH' AND entity_id IN (?,?)",first,secondId));
    }
}
