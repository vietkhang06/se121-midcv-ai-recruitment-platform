package com.platform.recruitment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.cv.*;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class CandidateCvDraftMapperAndProvenanceTest {

    @Mock private CVRepository cvRepository;
    @Mock private CVVersionRepository cvVersionRepository;
    @Mock private CVSectionRepository cvSectionRepository;
    @Mock private CandidateProfileRepository candidateProfileRepository;
    @Mock private CVEvidenceAttachmentRepository evidenceAttachmentRepository;
    @Mock private com.platform.recruitment.document.Documents documents;
    @Mock private TextReader textReader;
    @Mock private JdbcTemplate jdbcTemplate;

    private ObjectMapper objectMapper;
    private CVService cvService;

    private User candidateUser;
    private CandidateProfile doanVanChuongProfile;
    private CV testCv;
    private CVVersion initialVersion;
    private UUID cvId;
    private UUID versionId;
    private String hoangLeQuanJson;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();

        cvService = new CVService(
                cvRepository,
                cvVersionRepository,
                cvSectionRepository,
                candidateProfileRepository,
                documents,
                textReader,
                jdbcTemplate,
                null,
                objectMapper
        );
        cvService.setCvEvidenceAttachmentRepository(evidenceAttachmentRepository);

        candidateUser = User.builder()
                .email("vanchuong123@gmail.com")
                .role(Role.CANDIDATE)
                .build();
        candidateUser.setId(UUID.randomUUID());

        doanVanChuongProfile = CandidateProfile.builder()
                .user(candidateUser)
                .headline("Candidate Global Headline")
                .phone("0999999999")
                .build();
        doanVanChuongProfile.setId(UUID.randomUUID());

        cvId = UUID.randomUUID();
        versionId = UUID.randomUUID();

        testCv = CV.builder()
                .candidate(doanVanChuongProfile)
                .title("Hoang Le Quan - Data Engineer CV")
                .creationPath(CVCreationPath.UPLOAD)
                .fileName("hoanglequan_cv.pdf")
                .fileType("application/pdf")
                .fileSize(204800)
                .rawText("Họ và tên: Hoàng Lê Quân\nVị trí: Data Engineer\nEmail: hotro@topcv.vn\nĐiện thoại: (024) 6680 5588\nĐịa chỉ: Xuân Thủy, Cầu Giấy, Ha Nội\nVới hơn 8 năm kinh nghiệm...")
                .status("PARSED")
                .build();
        testCv.setId(cvId);

        hoangLeQuanJson = "{" +
                "\"personalInfo\":{" +
                "\"fullName\":\"Hoàng Lê Quân\"," +
                "\"headline\":\"Data Engineer\"," +
                "\"email\":\"hotro@topcv.vn\"," +
                "\"phone\":\"(024) 6680 5588\"," +
                "\"address\":\"Xuân Thủy, Cầu Giấy, Ha Nội\"" +
                "}," +
                "\"summary\":\"Với hơn 8 năm kinh nghiệm làm việc trong lĩnh vực Data Engineering...\"," +
                "\"skills\":[" +
                "\"Python\",\"SQL\",\"Apache Spark\",\"Apache Airflow\",\"Kafka\",\"Data Modeling\",\"ETL Pipeline\"," +
                "\"Data Warehousing\",\"AWS Big Data\",\"Google Cloud Platform\",\"BigQuery\",\"Snowflake\",\"dbt\"," +
                "\"Docker\",\"Kubernetes\",\"CI/CD\",\"Git\",\"PostgreSQL\",\"MongoDB\",\"Redis\",\"Hadoop\",\"Hive\",\"Presto\",\"Linux\"" +
                "]," +
                "\"experience\":[" +
                "{" +
                "\"company\":\"Orion Marketplace\"," +
                "\"position\":\"LEAD DATA ENGINEER\"," +
                "\"startDate\":\"07/2022\"," +
                "\"endDate\":null," +
                "\"description\":\"Xây dựng kiến trúc Data Lakehouse phục vụ phân tích.\"" +
                "}," +
                "{" +
                "\"company\":\"DataForge Cloud\"," +
                "\"position\":\"DATA ENGINEER\"," +
                "\"startDate\":\"01/2020\"," +
                "\"endDate\":\"06/2022\"," +
                "\"description\":\"Phát triển các pipeline streaming thời gian thực bằng Kafka.\"" +
                "}," +
                "{" +
                "\"company\":\"FinAxis Solutions\"," +
                "\"position\":\"JUNIOR DATA ENGINEER / ETL DEVELOPER\"," +
                "\"startDate\":\"06/2016\"," +
                "\"endDate\":\"12/2019\"," +
                "\"description\":\"Xây dựng các batch job trích xuất dữ liệu tài chính.\"" +
                "}" +
                "]," +
                "\"education\":[" +
                "{" +
                "\"institution\":\"Đại học Bách Khoa Hà Nội\"," +
                "\"degree\":\"Kỹ sư CNTT\"," +
                "\"fieldOfStudy\":\"Hệ thống thông tin\"," +
                "\"startDate\":\"2012\"," +
                "\"endDate\":\"2016\"," +
                "\"gpa\":3.6," +
                "\"gpaScale\":4.0" +
                "}" +
                "]," +
                "\"certifications\":[" +
                "{\"name\":\"AWS Certified Data Analytics - Specialty\",\"issuer\":\"Amazon Web Services\"}," +
                "{\"name\":\"Google Cloud Certified Professional Data Engineer\",\"issuer\":\"Google\"}," +
                "{\"name\":\"Databricks Certified Data Engineer Professional\",\"issuer\":\"Databricks\"}" +
                "]," +
                "\"projects\":[]," +
                "\"languages\":[]" +
                "}";

        initialVersion = CVVersion.builder()
                .cv(testCv)
                .versionNumber(1)
                .title("Hoang Le Quan - v1.0")
                .rawTextContent(testCv.getRawText())
                .rawStructuredContent(hoangLeQuanJson)
                .structuredJsonContent(hoangLeQuanJson)
                .status("DRAFT")
                .build();
        initialVersion.setId(versionId);

        when(candidateProfileRepository.findByUserId(candidateUser.getId())).thenReturn(Optional.of(doanVanChuongProfile));
        when(cvRepository.findById(cvId)).thenReturn(Optional.of(testCv));
        when(cvVersionRepository.findByCvIdOrderByVersionNumberDesc(cvId)).thenReturn(new ArrayList<>(List.of(initialVersion)));
        when(cvVersionRepository.save(any(CVVersion.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("14.1 Unit test mapper: Map đầy đủ fixture Hoàng Lê Quân với 24 skills, 3 exp, 1 edu, 3 certs")
    void test1_hoangLeQuanFixtureMapper() throws Exception {
        Map<String, Object> raw = objectMapper.readValue(hoangLeQuanJson, Map.class);
        Map<String, Object> draft = cvService.buildCanonicalDraftFromRaw(raw, testCv, versionId);

        assertNotNull(draft);
        assertEquals("2.0", draft.get("schema_version"));

        // Personal info assertions
        Map<?, ?> personal = (Map<?, ?>) draft.get("personal_info");
        assertNotNull(personal);
        assertEquals("Hoàng Lê Quân", ((Map<?, ?>) personal.get("full_name")).get("value"));
        assertEquals("CV_EXTRACTED", ((Map<?, ?>) personal.get("full_name")).get("origin"));
        assertEquals("Hoàng Lê Quân", ((Map<?, ?>) personal.get("fullName")).get("value"));
        assertEquals("Data Engineer", ((Map<?, ?>) personal.get("headline")).get("value"));
        assertEquals("hotro@topcv.vn", ((Map<?, ?>) personal.get("email")).get("value"));
        assertEquals("(024) 6680 5588", ((Map<?, ?>) personal.get("phone")).get("value"));
        assertEquals("Xuân Thủy, Cầu Giấy, Ha Nội", ((Map<?, ?>) personal.get("location")).get("value"));
        assertEquals("Xuân Thủy, Cầu Giấy, Ha Nội", ((Map<?, ?>) personal.get("address")).get("value"));

        // Summary canonical structure
        Map<?, ?> summary = (Map<?, ?>) draft.get("summary");
        assertNotNull(summary);
        assertTrue(summary.containsKey("content"));
        String sumText = (String) ((Map<?, ?>) summary.get("content")).get("value");
        assertTrue(sumText.contains("hơn 8 năm kinh nghiệm"));
        assertEquals("CV_EXTRACTED", ((Map<?, ?>) summary.get("content")).get("origin"));

        // Skills assertion: 24 skills
        List<?> skills = (List<?>) draft.get("skills");
        assertNotNull(skills);
        assertEquals(24, skills.size());
        assertEquals("Python", ((Map<?, ?>) skills.get(0)).get("name"));
        assertEquals("CV_EXTRACTED", ((Map<?, ?>) skills.get(0)).get("origin"));

        // Work experience assertion: 3 items with position -> role, startDate -> start_date
        List<?> expList = (List<?>) draft.get("work_experience");
        assertNotNull(expList);
        assertEquals(3, expList.size());

        Map<?, ?> exp1 = (Map<?, ?>) expList.get(0);
        assertEquals("Orion Marketplace", exp1.get("company"));
        assertEquals("LEAD DATA ENGINEER", exp1.get("role"));
        assertEquals("LEAD DATA ENGINEER", exp1.get("position"));
        assertEquals("07/2022", exp1.get("start_date"));
        assertNull(exp1.get("end_date"));
        assertEquals(true, exp1.get("is_current"));
        assertEquals("CV_EXTRACTED", exp1.get("origin"));
        assertDoesNotThrow(() -> UUID.fromString(exp1.get("id").toString()));

        Map<?, ?> exp2 = (Map<?, ?>) expList.get(1);
        assertEquals("DataForge Cloud", exp2.get("company"));
        assertEquals("DATA ENGINEER", exp2.get("role"));
        assertDoesNotThrow(() -> UUID.fromString(exp2.get("id").toString()));

        Map<?, ?> exp3 = (Map<?, ?>) expList.get(2);
        assertEquals("FinAxis Solutions", exp3.get("company"));
        assertEquals("JUNIOR DATA ENGINEER / ETL DEVELOPER", exp3.get("role"));
        assertDoesNotThrow(() -> UUID.fromString(exp3.get("id").toString()));

        // Education assertion: 1 item with fieldOfStudy -> field_of_study and valid UUID
        List<?> eduList = (List<?>) draft.get("education");
        assertNotNull(eduList);
        assertEquals(1, eduList.size());
        Map<?, ?> edu = (Map<?, ?>) eduList.get(0);
        assertEquals("Đại học Bách Khoa Hà Nội", edu.get("institution"));
        assertEquals("Hệ thống thông tin", edu.get("field_of_study"));
        assertEquals("Hệ thống thông tin", edu.get("fieldOfStudy"));
        assertEquals(3.6, edu.get("gpa"));
        assertEquals(4.0, edu.get("gpa_scale"));
        assertDoesNotThrow(() -> UUID.fromString(edu.get("id").toString()));

        // Certifications assertion: 3 items with valid UUIDs
        List<?> certList = (List<?>) draft.get("certifications");
        assertNotNull(certList);
        assertEquals(3, certList.size());
        for (Object c : certList) {
            Map<?, ?> cert = (Map<?, ?>) c;
            assertNotNull(cert.get("name"));
            assertDoesNotThrow(() -> UUID.fromString(cert.get("id").toString()));
            assertEquals("CV_EXTRACTED", cert.get("origin"));
        }

        // Projects and languages assertion: 0 items
        List<?> projList = (List<?>) draft.get("projects");
        assertNotNull(projList);
        assertEquals(0, projList.size());

        List<?> langList = (List<?>) draft.get("languages");
        assertNotNull(langList);
        assertEquals(0, langList.size());
    }

    @Test
    @DisplayName("14.2 Candidate Profile isolation test: Profile 'Đoàn Văn Chương' KHÔNG được ghi đè CV 'Hoàng Lê Quân'")
    void test2_candidateProfileIsolation() {
        CVDraftResponse draft = cvService.getCVDraft(candidateUser, cvId);

        assertNotNull(draft);
        Map<String, Object> personal = draft.getPersonalInfo();
        assertNotNull(personal);

        // Must strictly be Hoàng Lê Quân and hotro@topcv.vn
        assertEquals("Hoàng Lê Quân", ((Map<?, ?>) personal.get("full_name")).get("value"));
        assertEquals("hotro@topcv.vn", ((Map<?, ?>) personal.get("email")).get("value"));
        assertEquals("(024) 6680 5588", ((Map<?, ?>) personal.get("phone")).get("value"));
        assertEquals("Data Engineer", ((Map<?, ?>) personal.get("headline")).get("value"));
        assertEquals("Xuân Thủy, Cầu Giấy, Ha Nội", ((Map<?, ?>) personal.get("location")).get("value"));

        // Must NOT contain Đoàn Văn Chương or vanchuong123@gmail.com anywhere in personal info
        for (Object fieldObj : personal.values()) {
            if (fieldObj instanceof Map<?, ?> m && m.containsKey("value")) {
                String val = String.valueOf(m.get("value"));
                assertFalse(val.contains("Đoàn Văn Chương"), "Personal info contains Candidate Profile name!");
                assertFalse(val.contains("vanchuong123@gmail.com"), "Personal info contains Candidate Profile email!");
            }
        }
    }

    @Test
    @DisplayName("14.3 Existing draft preservation: Khi Candidate xóa toàn bộ work_experience, GET lại vẫn rỗng")
    void test3_existingDraftPreservationWhenUserDeletesAllExperiences() {
        // Step 1: Initial GET initializes draft with 3 experiences
        CVDraftResponse initialDraft = cvService.getCVDraft(candidateUser, cvId);
        assertEquals(3, initialDraft.getWorkExperience().size());

        // Step 2: Candidate deletes all work_experience and saves
        UpdateCVDraftRequest updateReq = new UpdateCVDraftRequest();
        updateReq.setWorkExperience(new ArrayList<>());
        CVDraftResponse updatedDraft = cvService.updateCVDraft(candidateUser, cvId, updateReq);
        assertEquals(0, updatedDraft.getWorkExperience().size());

        // Step 3: GET draft again
        CVDraftResponse refetchedDraft = cvService.getCVDraft(candidateUser, cvId);

        // Step 4: Assert work_experience remains empty and was NOT re-injected from raw_structured!
        assertNotNull(refetchedDraft.getWorkExperience());
        assertEquals(0, refetchedDraft.getWorkExperience().size(),
                "Existing user-modified draft was unexpectedly overwritten by raw extraction!");
    }

    @Test
    @DisplayName("14.4 Origin test: Field không đổi giữ CV_EXTRACTED, field sửa đổi có USER_EDITED, client spoof bị bỏ qua")
    void test4_fieldProvenanceAndClientSpoofingIgnored() {
        // Initialize draft
        cvService.getCVDraft(candidateUser, cvId);

        // Update email to new address, keeping fullName same, but spoofing origin as CV_EXTRACTED
        UpdateCVDraftRequest updateReq = new UpdateCVDraftRequest();
        Map<String, Object> personalUpdate = new LinkedHashMap<>();
        personalUpdate.put("fullName", "Hoàng Lê Quân"); // Unchanged
        personalUpdate.put("email", Map.of("value", "quan.hoang@enterprise.com", "origin", "CV_EXTRACTED")); // Spoofed origin!
        updateReq.setPersonalInfo(personalUpdate);

        CVDraftResponse response = cvService.updateCVDraft(candidateUser, cvId, updateReq);
        Map<String, Object> personal = response.getPersonalInfo();

        // Unchanged field retains CV_EXTRACTED
        assertEquals("Hoàng Lê Quân", ((Map<?, ?>) personal.get("full_name")).get("value"));
        assertEquals("CV_EXTRACTED", ((Map<?, ?>) personal.get("full_name")).get("origin"));

        // Changed field receives USER_EDITED, disregarding spoofed CV_EXTRACTED from client
        assertEquals("quan.hoang@enterprise.com", ((Map<?, ?>) personal.get("email")).get("value"));
        assertEquals("USER_EDITED", ((Map<?, ?>) personal.get("email")).get("origin"));
    }

    @Test
    @DisplayName("14.5 UUID test: Item IDs là UUID hợp lệ, GET hai lần và save draft không đổi UUID")
    void test5_nestedItemUuidStabilityAcrossGetsAndSaves() {
        CVDraftResponse draft1 = cvService.getCVDraft(candidateUser, cvId);

        List<String> expIds1 = draft1.getWorkExperience().stream()
                .map(m -> m.get("id").toString())
                .toList();
        List<String> certIds1 = draft1.getCertifications().stream()
                .map(m -> m.get("id").toString())
                .toList();

        // Assert all are valid UUIDs
        for (String id : expIds1) {
            assertDoesNotThrow(() -> UUID.fromString(id));
        }
        for (String id : certIds1) {
            assertDoesNotThrow(() -> UUID.fromString(id));
        }

        // GET second time must return EXACT same UUIDs
        CVDraftResponse draft2 = cvService.getCVDraft(candidateUser, cvId);
        List<String> expIds2 = draft2.getWorkExperience().stream()
                .map(m -> m.get("id").toString())
                .toList();
        List<String> certIds2 = draft2.getCertifications().stream()
                .map(m -> m.get("id").toString())
                .toList();

        assertEquals(expIds1, expIds2, "GET draft must return stable UUIDs across multiple calls!");
        assertEquals(certIds1, certIds2, "GET draft must return stable UUIDs across multiple calls!");

        // Save draft must also preserve existing UUIDs
        UpdateCVDraftRequest updateReq = new UpdateCVDraftRequest();
        updateReq.setWorkExperience(draft1.getWorkExperience());
        updateReq.setCertifications(draft1.getCertifications());

        CVDraftResponse draft3 = cvService.updateCVDraft(candidateUser, cvId, updateReq);
        List<String> expIds3 = draft3.getWorkExperience().stream()
                .map(m -> m.get("id").toString())
                .toList();
        assertEquals(expIds1, expIds3, "Save draft must not regenerate UUIDs for existing items!");
    }

    @Test
    @DisplayName("14.6 Attachment integration: cert_1 trả 400, UUID không tồn tại trả 404, UUID thật upload thành công")
    void test6_attachmentUploadWithUuidAndRejections() {
        CVDraftResponse draft = cvService.getCVDraft(candidateUser, cvId);
        String realCertUuid = draft.getCertifications().get(0).get("id").toString();
        assertDoesNotThrow(() -> UUID.fromString(realCertUuid));

        byte[] pdfMagic = "%PDF-1.4 sample evidence content".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile("file", "certificate.pdf", "application/pdf", pdfMagic);

        Path tempPath = Path.of(System.getProperty("java.io.tmpdir"), "test-cert.pdf");
        when(documents.path(anyString())).thenReturn(tempPath);
        when(evidenceAttachmentRepository.save(any(CVEvidenceAttachment.class))).thenAnswer(inv -> {
            CVEvidenceAttachment a = inv.getArgument(0);
            a.setId(UUID.randomUUID());
            return a;
        });

        // 1. Invalid legacy string itemId 'cert_1' returns 400 VALIDATION_ERROR
        CustomException invalidIdEx = assertThrows(CustomException.class, () ->
                cvService.uploadEvidenceAttachment(candidateUser, cvId, file, "CERTIFICATION", "cert_1"));
        assertEquals(ErrorCode.VALIDATION_ERROR, invalidIdEx.getErrorCode());

        // 2. Non-existent UUID returns 404 RESOURCE_NOT_FOUND
        String randomNonExistentUuid = UUID.randomUUID().toString();
        CustomException notFoundEx = assertThrows(CustomException.class, () ->
                cvService.uploadEvidenceAttachment(candidateUser, cvId, file, "CERTIFICATION", randomNonExistentUuid));
        assertEquals(ErrorCode.RESOURCE_NOT_FOUND, notFoundEx.getErrorCode());

        // 3. Real UUID from draft succeeds with UNVERIFIED status
        CVEvidenceAttachmentResponse response = cvService.uploadEvidenceAttachment(
                candidateUser, cvId, file, "CERTIFICATION", realCertUuid);
        assertNotNull(response);
        assertEquals("UNVERIFIED", response.getStatus());
        assertEquals(realCertUuid, response.getItemId());
        assertEquals("certificate.pdf", response.getFileName());
    }

    @Test
    @DisplayName("14.7 Ownership test: Ứng viên khác không thể xem hoặc tải attachment")
    void test7_attachmentOwnershipProtection() {
        User otherCandidateUser = User.builder()
                .email("other@midcv.io")
                .role(Role.CANDIDATE)
                .build();
        otherCandidateUser.setId(UUID.randomUUID());

        CandidateProfile otherProfile = CandidateProfile.builder()
                .user(otherCandidateUser)
                .build();
        otherProfile.setId(UUID.randomUUID());

        when(candidateProfileRepository.findByUserId(otherCandidateUser.getId())).thenReturn(Optional.of(otherProfile));

        assertThrows(UnauthorizedAccessException.class, () ->
                cvService.getCVDraft(otherCandidateUser, cvId));
    }
}
