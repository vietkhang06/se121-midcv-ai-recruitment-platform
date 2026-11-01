package com.platform.recruitment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.admin.model.*;
import com.platform.recruitment.admin.repository.*;
import com.platform.recruitment.admin.service.*;
import com.platform.recruitment.ai.*;
import com.platform.recruitment.application.*;
import com.platform.recruitment.auth.OAuthService;
import com.platform.recruitment.candidate.*;
import com.platform.recruitment.common.*;
import com.platform.recruitment.company.*;
import com.platform.recruitment.cv.*;
import com.platform.recruitment.document.Documents;
import com.platform.recruitment.github.*;
import com.platform.recruitment.job.*;
import com.platform.recruitment.matching.*;
import com.platform.recruitment.suspension.*;
import com.platform.recruitment.taxonomy.TaxonomyService;
import com.platform.recruitment.user.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** Regression tests with explicit repository/worker doubles; not live provider/DB acceptance. */
class BusinessTaskRegressionTest {
    @TempDir Path storage;
    User owner; CandidateProfile candidate; CV cv; CVVersion version;
    CVRepository cvs; CVVersionRepository versions; CandidateProfileRepository candidates;
    CVEvidenceAttachmentRepository attachments; JdbcTemplate db; Documents files;
    UUID item; ObjectMapper json = new ObjectMapper().findAndRegisterModules();
    @BeforeEach void setup() throws Exception {
        owner = user(Role.CANDIDATE);
        candidate = CandidateProfile.builder().user(owner).fullName("Fixture").build(); candidate.setId(UUID.randomUUID());
        cv = CV.builder().candidate(candidate).title("Fixture CV").build(); cv.setId(UUID.randomUUID());
        item = UUID.randomUUID();
        version = CVVersion.builder().cv(cv).versionNumber(1).title("CV v1").status("DRAFT")
                .structuredJsonContent("{\"summary\":\"Java backend\",\"certifications\":[{\"id\":\""+item+"\"}]} ").build();
        version.setId(UUID.randomUUID());
        cvs=mock(CVRepository.class); versions=mock(CVVersionRepository.class); candidates=mock(CandidateProfileRepository.class);
        attachments=mock(CVEvidenceAttachmentRepository.class); db=mock(JdbcTemplate.class); files=mock(Documents.class);
        when(candidates.findByUserId(owner.getId())).thenReturn(Optional.of(candidate));
        when(cvs.findById(cv.getId())).thenReturn(Optional.of(cv));
        when(cvs.findByIdForUpdate(cv.getId())).thenReturn(Optional.of(cv));
        when(versions.findByCvIdOrderByVersionNumberDesc(cv.getId())).thenReturn(List.of(version));
        when(versions.save(any())).thenAnswer(i->i.getArgument(0));
        when(attachments.save(any())).thenAnswer(i->i.getArgument(0));
        when(files.path(anyString())).thenAnswer(i->storage.resolve(i.getArgument(0,String.class)));
    }
    User user(Role role) { User u=User.builder().role(role).email("fixture@example.invalid").build(); u.setId(UUID.randomUUID()); return u; }
    CVService service() {
        CVService s = new CVService(cvs,versions,mock(CVSectionRepository.class),candidates,files,mock(TextReader.class),db,null,json);
        s.setCvEvidenceAttachmentRepository(attachments); return s;
    }
    MockMultipartFile pdf(String text) { return new MockMultipartFile("file","chung-chi.pdf","application/pdf",("%PDF-1.7\n"+text).getBytes(StandardCharsets.UTF_8)); }
    CVEvidenceAttachment evidence() throws Exception {
        byte[] bytes=pdf("evidence").getBytes();
        CVEvidenceAttachment a=CVEvidenceAttachment.builder().candidate(candidate).cv(cv).cvVersion(version)
                .itemType("CERTIFICATION").itemId(item.toString()).fileName("chung-chi.pdf").storageKey("evidence.pdf")
                .fileType("application/pdf").fileSize(bytes.length).sha256(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes))).build();
        a.setId(UUID.randomUUID()); Files.write(storage.resolve("evidence.pdf"),bytes);
        when(attachments.findByCvIdAndId(cv.getId(),a.getId())).thenReturn(Optional.of(a)); return a;
    }
    String snapshot(UUID attachment) { return "{\"certifications\":[{\"attachment\":{\"id\":\""+attachment+"\"}}]}"; }
    @Test void evidenceUploadHashSizeAndServiceRecreation() throws Exception {
        var input=pdf("evidence"); var response=service().uploadEvidenceAttachment(owner,cv.getId(),input,"CERTIFICATION",item.toString());
        assertEquals(input.getSize(),response.getFileSize().longValue());
        assertEquals(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(input.getBytes())),response.getSha256());
        var a=org.mockito.ArgumentCaptor.forClass(CVEvidenceAttachment.class); verify(attachments).save(a.capture());
        when(attachments.findByCvIdAndId(cv.getId(),a.getValue().getId())).thenReturn(Optional.of(a.getValue()));
        assertArrayEquals(input.getBytes(),service().getEvidenceAttachmentFile(owner,cv.getId(),a.getValue().getId()).data());
    }
    @Test void unrelatedHrCannotReadEvidence() throws Exception {
        var a=evidence(); assertThrows(UnauthorizedAccessException.class,()->service().getEvidenceAttachmentFile(user(Role.HR),cv.getId(),a.getId()));
    }
    @Test void companyHrCanReadOnlyEvidenceInSubmittedSnapshot() throws Exception {
        var a=evidence(); User hr=user(Role.HR);
        when(db.queryForList(contains("JOIN application"),eq(String.class),eq(cv.getId()),eq(hr.getId()))).thenReturn(List.of(snapshot(a.getId())));
        assertArrayEquals(pdf("evidence").getBytes(),service().getEvidenceAttachmentFile(hr,cv.getId(),a.getId()).data());
    }
    @Test void otherCandidateCannotReadEvidence() throws Exception {
        var a=evidence(); assertThrows(UnauthorizedAccessException.class,()->service().getEvidenceAttachmentFile(user(Role.CANDIDATE),cv.getId(),a.getId()));
    }
    @Test void evidenceCorruptionWithSameLengthIsDetected() throws Exception {
        var a=evidence(); byte[] bytes=Files.readAllBytes(storage.resolve(a.getStorageKey())); bytes[bytes.length-1]^=1; Files.write(storage.resolve(a.getStorageKey()),bytes);
        assertEquals(ErrorCode.FILE_STORAGE_FAILED,assertThrows(CustomException.class,()->service().getEvidenceAttachmentFile(owner,cv.getId(),a.getId())).getErrorCode());
    }
    @Test void confirmedEvidenceCannotBeChanged() {
        version.setStatus("CONFIRMED");
        assertEquals(ErrorCode.INVALID_STATE_TRANSITION,assertThrows(CustomException.class,()->service().uploadEvidenceAttachment(owner,cv.getId(),pdf("x"),"CERTIFICATION",item.toString())).getErrorCode());
        verify(attachments,never()).save(any());
    }
    @Test void replacingReferencedEvidenceRetainsOriginalBytes() throws Exception {
        var old=evidence(); when(attachments.findByCvIdAndItemTypeAndItemId(cv.getId(),"CERTIFICATION",item.toString())).thenReturn(Optional.of(old));
        when(db.queryForList(contains("JOIN applications"),eq(String.class),eq(cv.getId()))).thenReturn(List.of(snapshot(old.getId())));
        service().uploadEvidenceAttachment(owner,cv.getId(),pdf("replacement"),"CERTIFICATION",item.toString());
        assertTrue(old.isRetired()); assertTrue(Files.exists(storage.resolve(old.getStorageKey()))); verify(attachments,never()).delete(old);
    }
    @Test void removingReferencedEvidenceRetainsApplicationHistory() throws Exception {
        var old=evidence(); when(db.queryForList(contains("JOIN applications"),eq(String.class),eq(cv.getId()))).thenReturn(List.of(snapshot(old.getId())));
        service().deleteEvidenceAttachment(owner,cv.getId(),old.getId()); assertTrue(old.isRetired()); assertTrue(Files.exists(storage.resolve(old.getStorageKey())));
    }
    @Test void appliedCvCannotBeDeleted() {
        when(db.queryForObject(contains("FROM applications"),eq(Long.class),eq(cv.getId()))).thenReturn(1L);
        assertEquals(ErrorCode.INVALID_STATE_TRANSITION,assertThrows(CustomException.class,()->service().deleteCV(owner,cv.getId())).getErrorCode()); verify(cvs,never()).delete(any());
    }
    @Test void invalidPdfSignatureIsRejected() {
        var bad=new MockMultipartFile("file","x.pdf","application/pdf","%PDFfake".getBytes(StandardCharsets.US_ASCII));
        assertThrows(CustomException.class,()->service().uploadEvidenceAttachment(owner,cv.getId(),bad,"CERTIFICATION",item.toString()));
    }
    Company company() { Company c=Company.builder().name("Fixture").verificationStatus(CompanyVerification.VERIFIED).build(); c.setId(UUID.randomUUID()); return c; }
    @Test void hrCannotRepublishOrCloseModeratedJob() {
        var repo=mock(JobRepository.class); var recruiters=mock(RecruiterProfileRepository.class); User hr=user(Role.HR); Company c=company();
        var p=RecruiterProfile.builder().user(hr).company(c).build(); when(recruiters.findByUserId(hr.getId())).thenReturn(Optional.of(p));
        Job j=Job.builder().company(c).title("Java").status(JobStatus.SUSPENDED).build(); j.setId(UUID.randomUUID()); when(repo.findById(j.getId())).thenReturn(Optional.of(j));
        var s=new JobService(repo,recruiters); assertThrows(CustomException.class,()->s.publishJob(hr,j.getId())); assertThrows(CustomException.class,()->s.closeJob(hr,j.getId())); verify(repo,never()).save(any());
    }
    @Test void draftDeletionChecksCompanyAndStatus() {
        var repo=mock(JobRepository.class); var recruiters=mock(RecruiterProfileRepository.class); User hr=user(Role.HR); Company c=company();
        when(recruiters.findByUserId(hr.getId())).thenReturn(Optional.of(RecruiterProfile.builder().user(hr).company(c).build()));
        Job j=Job.builder().company(c).title("Java").build(); j.setId(UUID.randomUUID()); when(repo.findById(j.getId())).thenReturn(Optional.of(j));
        var s=new JobService(repo,recruiters); s.deleteDraftJob(hr,j.getId()); verify(repo).delete(j);
        j.setStatus(JobStatus.PUBLISHED); assertThrows(CustomException.class,()->s.deleteDraftJob(hr,j.getId()));
        j.setStatus(JobStatus.DRAFT); j.setCompany(company()); assertThrows(UnauthorizedAccessException.class,()->s.deleteDraftJob(hr,j.getId()));
    }
    @Test void nestedRequirementsRejectNegativeExperience() {
        try(var factory=jakarta.validation.Validation.buildDefaultValidatorFactory()) {
            var req=new CreateJobRequest(); req.setTitle("Java");req.setIndustry("TECHNOLOGY");req.setSeniority("JUNIOR");req.setDescription("JD");
            var item=new CreateJobRequest.RequirementItem();item.setSkillName("Java");item.setMinYearsExp(-1);req.setRequirements(List.of(item));
            assertTrue(factory.getValidator().validate(req).stream().anyMatch(v->v.getPropertyPath().toString().contains("minYearsExp")));
        }
    }
    @Test void staleDecisionIsConflictAndDoesNotWriteAudit() {
        var apps=mock(ApplicationRepository.class);var recruiters=mock(RecruiterProfileRepository.class);var audit=mock(ApplicationAuditLogRepository.class);var snaps=mock(ApplicationCVSnapshotRepository.class);
        User hr=user(Role.HR);Company c=company();var job=Job.builder().company(c).build();job.setId(UUID.randomUUID());
        var a=Application.builder().candidate(candidate).job(job).status(ApplicationStatus.SHORTLISTED).build();a.setId(UUID.randomUUID());
        when(apps.findByIdForUpdate(a.getId())).thenReturn(Optional.of(a));when(recruiters.findByUserId(hr.getId())).thenReturn(Optional.of(RecruiterProfile.builder().user(hr).company(c).build()));
        var s=new ApplicationService(apps,snaps,mock(JobRepository.class),candidates,recruiters,cvs,versions,mock(MatchingEngineService.class),null,null,audit,null);
        var request=UpdateApplicationStatusRequest.builder().status(ApplicationStatus.REJECTED).expectedStatus(ApplicationStatus.SUBMITTED).build();
        assertEquals(ErrorCode.CONCURRENT_MODIFICATION,assertThrows(CustomException.class,()->s.updateApplicationStatus(hr,a.getId(),request)).getErrorCode());verify(audit,never()).save(any());
        request.setStatus(ApplicationStatus.SHORTLISTED);request.setExpectedStatus(ApplicationStatus.SHORTLISTED);s.updateApplicationStatus(hr,a.getId(),request);verify(apps,never()).save(any());
    }
    @Test void githubRescanReplacesIdentityAndClearsStaleRepositories() {
        var worker=mock(AiWorkerClient.class); var profiles=mock(GitHubProfileRepository.class);var repos=mock(GitHubRepositoryRepository.class);var assessments=mock(GitHubAssessmentRepository.class);
        var oauth=mock(OAuthService.class);candidate.setGithubUrl("https://github.com/new-owner");
        when(candidates.findByUserId(candidate.getId())).thenReturn(Optional.of(candidate));
        var old=GitHubProfile.builder().candidate(candidate).username("old-owner").ownershipStatus("OWNED").build();old.setId(UUID.randomUUID());
        when(profiles.findByCandidateId(candidate.getId())).thenReturn(Optional.of(old));when(profiles.save(any())).thenAnswer(i->i.getArgument(0));
        when(worker.analyzeGithub(candidate.getId(),candidate.getGithubUrl())).thenReturn(Map.of("username","new-owner","status","UNAVAILABLE","repositories",List.of()));
        when(repos.findByGithubProfileId(old.getId())).thenReturn(List.of(GitHubRepository.builder().name("stale").build()));
        var s=new ProcessingLifecycleService(worker,mock(JobRepository.class),mock(JobRequirementRepository.class),cvs,versions,mock(CVSectionRepository.class),candidates,profiles,repos,assessments);
        ReflectionTestUtils.setField(s,"oauthService",oauth);s.processCandidateGithub(candidate.getId());
        assertEquals("new-owner",old.getUsername());assertEquals(candidate.getGithubUrl(),old.getGithubUrl());assertEquals("UNVERIFIED_PUBLIC",old.getOwnershipStatus());verify(repos).deleteAll(anyList());verify(oauth,never()).isGithubOwned(any(),any());
        when(worker.analyzeGithub(candidate.getId(),candidate.getGithubUrl())).thenReturn(Map.of("username","new-owner","status","SYNCED","repositories",List.of()));
        when(oauth.isGithubOwned(owner.getId(),"new-owner")).thenReturn(true);
        s.processCandidateGithub(candidate.getId());assertEquals("OWNED",old.getOwnershipStatus());
        when(worker.analyzeGithub(candidate.getId(),candidate.getGithubUrl())).thenReturn(Map.of("username","different-owner","status","SYNCED","repositories",List.of()));
        s.processCandidateGithub(candidate.getId());assertEquals("UNVERIFIED_PUBLIC",old.getOwnershipStatus());
        verify(oauth,never()).isGithubOwned(owner.getId(),"different-owner");
    }
    @Test void aiSettingsMissingRowCannotReportSuccess() throws Exception {
        AiClient client=new AiClient(db,json,"http://127.0.0.1:11434","local","bge-m3",10);
        assertEquals(ErrorCode.CONCURRENT_MODIFICATION,assertThrows(CustomException.class,()->client.updateSettings("LOCAL_OLLAMA","http://localhost:11434","local","https://example.invalid/v1","","model")).getErrorCode());
    }
    @Test void adminCandidateCvCountUsesProfileIdentity() {
        var users=mock(UserRepository.class);var admin=new AdminService(users,candidates,mock(RecruiterProfileRepository.class),mock(CompanyRepository.class),mock(JobRepository.class),mock(SystemReportRepository.class),mock(AdminAuditLogRepository.class),mock(AdminAuditLogService.class),mock(AiClient.class),mock(TaxonomyService.class),cvs,mock(ApplicationRepository.class),mock(com.platform.recruitment.company.service.CompanyVerificationService.class));
        var page=org.springframework.data.domain.PageRequest.of(0,10);when(users.findByRole(Role.CANDIDATE,page)).thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(owner)));
        when(cvs.countByCandidateId(candidate.getId())).thenReturn(3L);
        assertEquals(3,admin.listCandidates(null,null,page).getContent().getFirst().getCvCount());verify(cvs,never()).countByCandidateId(owner.getId());
    }

    @Test void appealApprovalDoesNotClaimActiveWhileAnotherSuspensionRemains() {
        var appeals=mock(SuspensionAppealRepository.class);var records=mock(SuspensionRecordRepository.class);var users=mock(UserRepository.class);var audit=mock(AdminAuditLogService.class);
        var actor=user(Role.ADMIN);owner.suspend();
        var rec=SuspensionRecord.builder().targetType(SuspensionTargetType.USER).targetId(owner.getId()).status(SuspensionStatus.ACTIVE).build();rec.setId(UUID.randomUUID());
        var appeal=SuspensionAppeal.builder().appellantUser(owner).targetType(SuspensionTargetType.USER).targetId(owner.getId()).suspension(rec).status(AppealStatus.UNDER_REVIEW).build();appeal.setId(UUID.randomUUID());
        when(appeals.findByIdForUpdate(appeal.getId())).thenReturn(Optional.of(appeal));
        when(records.countByTargetTypeAndTargetIdAndStatus(SuspensionTargetType.USER,owner.getId(),SuspensionStatus.ACTIVE)).thenReturn(1L);
        var service=new SuspensionAppealService(appeals,records,users,mock(CompanyRepository.class),mock(RecruiterProfileRepository.class),mock(JobRepository.class),audit);
        var req=com.platform.recruitment.suspension.dto.ReviewAppealRequest.builder().resolutionNote("Reviewed evidence").build();
        service.approveAppealAdmin(actor,appeal.getId(),req,"127.0.0.1");
        assertTrue(owner.isSuspended());verify(users,never()).save(any());
        verify(audit).log(eq(actor),eq("APPROVE_APPEAL"),eq("USER"),eq(owner.getId()),eq("SUSPENDED"),eq("SUSPENDED"),eq("Reviewed evidence"),eq("127.0.0.1"),isNull());
    }

    @Test void auditFailureMustPropagateToTheBusinessTransaction() {
        var repository=mock(AdminAuditLogRepository.class);
        doThrow(new org.springframework.dao.DataIntegrityViolationException("fixture audit failure")).when(repository).save(any());
        var audit=new AdminAuditLogService(repository);
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->audit.log(
                user(Role.ADMIN),"FIXTURE_CHANGE","USER",owner.getId(),"ACTIVE","SUSPENDED","Fixture reason","127.0.0.1",null));
    }
}
