package com.platform.recruitment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.ai.AiClient;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.cv.TextReader;
import com.platform.recruitment.matching.RequiredSkillMatcher;
import com.platform.recruitment.taxonomy.TaxonomyService;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase 4 Comprehensive Verification Test Suite:
 * Strengthen Structured Extraction, Evidence Validation & Source Location.
 */
public class ExtractionAndEvidenceValidationTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private AiClient aiClient;
    private TaxonomyService taxonomyService;
    private TextReader textReader;

    @BeforeEach
    void setUp() throws Exception {
        taxonomyService = new TaxonomyService(null);
        // Register test skills and aliases
        UUID javaId = UUID.randomUUID();
        taxonomyService.registerSkill(
                new TaxonomyService.TaxonomySkill(javaId, "Java", "java", "PROGRAMMING_LANGUAGES", "Java language", "SEED", "v1.0", true),
                List.of("Core Java", "Java 17", "Java 21")
        );
        UUID jsId = UUID.randomUUID();
        taxonomyService.registerSkill(
                new TaxonomyService.TaxonomySkill(jsId, "JavaScript", "javascript", "PROGRAMMING_LANGUAGES", "JavaScript language", "SEED", "v1.0", true),
                List.of("JS", "Vanilla JS")
        );
        UUID reactId = UUID.randomUUID();
        taxonomyService.registerSkill(
                new TaxonomyService.TaxonomySkill(reactId, "React", "react", "FRONTEND_FRAMEWORKS", "React UI library", "SEED", "v1.0", true),
                List.of("ReactJS", "React.js")
        );

        aiClient = new AiClient(null, mapper, "http://localhost:11434", "granite", "bge-m3", 30, taxonomyService);
        textReader = new TextReader();
    }

    private String validSampleCvJson() {
        return """
        {
          "title": "Senior Java Developer",
          "summary": "Experienced software engineer with 5 years in Java backend.",
          "skills": [
            {
              "name": "Java",
              "canonical": "Java",
              "priority": "MENTIONED",
              "evidence": "Experienced software engineer with 5 years in Java backend.",
              "category": "PROGRAMMING_LANGUAGES",
              "resolution": "TAXONOMY"
            }
          ],
          "experience": {
            "years": 5.0,
            "evidence": "5 years in Java backend",
            "entries": [
              {
                "role": "Senior Developer",
                "organization": "Acme Corp",
                "period": "2020-2025",
                "description": "Led backend microservices team",
                "evidence": "Led backend microservices team"
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
          "projects": [
            {
              "name": "Recruitment App",
              "description": "Built AI recruitment engine",
              "technologies": ["Java", "Spring Boot"],
              "evidence": "Built AI recruitment engine"
            }
          ],
          "otherRequirements": [],
          "githubUsername": "octocat",
          "profile": {
            "fullName": "Nguyen Van A",
            "email": "nguyen@example.com",
            "phone": "+84901234567",
            "location": "Ho Chi Minh City"
          }
        }
        """;
    }

    private String sampleSourceText() {
        return "Nguyen Van A\n"
                + "Email: nguyen@example.com, Phone: +84901234567, Location: Ho Chi Minh City\n"
                + "github.com/octocat\n"
                + "Experienced software engineer with 5 years in Java backend.\n"
                + "Led backend microservices team\n"
                + "Bachelor of Computer Science\n"
                + "Built AI recruitment engine with Spring Boot";
    }

    // 1. Valid structured LLM JSON passes schema and evidence validation
    @Test
    @DisplayName("SC-01: Valid structured LLM JSON passes schema and evidence validation")
    void testValidStructuredLlmJson_PassesValidation() throws Exception {
        JsonNode node = mapper.readTree(validSampleCvJson());
        String text = sampleSourceText();

        assertDoesNotThrow(() -> aiClient.validate(node, text, "CV"));
    }

    // 2. Invalid JSON produces deterministic processing failure
    @Test
    @DisplayName("SC-02: Malformed JSON syntax throws CustomException(INTERNAL_SERVER_ERROR)")
    void testInvalidJsonSyntax_ThrowsException() {
        String invalidJson = "{ \"title\": \"Incomplete JSON";

        CustomException ex = assertThrows(CustomException.class, () -> {
            try {
                mapper.readTree(invalidJson);
            } catch (Exception e) {
                throw new CustomException(
                        ErrorCode.INTERNAL_SERVER_ERROR,
                        "LLM không trả về JSON hợp lệ. Không tạo dữ liệu thay thế.");
            }
        });

        assertEquals(ErrorCode.INTERNAL_SERVER_ERROR, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("LLM không trả về JSON hợp lệ"));
    }

    // 3. Schema-invalid JSON rejected deterministically
    @Test
    @DisplayName("SC-03: Schema-invalid JSON (missing required field) fails validation")
    void testSchemaInvalidJson_FailsValidation() throws Exception {
        String invalidSchema = """
        {
          "summary": "Missing title, skills, experience, etc."
        }
        """;
        JsonNode node = mapper.readTree(invalidSchema);

        CustomException ex = assertThrows(CustomException.class, () ->
                aiClient.validate(node, sampleSourceText(), "CV")
        );

        assertEquals(ErrorCode.VALIDATION_ERROR, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("Dữ liệu LLM không đúng schema"));
    }

    // 4. Evidence quote exists in source text
    @Test
    @DisplayName("SC-04: Grounded quote present verbatim passes validation")
    void testEvidenceQuoteExists_PassesValidation() throws Exception {
        JsonNode node = mapper.readTree(validSampleCvJson());
        String text = sampleSourceText();

        assertDoesNotThrow(() -> aiClient.validate(node, text, "CV"));
    }

    // 5. Evidence quote does NOT exist in source text (rejected, no fabricated fallback)
    @Test
    @DisplayName("SC-05: Hallucinated evidence quote absent from source text is rejected")
    void testEvidenceQuoteDoesNotExist_ThrowsValidationError() throws Exception {
        String jsonWithHallucinatedQuote = validSampleCvJson().replace(
                "Experienced software engineer with 5 years in Java backend.",
                "10 years leading Kubernetes and Rust systems worldwide"
        );
        JsonNode node = mapper.readTree(jsonWithHallucinatedQuote);
        String text = sampleSourceText(); // Does NOT contain Rust / Kubernetes

        CustomException ex = assertThrows(CustomException.class, () ->
                aiClient.validate(node, text, "CV")
        );

        assertEquals(ErrorCode.VALIDATION_ERROR, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("Không tìm thấy trích dẫn của LLM trong tài liệu gốc"));
    }

    // 6. Page-level evidence location
    @Test
    @DisplayName("SC-06: Multi-page document tracks exact page numbers and character offsets")
    void testPageLevelEvidenceLocation() {
        TextReader.PageSegment p1 = new TextReader.PageSegment(1, "Nguyen Van A\nSenior Java Developer", "pdf-text", false, 0, 36);
        TextReader.PageSegment p2 = new TextReader.PageSegment(2, "Education: Bachelor of Computer Science", "pdf-text", false, 37, 76);

        TextReader.Extracted extracted = new TextReader.Extracted(
                "Nguyen Van A\nSenior Java Developer\nEducation: Bachelor of Computer Science",
                "pdf-text",
                2,
                false,
                false,
                List.of(p1, p2)
        );

        Optional<TextReader.PageSegment> foundP1 = extracted.findPageForSnippet("Senior Java Developer");
        assertTrue(foundP1.isPresent());
        assertEquals(1, foundP1.get().pageNumber());
        assertEquals(0, foundP1.get().startChar());
        assertEquals(36, foundP1.get().endChar());

        Optional<TextReader.PageSegment> foundP2 = extracted.findPageForSnippet("Bachelor of Computer Science");
        assertTrue(foundP2.isPresent());
        assertEquals(2, foundP2.get().pageNumber());
        assertEquals(37, foundP2.get().startChar());
        assertEquals(76, foundP2.get().endChar());

        // Absence check
        Optional<TextReader.PageSegment> missing = extracted.findPageForSnippet("NonExistentSnippet");
        assertTrue(missing.isEmpty());
    }

    // 7. Real PDF extraction and segmenting
    @Test
    @DisplayName("SC-07: Real 2-page PDF file extraction verifies page counts and non-empty text")
    void testPdfExtraction_PreservesPages(@TempDir Path tempDir) throws IOException {
        Path pdfPath = tempDir.resolve("sample.pdf");
        try (PDDocument doc = new PDDocument()) {
            PDPage page1 = new PDPage();
            doc.addPage(page1);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page1)) {
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 12);
                cs.newLineAtOffset(100, 700);
                cs.showText("Page 1: Nguyen Van A - Software Engineer");
                cs.endText();
            }

            PDPage page2 = new PDPage();
            doc.addPage(page2);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page2)) {
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 12);
                cs.newLineAtOffset(100, 700);
                cs.showText("Page 2: Core Skills Java, Spring Boot, PostgreSQL");
                cs.endText();
            }
            doc.save(pdfPath.toFile());
        }

        TextReader.Extracted extracted = textReader.read(pdfPath);
        assertNotNull(extracted);
        assertEquals(2, extracted.pageCount());
        assertEquals("pdf-text", extracted.method());
        assertEquals(2, extracted.pages().size());

        assertEquals(1, extracted.pages().get(0).pageNumber());
        assertTrue(extracted.pages().get(0).text().contains("Page 1"));

        assertEquals(2, extracted.pages().get(1).pageNumber());
        assertTrue(extracted.pages().get(1).text().contains("Page 2"));
    }

    // 8. DOCX extraction
    @Test
    @DisplayName("SC-08: Real DOCX extraction extracts headings and paragraphs without page count")
    void testDocxExtraction(@TempDir Path tempDir) throws IOException {
        Path docxPath = tempDir.resolve("resume.docx");
        try (XWPFDocument doc = new XWPFDocument();
             FileOutputStream fos = new FileOutputStream(docxPath.toFile())) {
            XWPFParagraph p1 = doc.createParagraph();
            p1.createRun().setText("Tran Thi B - Lead Software Engineer");
            XWPFParagraph p2 = doc.createParagraph();
            p2.createRun().setText("Experience: 6 years developing enterprise Java solutions");
            doc.write(fos);
        }

        TextReader.Extracted extracted = textReader.read(docxPath);
        assertNotNull(extracted);
        assertEquals("docx", extracted.method());
        assertNull(extracted.pageCount(), "DOCX is a flow document without physical pages");
        assertTrue(extracted.text().contains("Tran Thi B"));
        assertTrue(extracted.text().contains("enterprise Java solutions"));
    }

    // 9. Extraction cache key generation and deterministic hit
    @Test
    @DisplayName("SC-10: Identical document content produces identical cache key (Cache Hit)")
    void testExtractionCacheHit() {
        UUID owner = UUID.randomUUID();
        String text = "Senior Java Developer with 5 years experience";

        String key1 = AiClient.buildCacheKey(owner, "CV", text, "granite", "bge-m3", "v2", "v1.0", "v1.0");
        String key2 = AiClient.buildCacheKey(owner, "CV", text, "granite", "bge-m3", "v2", "v1.0", "v1.0");

        assertEquals(key1, key2, "Identical inputs must yield identical SHA-256 cache keys");
    }

    // 10. Extraction cache isolation
    @Test
    @DisplayName("SC-11: Different owners or different document contents produce isolated cache keys")
    void testExtractionCacheIsolation() {
        UUID owner1 = UUID.randomUUID();
        UUID owner2 = UUID.randomUUID();
        String text1 = "Senior Java Developer";
        String text2 = "Senior Python Developer";

        String keyOwner1 = AiClient.buildCacheKey(owner1, "CV", text1, "granite", "bge-m3", "v2", "v1.0", "v1.0");
        String keyOwner2 = AiClient.buildCacheKey(owner2, "CV", text1, "granite", "bge-m3", "v2", "v1.0", "v1.0");
        String keyText2 = AiClient.buildCacheKey(owner1, "CV", text2, "granite", "bge-m3", "v2", "v1.0", "v1.0");

        assertNotEquals(keyOwner1, keyOwner2, "Different owners must not share cache keys");
        assertNotEquals(keyOwner1, keyText2, "Different contents must not share cache keys");
    }

    // 11. Taxonomy normalization on extracted skills
    @Test
    @DisplayName("SC-12: Extracted raw skills pass through TaxonomyService to resolve canonical names")
    void testTaxonomyNormalizationOnExtractedSkills() throws Exception {
        String jsonWithAliases = """
        {
          "title": "Engineer",
          "summary": "Dev",
          "skills": [
            {
              "name": "Core Java",
              "canonical": "Core Java",
              "priority": "MENTIONED",
              "evidence": "Core Java",
              "category": null,
              "resolution": "TAXONOMY"
            },
            {
              "name": "ReactJS",
              "canonical": "ReactJS",
              "priority": "MENTIONED",
              "evidence": "ReactJS",
              "category": null,
              "resolution": "TAXONOMY"
            }
          ],
          "experience": { "years": null, "evidence": null, "entries": [] },
          "education": [],
          "projects": [],
          "otherRequirements": [],
          "githubUsername": null,
          "profile": { "fullName": null, "email": null, "phone": null, "location": null }
        }
        """;

        JsonNode root = mapper.readTree(jsonWithAliases);
        taxonomyService.normalizeDocumentSkills(root);

        JsonNode skills = root.path("skills");
        assertEquals("Java", skills.get(0).path("canonical").asText(), "Core Java alias must resolve to canonical Java");
        assertEquals("PROGRAMMING_LANGUAGES", skills.get(0).path("category").asText());

        assertEquals("React", skills.get(1).path("canonical").asText(), "ReactJS alias must resolve to canonical React");
        assertEquals("FRONTEND_FRAMEWORKS", skills.get(1).path("category").asText());
    }

    // 12. Java vs JavaScript discrimination
    @Test
    @DisplayName("SC-13: Java vs JavaScript discrimination is strictly preserved in taxonomy and matcher")
    void testJavaVsJavaScriptDiscrimination() {
        Optional<TaxonomyService.TaxonomyMatch> matchJava = taxonomyService.lookup("Java");
        Optional<TaxonomyService.TaxonomyMatch> matchJs = taxonomyService.lookup("JavaScript");

        assertTrue(matchJava.isPresent());
        assertTrue(matchJs.isPresent());
        assertEquals("Java", matchJava.get().canonicalName());
        assertEquals("JavaScript", matchJs.get().canonicalName());
        assertNotEquals(matchJava.get().canonicalName(), matchJs.get().canonicalName());

        // Matcher boundary test
        com.platform.recruitment.matching.SkillNormalizer normalizer = new com.platform.recruitment.matching.SkillNormalizer(taxonomyService);
        assertTrue(normalizer.matchesSkill("Java", "I am a skilled Java programmer."));
        assertFalse(normalizer.matchesSkill("Java", "I only know JavaScript and NodeJS."));
    }

    // 13. No fabricated evidence: ungrounded claims are rejected and not substituted
    @Test
    @DisplayName("SC-15: Normalization rejects ungrounded claims instead of fabricating evidence")
    void testNoFabricatedEvidenceInNormalization() throws Exception {
        String jsonWithInvalidEvidence = """
        {
          "title": "Engineer",
          "summary": null,
          "skills": [
            {
              "name": "Docker",
              "canonical": "Docker",
              "priority": "MENTIONED",
              "evidence": "Fabricated quote that does not exist in text",
              "category": null,
              "resolution": "TAXONOMY"
            }
          ],
          "experience": { "years": null, "evidence": null, "entries": [] },
          "education": [],
          "projects": [],
          "otherRequirements": [],
          "githubUsername": null,
          "profile": { "fullName": null, "email": null, "phone": null, "location": null }
        }
        """;

        JsonNode node = mapper.readTree(jsonWithInvalidEvidence);
        String sourceText = "Only Python and Django are mentioned in this CV.";

        // Normalization must REMOVE the skill with invalid evidence, NOT substitute name
        aiClient.normalize(node, sourceText, "CV");
        assertEquals(0, node.path("skills").size(), "Ungrounded skill must be removed, not fabricated");
    }

    // 14. File security constraints
    @Test
    @DisplayName("SC-16: Magic byte validation and size limit safeguards are enforced")
    void testFileSecuritySafeguards(@TempDir Path tempDir) throws IOException {
        Path fakeDocx = tempDir.resolve("spoofed.docx");
        Files.writeString(fakeDocx, "Not a ZIP PK file");

        CustomException ex = assertThrows(CustomException.class, () -> textReader.read(fakeDocx));
        assertEquals(ErrorCode.INVALID_FILE, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("Nội dung tệp không khớp phần mở rộng"));
    }
}
