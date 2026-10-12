package com.platform.recruitment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.auth.JwtTokenProvider;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.cv.CV;
import com.platform.recruitment.cv.CVCreationPath;
import com.platform.recruitment.cv.CVQuotaResponse;
import com.platform.recruitment.cv.CVRepository;
import com.platform.recruitment.cv.CVResponse;
import com.platform.recruitment.cv.CVService;
import com.platform.recruitment.cv.CVUploadAsyncResponse;
import com.platform.recruitment.cv.CVVersion;
import com.platform.recruitment.cv.CVVersionRepository;
import com.platform.recruitment.cv.CreateCVRequest;
import com.platform.recruitment.document.Documents;
import com.platform.recruitment.user.AccountPlan;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import com.platform.recruitment.user.UserRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class CandidateCvUploadQuotaIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private CVService cvService;

    @Autowired
    private CVRepository cvRepository;

    @Autowired
    private CVVersionRepository cvVersionRepository;

    @Autowired
    private CandidateProfileRepository candidateProfileRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private Documents documents;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private final List<UUID> createdUserIds = new ArrayList<>();
    private final List<UUID> createdProfileIds = new ArrayList<>();

    @AfterEach
    void tearDown() {
        for (UUID profileId : createdProfileIds) {
            try {
                List<CV> cvs = cvRepository.findByCandidateId(profileId);
                for (CV cv : cvs) {
                    try {
                        cvRepository.delete(cv);
                    } catch (Exception ignored) {}
                }
                candidateProfileRepository.deleteById(profileId);
            } catch (Exception ignored) {}
        }
        for (UUID userId : createdUserIds) {
            try {
                userRepository.deleteById(userId);
            } catch (Exception ignored) {}
        }
    }

    private User createCandidateUser(String emailPrefix, AccountPlan plan) {
        String uniqueEmail = emailPrefix + "-" + UUID.randomUUID() + "@candidate-test.com";
        User initialUser = User.builder()
                .email(uniqueEmail)
                .passwordHash("hashed-password-123")
                .role(Role.CANDIDATE)
                .accountPlan(plan)
                .emailVerified(true)
                .build();
        User savedUser = userRepository.save(initialUser);
        createdUserIds.add(savedUser.getId());

        CandidateProfile profile = CandidateProfile.builder()
                .user(savedUser)
                .fullName("Test Candidate " + emailPrefix)
                .build();
        CandidateProfile savedProfile = candidateProfileRepository.save(profile);
        createdProfileIds.add(savedProfile.getId());

        return savedUser;
    }

    private User createAdminUser(String emailPrefix) {
        String uniqueEmail = emailPrefix + "-" + UUID.randomUUID() + "@admin-test.com";
        User initialUser = User.builder()
                .email(uniqueEmail)
                .passwordHash("hashed-password-123")
                .role(Role.ADMIN)
                .emailVerified(true)
                .build();
        User savedUser = userRepository.save(initialUser);
        createdUserIds.add(savedUser.getId());
        return savedUser;
    }

    private MockMultipartFile createMockPdf(String fileName, String content) {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            String fullContent = content + "\nCandidate Experience: Senior Software Engineer with extensive skills in Java, Spring Boot, PostgreSQL, Docker, and Microservices architecture.";
            try (PDPageContentStream stream = new PDPageContentStream(doc, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                stream.newLineAtOffset(50, 700);
                for (String line : fullContent.split("\n")) {
                    stream.showText(line);
                    stream.newLineAtOffset(0, -15);
                }
                stream.endText();
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return new MockMultipartFile("file", fileName, "application/pdf", out.toByteArray());
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate test PDF", e);
        }
    }

    @Test
    @DisplayName("REQ: STANDARD Plan allows up to 3 CVs; 4th upload attempt is rejected with CV_QUOTA_EXCEEDED")
    void testStandardPlanQuotaEnforcement_0to3Succeed_4thFails() {
        User user = createCandidateUser("std-quota", AccountPlan.STANDARD);
        CandidateProfile profile = candidateProfileRepository.findByUserId(user.getId()).orElseThrow();

        // 1st upload -> 0 to 1
        CVUploadAsyncResponse res1 = cvService.uploadCVAsync(user, createMockPdf("cv1.pdf", "Candidate CV 1"), "CV 1", "Technology", true);
        assertNotNull(res1);
        assertEquals(1, cvRepository.countActiveByCandidateId(profile.getId()));

        // 2nd upload -> 1 to 2
        CVUploadAsyncResponse res2 = cvService.uploadCVAsync(user, createMockPdf("cv2.pdf", "Candidate CV 2"), "CV 2", "Technology", false);
        assertNotNull(res2);
        assertEquals(2, cvRepository.countActiveByCandidateId(profile.getId()));

        // 3rd upload -> 2 to 3
        CVUploadAsyncResponse res3 = cvService.uploadCVAsync(user, createMockPdf("cv3.pdf", "Candidate CV 3"), "CV 3", "Technology", false);
        assertNotNull(res3);
        assertEquals(3, cvRepository.countActiveByCandidateId(profile.getId()));

        // 4th upload -> quota exceeded (3 >= 3)
        CustomException ex = assertThrows(CustomException.class, () -> {
            cvService.uploadCVAsync(user, createMockPdf("cv4.pdf", "Candidate CV 4"), "CV 4", "Technology", false);
        });
        assertEquals(ErrorCode.CV_QUOTA_EXCEEDED, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("STANDARD"));
        assertEquals(3, cvRepository.countActiveByCandidateId(profile.getId()));
    }

    @Test
    @DisplayName("REQ: PRO Plan allows up to 5 CVs; 6th upload attempt is rejected with CV_QUOTA_EXCEEDED")
    void testProPlanQuotaEnforcement_0to5Succeed_6thFails() {
        User user = createCandidateUser("pro-quota", AccountPlan.PRO);
        CandidateProfile profile = candidateProfileRepository.findByUserId(user.getId()).orElseThrow();

        for (int i = 1; i <= 5; i++) {
            CVUploadAsyncResponse res = cvService.uploadCVAsync(
                    user,
                    createMockPdf("pro_cv" + i + ".pdf", "Candidate Pro CV " + i),
                    "Pro CV " + i,
                    "Technology",
                    i == 1
            );
            assertNotNull(res);
        }
        assertEquals(5, cvRepository.countActiveByCandidateId(profile.getId()));

        // 6th upload -> rejected
        CustomException ex = assertThrows(CustomException.class, () -> {
            cvService.uploadCVAsync(user, createMockPdf("pro_cv6.pdf", "Candidate Pro CV 6"), "Pro CV 6", "Technology", false);
        });
        assertEquals(ErrorCode.CV_QUOTA_EXCEEDED, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("PRO"));
        assertEquals(5, cvRepository.countActiveByCandidateId(profile.getId()));
    }

    @Test
    @DisplayName("REQ: Default unassigned plan safely defaults to STANDARD (limit 3)")
    void testDefaultPlanIsStandard_EnforcesLimit3() {
        User initialUser = User.builder()
                .email("default-plan-" + UUID.randomUUID() + "@candidate-test.com")
                .passwordHash("hashed-password-123")
                .role(Role.CANDIDATE)
                .emailVerified(true)
                .build();
        User user = userRepository.save(initialUser);
        createdUserIds.add(user.getId());

        CandidateProfile profile = CandidateProfile.builder()
                .user(user)
                .fullName("Default Plan Candidate")
                .build();
        CandidateProfile savedProfile = candidateProfileRepository.save(profile);
        createdProfileIds.add(savedProfile.getId());

        assertEquals(AccountPlan.STANDARD, user.getAccountPlan());

        // Upload 3 CVs
        for (int i = 1; i <= 3; i++) {
            cvService.uploadCVAsync(
                    user,
                    createMockPdf("def_cv" + i + ".pdf", "Candidate Default CV " + i),
                    "Def CV " + i,
                    "Technology",
                    i == 1
            );
        }
        assertEquals(3, cvRepository.countActiveByCandidateId(profile.getId()));

        // 4th CV is rejected
        CustomException ex = assertThrows(CustomException.class, () -> {
            cvService.uploadCVAsync(user, createMockPdf("def_cv4.pdf", "Candidate Default CV 4"), "Def CV 4", "Technology", false);
        });
        assertEquals(ErrorCode.CV_QUOTA_EXCEEDED, ex.getErrorCode());
    }

    @Test
    @DisplayName("REQ: Updating an existing CV (new CVVersion or draft edit) does NOT consume extra quota slot")
    void testUpdatingExistingCvDoesNotConsumeSlot() {
        User user = createCandidateUser("update-slot", AccountPlan.STANDARD);
        CandidateProfile profile = candidateProfileRepository.findByUserId(user.getId()).orElseThrow();

        // Fill 3 slots
        CVUploadAsyncResponse res1 = cvService.uploadCVAsync(user, createMockPdf("up1.pdf", "CV 1"), "CV 1", "Technology", true);
        cvService.uploadCVAsync(user, createMockPdf("up2.pdf", "CV 2"), "CV 2", "Technology", false);
        cvService.uploadCVAsync(user, createMockPdf("up3.pdf", "CV 3"), "CV 3", "Technology", false);
        assertEquals(3, cvRepository.countActiveByCandidateId(profile.getId()));

        CV cv1 = cvRepository.findById(res1.getCvId()).orElseThrow();

        // Adding a new version to cv1
        CVVersion newVersion = CVVersion.builder()
                .cv(cv1)
                .versionNumber(2)
                .title("CV 1 Version 2")
                .rawTextContent("Updated content for version 2")
                .build();
        cvVersionRepository.save(newVersion);

        // Active CV count must remain strictly 3
        assertEquals(3, cvRepository.countActiveByCandidateId(profile.getId()));
    }

    @Test
    @DisplayName("REQ: Deleting a CV restores a quota slot immediately")
    void testDeletingCvRestoresSlot() {
        User user = createCandidateUser("delete-slot", AccountPlan.STANDARD);
        CandidateProfile profile = candidateProfileRepository.findByUserId(user.getId()).orElseThrow();

        cvService.uploadCVAsync(user, createMockPdf("del1.pdf", "CV 1"), "CV 1", "Technology", true);
        CVUploadAsyncResponse res2 = cvService.uploadCVAsync(user, createMockPdf("del2.pdf", "CV 2"), "CV 2", "Technology", false);
        cvService.uploadCVAsync(user, createMockPdf("del3.pdf", "CV 3"), "CV 3", "Technology", false);
        assertEquals(3, cvRepository.countActiveByCandidateId(profile.getId()));

        // 4th upload fails
        assertThrows(CustomException.class, () -> {
            cvService.uploadCVAsync(user, createMockPdf("del4.pdf", "CV 4"), "CV 4", "Technology", false);
        });

        // Delete cv2
        cvService.deleteCV(user, res2.getCvId());
        assertEquals(2, cvRepository.countActiveByCandidateId(profile.getId()));

        // Now upload succeeds!
        CVUploadAsyncResponse res4 = cvService.uploadCVAsync(user, createMockPdf("del4.pdf", "CV 4"), "CV 4", "Technology", false);
        assertNotNull(res4);
        assertEquals(3, cvRepository.countActiveByCandidateId(profile.getId()));
    }

    @Test
    @DisplayName("REQ: Quota API returns authoritative plan, count, limit, remaining slots, and canUpload flag")
    void testQuotaApiResponse() {
        User user = createCandidateUser("api-quota", AccountPlan.STANDARD);

        // Initial state: 0 / 3
        CVQuotaResponse q0 = cvService.getCVQuota(user);
        assertEquals(AccountPlan.STANDARD, q0.getPlan());
        assertEquals(0, q0.getCurrentCount());
        assertEquals(3, q0.getMaxLimit());
        assertEquals(3, q0.getRemainingSlots());
        assertTrue(q0.isCanUpload());

        // After 2 uploads: 2 / 3
        cvService.uploadCVAsync(user, createMockPdf("api1.pdf", "CV 1"), "CV 1", "Technology", true);
        cvService.uploadCVAsync(user, createMockPdf("api2.pdf", "CV 2"), "CV 2", "Technology", false);
        CVQuotaResponse q2 = cvService.getCVQuota(user);
        assertEquals(2, q2.getCurrentCount());
        assertEquals(1, q2.getRemainingSlots());
        assertTrue(q2.isCanUpload());

        // After 3rd upload: 3 / 3
        cvService.uploadCVAsync(user, createMockPdf("api3.pdf", "CV 3"), "CV 3", "Technology", false);
        CVQuotaResponse q3 = cvService.getCVQuota(user);
        assertEquals(3, q3.getCurrentCount());
        assertEquals(0, q3.getRemainingSlots());
        assertFalse(q3.isCanUpload());
    }

    @Test
    @DisplayName("REQ: Cross-candidate isolation: Candidate A at quota limit cannot affect Candidate B's quota")
    void testCrossCandidateIsolation() {
        User userA = createCandidateUser("cand-a", AccountPlan.STANDARD);
        User userB = createCandidateUser("cand-b", AccountPlan.STANDARD);
        CandidateProfile profileB = candidateProfileRepository.findByUserId(userB.getId()).orElseThrow();

        // Fill User A's quota
        for (int i = 1; i <= 3; i++) {
            cvService.uploadCVAsync(userA, createMockPdf("a" + i + ".pdf", "CV A" + i), "CV A" + i, "Technology", i == 1);
        }
        CVQuotaResponse qA = cvService.getCVQuota(userA);
        assertFalse(qA.isCanUpload());

        // User B has empty quota
        CVQuotaResponse qB = cvService.getCVQuota(userB);
        assertEquals(0, qB.getCurrentCount());
        assertTrue(qB.isCanUpload());

        // User B can upload successfully
        CVUploadAsyncResponse resB = cvService.uploadCVAsync(userB, createMockPdf("b1.pdf", "CV B 1"), "CV B 1", "Technology", true);
        assertNotNull(resB);
        assertEquals(1, cvRepository.countActiveByCandidateId(profileB.getId()));
    }

    @Test
    @DisplayName("REQ: CV Builder creation path enforces quota server-side with concurrency lock")
    void testCvBuilderCreationPathQuotaEnforcement() {
        User user = createCandidateUser("builder-quota", AccountPlan.STANDARD);
        CandidateProfile profile = candidateProfileRepository.findByUserId(user.getId()).orElseThrow();

        for (int i = 1; i <= 3; i++) {
            CreateCVRequest req = new CreateCVRequest();
            req.setTitle("Builder CV " + i);
            req.setCreationPath(CVCreationPath.BUILDER);
            req.setTargetIndustry("Technology");
            req.setRawText("Candidate experience text for CV " + i);
            req.setIsDefault(i == 1);
            CVResponse created = cvService.createCV(user, req);
            assertNotNull(created);
        }
        assertEquals(3, cvRepository.countActiveByCandidateId(profile.getId()));

        // 4th creation attempt via Builder path is rejected
        CreateCVRequest req4 = new CreateCVRequest();
        req4.setTitle("Builder CV 4");
        req4.setCreationPath(CVCreationPath.BUILDER);
        req4.setTargetIndustry("Technology");
        req4.setRawText("Candidate experience text for CV 4");
        req4.setIsDefault(false);

        CustomException ex = assertThrows(CustomException.class, () -> cvService.createCV(user, req4));
        assertEquals(ErrorCode.CV_QUOTA_EXCEEDED, ex.getErrorCode());
        assertEquals(3, cvRepository.countActiveByCandidateId(profile.getId()));
    }

    @Test
    @DisplayName("REQ: Synchronous uploadCV path also enforces quota server-side with concurrency lock")
    void testSynchronousUploadPathQuotaEnforcement() {
        User user = createCandidateUser("sync-quota", AccountPlan.STANDARD);
        CandidateProfile profile = candidateProfileRepository.findByUserId(user.getId()).orElseThrow();

        for (int i = 1; i <= 3; i++) {
            CVResponse resp = cvService.uploadCV(user, createMockPdf("sync_" + i + ".pdf", "Sync CV " + i), "Sync CV " + i, "Technology", i == 1);
            assertNotNull(resp);
        }
        assertEquals(3, cvRepository.countActiveByCandidateId(profile.getId()));

        // 4th upload fails
        CustomException ex = assertThrows(CustomException.class, () -> {
            cvService.uploadCV(user, createMockPdf("sync_4.pdf", "Sync CV 4"), "Sync CV 4", "Technology", false);
        });
        assertEquals(ErrorCode.CV_QUOTA_EXCEEDED, ex.getErrorCode());
        assertEquals(3, cvRepository.countActiveByCandidateId(profile.getId()));
    }

    @Test
    @DisplayName("REQ: Authorization: Standard candidate cannot change their own plan or another user plan (403 Forbidden)")
    void testStandardCandidateCannotChangePlan_Forbidden403() throws Exception {
        User candidateUser = createCandidateUser("cand-rbac", AccountPlan.STANDARD);
        String candidateToken = jwtTokenProvider.generateAccessToken(candidateUser.getId(), candidateUser.getEmail(), Role.CANDIDATE);

        mockMvc.perform(put("/api/v1/admin/users/" + candidateUser.getId() + "/plan")
                        .header("Authorization", "Bearer " + candidateToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("plan", "PRO"))))
                .andExpect(status().isForbidden());

        // Assert database state is unchanged
        User refreshed = userRepository.findById(candidateUser.getId()).orElseThrow();
        assertEquals(AccountPlan.STANDARD, refreshed.getAccountPlan(), "Candidate cannot promote themselves to PRO");
    }

    @Test
    @DisplayName("REQ: Authorization: Only an authenticated administrator can change user plan via PUT /api/v1/admin/users/{id}/plan")
    void testAdminCanUpdatePlanToPro_ElevatesQuotaTo5() throws Exception {
        User candidateUser = createCandidateUser("elevate-test", AccountPlan.STANDARD);
        User adminUser = createAdminUser("admin-elevate");
        String adminToken = jwtTokenProvider.generateAccessToken(adminUser.getId(), adminUser.getEmail(), Role.ADMIN);

        // Fill standard quota (3/3)
        for (int i = 1; i <= 3; i++) {
            cvService.uploadCVAsync(candidateUser, createMockPdf("std_" + i + ".pdf", "CV " + i), "CV " + i, "Technology", i == 1);
        }
        CVQuotaResponse qBefore = cvService.getCVQuota(candidateUser);
        assertFalse(qBefore.isCanUpload());

        // Admin updates candidate plan to PRO
        mockMvc.perform(put("/api/v1/admin/users/" + candidateUser.getId() + "/plan")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("plan", "PRO"))))
                .andExpect(status().isOk());

        // Verify authoritative database state
        User refreshed = userRepository.findById(candidateUser.getId()).orElseThrow();
        assertEquals(AccountPlan.PRO, refreshed.getAccountPlan());

        // Quota is now updated to PRO (3/5, canUpload = true)
        CVQuotaResponse qAfter = cvService.getCVQuota(refreshed);
        assertEquals(AccountPlan.PRO, qAfter.getPlan());
        assertEquals(5, qAfter.getMaxLimit());
        assertEquals(3, qAfter.getCurrentCount());
        assertEquals(2, qAfter.getRemainingSlots());
        assertTrue(qAfter.isCanUpload());

        // Candidate can now upload 4th and 5th CV
        cvService.uploadCVAsync(refreshed, createMockPdf("std_4.pdf", "CV 4"), "CV 4", "Technology", false);
        cvService.uploadCVAsync(refreshed, createMockPdf("std_5.pdf", "CV 5"), "CV 5", "Technology", false);

        // 6th is rejected under PRO limit
        assertThrows(CustomException.class, () -> {
            cvService.uploadCVAsync(refreshed, createMockPdf("std_6.pdf", "CV 6"), "CV 6", "Technology", false);
        });
    }

    @Test
    @DisplayName("REQ: Storage Failure Compensation: External file storage is cleaned up via TransactionSynchronization on rollback")
    void testStorageCleanupOnTransactionRollback() {
        User user = createCandidateUser("storage-cleanup", AccountPlan.STANDARD);
        TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);

        List<Path> storedFiles = new ArrayList<>();

        assertThrows(RuntimeException.class, () -> {
            txTemplate.execute(status -> {
                try {
                    MockMultipartFile file = createMockPdf("rollback.pdf", "Rollback Test Content");
                    Documents.Saved saved = documents.upload(user.getId(), "CV", "Rollback Doc", file, null);
                    Path physicalPath = documents.path(saved.versionId() + ".pdf");
                    storedFiles.add(physicalPath);

                    // Verify file is physically written to disk
                    assertTrue(Files.exists(physicalPath), "Physical file should exist before transaction failure");

                    // Simulate an unexpected database failure or exception before transaction commits
                    throw new RuntimeException("Simulated failure after storage before DB commit");
                } catch (IOException e) {
                    throw new RuntimeException(e);
                }
            });
        });

        // After rollback, verify Spring TransactionSynchronization deleted the file
        assertFalse(storedFiles.isEmpty());
        Path rolledBackFile = storedFiles.get(0);
        assertFalse(Files.exists(rolledBackFile), "Physical file must be deleted upon transaction rollback to prevent orphan files");
    }

    @Test
    @DisplayName("REQ: Real Database Concurrency: Two simultaneous uploads for the last remaining slot - exactly 1 succeeds, 1 is rejected, persisted count never exceeds limit")
    void testRealDatabaseConcurrency_TwoSimultaneousUploadsForLastSlot() throws InterruptedException, ExecutionException {
        User user = createCandidateUser("concur-test", AccountPlan.STANDARD);
        CandidateProfile profile = candidateProfileRepository.findByUserId(user.getId()).orElseThrow();

        // Fill 2 slots -> 1 slot remaining
        cvService.uploadCVAsync(user, createMockPdf("c1.pdf", "Concur CV 1"), "Concur CV 1", "Technology", true);
        cvService.uploadCVAsync(user, createMockPdf("c2.pdf", "Concur CV 2"), "Concur CV 2", "Technology", false);
        assertEquals(2, cvRepository.countActiveByCandidateId(profile.getId()));

        int numThreads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch startLatch = new CountDownLatch(1);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);

        List<Future<Void>> futures = new ArrayList<>();

        for (int i = 1; i <= numThreads; i++) {
            final int index = i;
            futures.add(executor.submit(() -> {
                startLatch.await(); // Synchronize thread release for genuine concurrent contention
                try {
                    cvService.uploadCVAsync(
                            user,
                            createMockPdf("race_" + index + ".pdf", "Race CV " + index),
                            "Race CV " + index,
                            "Technology",
                            false
                    );
                    successCount.incrementAndGet();
                } catch (CustomException ex) {
                    if (ex.getErrorCode() == ErrorCode.CV_QUOTA_EXCEEDED) {
                        rejectedCount.incrementAndGet();
                    } else {
                        throw ex;
                    }
                }
                return null;
            }));
        }

        // Release both threads simultaneously
        startLatch.countDown();

        for (Future<Void> future : futures) {
            future.get();
        }
        executor.shutdown();
        assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));

        // Assert: Exactly ONE upload succeeded, exactly ONE was rejected by quota check
        assertEquals(1, successCount.get(), "Exactly one concurrent upload should succeed for the last slot");
        assertEquals(1, rejectedCount.get(), "Exactly one concurrent upload should be rejected by quota enforcement");

        // Verify direct from PostgreSQL persistence: Total active CVs MUST NEVER exceed 3
        long finalPersistedCount = cvRepository.countActiveByCandidateId(profile.getId());
        assertEquals(3, finalPersistedCount, "Persisted CV count in PostgreSQL must be exactly 3 and never exceed quota");
    }
}
