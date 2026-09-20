package com.platform.recruitment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.platform.recruitment.ai.AiClient;
import com.platform.recruitment.application.Application;
import com.platform.recruitment.application.ApplicationRepository;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.company.Company;
import com.platform.recruitment.company.RecruiterProfile;
import com.platform.recruitment.company.RecruiterProfileRepository;
import com.platform.recruitment.cv.*;
import com.platform.recruitment.document.Documents;
import com.platform.recruitment.embedding.PgvectorCosineSimilarity;
import com.platform.recruitment.event.Events;
import com.platform.recruitment.github.*;
import com.platform.recruitment.job.*;
import com.platform.recruitment.matching.*;
import com.platform.recruitment.screening.ScreeningController;
import com.platform.recruitment.taxonomy.TaxonomyService;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import com.platform.recruitment.worker.JobQueue;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Path;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class MidCvEndToEndScreeningTest {

    @TempDir
    Path tempDir;

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private PlatformTransactionManager transactionManager;
    @Mock private Events events;
    @Mock private JobRepository jobRepository;
    @Mock private JobRequirementRepository jobRequirementRepository;
    @Mock private CandidateProfileRepository candidateProfileRepository;
    @Mock private ApplicationRepository applicationRepository;
    @Mock private CVRepository cvRepository;
    @Mock private MatchResultRepository matchResultRepository;
    @Mock private MatchFactorRepository matchFactorRepository;
    @Mock private EvidenceRepository evidenceRepository;
    @Mock private GitHubProfileRepository gitHubProfileRepository;
    @Mock private GitHubAssessmentRepository gitHubAssessmentRepository;
    @Mock private GitHubRepositoryRepository gitHubRepositoryRepository;
    @Mock private RecruiterProfileRepository recruiterProfileRepository;

    private ObjectMapper mapper = new ObjectMapper();
    private Documents documents;
    private TextReader textReader;
    private JobQueue jobQueue;
    private AiClient aiClient;
    private TaxonomyService taxonomyService;
    private SkillNormalizer skillNormalizer;
    private PgvectorCosineSimilarity pgvectorCosineSimilarity;
    private GitHubScoringService gitHubScoringService;
    private MatchingEngineService matchingEngineService;
    private CandidateRankingService candidateRankingService;
    private MatchingController matchingController;
    private ScreeningController screeningController;

    private User hrUserCompanyA;
    private RecruiterProfile recruiterA;
    private Company companyA;
    private Job jobA;

    private User hrUserCompanyB;
    private RecruiterProfile recruiterB;
    private Company companyB;
    private Job jobB;

    private User candidateUser1;
    private CandidateProfile candidateProfile1;
    private User candidateUser2;
    private CandidateProfile candidateProfile2;

    @BeforeEach
    void setUp() throws Exception {
        lenient().when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        lenient().doNothing().when(transactionManager).commit(any());
        lenient().doNothing().when(transactionManager).rollback(any());

        jobQueue = new JobQueue(jdbcTemplate, events, transactionManager);
        documents = new Documents(jdbcTemplate, jobQueue, events, tempDir.toString());
        textReader = new TextReader();
        taxonomyService = new TaxonomyService(null);
        aiClient = new AiClient(jdbcTemplate, mapper, "http://localhost:11434", "granite", "bge-m3", 30, taxonomyService);
        skillNormalizer = new SkillNormalizer();
        pgvectorCosineSimilarity = new PgvectorCosineSimilarity();
        gitHubScoringService = new GitHubScoringService(gitHubProfileRepository, gitHubAssessmentRepository, gitHubRepositoryRepository);

        matchingEngineService = new MatchingEngineService(
                jobRepository,
                jobRequirementRepository,
                candidateProfileRepository,
                applicationRepository,
                cvRepository,
                matchResultRepository,
                matchFactorRepository,
                new RequiredSkillMatcher(),
                new PreferredSkillMatcher(),
                new ExperienceMatcher(),
                new EducationMatcher(),
                new ProjectRelevanceMatcher(),
                gitHubScoringService
        );

        // Inject helper dependencies
        org.springframework.test.util.ReflectionTestUtils.setField(matchingEngineService, "evidenceRepository", evidenceRepository);
        org.springframework.test.util.ReflectionTestUtils.setField(matchingEngineService, "gitHubProfileRepository", gitHubProfileRepository);
        org.springframework.test.util.ReflectionTestUtils.setField(matchingEngineService, "skillNormalizer", skillNormalizer);
        org.springframework.test.util.ReflectionTestUtils.setField(matchingEngineService, "pgvectorCosineSimilarity", pgvectorCosineSimilarity);
        org.springframework.test.util.ReflectionTestUtils.setField(matchingEngineService, "jdbcTemplate", jdbcTemplate);

        candidateRankingService = new CandidateRankingService(matchResultRepository);

        matchingController = new MatchingController(
                matchingEngineService,
                candidateRankingService,
                jobRepository,
                recruiterProfileRepository,
                applicationRepository
        );

        screeningController = new ScreeningController(
                jdbcTemplate,
                mapper,
                documents,
                jobQueue,
                events
        );

        // Company A & HR Recruiter A
        companyA = Company.builder().name("Tech Corp A").build();
        companyA.setId(UUID.randomUUID());
        hrUserCompanyA = User.builder().email("hr@techcorp-a.com").role(Role.HR).build();
        hrUserCompanyA.setId(UUID.randomUUID());
        recruiterA = RecruiterProfile.builder().user(hrUserCompanyA).company(companyA).fullName("HR Manager A").build();
        recruiterA.setId(UUID.randomUUID());

        jobA = Job.builder()
                .company(companyA)
                .title("Senior Java Engineer")
                .industry("IT")
                .description("Yêu cầu tối thiểu 3 năm kinh nghiệm lập trình Java, Spring Boot, PostgreSQL, Docker. Trình độ Đại học chuyên ngành CNTT.")
                .status(JobStatus.PUBLISHED)
                .build();
        jobA.setId(UUID.randomUUID());

        // Company B & HR Recruiter B
        companyB = Company.builder().name("Fintech Corp B").build();
        companyB.setId(UUID.randomUUID());
        hrUserCompanyB = User.builder().email("hr@fintech-b.com").role(Role.HR).build();
        hrUserCompanyB.setId(UUID.randomUUID());
        recruiterB = RecruiterProfile.builder().user(hrUserCompanyB).company(companyB).fullName("HR Manager B").build();
        recruiterB.setId(UUID.randomUUID());

        jobB = Job.builder()
                .company(companyB)
                .title("Fullstack Developer")
                .industry("IT")
                .description("Yêu cầu React, Node.js, AWS.")
                .status(JobStatus.PUBLISHED)
                .build();
        jobB.setId(UUID.randomUUID());

        // Candidate 1 (Full match)
        candidateUser1 = User.builder().email("cand1@example.com").role(Role.CANDIDATE).build();
        candidateUser1.setId(UUID.randomUUID());
        candidateProfile1 = CandidateProfile.builder().user(candidateUser1).fullName("Nguyễn Văn A").build();
        candidateProfile1.setId(UUID.randomUUID());

        // Candidate 2 (Missing required skill)
        candidateUser2 = User.builder().email("cand2@example.com").role(Role.CANDIDATE).build();
        candidateUser2.setId(UUID.randomUUID());
        candidateProfile2 = CandidateProfile.builder().user(candidateUser2).fullName("Trần Thị B").build();
        candidateProfile2.setId(UUID.randomUUID());

        when(recruiterProfileRepository.findByUserId(hrUserCompanyA.getId())).thenReturn(Optional.of(recruiterA));
        when(recruiterProfileRepository.findByUserId(hrUserCompanyB.getId())).thenReturn(Optional.of(recruiterB));
        when(jobRepository.findById(jobA.getId())).thenReturn(Optional.of(jobA));
        when(jobRepository.findById(jobB.getId())).thenReturn(Optional.of(jobB));
        when(candidateProfileRepository.findById(candidateProfile1.getId())).thenReturn(Optional.of(candidateProfile1));
        when(candidateProfileRepository.findById(candidateProfile2.getId())).thenReturn(Optional.of(candidateProfile2));

        // Mock document queries for Documents.upload and documents.text
        lenient().when(jdbcTemplate.queryForList(contains("documents"), any(Object[].class)))
                .thenReturn(List.of(Map.of("id", UUID.randomUUID())));
        lenient().when(jdbcTemplate.queryForList(contains("documents"), any(), any(), any()))
                .thenReturn(List.of(Map.of("id", UUID.randomUUID())));
        lenient().when(jdbcTemplate.queryForObject(contains("max(version_no)"), eq(Integer.class), any(Object[].class)))
                .thenReturn(1);
        lenient().when(jdbcTemplate.queryForObject(contains("max(version_no)"), eq(Integer.class), any(Object.class)))
                .thenReturn(1);
        lenient().when(jdbcTemplate.queryForObject(contains("max(priority)"), eq(Integer.class), any(Object[].class)))
                .thenReturn(100);
        lenient().when(jdbcTemplate.queryForObject(contains("max(priority)"), eq(Integer.class), any(Object.class)))
                .thenReturn(100);

        lenient().when(jdbcTemplate.query(contains("processing_jobs"), any(org.springframework.jdbc.core.RowMapper.class), any(Object[].class)))
                .thenAnswer(inv -> {
                    Object[] raw = inv.getArguments();
                    if (raw.length > 2) {
                        if (raw[2] instanceof Object[] arr && arr.length > 0 && arr[0] instanceof UUID u) return List.of(u);
                        if (raw[2] instanceof UUID u) return List.of(u);
                    }
                    return List.of(UUID.randomUUID());
                });
        lenient().when(jdbcTemplate.query(contains("processing_jobs"), any(org.springframework.jdbc.core.RowMapper.class), any(), any(), any(), any(), any()))
                .thenAnswer(inv -> {
                    Object[] raw = inv.getArguments();
                    if (raw.length > 2) {
                        if (raw[2] instanceof Object[] arr && arr.length > 0 && arr[0] instanceof UUID u) return List.of(u);
                        if (raw[2] instanceof UUID u) return List.of(u);
                    }
                    return List.of(UUID.randomUUID());
                });
    }

    private byte[] createSamplePdfBytes(String content) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                cs.newLineAtOffset(50, 700);
                String[] lines = content.split("\\r?\\n");
                for (int i = 0; i < lines.length; i++) {
                    if (i > 0) cs.newLineAtOffset(0, -15);
                    cs.showText(lines[i]);
                }
                cs.endText();
            }
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            doc.save(baos);
            return baos.toByteArray();
        }
    }

    // =========================================================================
    // 1. INGESTION, EXTRACTION, EVIDENCE & SCHEMA VALIDATION, VECTOR EMBEDDING
    // =========================================================================

    @Test
    @DisplayName("1. Real Candidate CV Ingestion, Extraction, Validation & 1024-dim Vector Check")
    void testRealCvIngestionExtractionValidationAndVector() throws Exception {
        String cvText = "Nguyen Van A\n"
                + "Email: nguyen@example.com, Phone: +84901234567, Location: Ho Chi Minh City\n"
                + "Senior Java Developer with 5 years experience in Spring Boot, PostgreSQL, Docker.\n"
                + "Bachelor of Computer Science.";
        byte[] pdfBytes = createSamplePdfBytes(cvText);
        MockMultipartFile file = new MockMultipartFile("file", "nguyen_van_a_cv.pdf", "application/pdf", pdfBytes);

        // Upload creating native document
        Documents.Saved savedDoc = documents.upload(candidateUser1.getId(), "CV", "Nguyen Van A CV", file, null);
        assertNotNull(savedDoc);
        assertNotNull(savedDoc.documentId());
        assertNotNull(savedDoc.versionId());

        // Verify storage file exists on disk
        Path filePath = tempDir.resolve(savedDoc.versionId().toString() + ".pdf");
        assertTrue(java.nio.file.Files.exists(filePath));

        // TextReader reads real PDF file
        TextReader.Extracted extracted = textReader.read(filePath);
        assertTrue(extracted.text().contains("Senior Java Developer"));
        assertTrue(extracted.text().contains("Spring Boot"));

        // Schema validation on extracted structured JSON
        String validCvJson = """
        {
          "title": "Senior Java Developer",
          "summary": "Senior Java Developer with 5 years experience in Spring Boot, PostgreSQL, Docker.",
          "skills": [
            {
              "name": "Java",
              "canonical": "Java",
              "priority": "MENTIONED",
              "evidence": "Senior Java Developer",
              "category": "PROGRAMMING_LANGUAGES",
              "resolution": "TAXONOMY"
            },
            {
              "name": "Spring Boot",
              "canonical": "Spring Boot",
              "priority": "MENTIONED",
              "evidence": "Spring Boot",
              "category": "BACKEND_FRAMEWORKS",
              "resolution": "TAXONOMY"
            }
          ],
          "experience": {
            "years": 5.0,
            "evidence": "5 years experience",
            "entries": [
              {
                "role": "Senior Java Developer",
                "organization": "Acme Corp",
                "period": "2020-2025",
                "description": "5 years experience in Spring Boot",
                "evidence": "5 years experience in Spring Boot"
              }
            ]
          },
          "education": [
            {
              "level": "BACHELOR",
              "field": "Computer Science",
              "priority": "MENTIONED",
              "evidence": "Bachelor of Computer Science"
            }
          ],
          "projects": [],
          "otherRequirements": [],
          "githubUsername": null,
          "profile": {
            "fullName": "Nguyen Van A",
            "email": "nguyen@example.com",
            "phone": "+84901234567",
            "location": "Ho Chi Minh City"
          }
        }
        """;
        ObjectNode normalized = (ObjectNode) mapper.readTree(validCvJson);

        // Grounded evidence validation: should succeed because evidence matches raw text
        assertDoesNotThrow(() -> aiClient.validate(normalized, extracted.text(), "CV"));

        // Fabricated evidence check: should throw CustomException
        ObjectNode hallucinated = normalized.deepCopy();
        ObjectNode fakeSkill = ((ArrayNode) hallucinated.get("skills")).addObject();
        fakeSkill.put("name", "Rust");
        fakeSkill.put("canonical", "Rust");
        fakeSkill.put("evidence", "Expert Rust systems engineer with 10 years experience"); // Not in CV!
        assertThrows(CustomException.class, () -> aiClient.validate(hallucinated, extracted.text(), "CV"));

        // 1024-dim Vector validation check
        String validVector = "[" + String.join(",", Collections.nCopies(1024, "0.03125")) + "]";
        assertDoesNotThrow(() -> AiClient.validateVector(validVector));

        // Invalid vector dimensionality check
        String invalidVector = "[0.1, 0.2, 0.3]";
        assertThrows(CustomException.class, () -> AiClient.validateVector(invalidVector));
    }

    // =========================================================================
    // 2. STRUCTURED + NATIVE PGVECTOR MATCHING & MATHEMATICAL SCORE RECONSTRUCTION
    // =========================================================================

    @Test
    @DisplayName("2. Structured + Native Pgvector Matching & Exact Score Reconstruction")
    void testMatchingAndScoreReconstruction() {
        // Job A requirements
        JobRequirement reqJava = JobRequirement.builder().job(jobA).skillName("Java").requirementType(RequirementType.REQUIRED).build();
        JobRequirement reqSpring = JobRequirement.builder().job(jobA).skillName("Spring Boot").requirementType(RequirementType.REQUIRED).build();
        JobRequirement reqSql = JobRequirement.builder().job(jobA).skillName("PostgreSQL").requirementType(RequirementType.REQUIRED).build();
        JobRequirement prefDocker = JobRequirement.builder().job(jobA).skillName("Docker").requirementType(RequirementType.PREFERRED).build();

        when(jobRequirementRepository.findByJobId(jobA.getId())).thenReturn(List.of(reqJava, reqSpring, reqSql, prefDocker));

        // Candidate 1 CV
        String cvRawText = "Hồ sơ ứng viên Nguyễn Văn A: 5 năm kinh nghiệm lập trình Java, Spring Boot, PostgreSQL. Kỹ năng phụ trợ: Docker. Tốt nghiệp Đại học Bách Khoa ngành Công nghệ Thông tin.";
        CV cv1 = CV.builder().candidate(candidateProfile1).rawText(cvRawText).build();
        when(cvRepository.findByCandidateId(candidateProfile1.getId())).thenReturn(List.of(cv1));

        Application app1 = Application.builder().job(jobA).candidate(candidateProfile1).build();
        app1.setId(UUID.randomUUID());
        when(applicationRepository.findByJobIdAndCandidateId(jobA.getId(), candidateProfile1.getId())).thenReturn(Optional.of(app1));
        when(matchResultRepository.findByApplicationId(app1.getId())).thenReturn(Optional.empty());
        when(matchResultRepository.save(any())).thenAnswer(inv -> {
            MatchResult mr = inv.getArgument(0);
            mr.setId(UUID.randomUUID());
            return mr;
        });

        // Mock pgvector distance query in PostgreSQL returning score 85.0
        UUID cvDocVersionId = UUID.randomUUID();
        UUID jdDocVersionId = UUID.randomUUID();
        when(jdbcTemplate.query(contains("document_versions v JOIN documents d"), any(org.springframework.jdbc.core.RowMapper.class), eq(candidateUser1.getId())))
                .thenReturn(List.of(cvDocVersionId));
        when(jdbcTemplate.query(contains("document_versions v JOIN documents d"), any(org.springframework.jdbc.core.RowMapper.class), eq(jobA.getId()), eq(jobA.getId())))
                .thenReturn(List.of(jdDocVersionId));
        when(jdbcTemplate.queryForList(contains("cv.embedding <=> jd.embedding"), any(Object.class), any(Object.class)))
                .thenReturn(List.of(Map.of("score", BigDecimal.valueOf(85.00))));

        // Calculate match
        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(jobA.getId(), candidateProfile1.getId());

        assertNotNull(result);
        assertEquals("COMPLETED", result.getStatus());
        assertEquals(3, result.getRequiredSkillsTotal());
        assertEquals(3, result.getRequiredSkillsMatched());
        assertEquals(0, result.getRequiredSkillsMissing());
        assertEquals(1, result.getPreferredSkillsTotal());
        assertEquals(1, result.getPreferredSkillsMatched());

        // Verify MatchFactors saved for score reconstruction
        List<MatchFactor> savedFactors = new ArrayList<>();
        verify(matchFactorRepository, atLeast(6)).save(argThat(factor -> {
            savedFactors.add(factor);
            return true;
        }));

        // Reconstruct Core Score from MatchFactors:
        // Sum(score * weight) over all factors
        double reconstructedCore = savedFactors.stream()
                .filter(f -> !"GITHUB_SUPPORTING".equals(f.getFactorType()))
                .mapToDouble(f -> f.getScore().doubleValue() * f.getWeight().doubleValue())
                .sum();

        BigDecimal reconstructedCoreBd = BigDecimal.valueOf(reconstructedCore).setScale(2, RoundingMode.HALF_UP);
        assertEquals(result.getCoreScore(), reconstructedCoreBd, "Persisted core score must exactly match sum of factor weights");

        // Verify Overall Score equals Core Score when GitHub is absent
        assertFalse(result.getIsGithubActive());
        assertTrue(result.getGithubFallbackApplied());
        assertEquals(result.getCoreScore(), result.getOverallScore());
    }

    // =========================================================================
    // 3. RANKING SAFETY & DETERMINISTIC TIE-BREAKING
    // =========================================================================

    @Test
    @DisplayName("3. Candidate Ranking Safety: Required Skills Gating & Stable Tie-breaker")
    void testCandidateRankingSafetyAndTieBreaker() {
        UUID candIdA = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID candIdB = UUID.fromString("00000000-0000-0000-0000-000000000002");
        UUID candIdC = UUID.fromString("00000000-0000-0000-0000-000000000003");

        CandidateProfile cA = CandidateProfile.builder().fullName("Candidate A").build(); cA.setId(candIdA);
        CandidateProfile cB = CandidateProfile.builder().fullName("Candidate B").build(); cB.setId(candIdB);
        CandidateProfile cC = CandidateProfile.builder().fullName("Candidate C").build(); cC.setId(candIdC);

        Application appA = Application.builder().job(jobA).candidate(cA).build(); appA.setId(UUID.randomUUID());
        Application appB = Application.builder().job(jobA).candidate(cB).build(); appB.setId(UUID.randomUUID());
        Application appC = Application.builder().job(jobA).candidate(cC).build(); appC.setId(UUID.randomUUID());

        // Candidate C has 0 missing required skills, overall 85
        MatchResult mrC = MatchResult.builder()
                .application(appC)
                .requiredSkillsMissing(0)
                .overallScore(BigDecimal.valueOf(85.00))
                .coreScore(BigDecimal.valueOf(85.00))
                .build();
        mrC.setId(UUID.randomUUID());

        // Candidate B has 1 missing required skill, but higher overall 95
        MatchResult mrB = MatchResult.builder()
                .application(appB)
                .requiredSkillsMissing(1)
                .overallScore(BigDecimal.valueOf(95.00))
                .coreScore(BigDecimal.valueOf(95.00))
                .build();
        mrB.setId(UUID.randomUUID());

        // Candidate A has 0 missing required skills, identical overall 85, identical core 85 as C
        MatchResult mrA = MatchResult.builder()
                .application(appA)
                .requiredSkillsMissing(0)
                .overallScore(BigDecimal.valueOf(85.00))
                .coreScore(BigDecimal.valueOf(85.00))
                .build();
        mrA.setId(UUID.randomUUID());

        when(matchResultRepository.findByApplicationJobId(jobA.getId())).thenReturn(List.of(mrB, mrC, mrA));

        List<MatchResult> ranked = candidateRankingService.getRankedCandidatesForJob(jobA.getId(), null);

        // Order should be:
        // 1. Candidate A (0 missing, score 85, candId 0001 < 0003)
        // 2. Candidate C (0 missing, score 85, candId 0003)
        // 3. Candidate B (1 missing, even though score is 95)
        assertEquals(3, ranked.size());
        assertSame(mrA, ranked.get(0), "Candidate A satisfies required skills and has lowest UUID tie-breaker");
        assertSame(mrC, ranked.get(1), "Candidate C satisfies required skills");
        assertSame(mrB, ranked.get(2), "Candidate B missing required skills MUST be gated below candidates with 0 missing required skills");
    }

    // =========================================================================
    // 4. EXPLAINABILITY & GROUNDED EVIDENCE SNIPPETS
    // =========================================================================

    @Test
    @DisplayName("4. Grounded Explainability: CV snippets, GitHub assessment & Factor explanation")
    void testExplainabilityAndGroundedSnippets() {
        JobRequirement reqJava = JobRequirement.builder().job(jobA).skillName("Java").requirementType(RequirementType.REQUIRED).build();
        when(jobRequirementRepository.findByJobId(jobA.getId())).thenReturn(List.of(reqJava));

        String rawCv = "Kỹ năng chuyên môn: Thành thạo Java Spring Boot xây dựng hệ thống phân tán microservices.";
        CV cv = CV.builder().candidate(candidateProfile1).rawText(rawCv).build();
        when(cvRepository.findByCandidateId(candidateProfile1.getId())).thenReturn(List.of(cv));

        Application app = Application.builder().job(jobA).candidate(candidateProfile1).build();
        app.setId(UUID.randomUUID());
        when(applicationRepository.findById(app.getId())).thenReturn(Optional.of(app));

        MatchResult mr = MatchResult.builder()
                .application(app)
                .overallScore(BigDecimal.valueOf(90.00))
                .coreScore(BigDecimal.valueOf(90.00))
                .isGithubActive(false)
                .requiredSkillsTotal(1)
                .requiredSkillsMatched(1)
                .requiredSkillsMissing(0)
                .build();
        mr.setId(UUID.randomUUID());
        when(matchResultRepository.findByApplicationId(app.getId())).thenReturn(Optional.of(mr));

        MatchInspectionResponse response = matchingEngineService.getMatchInspection(app.getId());

        assertNotNull(response);
        assertEquals("Senior Java Engineer", response.getJobTitle());
        assertEquals("Nguyễn Văn A", response.getCandidateName());
        assertEquals(BigDecimal.valueOf(90.00), response.getOverallScore());
        assertFalse(response.getGithubScoreActive());

        // Check required skill evidence snippet is grounded in CV text
        assertFalse(response.getRequiredSkillsStatus().isEmpty());
        MatchInspectionResponse.SkillItem skillItem = response.getRequiredSkillsStatus().get(0);
        assertEquals("Java", skillItem.getSkillName());
        assertEquals("MATCH", skillItem.getStatus());
        assertTrue(skillItem.getEvidenceText().contains("Java"), "Snippet must be extracted from actual CV text");

        // Verify GitHub assessment indicates clean fallback when not connected
        assertNotNull(response.getGithubAssessment());
        assertFalse(response.getGithubAssessment().isConnected());
        assertEquals("NOT_CONNECTED", response.getGithubAssessment().getStatus());
    }

    // =========================================================================
    // 5. HR QUICK SCREENING LIFECYCLE & DETAILS API
    // =========================================================================

    @Test
    @DisplayName("5. HR Quick Screening Upload, Status & Details Flow")
    void testHrQuickScreeningLifecycle() throws Exception {
        // Set authenticated user to HR of Company A
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(hrUserCompanyA, null, List.of(new SimpleGrantedAuthority("ROLE_HR")))
        );

        byte[] pdfBytes = createSamplePdfBytes("CV ung vien Quick Screening: 4 nam kinh nghiem Java.");
        MockMultipartFile file = new MockMultipartFile("file", "quick_screening_cv.pdf", "application/pdf", pdfBytes);

        // Mock job query for company ownership check
        when(jdbcTemplate.queryForList(contains("SELECT j.* FROM jobs j LEFT JOIN recruiter_profiles rp"), eq(jobA.getId()), eq(hrUserCompanyA.getId()), eq(hrUserCompanyA.getId())))
                .thenReturn(List.of(Map.of("id", jobA.getId(), "title", jobA.getTitle(), "industry", "IT", "description", jobA.getDescription())));

        // Mock existing JD check
        UUID jdVersionId = UUID.randomUUID();
        when(jdbcTemplate.queryForList(contains("SELECT jd_version_id FROM screening_runs WHERE job_id=?"), eq(jobA.getId())))
                .thenReturn(List.of(Map.of("jd_version_id", jdVersionId.toString())));

        // Call HR Quick Screening Upload
        Map<String, Object> uploadResult = screeningController.upload(jobA.getId(), file, true);

        assertNotNull(uploadResult);
        assertNotNull(uploadResult.get("id"));
        assertNotNull(uploadResult.get("jobId"));

        UUID screeningRunId = (UUID) uploadResult.get("id");

        // Mock detail query
        Map<String, Object> runMap = new HashMap<>();
        runMap.put("id", screeningRunId);
        runMap.put("job_id", jobA.getId());
        runMap.put("owner_id", hrUserCompanyA.getId());
        runMap.put("cv_version_id", UUID.randomUUID());
        runMap.put("jd_version_id", jdVersionId);

        when(jdbcTemplate.queryForList(contains("SELECT * FROM screening_runs WHERE id=?"), eq(screeningRunId), eq(hrUserCompanyA.getId()), eq(hrUserCompanyA.getId())))
                .thenReturn(List.of(runMap));

        when(jdbcTemplate.queryForList(eq("SELECT * FROM document_versions WHERE id=?"), any(Object.class)))
                .thenReturn(List.of(Map.of("id", UUID.randomUUID(), "document_id", UUID.randomUUID(), "state", "READY", "storage_key", "key")));

        Map<String, Object> detail = screeningController.detail(screeningRunId);
        assertNotNull(detail);
        assertNotNull(detail.get("screening"));
        Map<?, ?> screeningView = (Map<?, ?>) detail.get("screening");
        assertEquals(screeningRunId.toString(), screeningView.get("id"));
        assertEquals(jobA.getId().toString(), screeningView.get("job_id"));
        assertNotNull(detail.get("cv"));
        assertNotNull(detail.get("jd"));
    }

    // =========================================================================
    // 6. MULTI-TENANT SECURITY & AUTHORIZATION BOUNDARIES
    // =========================================================================

    @Test
    @DisplayName("6. Security: Recruiter Cross-Company Access Rejection & Candidate Privacy")
    void testMultiTenantSecurityAndCandidatePrivacy() {
        // Test A: Recruiter B attempting to get rankings for Job A (Company A) -> 403 Forbidden
        UnauthorizedAccessException exRankings = assertThrows(UnauthorizedAccessException.class, () -> {
            matchingController.getCandidateRankings(hrUserCompanyB, jobA.getId(), null);
        });
        assertTrue(exRankings.getMessage().contains("Recruiter does not own the company"));

        // Test B: Candidate attempting to view Recruiter rankings -> 403 Forbidden
        UnauthorizedAccessException exCandRank = assertThrows(UnauthorizedAccessException.class, () -> {
            matchingController.getCandidateRankings(candidateUser1, jobA.getId(), null);
        });
        assertTrue(exCandRank.getMessage().contains("Ứng viên không có quyền"));

        // Test C: Candidate 2 attempting to inspect Candidate 1's application -> 403 Forbidden
        Application appCand1 = Application.builder().job(jobA).candidate(candidateProfile1).build();
        appCand1.setId(UUID.randomUUID());
        when(applicationRepository.findById(appCand1.getId())).thenReturn(Optional.of(appCand1));

        UnauthorizedAccessException exCrossCand = assertThrows(UnauthorizedAccessException.class, () -> {
            matchingController.getMatchInspection(candidateUser2, appCand1.getId());
        });
        assertTrue(exCrossCand.getMessage().contains("Candidate cannot inspect another candidate's application"));

        // Test D: Candidate 1 inspecting their OWN application -> Allowed!
        MatchResult mrCand1 = MatchResult.builder().application(appCand1).overallScore(BigDecimal.valueOf(88.0)).build();
        mrCand1.setId(UUID.randomUUID());
        when(matchResultRepository.findByApplicationId(appCand1.getId())).thenReturn(Optional.of(mrCand1));
        assertDoesNotThrow(() -> matchingController.getMatchInspection(candidateUser1, appCand1.getId()));

        // Test E: Recruiter A inspecting Candidate 1's application for Job A -> Allowed!
        assertDoesNotThrow(() -> matchingController.getMatchInspection(hrUserCompanyA, appCand1.getId()));

        // Test F: Recruiter B inspecting Candidate 1's application for Job A -> 403 Forbidden
        UnauthorizedAccessException exCrossRec = assertThrows(UnauthorizedAccessException.class, () -> {
            matchingController.getMatchInspection(hrUserCompanyB, appCand1.getId());
        });
        assertTrue(exCrossRec.getMessage().contains("Recruiter does not own the company"));
    }

    // =========================================================================
    // 7. RETRY & IDEMPOTENCY AT SCREENING LEVEL
    // =========================================================================

    @Test
    @DisplayName("7. Idempotency & Safe Retries on Match Execution")
    void testIdempotentMatchingCalculation() {
        Application app = Application.builder().job(jobA).candidate(candidateProfile1).build();
        app.setId(UUID.randomUUID());
        when(applicationRepository.findByJobIdAndCandidateId(jobA.getId(), candidateProfile1.getId())).thenReturn(Optional.of(app));

        CV cv = CV.builder().candidate(candidateProfile1).rawText("Java Spring Boot PostgreSQL").build();
        when(cvRepository.findByCandidateId(candidateProfile1.getId())).thenReturn(List.of(cv));

        MatchResult existingResult = MatchResult.builder()
                .application(app)
                .overallScore(BigDecimal.valueOf(80.00))
                .status("COMPLETED")
                .build();
        existingResult.setId(UUID.randomUUID());

        // Existing match result already present
        when(matchResultRepository.findByApplicationId(app.getId())).thenReturn(Optional.of(existingResult));
        when(matchResultRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Re-executing match calculation should update existing record, NOT duplicate
        MatchResult updated = matchingEngineService.calculateAndPersistMatchResult(jobA.getId(), candidateProfile1.getId());

        assertEquals(existingResult.getId(), updated.getId(), "Should update existing MatchResult ID rather than inserting duplicates");
        assertEquals("COMPLETED", updated.getStatus());
    }
}
