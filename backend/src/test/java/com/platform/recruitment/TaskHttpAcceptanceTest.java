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

/** Real HTTP + PostgreSQL + filesystem. Local MOCK mail is explicit; not SMTP/provider acceptance. */
@EnabledIfEnvironmentVariable(named="MIDCV_TASK_HTTP",matches="true")
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
    "app.worker-enabled=false","spring.jpa.open-in-view=false","app.email-mode=MOCK",
    "jwt.secret=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "jwt.expiration-ms=60000","jwt.refresh-expiration-ms=120000"})
class TaskHttpAcceptanceTest {
    static Path storage;
    @DynamicPropertySource static void isolated(DynamicPropertyRegistry properties) throws Exception {
        String url=System.getenv("DATABASE_URL");
        if(url==null || !url.matches("jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/midcv_task_[0-9a-f]+"))
            throw new IllegalStateException("Use Test-MidcvTaskHttp.ps1: only a new local midcv_task_<hex> database is allowed.");
        storage=Files.createTempDirectory("midcv-task-uploads-");
        properties.add("app.upload-dir",()->storage.toString()); properties.add("app.file-storage-path",()->storage.toString());
    }
    @Autowired TestRestTemplate http; @Autowired ObjectMapper json; @Autowired JdbcTemplate db;
    @Autowired UserRepository users; @Autowired CandidateProfileRepository candidates; @Autowired PasswordEncoder passwords;
    @Autowired EmailService email; @Autowired CompanyRepository companies; @Autowired RecruiterProfileRepository recruiters;
    @Autowired JobRepository jobs; @Autowired CVRepository cvs; @Autowired CVVersionRepository versions;
    @Autowired ApplicationRepository applications; @Autowired MatchResultRepository results;
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
    @Test void tokenSeparationRotationReplayRevocationAndSessionPrivacy() throws Exception {
        JsonNode first=login(user); String access=first.path("accessToken").asText(); String refresh=first.path("refreshToken").asText();
        assertEquals(401,call(HttpMethod.GET,"/api/v1/candidate/profile",null,refresh).getStatusCode().value());
        assertEquals(401,call(HttpMethod.POST,"/api/v1/auth/refresh",Map.of("refreshToken",access),null).getStatusCode().value());
        var listed=call(HttpMethod.GET,"/api/v1/auth/sessions",null,access);
        assertEquals(200,listed.getStatusCode().value()); assertFalse(listed.getBody().contains(refresh)); assertFalse(listed.getBody().contains("refresh_hash"));
        var rotated=call(HttpMethod.POST,"/api/v1/auth/refresh",Map.of("refreshToken",refresh),null);assertEquals(200,rotated.getStatusCode().value());
        String replacement=data(rotated).path("refreshToken").asText();assertNotEquals(refresh,replacement);
        assertEquals(401,call(HttpMethod.POST,"/api/v1/auth/refresh",Map.of("refreshToken",refresh),null).getStatusCode().value());
        assertEquals(401,call(HttpMethod.GET,"/api/v1/candidate/profile",null,data(rotated).path("accessToken").asText()).getStatusCode().value());
        assertEquals(401,call(HttpMethod.POST,"/api/v1/auth/refresh",Map.of("refreshToken",replacement),null).getStatusCode().value());
    }
    @Test void expiryAndLogoutAreEnforcedByRealHttpFilter() throws Exception {
        JsonNode auth=login(user);String access=auth.path("accessToken").asText();
        var tokenProvider=new JwtTokenProvider("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",-1000,-1000);
        String expired=tokenProvider.generateAccessToken(user.getId(),user.getEmail(),user.getRole());
        assertEquals(401,call(HttpMethod.GET,"/api/v1/candidate/profile",null,expired).getStatusCode().value());
        assertEquals(401,call(HttpMethod.GET,"/api/v1/auth/sessions",null,null).getStatusCode().value());
        assertEquals(200,call(HttpMethod.POST,"/api/v1/auth/logout",null,access).getStatusCode().value());
        assertEquals(401,call(HttpMethod.GET,"/api/v1/candidate/profile",null,access).getStatusCode().value());
    }
    @Test void passwordResetIsSingleUseAndInvalidatesAllSessions() throws Exception {
        String before=access();
        assertEquals(200,call(HttpMethod.POST,"/api/v1/auth/forgot-password",Map.of("email",user.getEmail()),null).getStatusCode().value());
        String token=email.getLastSentTokenForDev("reset:"+user.getEmail());assertNotNull(token,"MOCK local mail callback must run after commit");
        assertEquals(Documents.shaHex(token),db.queryForObject("SELECT token_hash FROM password_reset_tokens WHERE user_id=? AND used_at IS NULL",String.class,user.getId()));
        String replacement="Replacement#Task2026";
        assertEquals(200,call(HttpMethod.POST,"/api/v1/auth/reset-password",Map.of("token",token,"password",replacement),null).getStatusCode().value());
        assertEquals(400,call(HttpMethod.POST,"/api/v1/auth/reset-password",Map.of("token",token,"password",replacement),null).getStatusCode().value());
        assertEquals(401,call(HttpMethod.GET,"/api/v1/candidate/profile",null,before).getStatusCode().value());
        assertEquals(401,call(HttpMethod.POST,"/api/v1/auth/login",Map.of("email",user.getEmail(),"password",password),null).getStatusCode().value());
        assertEquals(200,call(HttpMethod.POST,"/api/v1/auth/login",Map.of("email",user.getEmail(),"password",replacement),null).getStatusCode().value());
    }
    ResponseEntity<String> upload(String token,byte[] bytes) {
        var form=new LinkedMultiValueMap<String,Object>(); form.add("file",new ByteArrayResource(bytes){@Override public String getFilename(){return "fixture.pdf";}}); form.add("title","HTTP acceptance CV");
        HttpHeaders headers=new HttpHeaders();headers.setContentType(MediaType.MULTIPART_FORM_DATA);headers.setBearerAuth(token);
        var response=http.postForEntity("/api/v1/candidate/cvs/upload",new HttpEntity<>(form,headers),String.class);
        System.out.println("HTTP_ACCEPTANCE POST /candidate/cvs/upload status="+response.getStatusCode().value()+" requestId="+response.getHeaders().getFirst("X-Request-ID"));return response;
    }
    long fileCount() throws Exception {try(var files=Files.list(storage)){return files.count();}}
    @Test void uploadCreatesMatchingFileAndDbRowsAndRejectsSpoofedInput() throws Exception {
        byte[] bytes=Files.readAllBytes(Path.of("../test-fixtures/synthetic/01_single_column_tech_cv.pdf"));String token=access();
        var response=upload(token,bytes);assertEquals(202,response.getStatusCode().value());assertNotNull(response.getHeaders().getFirst("X-Request-ID"));
        Map<String,Object> row=db.queryForMap("SELECT v.storage_key,v.source_sha FROM document_versions v JOIN documents d ON d.id=v.document_id WHERE d.owner_id=?",user.getId());
        assertEquals(Documents.shaHex(bytes),row.get("source_sha"));assertArrayEquals(bytes,Files.readAllBytes(storage.resolve((String)row.get("storage_key"))));
        long before=fileCount();assertEquals(400,upload(token,"fake PDF".getBytes()).getStatusCode().value());assertEquals(before,fileCount());
    }
    @Test void dbFailureAfterFileWriteRollsBackFileDocumentJobAndCv() throws Exception {
        String token=access();long files=fileCount();String constraint="ac_task_"+UUID.randomUUID().toString().replace("-","");
        db.execute("ALTER TABLE cvs ADD CONSTRAINT "+constraint+" CHECK(candidate_id <> '"+candidate.getId()+"'::uuid)");
        try {
            var response=upload(token,Files.readAllBytes(Path.of("../test-fixtures/synthetic/01_single_column_tech_cv.pdf")));assertTrue(response.getStatusCode().isError());
            assertEquals(files,fileCount());assertEquals(0L,db.queryForObject("SELECT count(*) FROM documents WHERE owner_id=?",Long.class,user.getId()));
            assertEquals(0L,db.queryForObject("SELECT count(*) FROM processing_jobs WHERE owner_id=?",Long.class,user.getId()));
            assertEquals(0L,db.queryForObject("SELECT count(*) FROM cvs WHERE candidate_id=?",Long.class,candidate.getId()));
        } finally { db.execute("ALTER TABLE cvs DROP CONSTRAINT "+constraint); }
    }
    @Test void unavailableStorageReturnsTraceableErrorWithoutPartialDbRows() throws Exception {
        String token=access();Path backup=storage.resolveSibling(storage.getFileName()+"-backup");Files.move(storage,backup);Files.writeString(storage,"storage deliberately unavailable");
        try {
            var response=upload(token,Files.readAllBytes(Path.of("../test-fixtures/synthetic/01_single_column_tech_cv.pdf")));assertEquals(500,response.getStatusCode().value());
            assertTrue(response.getBody().contains("FILE_STORAGE_FAILED"));assertNotNull(response.getHeaders().getFirst("X-Request-ID"));
            assertEquals(0L,db.queryForObject("SELECT count(*) FROM documents WHERE owner_id=?",Long.class,user.getId()));
        } finally {Files.delete(storage);Files.move(backup,storage);}
    }
    @Test void rankingInspectionAndCompanySuspensionReadWorkWithoutOsiv() throws Exception {
        User hr=users.saveAndFlush(User.builder().email("hr-"+UUID.randomUUID()+"@example.invalid").passwordHash(passwords.encode(password)).role(Role.HR).emailVerified(true).build());
        Company company=companies.saveAndFlush(Company.builder().name("Fixture company").verificationStatus(CompanyVerification.VERIFIED).build());
        recruiters.saveAndFlush(RecruiterProfile.builder().user(hr).company(company).fullName("Fixture recruiter").build());
        Job job=jobs.saveAndFlush(Job.builder().company(company).title("Fixture job").industry("Technology").seniority("Junior").description("Java developer fixture").status(JobStatus.PUBLISHED).build());
        CV cv=cvs.saveAndFlush(CV.builder().candidate(candidate).title("Fixture CV").creationPath(CVCreationPath.BUILDER).status("CONFIRMED").build());
        CVVersion version=versions.saveAndFlush(CVVersion.builder().cv(cv).title("Fixture v1").versionNumber(1).status("CONFIRMED").structuredJsonContent("{\"skills\":[\"Java\"],\"summary\":\"Java developer\"}").build());
        Application application=applications.saveAndFlush(Application.builder().candidate(candidate).job(job).appliedCv(cv).appliedCvVersion(version).build());
        results.saveAndFlush(MatchResult.builder().application(application).coreScore(new BigDecimal("60")).overallScore(new BigDecimal("60")).status("COMPLETED").build());
        String token=login(hr).path("accessToken").asText();
        assertEquals(200,call(HttpMethod.GET,"/api/v1/jobs/"+job.getId(),null,null).getStatusCode().value());
        assertEquals(200,call(HttpMethod.GET,"/api/v1/matching/jobs/"+job.getId()+"/rankings",null,token).getStatusCode().value());
        assertEquals(200,call(HttpMethod.GET,"/api/v1/matching/applications/"+application.getId()+"/inspection",null,token).getStatusCode().value());
        assertEquals(200,call(HttpMethod.GET,"/api/v1/suspensions/my-active",null,token).getStatusCode().value());
    }

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
    @Test void businessConcurrentApplyHasOneWinnerAndImmutableSnapshot() throws Exception {
        Hiring h=hiring("CONFIRMED");String token=access();var body=Map.of("jobId",h.job().getId(),"cvId",h.cv().getId());
        try(var pool=java.util.concurrent.Executors.newFixedThreadPool(6)) {
            var futures=new ArrayList<java.util.concurrent.Future<Integer>>();
            for(int i=0;i<6;i++) futures.add(pool.submit(()->call(HttpMethod.POST,"/api/v1/candidate/applications",body,token).getStatusCode().value()));
            var statuses=new ArrayList<Integer>();for(var f:futures)statuses.add(f.get(60,java.util.concurrent.TimeUnit.SECONDS));
            assertEquals(1,statuses.stream().filter(v->v==201).count());assertEquals(5,statuses.stream().filter(v->v==409).count());
        }
        UUID application=applications.findByJobIdAndCandidateId(h.job().getId(),candidate.getId()).orElseThrow().getId();
        String before=db.queryForObject("SELECT structured_json_snapshot FROM application_cv_snapshots WHERE application_id=?",String.class,application);
        assertThrows(org.springframework.dao.DataAccessException.class,()->db.update("UPDATE application_cv_snapshots SET cv_title='tampered' WHERE application_id=?",application));
        assertEquals(200,call(HttpMethod.PUT,"/api/v1/candidate/cvs/"+h.cv().getId()+"/draft",Map.of("summary",Map.of("value","Updated professional profile")),token).getStatusCode().value());
        assertEquals(before,db.queryForObject("SELECT structured_json_snapshot FROM application_cv_snapshots WHERE application_id=?",String.class,application));
        assertEquals(409,call(HttpMethod.DELETE,"/api/v1/candidate/cvs/"+h.cv().getId(),null,token).getStatusCode().value());
    }
    @Test void businessDraftCannotApplyAndCandidateCannotManageJobs() throws Exception {
        Hiring h=hiring("DRAFT");String token=access();
        assertEquals(400,call(HttpMethod.POST,"/api/v1/candidate/applications",Map.of("jobId",h.job().getId(),"cvId",h.cv().getId()),token).getStatusCode().value());
        assertEquals(403,call(HttpMethod.POST,"/api/v1/jobs/"+h.job().getId()+"/close",null,token).getStatusCode().value());
        assertEquals(403,call(HttpMethod.DELETE,"/api/v1/jobs/"+h.job().getId(),null,token).getStatusCode().value());
    }
    @Test void businessDecisionAuditAndStaleUpdateAreAtomic() throws Exception {
        Hiring h=hiring("CONFIRMED");String token=access();
        var submitted=call(HttpMethod.POST,"/api/v1/candidate/applications",Map.of("jobId",h.job().getId(),"cvId",h.cv().getId()),token);assertEquals(201,submitted.getStatusCode().value());
        UUID id=UUID.fromString(data(submitted).path("id").asText());String hr=login(h.hr()).path("accessToken").asText();
        String path="/api/v1/recruiter/applications/"+id+"/status";
        assertEquals(200,call(HttpMethod.PUT,path,Map.of("status","SHORTLISTED","expectedStatus","SUBMITTED","decisionNote","HR reviewed evidence"),hr).getStatusCode().value());
        assertEquals(409,call(HttpMethod.PUT,path,Map.of("status","REJECTED","expectedStatus","SUBMITTED"),hr).getStatusCode().value());
        assertEquals(200,call(HttpMethod.PUT,path,Map.of("status","SHORTLISTED","expectedStatus","SHORTLISTED"),hr).getStatusCode().value());
        assertEquals(1,db.queryForObject("SELECT COUNT(*) FROM application_audit_logs WHERE application_id=?",Integer.class,id));
        assertEquals("SUBMITTED",db.queryForObject("SELECT previous_status FROM application_audit_logs WHERE application_id=?",String.class,id));
        assertEquals("SHORTLISTED",db.queryForObject("SELECT new_status FROM application_audit_logs WHERE application_id=?",String.class,id));
    }
    @Test void businessChatRetryBlockReadAndCompanyOwnership() throws Exception {
        Hiring h=hiring("CONFIRMED");String candidateToken=access();
        var submitted=call(HttpMethod.POST,"/api/v1/candidate/applications",Map.of("jobId",h.job().getId(),"cvId",h.cv().getId()),candidateToken);assertEquals(201,submitted.getStatusCode().value());
        String application=data(submitted).path("id").asText(),hr=login(h.hr()).path("accessToken").asText();
        var opened=call(HttpMethod.POST,"/api/v1/inbox/conversations",Map.of("applicationId",application),hr);assertEquals(200,opened.getStatusCode().value());
        String conversation=data(opened).path("id").asText();
        // The controller returns a UUID directly if no summary envelope is used.
        if(conversation.isBlank())conversation=data(opened).asText();
        String path="/api/v1/inbox/conversations/"+conversation;UUID nonce=UUID.randomUUID();var payload=Map.of("clientId",nonce,"body","Xin chào ứng viên");
        var sent=call(HttpMethod.POST,path+"/messages",payload,hr);assertEquals(200,sent.getStatusCode().value());
        var retry=call(HttpMethod.POST,path+"/messages",payload,hr);assertEquals(data(sent).path("id"),data(retry).path("id"));
        assertEquals(409,call(HttpMethod.POST,path+"/messages",Map.of("clientId",nonce,"body","Different body"),hr).getStatusCode().value());
        assertEquals(1,data(call(HttpMethod.GET,"/api/v1/inbox/unread",null,candidateToken)).path("messages").asInt());
        assertEquals(200,call(HttpMethod.POST,path+"/read",Map.of("through",data(sent).path("id").asText()),candidateToken).getStatusCode().value());
        assertEquals(0,data(call(HttpMethod.GET,"/api/v1/inbox/unread",null,candidateToken)).path("messages").asInt());
        assertEquals(200,call(HttpMethod.POST,path+"/action",Map.of("action","block"),candidateToken).getStatusCode().value());
        assertEquals(403,call(HttpMethod.POST,path+"/messages",Map.of("clientId",UUID.randomUUID(),"body","Blocked send"),hr).getStatusCode().value());
        assertEquals(404,call(HttpMethod.GET,path+"/messages",null,login(actor(Role.HR)).path("accessToken").asText()).getStatusCode().value());
    }
    @Test void businessDraftJobCrudOtherSalaryAndServerSearch() throws Exception {
        Hiring h=hiring("CONFIRMED");String hr=login(h.hr()).path("accessToken").asText();String title="TaskSearch"+UUID.randomUUID();
        Map<String,Object> body=new LinkedHashMap<>(Map.of("title",title,"industry","OTHER","industryOther","Công nghệ mới","seniority","OTHER","seniorityOther","Chuyên gia","description","Java backend","employmentType","OTHER","employmentTypeOther","Dự án","salaryCurrency","USD"));
        body.put("minSalary",1000);body.put("maxSalary",2000);
        var created=call(HttpMethod.POST,"/api/v1/jobs/draft",body,hr);assertEquals(201,created.getStatusCode().value());String id=data(created).path("id").asText();
        assertEquals(200,call(HttpMethod.PUT,"/api/v1/jobs/"+id,body,hr).getStatusCode().value());
        assertEquals(200,call(HttpMethod.POST,"/api/v1/jobs/"+id+"/publish",null,hr).getStatusCode().value());
        var found=call(HttpMethod.GET,"/api/v1/jobs?query="+title,null,null);assertEquals(200,found.getStatusCode().value());
        assertEquals(1,data(found).path("totalElements").asInt());assertEquals("USD",data(found).path("content").get(0).path("salaryCurrency").asText());
        assertEquals(409,call(HttpMethod.DELETE,"/api/v1/jobs/"+id,null,hr).getStatusCode().value());
        assertEquals(200,call(HttpMethod.POST,"/api/v1/jobs/"+id+"/close",null,hr).getStatusCode().value());
        var draft=call(HttpMethod.POST,"/api/v1/jobs/draft",body,hr);assertEquals(200,call(HttpMethod.DELETE,"/api/v1/jobs/"+data(draft).path("id").asText(),null,hr).getStatusCode().value());
    }

