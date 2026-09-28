package com.platform.recruitment.cv;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.ai.AiWorkerClient;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.document.Documents;
import com.platform.recruitment.user.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.ZonedDateTime;
import java.util.*;

@Slf4j
@Service
public class CVService {

    private final CVRepository cvRepository;
    private final CVVersionRepository cvVersionRepository;
    private final CVSectionRepository cvSectionRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final Documents documents;
    private final TextReader textReader;
    private final JdbcTemplate jdbcTemplate;
    private final AiWorkerClient aiWorkerClient;
    private final ObjectMapper objectMapper;
    private final org.springframework.transaction.support.TransactionTemplate tx;

    @Autowired
    public CVService(
            CVRepository cvRepository,
            CVVersionRepository cvVersionRepository,
            CVSectionRepository cvSectionRepository,
            CandidateProfileRepository candidateProfileRepository,
            Documents documents,
            TextReader textReader,
            JdbcTemplate jdbcTemplate,
            @Autowired(required = false) AiWorkerClient aiWorkerClient,
            @Autowired(required = false) ObjectMapper objectMapper,
            @Autowired(required = false) org.springframework.transaction.PlatformTransactionManager transactionManager) {
        this.cvRepository = cvRepository;
        this.cvVersionRepository = cvVersionRepository;
        this.cvSectionRepository = cvSectionRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.documents = documents;
        this.textReader = textReader;
        this.jdbcTemplate = jdbcTemplate;
        this.aiWorkerClient = aiWorkerClient;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        this.tx = transactionManager != null ? new org.springframework.transaction.support.TransactionTemplate(transactionManager) : null;
    }

    public CVService(
            CVRepository cvRepository,
            CVVersionRepository cvVersionRepository,
            CVSectionRepository cvSectionRepository,
            CandidateProfileRepository candidateProfileRepository,
            Documents documents,
            TextReader textReader,
            JdbcTemplate jdbcTemplate) {
        this(cvRepository, cvVersionRepository, cvSectionRepository, candidateProfileRepository, documents, textReader, jdbcTemplate, null, new ObjectMapper(), null);
    }

    @Transactional
    public CVResponse createCV(User candidateUser, CreateCVRequest request) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        CV cv = CV.builder()
                .candidate(candidate)
                .title(request.getTitle())
                .creationPath(request.getCreationPath())
                .targetIndustry(request.getTargetIndustry())
                .rawText(request.getRawText())
                .isDefault(request.getIsDefault() != null ? request.getIsDefault() : false)
                .status("PARSED")
                .build();

        CV savedCv = cvRepository.save(cv);

        CVVersion version = CVVersion.builder()
                .cv(savedCv)
                .versionNumber(1)
                .title(savedCv.getTitle() + " v1.0")
                .rawTextContent(savedCv.getRawText())
                .build();
        version = cvVersionRepository.save(version);

        CVSection section = CVSection.builder()
                .cvVersion(version)
                .sectionType("SUMMARY")
                .content(savedCv.getTitle() != null ? savedCv.getTitle() : "")
                .build();
        cvSectionRepository.save(section);

