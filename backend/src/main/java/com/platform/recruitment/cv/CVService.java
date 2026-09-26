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
            @Autowired(required = false) ObjectMapper objectMapper) {
        this.cvRepository = cvRepository;
        this.cvVersionRepository = cvVersionRepository;
        this.cvSectionRepository = cvSectionRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.documents = documents;
        this.textReader = textReader;
        this.jdbcTemplate = jdbcTemplate;
        this.aiWorkerClient = aiWorkerClient;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    public CVService(
            CVRepository cvRepository,
            CVVersionRepository cvVersionRepository,
            CVSectionRepository cvSectionRepository,
            CandidateProfileRepository candidateProfileRepository,
            Documents documents,
            TextReader textReader,
            JdbcTemplate jdbcTemplate) {
        this(cvRepository, cvVersionRepository, cvSectionRepository, candidateProfileRepository, documents, textReader, jdbcTemplate, null, new ObjectMapper());
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
                .content(savedCv.getRawText() != null ? savedCv.getRawText() : savedCv.getTitle())
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
        } catch (IOException e) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to store uploaded file: " + e.getMessage());
        }

        String ext = originalFileName.contains(".")
                ? originalFileName.substring(originalFileName.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT)
                : "pdf";
        String storageKey = savedDoc.versionId() + "." + ext;

        // 2. Multi-tier extraction: try AI Worker with pdfplumber/ocr/anti-fabrication, fallback to native TextReader
        byte[] fileBytes = new byte[0];
        try {
            if (file != null) {
                fileBytes = file.getBytes();
            }
        } catch (IOException ignored) {}

        String extractedText = null;
        String extractionMethod = "native-reader";
        Map<String, Object> aiResult = null;

        if (aiWorkerClient != null && fileBytes.length > 0) {
            try {
                aiResult = aiWorkerClient.extractCv(savedDoc.documentId(), savedDoc.versionId(), fileBytes, ext.toUpperCase(Locale.ROOT), null);
                if (aiResult != null && "SUCCESS".equals(aiResult.get("status"))) {
                    extractedText = (String) aiResult.get("raw_text");
                    if (extractedText == null || extractedText.isBlank()) {
                        extractedText = (String) aiResult.get("text");
                    }
                    extractionMethod = "ai-worker";
                }
            } catch (Exception ex) {
                log.warn("AI Worker extract-cv call failed, falling back to native TextReader: {}", ex.getMessage());
            }
        }

        if (extractedText == null || extractedText.isBlank()) {
            TextReader.Extracted extracted = textReader.read(documents.path(storageKey));
            extractedText = extracted.text();
            extractionMethod = extracted.method();
        }

        if (extractedText == null || extractedText.isBlank()) {
            throw new CustomException(ErrorCode.INVALID_FILE, "DOCUMENT_TEXT_EMPTY: Document text extraction yielded no readable text");
        }

        // 3. Update document_versions record
        if (aiResult != null && "SUCCESS".equals(aiResult.get("status"))) {
            try {
                String normJson = objectMapper.writeValueAsString(aiResult);
                jdbcTemplate.update(
                        "UPDATE document_versions SET raw_text=?, extraction_method=?, normalized=?::jsonb, state='READY' WHERE id=?",
                        extractedText, extractionMethod, normJson, savedDoc.versionId()
                );
            } catch (Exception jsonErr) {
                jdbcTemplate.update(
                        "UPDATE document_versions SET raw_text=?, extraction_method=? WHERE id=?",
                        extractedText, extractionMethod, savedDoc.versionId()
                );
            }
        } else {
            jdbcTemplate.update(
                    "UPDATE document_versions SET raw_text=?, extraction_method=? WHERE id=?",
                    extractedText, extractionMethod, savedDoc.versionId()
            );
        }

        // 4. Persist legacy CV entity with synchronized IDs
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
                .rawText(extractedText)
                .isDefault(isDefault != null ? isDefault : false)
                .build();
        cv.setId(savedDoc.documentId());

        CV savedCv = cvRepository.save(cv);

        CVVersion version = CVVersion.builder()
                .cv(savedCv)
                .versionNumber(savedDoc.versionNo())
                .title(savedCv.getTitle() + " v" + savedDoc.versionNo() + ".0")
                .rawTextContent(extractedText)
                .build();
        version.setId(savedDoc.versionId());
        version = cvVersionRepository.save(version);

        // 5. Persist sections
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

        CVSection section = CVSection.builder()
                .cvVersion(version)
                .sectionType("SUMMARY")
                .content(extractedText)
                .build();
        cvSectionRepository.save(section);

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
        String storageKey = (String) versionRow.get("storage_key");
        Path path = documents.path(storageKey);

        byte[] fileBytes;
        try {
            fileBytes = Files.readAllBytes(path);
        } catch (IOException e) {
            throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "Stored document file missing from disk.");
        }

        String ext = storageKey.substring(storageKey.lastIndexOf('.') + 1);
        Map<String, Object> aiResult = null;
        String extractedText = null;

        if (aiWorkerClient != null) {
            try {
                aiResult = aiWorkerClient.extractCv(cvId, versionId, fileBytes, ext.toUpperCase(Locale.ROOT), null);
                if (aiResult != null && "SUCCESS".equals(aiResult.get("status"))) {
                    extractedText = (String) aiResult.get("raw_text");
                    if (extractedText == null) extractedText = (String) aiResult.get("text");
                }
            } catch (Exception ex) {
                log.error("Retry extraction via AI Worker failed: {}", ex.getMessage());
            }
        }

        if (extractedText == null) {
            TextReader.Extracted extracted = textReader.read(path);
            extractedText = extracted.text();
        }

        if (extractedText != null && !extractedText.isBlank()) {
            cv.setRawText(extractedText);
            cv.setStatus("PARSED");
            cvRepository.save(cv);

            if (aiResult != null && "SUCCESS".equals(aiResult.get("status"))) {
                try {
                    String normJson = objectMapper.writeValueAsString(aiResult);
                    jdbcTemplate.update(
                            "UPDATE document_versions SET raw_text=?, extraction_method='ai-worker', normalized=?::jsonb, state='READY', error_code=NULL, error_message=NULL WHERE id=?",
                            extractedText, normJson, versionId
                    );
                } catch (Exception ignored) {
                    jdbcTemplate.update(
                            "UPDATE document_versions SET raw_text=?, state='READY', error_code=NULL, error_message=NULL WHERE id=?",
                            extractedText, versionId
                    );
                }
            } else {
                jdbcTemplate.update(
                        "UPDATE document_versions SET raw_text=?, state='READY', error_code=NULL, error_message=NULL WHERE id=?",
                        extractedText, versionId
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
}