    @Test void businessEvidenceHashAndPermissionMatrix() throws Exception {
        Hiring h=hiring("DRAFT");UUID certificate=UUID.randomUUID();
        h.version().setStructuredJsonContent("{\"summary\":\"Java backend\",\"certifications\":[{\"id\":\""+certificate+"\",\"name\":\"Fixture certificate\"}]}");versions.saveAndFlush(h.version());
        byte[] bytes="%PDF-1.7\nDurable evidence fixture".getBytes(java.nio.charset.StandardCharsets.UTF_8);String candidateToken=access();
        var parts=new LinkedMultiValueMap<String,Object>();parts.add("file",new ByteArrayResource(bytes){@Override public String getFilename(){return "certificate.pdf";}});parts.add("itemType","CERTIFICATION");parts.add("itemId",certificate.toString());
        var headers=new HttpHeaders();headers.setBearerAuth(candidateToken);headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        var uploaded=http.postForEntity("/api/v1/candidate/cvs/"+h.cv().getId()+"/attachments",new HttpEntity<>(parts,headers),String.class);
        assertEquals(201,uploaded.getStatusCode().value());JsonNode metadata=data(uploaded);
        assertEquals(bytes.length,metadata.path("file_size").asInt());assertEquals(Documents.shaHex(bytes),metadata.path("sha256").asText());
        String path=metadata.path("preview_url").asText();
        assertEquals(403,call(HttpMethod.GET,path,null,login(h.hr()).path("accessToken").asText()).getStatusCode().value());
        h.version().setStatus("CONFIRMED");h.version().setStructuredJsonContent(db.queryForObject("SELECT structured_json_content FROM cv_versions WHERE id=?",String.class,h.version().getId()));versions.saveAndFlush(h.version());
        Application app=applications.saveAndFlush(Application.builder().candidate(candidate).job(h.job()).appliedCv(h.cv()).appliedCvVersion(h.version()).status(ApplicationStatus.SUBMITTED).build());
        db.update("INSERT INTO application_cv_snapshots(id,application_id,cv_title,raw_text_snapshot,structured_json_snapshot) VALUES(?,?,?,?,?)",UUID.randomUUID(),app.getId(),"Fixture","Java backend",h.version().getStructuredJsonContent());
        for(String token:List.of(candidateToken,login(h.hr()).path("accessToken").asText(),login(actor(Role.ADMIN)).path("accessToken").asText())){
            HttpHeaders auth=new HttpHeaders();auth.setBearerAuth(token);var response=http.exchange(path,HttpMethod.GET,new HttpEntity<>(auth),byte[].class);
            assertEquals(200,response.getStatusCode().value());assertArrayEquals(bytes,response.getBody());assertEquals("nosniff",response.getHeaders().getFirst("X-Content-Type-Options"));
        }
        assertEquals(403,call(HttpMethod.GET,path,null,login(actor(Role.HR)).path("accessToken").asText()).getStatusCode().value());
        assertEquals(403,call(HttpMethod.GET,path,null,login(actor(Role.CANDIDATE)).path("accessToken").asText()).getStatusCode().value());
    }
    @Test void businessAdminUserCountsAndRoleMatrix() throws Exception {
        User admin=actor(Role.ADMIN);String token=login(admin).path("accessToken").asText();
        var response=call(HttpMethod.GET,"/api/v1/admin/users?size=1",null,token);assertEquals(200,response.getStatusCode().value());
        assertEquals(db.queryForObject("SELECT COUNT(*) FROM users",Long.class).longValue(),data(response).path("totalElements").asLong());
        assertTrue(data(response).path("content").size()<=1);
        assertEquals(403,call(HttpMethod.GET,"/api/v1/admin/users",null,access()).getStatusCode().value());
        assertEquals(401,call(HttpMethod.GET,"/api/v1/admin/users",null,null).getStatusCode().value());
        assertEquals(403,call(HttpMethod.POST,"/api/v1/jobs/draft",Map.of(),token).getStatusCode().value());
    }
    @Test void businessCompanySuspensionAppealAndAudit() throws Exception {
        Hiring h=hiring("CONFIRMED");User admin=actor(Role.ADMIN);String adminToken=login(admin).path("accessToken").asText(),hr=login(h.hr()).path("accessToken").asText();
        assertEquals(200,call(HttpMethod.POST,"/api/v1/admin/companies/"+h.company().getId()+"/verification/suspend",Map.of("reason","Disposable acceptance suspension"),adminToken).getStatusCode().value());
        assertEquals(403,call(HttpMethod.POST,"/api/v1/jobs/"+h.job().getId()+"/publish",null,hr).getStatusCode().value());
        var submitted=call(HttpMethod.POST,"/api/v1/recruiter/appeals",Map.of("subject","Request review","content","Please review the fixture suspension"),hr);assertEquals(201,submitted.getStatusCode().value());
        String appeal=data(submitted).path("id").asText();
        assertEquals(409,call(HttpMethod.POST,"/api/v1/recruiter/appeals",Map.of("subject","Duplicate","content","Duplicate open appeal"),hr).getStatusCode().value());
        assertEquals(200,call(HttpMethod.POST,"/api/v1/admin/appeals/"+appeal+"/review",null,adminToken).getStatusCode().value());
        assertEquals(200,call(HttpMethod.POST,"/api/v1/admin/appeals/"+appeal+"/approve",Map.of("resolutionNote","Evidence reviewed; lift suspension"),adminToken).getStatusCode().value());
        assertEquals("ACTIVE",db.queryForObject("SELECT operational_status FROM companies WHERE id=?",String.class,h.company().getId()));
        assertTrue(db.queryForObject("SELECT COUNT(*) FROM admin_audit_logs WHERE target_id=?",Integer.class,h.company().getId())>=2);
    }
}