        return mapToResponse(savedCv);
    }

    @Transactional(readOnly = true)
    public List<CVResponse> getCandidateCVs(User candidateUser) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        return cvRepository.findByCandidateId(candidate.getId()).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CVResponse getCVById(User candidateUser, UUID cvId) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        CV cv = cvRepository.findById(cvId)
                .orElseThrow(() -> new ResourceNotFoundException("CV", "id", cvId));

        if (!cv.getCandidate().getId().equals(candidate.getId())) {
            throw new UnauthorizedAccessException("Candidate does not own this CV");
        }

        return mapToResponse(cv);
    }

    @Transactional
    public CVResponse updateCVRawText(User candidateUser, UUID cvId, String newRawText) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        CV cv = cvRepository.findById(cvId)
                .orElseThrow(() -> new ResourceNotFoundException("CV", "id", cvId));

        if (!cv.getCandidate().getId().equals(candidate.getId())) {
            throw new UnauthorizedAccessException("Candidate does not own this CV");
        }

        cv.setRawText(newRawText);
        CV updatedCv = cvRepository.save(cv);
        return mapToResponse(updatedCv);
    }

    @Transactional
    public CVResponse uploadCV(User candidateUser, MultipartFile file, String title, String targetIndustry, Boolean isDefault) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        String originalFileName = Optional.ofNullable(file != null ? file.getOriginalFilename() : null).orElse("document");
        String cvTitle = (title != null && !title.isBlank()) ? title : originalFileName;

        // 1. Native document ingestion
        Documents.Saved savedDoc;
        try {
            savedDoc = documents.upload(candidateUser.getId(), "CV", cvTitle, file, null);
        } catch (CustomException ce) {
            throw ce;
        } catch (Exception e) {
            log.error("Failed to store uploaded file for candidate user {}: {}", candidateUser.getId(), e.getMessage(), e);
            throw new CustomException(ErrorCode.FILE_STORAGE_FAILED, "Không thể lưu tệp CV lên hệ thống lưu trữ. Vui lòng thử lại.");
        }

        String ext = originalFileName.contains(".")
                ? originalFileName.substring(originalFileName.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT)
                : "pdf";
        String storageKey = savedDoc.versionId() + "." + ext;

        // 2. Operation A: Document extraction (pure local text layer / OCR, strictly NO LLM)
        byte[] fileBytes = new byte[0];
        try {
            if (file != null) {
                fileBytes = file.getBytes();
            }
        } catch (IOException ignored) {}

        String extractedText = null;
        String extractionMethod = "native-reader";
        boolean isDegradedFallback = false;

        if (aiWorkerClient != null && fileBytes.length > 0) {
            try {
                Map<String, Object> extractRes = aiWorkerClient.extractDocument(fileBytes, originalFileName, ext.toUpperCase(Locale.ROOT), null);
                if (extractRes != null && ("EXTRACTED".equals(extractRes.get("status")) || "SUCCESS".equals(extractRes.get("status")))) {
                    extractedText = (String) extractRes.get("rawText");
                    if (extractedText == null || extractedText.isBlank()) {
                        extractedText = (String) extractRes.get("text");
                    }
                    extractionMethod = (String) extractRes.getOrDefault("extractionMethod", "ai-worker");
                }
            } catch (Exception ex) {
                log.warn("AI Worker extract-document call failed, falling back to native TextReader: {}", ex.getMessage());
            }
        }

        if (extractedText == null || extractedText.isBlank()) {
            TextReader.Extracted extracted = textReader.read(documents.path(storageKey));
            extractedText = extracted.text();
            extractionMethod = extracted.method();
            isDegradedFallback = true;
        }

        if (extractedText == null || extractedText.isBlank()) {
            throw new CustomException(ErrorCode.INVALID_FILE, "DOCUMENT_TEXT_EMPTY: Document text extraction yielded no readable text");
        }

        final String finalExtractedText = extractedText;
        final String finalExtractionMethod = extractionMethod;

        // 3. PERSIST RAW TEXT AND COMMIT (EXTRACTED state)
        // Raw text is permanently saved in document_versions before LLM structuring is invoked
        if (tx != null) {
            tx.executeWithoutResult(status -> {
                jdbcTemplate.update(
                        "UPDATE document_versions SET raw_text=?, extraction_method=?, state='EXTRACTED' WHERE id=?",
                        finalExtractedText, finalExtractionMethod, savedDoc.versionId()
                );
            });
        } else {
            jdbcTemplate.update(
                    "UPDATE document_versions SET raw_text=?, extraction_method=?, state='EXTRACTED' WHERE id=?",
                    finalExtractedText, finalExtractionMethod, savedDoc.versionId()
            );
        }

        // 4. Operation B: CV structuring via LLM
        Map<String, Object> aiResult = null;
        boolean structuringSucceeded = false;
        if (!isDegradedFallback && aiWorkerClient != null) {
            try {
                aiResult = aiWorkerClient.extractCv(savedDoc.documentId(), savedDoc.versionId(), null, null, finalExtractedText);
                if (aiResult != null && "SUCCESS".equals(aiResult.get("status"))) {
                    structuringSucceeded = true;
                }
            } catch (Exception ex) {
                log.warn("AI Worker structuring failed, raw text is preserved: {}", ex.getMessage());
            }
        }

        // 5. Update document_versions record with structuring outcome
        if (structuringSucceeded && aiResult != null) {
            try {
                String normJson = objectMapper.writeValueAsString(aiResult);
                jdbcTemplate.update(
                        "UPDATE document_versions SET normalized=?::jsonb, state='READY' WHERE id=?",
                        normJson, savedDoc.versionId()
                );
            } catch (Exception jsonErr) {
                jdbcTemplate.update(
                        "UPDATE document_versions SET state='READY' WHERE id=?",
                        savedDoc.versionId()
                );
            }
        } else {
            // TextReader or failed LLM creates degraded extraction: EXTRACTED / STRUCTURING_FAILED
            jdbcTemplate.update(
                    "UPDATE document_versions SET state='STRUCTURING_FAILED', error_code='STRUCTURING_FAILED', error_message='Structuring incomplete, draft requires manual review' WHERE id=?",
                    savedDoc.versionId()
            );
        }

        // 6. Persist CV entity with synchronized IDs
        String filePath = documents.path(storageKey).toString();
        String contentType = (file != null && file.getContentType() != null && !file.getContentType().isBlank())
                ? file.getContentType()
                : (ext.equals("docx") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf");

        CV cv = CV.builder()
                .candidate(candidate)
                .title(cvTitle)
                .creationPath(CVCreationPath.UPLOAD)
                .targetIndustry(targetIndustry)
                .fileName(originalFileName)
                .filePath(filePath)
                .fileType(contentType)
                .fileSize(file != null ? (int) file.getSize() : 0)
                .status("PARSED")
                .rawText(finalExtractedText)
                .isDefault(isDefault != null ? isDefault : false)
                .build();
        cv.setId(savedDoc.documentId());

        CV savedCv = cvRepository.save(cv);

        CVVersion version = CVVersion.builder()
                .cv(savedCv)
                .versionNumber(savedDoc.versionNo())
                .title(savedCv.getTitle() + " v" + savedDoc.versionNo() + ".0")
                .rawTextContent(finalExtractedText)
                .status("DRAFT")
                .build();
        version.setId(savedDoc.versionId());
        version = cvVersionRepository.save(version);

        // 7. Persist structured sections (DO NOT dump raw CV into SUMMARY section)
        if (aiResult != null && aiResult.get("skills") instanceof List<?> skillsList && !skillsList.isEmpty()) {
            try {
                cvSectionRepository.save(CVSection.builder()
                        .cvVersion(version)
                        .sectionType("SKILLS")
                        .content(objectMapper.writeValueAsString(skillsList))
                        .build());
            } catch (Exception ignored) {}
        }
        if (aiResult != null && aiResult.get("experiences") instanceof List<?> expList && !expList.isEmpty()) {
            try {
                cvSectionRepository.save(CVSection.builder()
                        .cvVersion(version)
                        .sectionType("EXPERIENCE")
                        .content(objectMapper.writeValueAsString(expList))
                        .build());
            } catch (Exception ignored) {}
        }
        if (aiResult != null && aiResult.get("educations") instanceof List<?> eduList && !eduList.isEmpty()) {
            try {
                cvSectionRepository.save(CVSection.builder()
                        .cvVersion(version)
                        .sectionType("EDUCATION")
                        .content(objectMapper.writeValueAsString(eduList))
                        .build());
            } catch (Exception ignored) {}
        }

        // Summary section stores strictly the extracted candidate summary/bio, NEVER full raw text
        String candidateSummary = "";
        if (aiResult != null && aiResult.get("summary") != null) {
            candidateSummary = aiResult.get("summary").toString();
        } else if (aiResult != null && aiResult.get("bio") != null) {
            candidateSummary = aiResult.get("bio").toString();
        }
        if (!candidateSummary.isBlank()) {
            cvSectionRepository.save(CVSection.builder()
                    .cvVersion(version)
                    .sectionType("SUMMARY")
                    .content(candidateSummary)
                    .build());
        }

        CVResponse response = mapToResponse(savedCv);
        response.setJobId(savedDoc.jobId());
        response.setDocumentVersionId(savedDoc.versionId());
        return response;
    }

    @Transactional(readOnly = true)
    public CVReviewResponse getCVReview(User candidateUser, UUID cvId) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        CV cv = cvRepository.findById(cvId)
                .orElseThrow(() -> new ResourceNotFoundException("CV", "id", cvId));

        if (!cv.getCandidate().getId().equals(candidate.getId())) {
            throw new UnauthorizedAccessException("Candidate does not own this CV");
        }

        List<Map<String, Object>> vRows = jdbcTemplate.queryForList(
                "SELECT v.*, d.title AS doc_title, d.owner_id " +
                "FROM document_versions v " +
                "JOIN documents d ON d.id = v.document_id " +
                "WHERE v.document_id = ? " +
                "ORDER BY v.version_no DESC LIMIT 1",
                cvId
        );

        UUID versionId = cvId;
        String rawText = cv.getRawText();
        String extractionMethod = "native";
        String state = cv.getStatus();
        Map<String, Object> structured = new LinkedHashMap<>();
        List<Map<String, Object>> evidences = new ArrayList<>();
        List<Map<String, Object>> unverifiedFacts = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        List<Map<String, Object>> pages = new ArrayList<>();

        if (!vRows.isEmpty()) {
            Map<String, Object> v = vRows.get(0);
            versionId = (UUID) v.get("id");
            if (v.get("raw_text") != null) {
                rawText = (String) v.get("raw_text");
            }
            if (v.get("extraction_method") != null) {
                extractionMethod = (String) v.get("extraction_method");
            }
            if (v.get("state") != null) {
                state = (String) v.get("state");
            }

            Object normObj = v.get("normalized");
            if (normObj != null) {
                try {
                    String normStr = normObj.toString();
                    Map<String, Object> parsed = objectMapper.readValue(normStr, new TypeReference<>() {});
                    structured = parsed;
                    if (parsed.get("evidences") instanceof List<?> evList) {
                        for (Object o : evList) {
                            if (o instanceof Map<?, ?> m) {
                                evidences.add((Map<String, Object>) m);
                            }
                        }
                    }
                    if (parsed.get("unverified_facts") instanceof List<?> uvList) {
                        for (Object o : uvList) {
                            if (o instanceof Map<?, ?> m) {
                                unverifiedFacts.add((Map<String, Object>) m);
                            }
                        }
                    }
                    if (parsed.get("warnings") instanceof List<?> wList) {
                        for (Object o : wList) {
                            warnings.add(String.valueOf(o));
                        }
                    }
                    if (parsed.get("pages") instanceof List<?> pList) {
                        for (Object o : pList) {
                            if (o instanceof Map<?, ?> m) {
                                pages.add((Map<String, Object>) m);
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn("Failed parsing normalized JSON for cvId: {}", cvId);
                }
            }
        }

        return CVReviewResponse.builder()
                .cvId(cv.getId())
                .versionId(versionId)
                .title(cv.getTitle())
                .fileName(cv.getFileName())
                .fileType(cv.getFileType())
                .fileSize(cv.getFileSize())
                .status(state)
                .extractionMethod(extractionMethod)
                .rawText(rawText)
                .structured(structured)
                .evidences(evidences)
                .unverifiedFacts(unverifiedFacts)
                .warnings(warnings)
                .pages(pages)
                .createdAt(cv.getCreatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public DownloadResult downloadCV(User candidateUser, UUID cvId, String format) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        CV cv = cvRepository.findById(cvId)
                .orElseThrow(() -> new ResourceNotFoundException("CV", "id", cvId));

        if (!cv.getCandidate().getId().equals(candidate.getId())) {
            throw new UnauthorizedAccessException("Candidate does not own this CV");
        }

        List<Map<String, Object>> vRows = jdbcTemplate.queryForList(
                "SELECT v.* FROM document_versions v WHERE v.document_id = ? ORDER BY v.version_no DESC LIMIT 1",
                cvId
        );

        String baseName = cv.getTitle() != null ? cv.getTitle().replaceAll("[\\\\/:*?\"<>|]", "_") : "cv";
        String fmt = format != null ? format.toLowerCase(Locale.ROOT) : "raw";

        if (fmt.equals("raw") || fmt.equals("raw.txt") || fmt.equals("txt")) {
            String text = cv.getRawText() != null ? cv.getRawText() : "";
            if (!vRows.isEmpty() && vRows.get(0).get("raw_text") != null) {
                text = (String) vRows.get(0).get("raw_text");
            }
            return new DownloadResult(
                    text.getBytes(StandardCharsets.UTF_8),
                    baseName + "_raw.txt",
                    "text/plain; charset=UTF-8"
            );
        }

        if (fmt.equals("json") || fmt.equals("structured") || fmt.equals("structured.json")) {
            String jsonStr = "{}";
            if (!vRows.isEmpty() && vRows.get(0).get("normalized") != null) {
                jsonStr = vRows.get(0).get("normalized").toString();
            }
            return new DownloadResult(
                    jsonStr.getBytes(StandardCharsets.UTF_8),
                    baseName + "_structured.json",
                    "application/json; charset=UTF-8"
            );
        }

        // Original file
        if (!vRows.isEmpty() && vRows.get(0).get("storage_key") != null) {
            String key = (String) vRows.get(0).get("storage_key");
            Path path = documents.path(key);
            try {
                byte[] data = Files.readAllBytes(path);
                String originalFilename = cv.getFileName() != null ? cv.getFileName() : baseName + ".pdf";
                String contentType = cv.getFileType() != null ? cv.getFileType() : "application/octet-stream";
                return new DownloadResult(data, originalFilename, contentType);
            } catch (IOException e) {
                throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "Original document file could not be read from storage.");
            }
        }

        throw new CustomException(ErrorCode.VALIDATION_ERROR, "Invalid download format requested: " + format);
    }

    @Transactional
    public CVReviewResponse retryCVExtraction(User candidateUser, UUID cvId) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        CV cv = cvRepository.findById(cvId)
                .orElseThrow(() -> new ResourceNotFoundException("CV", "id", cvId));

        if (!cv.getCandidate().getId().equals(candidate.getId())) {
            throw new UnauthorizedAccessException("Candidate does not own this CV");
        }

        List<Map<String, Object>> vRows = jdbcTemplate.queryForList(
                "SELECT v.* FROM document_versions v WHERE v.document_id = ? ORDER BY v.version_no DESC LIMIT 1",
                cvId
        );

        if (vRows.isEmpty()) {
            throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "Document version not found for CV: " + cvId);
        }

        Map<String, Object> versionRow = vRows.get(0);
        UUID versionId = (UUID) versionRow.get("id");
        String existingRaw = (String) versionRow.get("raw_text");
        String extractedText = existingRaw;
        Map<String, Object> aiResult = null;

        if (extractedText == null || extractedText.isBlank()) {
            // Missing raw text fallback: read original file
            String storageKey = (String) versionRow.get("storage_key");
            Path path = documents.path(storageKey);
            byte[] fileBytes;
            try {
                fileBytes = Files.readAllBytes(path);
            } catch (IOException e) {
                throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "Stored document file missing from disk.");
            }

            String ext = storageKey.contains(".") ? storageKey.substring(storageKey.lastIndexOf('.') + 1) : "pdf";
            if (aiWorkerClient != null && fileBytes.length > 0) {
                try {
                    Map<String, Object> extractRes = aiWorkerClient.extractDocument(fileBytes, cv.getFileName(), ext.toUpperCase(Locale.ROOT), null);
                    if (extractRes != null && ("EXTRACTED".equals(extractRes.get("status")) || "SUCCESS".equals(extractRes.get("status")))) {
                        extractedText = (String) extractRes.get("rawText");
                        if (extractedText == null || extractedText.isBlank()) {
                            extractedText = (String) extractRes.get("text");
                        }
                    }
                } catch (Exception ex) {
                    log.warn("Retry extraction via AI Worker failed: {}", ex.getMessage());
                }
            }

            if (extractedText == null || extractedText.isBlank()) {
                TextReader.Extracted extracted = textReader.read(path);
                extractedText = extracted.text();
            }

            if (extractedText != null && !extractedText.isBlank()) {
                jdbcTemplate.update("UPDATE document_versions SET raw_text=?, state='EXTRACTED' WHERE id=?", extractedText, versionId);
            }
        }

        // Retry structuring directly from saved raw text without reading binary file
        if (extractedText != null && !extractedText.isBlank() && aiWorkerClient != null) {
            try {
                aiResult = aiWorkerClient.extractCv(cvId, versionId, null, null, extractedText);
            } catch (Exception ex) {
                log.error("Retry structuring via AI Worker failed: {}", ex.getMessage());
            }
        }

        if (extractedText != null && !extractedText.isBlank()) {
            cv.setRawText(extractedText);
            cvRepository.save(cv);

            if (aiResult != null && "SUCCESS".equals(aiResult.get("status"))) {
                try {
                    String normJson = objectMapper.writeValueAsString(aiResult);
                    jdbcTemplate.update(
                            "UPDATE document_versions SET normalized=?::jsonb, state='READY', error_code=NULL, error_message=NULL WHERE id=?",
                            normJson, versionId
                    );
                } catch (Exception ignored) {
                    jdbcTemplate.update(
                            "UPDATE document_versions SET state='READY', error_code=NULL, error_message=NULL WHERE id=?",
                            versionId
                    );
                }
            } else {
                jdbcTemplate.update(
                        "UPDATE document_versions SET state='STRUCTURING_FAILED', error_code='STRUCTURING_FAILED', error_message='Retry structuring failed' WHERE id=?",
                        versionId
                );
            }
        }

        return getCVReview(candidateUser, cvId);
    }

    @Transactional
    public void deleteCV(User candidateUser, UUID cvId) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        CV cv = cvRepository.findById(cvId)
                .orElseThrow(() -> new ResourceNotFoundException("CV", "id", cvId));

        if (!cv.getCandidate().getId().equals(candidate.getId())) {
            throw new UnauthorizedAccessException("Candidate does not own this CV");
        }

        cvRepository.delete(cv);
        jdbcTemplate.update("UPDATE documents SET archived=true WHERE id=? AND owner_id=?", cvId, candidateUser.getId());
    }

    public CVResponse mapToResponse(CV cv) {
        return CVResponse.builder()
                .id(cv.getId())
                .candidateId(cv.getCandidate().getId())
                .title(cv.getTitle())
                .creationPath(cv.getCreationPath())
                .targetIndustry(cv.getTargetIndustry())
                .fileName(cv.getFileName())
                .filePath(cv.getFilePath())
                .fileType(cv.getFileType())
                .fileSize(cv.getFileSize())
                .status(cv.getStatus())
                .rawText(cv.getRawText())
                .isDefault(cv.getIsDefault())
                .createdAt(cv.getCreatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public CVDraftResponse getCVDraft(User candidateUser, UUID cvId) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        CV cv = cvRepository.findById(cvId)
                .orElseThrow(() -> new ResourceNotFoundException("CV", "id", cvId));

        if (!cv.getCandidate().getId().equals(candidate.getId())) {
            throw new UnauthorizedAccessException("Candidate does not own this CV");
        }

        List<CVVersion> versions = cvVersionRepository.findByCvIdOrderByVersionNumberDesc(cvId);
        CVVersion version;
        if (versions.isEmpty()) {
            version = CVVersion.builder()
                    .cv(cv)
                    .versionNumber(1)
                    .title(cv.getTitle() + " v1.0")
                    .rawTextContent(cv.getRawText())
                    .status("DRAFT")
                    .build();
            version = cvVersionRepository.save(version);
        } else {
            version = versions.get(0);
        }

        Map<String, Object> rawStructured = new LinkedHashMap<>();
        if (version.getStructuredJsonContent() != null && !version.getStructuredJsonContent().isBlank()) {
            try {
                rawStructured = objectMapper.readValue(version.getStructuredJsonContent(), new TypeReference<>() {});
            } catch (Exception e) {
                log.warn("Failed to parse structuredJsonContent for version {}", version.getId());
            }
        }

        if (rawStructured.isEmpty()) {
            List<Map<String, Object>> vRows = jdbcTemplate.queryForList(
                    "SELECT normalized FROM document_versions WHERE document_id = ? ORDER BY version_no DESC LIMIT 1",
                    cvId
            );
            if (!vRows.isEmpty() && vRows.get(0).get("normalized") != null) {
                try {
                    rawStructured = objectMapper.readValue(vRows.get(0).get("normalized").toString(), new TypeReference<>() {});
                } catch (Exception ignored) {}
            }
        }

        Map<String, Object> personalInfo = extractPersonalInfoWithLineage(rawStructured, candidate, cv);
        Map<String, Object> summary = extractSummaryWithLineage(rawStructured, cv);
        List<Map<String, Object>> skills = extractSkillsWithLineage(rawStructured, version.getId());
        List<Map<String, Object>> experiences = extractExperienceWithLineage(rawStructured, version.getId());
        List<Map<String, Object>> projects = extractProjectsWithLineage(rawStructured);
        List<Map<String, Object>> education = extractEducationWithLineage(rawStructured, version.getId());
        List<Map<String, Object>> certifications = extractCertificationsWithLineage(rawStructured);
        List<Map<String, Object>> languages = extractLanguagesWithLineage(rawStructured);
        Map<String, Object> links = extractLinksWithLineage(rawStructured, personalInfo);

        return CVDraftResponse.builder()
                .cvId(cv.getId())
                .profileId(candidate.getId())
                .versionId(version.getId())
                .versionNumber(version.getVersionNumber())
                .title(version.getTitle() != null ? version.getTitle() : cv.getTitle())
                .status(version.getStatus() != null ? version.getStatus() : "DRAFT")
                .confirmedAt(version.getConfirmedAt())
                .personalInfo(personalInfo)
                .summary(summary)
                .skills(skills)
                .workExperience(experiences)
                .projects(projects)
                .education(education)
                .certifications(certifications)
                .languages(languages)
                .links(links)
                .rawStructured(rawStructured)
                .createdAt(version.getCreatedAt() != null ? version.getCreatedAt() : cv.getCreatedAt())
                .updatedAt(version.getUpdatedAt() != null ? version.getUpdatedAt() : cv.getUpdatedAt())
                .build();
    }

    @Transactional
    public CVDraftResponse updateCVDraft(User candidateUser, UUID cvId, UpdateCVDraftRequest request) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        CV cv = cvRepository.findById(cvId)
                .orElseThrow(() -> new ResourceNotFoundException("CV", "id", cvId));

        if (!cv.getCandidate().getId().equals(candidate.getId())) {
            throw new UnauthorizedAccessException("Candidate does not own this CV");
        }

        List<CVVersion> versions = cvVersionRepository.findByCvIdOrderByVersionNumberDesc(cvId);
        CVVersion targetVersion;

        // If latest version was already CONFIRMED, fork a new DRAFT version to maintain audit immutability (AC-P0-03, AC-P3-03)
        if (!versions.isEmpty() && "CONFIRMED".equalsIgnoreCase(versions.get(0).getStatus())) {
            CVVersion latestConfirmed = versions.get(0);
            int newVersionNum = latestConfirmed.getVersionNumber() + 1;
            targetVersion = CVVersion.builder()
                    .cv(cv)
                    .versionNumber(newVersionNum)
                    .title(cv.getTitle() + " v" + newVersionNum + ".0 (Draft)")
                    .rawTextContent(latestConfirmed.getRawTextContent())
                    .status("DRAFT")
                    .build();
            targetVersion = cvVersionRepository.save(targetVersion);
            cv.setStatus("DRAFT");
            cvRepository.save(cv);
        } else if (!versions.isEmpty()) {
            targetVersion = versions.get(0);
        } else {
            targetVersion = CVVersion.builder()
                    .cv(cv)
                    .versionNumber(1)
                    .title(cv.getTitle() + " v1.0")
                    .rawTextContent(cv.getRawText())
                    .status("DRAFT")
                    .build();
            targetVersion = cvVersionRepository.save(targetVersion);
        }

        Map<String, Object> updatedStructured = new LinkedHashMap<>();
        if (targetVersion.getStructuredJsonContent() != null && !targetVersion.getStructuredJsonContent().isBlank()) {
            try {
                updatedStructured = objectMapper.readValue(targetVersion.getStructuredJsonContent(), new TypeReference<>() {});
            } catch (Exception ignored) {}
        }

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            targetVersion.setTitle(request.getTitle());
            cv.setTitle(request.getTitle());
            cvRepository.save(cv);
        }

        if (request.getPersonalInfo() != null) {
            updatedStructured.put("personal_info", markLineageOnMap(request.getPersonalInfo()));
        }
        if (request.getSummary() != null) {
            updatedStructured.put("summary", markLineageOnMap(request.getSummary()));
        }
        if (request.getSkills() != null) {
            updatedStructured.put("skills", markLineageOnList(request.getSkills()));
        }
        if (request.getWorkExperience() != null) {
            updatedStructured.put("work_experience", markLineageOnList(request.getWorkExperience()));
        }
        if (request.getProjects() != null) {
            updatedStructured.put("projects", markLineageOnList(request.getProjects()));
        }
        if (request.getEducation() != null) {
            updatedStructured.put("education", markLineageOnList(request.getEducation()));
        }
        if (request.getCertifications() != null) {
            updatedStructured.put("certifications", markLineageOnList(request.getCertifications()));
        }
        if (request.getLanguages() != null) {
            updatedStructured.put("languages", markLineageOnList(request.getLanguages()));
        }
        if (request.getLinks() != null) {
            updatedStructured.put("links", markLineageOnMap(request.getLinks()));
        }
        if (request.getStructuredJson() != null) {
            updatedStructured.putAll(request.getStructuredJson());
        }

        try {
            targetVersion.setStructuredJsonContent(objectMapper.writeValueAsString(updatedStructured));
        } catch (Exception e) {
            log.error("Failed to serialize updated structured json for version {}", targetVersion.getId(), e);
        }

        cvVersionRepository.save(targetVersion);

        return getCVDraft(candidateUser, cvId);
    }

    @Transactional
    public CVConfirmResponse confirmCV(User candidateUser, UUID cvId) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        CV cv = cvRepository.findById(cvId)
                .orElseThrow(() -> new ResourceNotFoundException("CV", "id", cvId));

        if (!cv.getCandidate().getId().equals(candidate.getId())) {
            throw new UnauthorizedAccessException("Candidate does not own this CV");
        }

        List<CVVersion> versions = cvVersionRepository.findByCvIdOrderByVersionNumberDesc(cvId);
        CVVersion targetVersion;
        if (versions.isEmpty()) {
            targetVersion = CVVersion.builder()
                    .cv(cv)
                    .versionNumber(1)
                    .title(cv.getTitle() + " v1.0")
                    .rawTextContent(cv.getRawText())
                    .status("DRAFT")
                    .build();
            targetVersion = cvVersionRepository.save(targetVersion);
        } else {
            targetVersion = versions.get(0);
        }

        ZonedDateTime now = ZonedDateTime.now();
        targetVersion.setStatus("CONFIRMED");
        targetVersion.setConfirmedAt(now);
        cvVersionRepository.save(targetVersion);

        cv.setStatus("CONFIRMED");
        cvRepository.save(cv);

        return CVConfirmResponse.builder()
                .cvId(cv.getId())
                .profileId(candidate.getId())
                .status("CONFIRMED")
                .confirmedAt(now)
                .build();
    }

    @Transactional(readOnly = true)
    public List<CVVersionSummaryResponse> getCVVersions(User candidateUser, UUID cvId) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        CV cv = cvRepository.findById(cvId)
                .orElseThrow(() -> new ResourceNotFoundException("CV", "id", cvId));

        if (!cv.getCandidate().getId().equals(candidate.getId())) {
            throw new UnauthorizedAccessException("Candidate does not own this CV");
        }

        return cvVersionRepository.findByCvIdOrderByVersionNumberDesc(cvId).stream()
                .map(v -> CVVersionSummaryResponse.builder()
                        .versionId(v.getId())
                        .versionNumber(v.getVersionNumber())
                        .title(v.getTitle())
                        .status(v.getStatus() != null ? v.getStatus() : "DRAFT")
                        .confirmedAt(v.getConfirmedAt())
                        .createdAt(v.getCreatedAt())
                        .build())
                .toList();
    }

    private Map<String, Object> extractPersonalInfoWithLineage(Map<String, Object> structured, CandidateProfile profile, CV cv) {
        Map<String, Object> personal = new LinkedHashMap<>();
        Object pObj = structured.get("personal_info");
        Map<?, ?> pMap = (pObj instanceof Map<?, ?>) ? (Map<?, ?>) pObj : Collections.emptyMap();

        addProvenanceField(personal, "full_name", pMap.get("full_name"), profile.getFullName() != null ? profile.getFullName() : cv.getTitle());
        addProvenanceField(personal, "email", pMap.get("email"), profile.getUser() != null ? profile.getUser().getEmail() : null);
        addProvenanceField(personal, "phone", pMap.get("phone"), profile.getPhone());
        addProvenanceField(personal, "location", pMap.get("location"), null);
        addProvenanceField(personal, "github_url", pMap.get("github_url"), profile.getGithubUrl());
        addProvenanceField(personal, "linkedin_url", pMap.get("linkedin_url"), null);
        addProvenanceField(personal, "portfolio_url", pMap.get("portfolio_url"), profile.getPortfolioUrl());
        return personal;
    }

    private Map<String, Object> extractSummaryWithLineage(Map<String, Object> structured, CV cv) {
        Map<String, Object> summary = new LinkedHashMap<>();
        Object sumVal = structured.get("professional_summary");
        if (sumVal == null) sumVal = structured.get("summary");
        if (sumVal == null) sumVal = cv.getRawText();
        addProvenanceField(summary, "summary", sumVal, "Hồ sơ ứng viên.");
        return summary;
    }

    private void addProvenanceField(Map<String, Object> target, String key, Object extractedVal, Object fallbackVal) {
        Object chosen = extractedVal != null ? extractedVal : fallbackVal;
        if (chosen instanceof Map<?, ?> m && m.containsKey("origin")) {
            target.put(key, m);
        } else {
            Map<String, Object> field = new LinkedHashMap<>();
            field.put("value", chosen != null ? chosen : "");
            field.put("origin", extractedVal != null ? "CV_EXTRACTED" : "USER_ADDED");
            target.put(key, field);
        }
    }

    private List<Map<String, Object>> extractSkillsWithLineage(Map<String, Object> structured, UUID versionId) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (structured.get("skills") instanceof List<?> list) {
            for (Object obj : list) {
                if (obj instanceof Map<?, ?> m) {
                    Map<String, Object> copy = new LinkedHashMap<>((Map<String, Object>) m);
                    if (!copy.containsKey("origin")) copy.put("origin", "CV_EXTRACTED");
                    result.add(copy);
                } else if (obj != null) {
                    Map<String, Object> s = new LinkedHashMap<>();
                    s.put("name", String.valueOf(obj));
                    s.put("origin", "CV_EXTRACTED");
                    s.put("verified", false);
                    result.add(s);
                }
            }
        }
        if (result.isEmpty() && versionId != null) {
            List<CVSection> sections = cvSectionRepository.findByCvVersionId(versionId);
            for (CVSection sec : sections) {
                if ("SKILLS".equalsIgnoreCase(sec.getSectionType())) {
                    try {
                        List<?> sList = objectMapper.readValue(sec.getContent(), List.class);
                        for (Object o : sList) {
                            Map<String, Object> s = new LinkedHashMap<>();
                            s.put("name", String.valueOf(o));
                            s.put("origin", "CV_EXTRACTED");
                            s.put("verified", false);
                            result.add(s);
                        }
                    } catch (Exception ignored) {}
                }
            }
        }
        return result;
    }

    private List<Map<String, Object>> extractExperienceWithLineage(Map<String, Object> structured, UUID versionId) {
        List<Map<String, Object>> result = new ArrayList<>();
        Object expObj = structured.get("work_experience");
        if (expObj == null) expObj = structured.get("experiences");
        if (expObj instanceof List<?> list) {
            int idx = 1;
            for (Object obj : list) {
                if (obj instanceof Map<?, ?> m) {
                    Map<String, Object> copy = new LinkedHashMap<>((Map<String, Object>) m);
                    if (!copy.containsKey("id")) copy.put("id", "exp_" + idx++);
                    if (!copy.containsKey("origin")) copy.put("origin", "CV_EXTRACTED");
                    result.add(copy);
                }
            }
        }
        return result;
    }

    private List<Map<String, Object>> extractProjectsWithLineage(Map<String, Object> structured) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (structured.get("projects") instanceof List<?> list) {
            int idx = 1;
            for (Object obj : list) {
                if (obj instanceof Map<?, ?> m) {
                    Map<String, Object> copy = new LinkedHashMap<>((Map<String, Object>) m);
                    if (!copy.containsKey("id")) copy.put("id", "proj_" + idx++);
                    if (!copy.containsKey("origin")) copy.put("origin", "CV_EXTRACTED");
                    result.add(copy);
                }
            }
        }
        return result;
    }

    private List<Map<String, Object>> extractEducationWithLineage(Map<String, Object> structured, UUID versionId) {
        List<Map<String, Object>> result = new ArrayList<>();
        Object eduObj = structured.get("education");
        if (eduObj == null) eduObj = structured.get("educations");
        if (eduObj instanceof List<?> list) {
            int idx = 1;
            for (Object obj : list) {
                if (obj instanceof Map<?, ?> m) {
                    Map<String, Object> copy = new LinkedHashMap<>((Map<String, Object>) m);
                    if (!copy.containsKey("id")) copy.put("id", "edu_" + idx++);
                    if (!copy.containsKey("origin")) copy.put("origin", "CV_EXTRACTED");
                    result.add(copy);
                }
            }
        }
        return result;
    }

    private List<Map<String, Object>> extractCertificationsWithLineage(Map<String, Object> structured) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (structured.get("certifications") instanceof List<?> list) {
            int idx = 1;
            for (Object obj : list) {
                if (obj instanceof Map<?, ?> m) {
                    Map<String, Object> copy = new LinkedHashMap<>((Map<String, Object>) m);
                    if (!copy.containsKey("id")) copy.put("id", "cert_" + idx++);
                    if (!copy.containsKey("origin")) copy.put("origin", "CV_EXTRACTED");
                    result.add(copy);
                } else if (obj != null) {
                    Map<String, Object> c = new LinkedHashMap<>();
                    c.put("id", "cert_" + idx++);
                    c.put("name", String.valueOf(obj));
                    c.put("origin", "CV_EXTRACTED");
                    result.add(c);
                }
            }
        }
        return result;
    }

    private List<Map<String, Object>> extractLanguagesWithLineage(Map<String, Object> structured) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (structured.get("languages") instanceof List<?> list) {
            int idx = 1;
            for (Object obj : list) {
                if (obj instanceof Map<?, ?> m) {
                    Map<String, Object> copy = new LinkedHashMap<>((Map<String, Object>) m);
                    if (!copy.containsKey("id")) copy.put("id", "lang_" + idx++);
                    if (!copy.containsKey("origin")) copy.put("origin", "CV_EXTRACTED");
                    result.add(copy);
                } else if (obj != null) {
                    Map<String, Object> l = new LinkedHashMap<>();
                    l.put("id", "lang_" + idx++);
                    l.put("name", String.valueOf(obj));
                    l.put("origin", "CV_EXTRACTED");
                    result.add(l);
                }
            }
        }
        return result;
    }

    private Map<String, Object> extractLinksWithLineage(Map<String, Object> structured, Map<String, Object> personalInfo) {
        Map<String, Object> links = new LinkedHashMap<>();
        if (personalInfo.containsKey("github_url")) links.put("github_url", personalInfo.get("github_url"));
        if (personalInfo.containsKey("linkedin_url")) links.put("linkedin_url", personalInfo.get("linkedin_url"));
        if (personalInfo.containsKey("portfolio_url")) links.put("portfolio_url", personalInfo.get("portfolio_url"));
        return links;
    }

    private Map<String, Object> markLineageOnMap(Map<String, Object> map) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            Object val = entry.getValue();
            if (val instanceof Map<?, ?> innerMap) {
                Map<String, Object> copy = new LinkedHashMap<>((Map<String, Object>) innerMap);
                if (!copy.containsKey("origin")) {
                    copy.put("origin", "USER_CONFIRMED");
                }
                result.put(entry.getKey(), copy);
            } else if (val != null) {
                Map<String, Object> cell = new LinkedHashMap<>();
                cell.put("value", val);
                cell.put("origin", "USER_CONFIRMED");
                result.put(entry.getKey(), cell);
            }
        }
        return result;
    }

    private List<Map<String, Object>> markLineageOnList(List<Map<String, Object>> list) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> item : list) {
            Map<String, Object> copy = new LinkedHashMap<>(item);
            if (!copy.containsKey("origin") || copy.get("origin") == null) {
                copy.put("origin", copy.containsKey("id") ? "USER_CONFIRMED" : "USER_ADDED");
            }
            if (!copy.containsKey("id") || copy.get("id") == null) {
                copy.put("id", UUID.randomUUID().toString());
            }
            result.add(copy);
        }
        return result;
    }
}
