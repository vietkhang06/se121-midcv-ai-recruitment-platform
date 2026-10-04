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
import java.nio.file.StandardOpenOption;
import java.time.Instant;
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
    @Autowired(required = false)
    private CVEvidenceAttachmentRepository cvEvidenceAttachmentRepository;

    public void setCvEvidenceAttachmentRepository(CVEvidenceAttachmentRepository cvEvidenceAttachmentRepository) {
        this.cvEvidenceAttachmentRepository = cvEvidenceAttachmentRepository;
    }

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

    public CVService(
            CVRepository cvRepository,
            CVVersionRepository cvVersionRepository,
            CVSectionRepository cvSectionRepository,
            CandidateProfileRepository candidateProfileRepository,
            Documents documents,
            TextReader textReader,
            JdbcTemplate jdbcTemplate,
            AiWorkerClient aiWorkerClient,
            ObjectMapper objectMapper) {
        this(cvRepository, cvVersionRepository, cvSectionRepository, candidateProfileRepository, documents, textReader, jdbcTemplate, aiWorkerClient, objectMapper, null);
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

    public static final java.util.Set<String> ALLOWED_CV_SORT_FIELDS = java.util.Set.of(
            "createdAt", "title", "targetIndustry", "versionNumber", "updatedAt"
    );

    @Transactional(readOnly = true)
    public List<CVResponse> getCandidateCVs(User candidateUser) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        return cvRepository.findByCandidateId(candidate.getId()).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public com.platform.recruitment.common.PageResponse<CVResponse> getCandidateCVs(
            User candidateUser, int page, int size, String sort, String direction) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        org.springframework.data.domain.Pageable pageable =
                com.platform.recruitment.common.PaginationUtils.createPageable(
                        page, size, sort, direction, ALLOWED_CV_SORT_FIELDS, "createdAt");

        org.springframework.data.domain.Page<CV> cvPage = cvRepository.findByCandidateId(candidate.getId(), pageable);
        List<CVResponse> content = cvPage.getContent().stream().map(this::mapToResponse).toList();
        String sortField = (sort == null || sort.isBlank()) ? "createdAt" : sort;
        String sortDir = (direction == null || direction.isBlank()) ? "desc" : direction.toLowerCase();
        return com.platform.recruitment.common.PageResponse.of(cvPage, content, sortField, sortDir);
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

        byte[] fileBytes = new byte[0];
        try {
            if (file != null) {
                fileBytes = file.getBytes();
            }
        } catch (IOException ignored) {}

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
                .status("PROCESSING")
                .isDefault(isDefault != null ? isDefault : false)
                .build();
        cv.setId(savedDoc.documentId());
        CV savedCv = cvRepository.save(cv);

        CVVersion version = CVVersion.builder()
                .cv(savedCv)
                .versionNumber(savedDoc.versionNo())
                .title(savedCv.getTitle() + " v" + savedDoc.versionNo() + ".0")
                .status("DRAFT")
                .build();
        version.setId(savedDoc.versionId());
        version = cvVersionRepository.save(version);

        executeProcessingPipeline(candidateUser, candidate, savedCv, version, savedDoc, storageKey, fileBytes, originalFileName, ext);

        CVResponse response = mapToResponse(savedCv);
        response.setJobId(savedDoc.jobId());
        response.setDocumentVersionId(savedDoc.versionId());
        return response;
    }

    public void updateJobStage(UUID jobId, String stage, int progress, String message) {
        if (jobId == null) return;
        try {
            jdbcTemplate.update(
                    "UPDATE processing_jobs SET step=?, progress=?, updated_at=now() " +
                    "WHERE id=? AND state != 'FAILED' AND progress <= ?",
                    stage, progress, jobId, progress
            );
        } catch (Exception ex) {
            log.warn("Failed to update processing job {} stage {}: {}", jobId, stage, ex.getMessage());
        }
    }

    private boolean isRetryableErrorCode(String code) {
        if (code == null) return false;
        return switch (code) {
            case "PRIMARY_NETWORK_ERROR", "PRIMARY_TIMEOUT", "PRIMARY_RESPONSE_EMPTY",
                 "PRIMARY_RESPONSE_INVALID", "ALL_PROVIDERS_FAILED", "TRANSIENT_ERROR" -> true;
            default -> false;
        };
    }

    public CVUploadAsyncResponse uploadCVAsync(User candidateUser, MultipartFile file, String title, String targetIndustry, Boolean isDefault) {
        if (file == null || file.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_FILE, "FILE_EMPTY: File rỗng hoặc không tồn tại");
        }
        if (file.getSize() > 10 * 1024 * 1024) {
            throw new CustomException(ErrorCode.FILE_SIZE_EXCEEDED, "FILE_TOO_LARGE: Dung lượng tệp vượt quá 10MB");
        }

        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        String originalFileName = Optional.ofNullable(file.getOriginalFilename()).orElse("document");
        String cvTitle = (title != null && !title.isBlank()) ? title : originalFileName;

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
        String filePath = documents.path(storageKey).toString();
        String contentType = (file.getContentType() != null && !file.getContentType().isBlank())
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
                .fileSize((int) file.getSize())
                .status("PROCESSING")
                .isDefault(isDefault != null ? isDefault : false)
                .build();
        cv.setId(savedDoc.documentId());
        CV savedCv = cvRepository.saveAndFlush(cv);
        if (!savedDoc.documentId().equals(savedCv.getId())) {
            log.error("CRITICAL CONTRACT VIOLATION: Saved CV id [{}] does not match documentId [{}]",
                    savedCv.getId(), savedDoc.documentId());
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR,
                    "ID contract violation: CV id must match document id");
        }

        CVVersion version = CVVersion.builder()
                .cv(savedCv)
                .versionNumber(savedDoc.versionNo())
                .title(savedCv.getTitle() + " v" + savedDoc.versionNo() + ".0")
                .status("DRAFT")
                .build();
        version.setId(savedDoc.versionId());
        CVVersion savedVersion = cvVersionRepository.saveAndFlush(version);
        if (!savedDoc.versionId().equals(savedVersion.getId())) {
            log.error("CRITICAL CONTRACT VIOLATION: Saved CVVersion id [{}] does not match versionId [{}]",
                    savedVersion.getId(), savedDoc.versionId());
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR,
                    "ID contract violation: CVVersion id must match document version id");
        }

        updateJobStage(savedDoc.jobId(), "UPLOADED", 5, "Đã tải tệp lên");

        return CVUploadAsyncResponse.builder()
                .cvId(savedCv.getId())
                .versionId(savedVersion.getId())
                .jobId(savedDoc.jobId())
                .status("UPLOADED")
                .stage("UPLOADED")
                .progress(5)
                .build();
    }

    public void executeProcessingPipeline(
            User candidateUser,
            CandidateProfile candidate,
            CV cv,
            CVVersion version,
            Documents.Saved savedDoc,
            String storageKey,
            byte[] fileBytes,
            String originalFileName,
            String ext
    ) {
        updateJobStage(savedDoc.jobId(), "VALIDATING_FILE", 10, "Đang kiểm tra tệp");

        updateJobStage(savedDoc.jobId(), "EXTRACTING_TEXT", 20, "Đang trích xuất văn bản từ CV");

        String extractedText = null;
        String extractionMethod = "native-reader";
        boolean isDegradedFallback = false;
        boolean ocrUsed = false;

        if (aiWorkerClient != null && fileBytes.length > 0) {
            try {
                Map<String, Object> extractRes = aiWorkerClient.extractDocument(fileBytes, originalFileName, ext.toUpperCase(Locale.ROOT), null);
                if (extractRes != null && ("EXTRACTED".equals(extractRes.get("status")) || "SUCCESS".equals(extractRes.get("status")))) {
                    extractedText = (String) extractRes.get("rawText");
                    if (extractedText == null || extractedText.isBlank()) {
                        extractedText = (String) extractRes.get("text");
                    }
                    extractionMethod = (String) extractRes.getOrDefault("extractionMethod", "ai-worker");
                    if (Boolean.TRUE.equals(extractRes.get("ocrUsed"))) {
                        ocrUsed = true;
                    }
                }
            } catch (Exception ex) {
                log.warn("AI Worker extract-document call failed, falling back to native TextReader: {}", ex.getMessage());
            }
        }

        if (ocrUsed) {
            updateJobStage(savedDoc.jobId(), "OCR_PROCESSING", 35, "Đang OCR tài liệu");
        }

        if (extractedText == null || extractedText.isBlank()) {
            TextReader.Extracted extracted = textReader.read(documents.path(storageKey));
            extractedText = extracted.text();
            extractionMethod = extracted.method();
            isDegradedFallback = true;
        }

        if (extractedText == null || extractedText.isBlank()) {
            jdbcTemplate.update(
                    "UPDATE processing_jobs SET state='FAILED', step='EXTRACTING_TEXT', error_code='EXTRACTION_EMPTY', error_message='Document text extraction yielded no readable text', updated_at=now() WHERE id=?",
                    savedDoc.jobId()
            );
            throw new CustomException(ErrorCode.INVALID_FILE, "DOCUMENT_TEXT_EMPTY: Document text extraction yielded no readable text");
        }

        final String finalExtractedText = extractedText;
        final String finalExtractionMethod = extractionMethod;

        // Persist raw text permanently in document_versions before calling LLM
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

        updateJobStage(savedDoc.jobId(), "RAW_TEXT_SAVED", 45, "Đã lưu văn bản");

        updateJobStage(savedDoc.jobId(), "STRUCTURING_CV", 55, "Đang cấu trúc hồ sơ bằng AI");

        Map<String, Object> aiResult = null;
        boolean structuringSucceeded = false;
        if (!isDegradedFallback && aiWorkerClient != null) {
            try {
                String correlationId = UUID.randomUUID().toString();
                Map<String, Object> structRes = aiWorkerClient.structureCv(finalExtractedText, savedDoc.versionId(), correlationId);
                if (structRes != null && Boolean.TRUE.equals(structRes.get("success")) && structRes.get("data") instanceof Map<?, ?> dataMap) {
                    aiResult = (Map<String, Object>) dataMap;
                    structuringSucceeded = true;
                }
            } catch (Exception ex) {
                log.warn("AI Worker structuring failed, raw text is preserved: {}", ex.getMessage());
            }
        }

        updateJobStage(savedDoc.jobId(), "VALIDATING_STRUCTURE", 75, "Đang kiểm tra dữ liệu");

        boolean llmAttempted = (!isDegradedFallback && aiWorkerClient != null);

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

            updateJobStage(savedDoc.jobId(), "SAVING_DRAFT", 90, "Đang tạo bản nháp");

            cv.setRawText(finalExtractedText);
            cv.setStatus("PARSED");
            cvRepository.save(cv);

            version.setRawTextContent(finalExtractedText);
            version.setStatus("DRAFT");
            try {
                String rawJson = objectMapper.writeValueAsString(aiResult);
                version.setRawStructuredContent(rawJson);
                Map<String, Object> initialDraft = buildCanonicalDraftFromRaw(aiResult, cv, version.getId());
                version.setStructuredJsonContent(objectMapper.writeValueAsString(initialDraft));
            } catch (Exception ignored) {}
            cvVersionRepository.save(version);

            // Persist structured sections (DO NOT dump raw CV into SUMMARY section)
            if (aiResult.get("skills") instanceof List<?> skillsList && !skillsList.isEmpty()) {
                try {
                    cvSectionRepository.save(CVSection.builder()
                            .cvVersion(version)
                            .sectionType("SKILLS")
                            .content(objectMapper.writeValueAsString(skillsList))
                            .build());
                } catch (Exception ignored) {}
            }
            Object expObj = aiResult.get("experience");
            if (expObj == null) expObj = aiResult.get("experiences");
            if (expObj == null) expObj = aiResult.get("work_experience");
            if (expObj instanceof List<?> expList && !expList.isEmpty()) {
                try {
                    cvSectionRepository.save(CVSection.builder()
                            .cvVersion(version)
                            .sectionType("EXPERIENCE")
                            .content(objectMapper.writeValueAsString(expList))
                            .build());
                } catch (Exception ignored) {}
            }
            Object eduObj = aiResult.get("education");
            if (eduObj == null) eduObj = aiResult.get("educations");
            if (eduObj instanceof List<?> eduList && !eduList.isEmpty()) {
                try {
                    cvSectionRepository.save(CVSection.builder()
                            .cvVersion(version)
                            .sectionType("EDUCATION")
                            .content(objectMapper.writeValueAsString(eduList))
                            .build());
                } catch (Exception ignored) {}
            }

            String candidateSummary = "";
            if (aiResult.get("summary") != null) {
                candidateSummary = aiResult.get("summary").toString();
            } else if (aiResult.get("bio") != null) {
                candidateSummary = aiResult.get("bio").toString();
            }
            if (!candidateSummary.isBlank()) {
                cvSectionRepository.save(CVSection.builder()
                        .cvVersion(version)
                        .sectionType("SUMMARY")
                        .content(candidateSummary)
                        .build());
            }

            updateJobStage(savedDoc.jobId(), "NEEDS_REVIEW", 100, "Sẵn sàng để bạn kiểm tra");
            jdbcTemplate.update(
                    "UPDATE processing_jobs SET state='SUCCEEDED', step='NEEDS_REVIEW', progress=100, updated_at=now() WHERE id=?",
                    savedDoc.jobId()
            );
        } else if (llmAttempted) {
            // LLM attempted and failed -> MUST NOT mark PARSED! Mark FAILED!
            jdbcTemplate.update(
                    "UPDATE document_versions SET state='FAILED', error_code='STRUCTURING_FAILED', error_message='Structuring incomplete' WHERE id=?",
                    savedDoc.versionId()
            );
            cv.setRawText(finalExtractedText);
            cv.setStatus("FAILED");
            cvRepository.save(cv);

            version.setRawTextContent(finalExtractedText);
            version.setStatus("FAILED");
            cvVersionRepository.save(version);

            jdbcTemplate.update(
                    "UPDATE processing_jobs SET state='FAILED', step='FAILED', error_code='STRUCTURING_FAILED', error_message='Cấu trúc hóa CV bằng AI thất bại', updated_at=now() WHERE id=?",
                    savedDoc.jobId()
            );
        } else {
            // In-process fallback without LLM client (e.g. tests)
            cv.setRawText(finalExtractedText);
            cv.setStatus("PARSED");
            cvRepository.save(cv);

            version.setRawTextContent(finalExtractedText);
            version.setStatus("DRAFT");
            cvVersionRepository.save(version);

            updateJobStage(savedDoc.jobId(), "NEEDS_REVIEW", 100, "Sẵn sàng để bạn kiểm tra");
            jdbcTemplate.update(
                    "UPDATE processing_jobs SET state='SUCCEEDED', step='NEEDS_REVIEW', progress=100, updated_at=now() WHERE id=?",
                    savedDoc.jobId()
            );
        }
    }

    @Transactional(readOnly = true)
    public CVProcessingStatusResponse getProcessingStatus(User candidateUser, UUID cvId) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        CV cv = cvRepository.findById(cvId)
                .orElseThrow(() -> new ResourceNotFoundException("CV", "id", cvId));

        if (!cv.getCandidate().getId().equals(candidate.getId())) {
            throw new CustomException(ErrorCode.ACCESS_DENIED, "FORBIDDEN_RESOURCE: You do not own this CV");
        }

        List<Map<String, Object>> jobs = jdbcTemplate.queryForList(
                "SELECT j.* FROM processing_jobs j " +
                "WHERE j.entity_id IN (SELECT id FROM cv_versions WHERE cv_id = ?) " +
                "ORDER BY j.created_at DESC LIMIT 1",
                cvId
        );

        if (jobs.isEmpty()) {
            List<CVVersion> versions = cvVersionRepository.findByCvIdOrderByVersionNumberDesc(cvId);
            if (!versions.isEmpty()) {
                CVVersion latest = versions.get(0);
                if ("FAILED".equals(latest.getStatus()) || "FAILED".equals(cv.getStatus())) {
                    return CVProcessingStatusResponse.builder()
                            .cvId(cvId)
                            .status("FAILED")
                            .stage("FAILED")
                            .progress(0)
                            .message("Quá trình xử lý hồ sơ gặp lỗi")
                            .retryable(true)
                            .updatedAt(Instant.now())
                            .build();
                } else if ("CONFIRMED".equals(latest.getStatus())) {
                    return CVProcessingStatusResponse.builder()
                            .cvId(cvId)
                            .status("CONFIRMED")
                            .stage("CONFIRMED")
                            .progress(100)
                            .message("Hồ sơ đã được bạn xác nhận")
                            .retryable(false)
                            .updatedAt(Instant.now())
                            .build();
                } else if ("DRAFT".equals(latest.getStatus())) {
                    boolean rawTextSaved = cv.getRawText() != null && !cv.getRawText().isBlank();
                    boolean structuredJsonValid = latest.getStructuredJsonContent() != null && !latest.getStructuredJsonContent().isBlank();
                    if (rawTextSaved && structuredJsonValid) {
                        return CVProcessingStatusResponse.builder()
                                .cvId(cvId)
                                .status("COMPLETED")
                                .stage("NEEDS_REVIEW")
                                .progress(100)
                                .message("Sẵn sàng để bạn kiểm tra")
                                .retryable(false)
                                .updatedAt(Instant.now())
                                .build();
                    } else {
                        return CVProcessingStatusResponse.builder()
                                .cvId(cvId)
                                .status("PROCESSING")
                                .stage("PROCESSING")
                                .progress(50)
                                .message("Đang xử lý hồ sơ")
                                .retryable(false)
                                .updatedAt(Instant.now())
                                .build();
                    }
                }
            }
            if ("FAILED".equals(cv.getStatus())) {
                return CVProcessingStatusResponse.builder()
                        .cvId(cvId)
                        .status("FAILED")
                        .stage("FAILED")
                        .progress(0)
                        .message("Quá trình xử lý hồ sơ gặp lỗi")
                        .retryable(true)
                        .updatedAt(Instant.now())
                        .build();
            }
            return CVProcessingStatusResponse.builder()
                    .cvId(cvId)
                    .status("UPLOADED")
                    .stage("UPLOADED")
                    .progress(5)
                    .message("Đã tải tệp lên")
                    .retryable(false)
                    .updatedAt(Instant.now())
                    .build();
        }

        Map<String, Object> job = jobs.get(0);
        UUID jobId = (UUID) job.get("id");
        String state = Objects.toString(job.get("state"), "QUEUED");
        String step = Objects.toString(job.get("step"), "UPLOADED");
        int progress = job.get("progress") != null ? ((Number) job.get("progress")).intValue() : 5;
        String errorCode = (String) job.get("error_code");
        String errorMessage = (String) job.get("error_message");
        java.sql.Timestamp updatedAtTs = (java.sql.Timestamp) job.get("updated_at");
        Instant updatedAt = updatedAtTs != null ? updatedAtTs.toInstant() : Instant.now();
        String correlationId = Objects.toString(job.get("request_id"), UUID.randomUUID().toString());

        String message;
        boolean retryable = false;

        boolean isSucceeded = "SUCCEEDED".equals(state) || "COMPLETED".equals(state);
        if (isSucceeded || progress >= 100) {
            // Requirement PHẦN 3: Chỉ trả NEEDS_REVIEW/progress=100 khi:
            // a. raw_text đã được lưu.
            // b. structured_json_content hợp lệ (không rỗng, đúng schema tối thiểu).
            // c. DRAFT CV đã được lưu thành công.
            boolean rawTextSaved = cv.getRawText() != null && !cv.getRawText().isBlank();
            List<CVVersion> versions = cvVersionRepository.findByCvIdOrderByVersionNumberDesc(cvId);
            boolean draftSaved = !versions.isEmpty() && ("DRAFT".equals(versions.get(0).getStatus()) || "CONFIRMED".equals(versions.get(0).getStatus()));
            boolean structuredJsonValid = !versions.isEmpty() && versions.get(0).getStructuredJsonContent() != null && !versions.get(0).getStructuredJsonContent().isBlank();

            if (rawTextSaved && draftSaved && structuredJsonValid) {
                state = "COMPLETED";
                step = "NEEDS_REVIEW";
                progress = 100;
                message = "Sẵn sàng để bạn kiểm tra";
            } else if ("FAILED".equals(state) || "FAILED".equals(cv.getStatus())) {
                state = "FAILED";
                step = "FAILED";
                message = errorMessage != null ? errorMessage : "Quá trình xử lý hồ sơ gặp lỗi";
                retryable = isRetryableErrorCode(errorCode);
            } else {
                state = "PROCESSING";
                progress = Math.min(progress, 90);
                message = "Đang xử lý hồ sơ";
            }
        } else if ("FAILED".equals(state) || "FAILED".equals(cv.getStatus())) {
            state = "FAILED";
            step = "FAILED";
            message = errorMessage != null ? errorMessage : "Quá trình xử lý hồ sơ gặp lỗi";
            retryable = isRetryableErrorCode(errorCode);
        } else {
            state = "PROCESSING";
            switch (step) {
                case "UPLOADED", "QUEUED" -> { progress = Math.max(progress, 5); message = "Đã tải tệp lên"; }
                case "VALIDATING_FILE" -> { progress = Math.max(progress, 10); message = "Đang kiểm tra tệp"; }
                case "READ_DOCUMENT", "EXTRACTING_TEXT" -> { progress = Math.max(progress, 20); message = "Đang trích xuất văn bản từ CV"; }
                case "OCR_PROCESSING" -> { progress = Math.max(progress, 35); message = "Đang OCR tài liệu"; }
                case "RAW_TEXT_SAVED" -> { progress = Math.max(progress, 45); message = "Đã lưu văn bản"; }
                case "LLM_EXTRACTION", "STRUCTURING_CV" -> { progress = Math.max(progress, 55); message = "Đang cấu trúc hồ sơ bằng AI"; }
                case "VALIDATING_STRUCTURE" -> { progress = Math.max(progress, 75); message = "Đang kiểm tra dữ liệu"; }
                case "SAVING_DRAFT" -> { progress = Math.max(progress, 90); message = "Đang tạo bản nháp"; }
                default -> { progress = Math.max(progress, 25); message = "Đang xử lý hồ sơ"; }
            }
        }

        return CVProcessingStatusResponse.builder()
                .cvId(cvId)
                .jobId(jobId)
                .status(state)
                .stage(step)
                .progress(progress)
                .message(message)
                .retryable(retryable)
                .errorCode(errorCode)
                .correlationId(correlationId)
                .updatedAt(updatedAt)
                .build();
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
            if (v.get("raw_text") != null && !((String) v.get("raw_text")).isBlank()) {
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

        // Secondary fallback to cv_versions entity if vRows is empty or missing raw_text
        if ((rawText == null || rawText.isBlank()) || structured.isEmpty()) {
            List<CVVersion> versions = cvVersionRepository.findByCvIdOrderByVersionNumberDesc(cvId);
            if (!versions.isEmpty()) {
                CVVersion latestVer = versions.get(0);
                if (versionId.equals(cvId)) {
                    versionId = latestVer.getId();
                }
                if ((rawText == null || rawText.isBlank()) && latestVer.getRawTextContent() != null) {
                    rawText = latestVer.getRawTextContent();
                }
                if (structured.isEmpty() && latestVer.getStructuredJsonContent() != null && !latestVer.getStructuredJsonContent().isBlank()) {
                    try {
                        structured = objectMapper.readValue(latestVer.getStructuredJsonContent(), new TypeReference<>() {});
                    } catch (Exception ignored) {}
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
            if (text.isBlank()) {
                List<CVVersion> versions = cvVersionRepository.findByCvIdOrderByVersionNumberDesc(cvId);
                if (!versions.isEmpty() && versions.get(0).getRawTextContent() != null) {
                    text = versions.get(0).getRawTextContent();
                }
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
            } else {
                List<CVVersion> versions = cvVersionRepository.findByCvIdOrderByVersionNumberDesc(cvId);
                if (!versions.isEmpty() && versions.get(0).getStructuredJsonContent() != null && !versions.get(0).getStructuredJsonContent().isBlank()) {
                    jsonStr = versions.get(0).getStructuredJsonContent();
                }
            }
            return new DownloadResult(
                    jsonStr.getBytes(StandardCharsets.UTF_8),
                    baseName + "_structured.json",
                    "application/json; charset=UTF-8"
            );
        }

        // Original file
        Path filePath = null;
        if (!vRows.isEmpty() && vRows.get(0).get("storage_key") != null) {
            String key = (String) vRows.get(0).get("storage_key");
            filePath = documents.path(key);
        } else if (cv.getFilePath() != null && !cv.getFilePath().isBlank()) {
            filePath = Path.of(cv.getFilePath());
        }

        if (filePath != null && Files.exists(filePath)) {
            try {
                byte[] data = Files.readAllBytes(filePath);
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

        UUID versionId = cvId;
        String existingRaw = cv.getRawText();
        Map<String, Object> versionRow = null;
        if (!vRows.isEmpty()) {
            versionRow = vRows.get(0);
            versionId = (UUID) versionRow.get("id");
            if (versionRow.get("raw_text") != null) {
                existingRaw = (String) versionRow.get("raw_text");
            }
        } else {
            List<CVVersion> versions = cvVersionRepository.findByCvIdOrderByVersionNumberDesc(cvId);
            if (!versions.isEmpty()) {
                versionId = versions.get(0).getId();
                if (existingRaw == null || existingRaw.isBlank()) {
                    existingRaw = versions.get(0).getRawTextContent();
                }
            }
        }

        String extractedText = existingRaw;
        Map<String, Object> aiResult = null;

        if (extractedText == null || extractedText.isBlank()) {
            // Missing raw text fallback: read original file
            Path path = null;
            String storageKey = versionRow != null ? (String) versionRow.get("storage_key") : null;
            if (storageKey != null && !storageKey.isBlank()) {
                path = documents.path(storageKey);
            } else if (cv.getFilePath() != null && !cv.getFilePath().isBlank()) {
                path = Path.of(cv.getFilePath());
            }

            if (path != null && Files.exists(path)) {
                byte[] fileBytes;
                try {
                    fileBytes = Files.readAllBytes(path);
                } catch (IOException e) {
                    throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "Stored document file missing from disk.");
                }

                String ext = storageKey != null && storageKey.contains(".") 
                        ? storageKey.substring(storageKey.lastIndexOf('.') + 1) 
                        : (cv.getFileName() != null && cv.getFileName().contains(".") 
                                ? cv.getFileName().substring(cv.getFileName().lastIndexOf('.') + 1) 
                                : "pdf");
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
        }

        // Retry structuring directly from saved raw text without reading binary file
        Map<String, Object> cvData = null;
        if (extractedText != null && !extractedText.isBlank() && aiWorkerClient != null) {
            String corrId = UUID.randomUUID().toString();
            try {
                aiResult = aiWorkerClient.structureCv(extractedText, versionId, corrId);
                if (aiResult != null && Boolean.TRUE.equals(aiResult.get("success")) && aiResult.get("data") instanceof Map<?, ?> dataMap) {
                    cvData = (Map<String, Object>) dataMap;
                }
            } catch (Exception ex) {
                log.error("Retry structuring via AI Worker failed [corrId={}]: {}", corrId, ex.getMessage());
            }
        }

        if (extractedText != null && !extractedText.isBlank()) {
            cv.setRawText(extractedText);

            if (cvData != null && !cvData.isEmpty()) {
                try {
                    String normJson = objectMapper.writeValueAsString(cvData);
                    cv.setStatus("DRAFT");
                    cvRepository.save(cv);

                    jdbcTemplate.update(
                            "UPDATE document_versions SET normalized=?::jsonb, state='READY', error_code=NULL, error_message=NULL WHERE id=?",
                            normJson, versionId
                    );
                    jdbcTemplate.update(
                            "UPDATE cv_versions SET structured_json_content=?, status='DRAFT', raw_text_content=? WHERE id=?",
                            normJson, extractedText, versionId
                    );
                    jdbcTemplate.update(
                            "UPDATE processing_jobs SET state='SUCCEEDED', step='NEEDS_REVIEW', progress=100, updated_at=now() WHERE entity_id=?",
                            versionId
                    );
                } catch (Exception ignored) {
                    jdbcTemplate.update(
                            "UPDATE document_versions SET state='READY', error_code=NULL, error_message=NULL WHERE id=?",
                            versionId
                    );
                }
            } else {
                cv.setStatus("FAILED");
                cvRepository.save(cv);
                jdbcTemplate.update(
                        "UPDATE cv_versions SET status='FAILED' WHERE id=?",
                        versionId
                );
                jdbcTemplate.update(
                        "UPDATE document_versions SET state='FAILED', error_code='STRUCTURING_FAILED', error_message='Retry structuring failed' WHERE id=?",
                        versionId
                );
                jdbcTemplate.update(
                        "UPDATE processing_jobs SET state='FAILED', step='FAILED', error_code='STRUCTURING_FAILED', error_message='Retry structuring failed', updated_at=now() WHERE entity_id=?",
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

        if (cvEvidenceAttachmentRepository != null) {
            try {
                cvEvidenceAttachmentRepository.findByCvId(cvId).forEach(att -> {
                    try {
                        Files.deleteIfExists(documents.path(att.getStorageKey()));
                    } catch (Exception ignored) {}
                });
                cvEvidenceAttachmentRepository.deleteByCvId(cvId);
            } catch (Exception ex) {
                log.warn("Failed to clean up evidence attachments for CV {}: {}", cvId, ex.getMessage());
            }
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

    @Transactional
    public CVDraftResponse getCVDraft(User candidateUser, UUID cvId) {
        String correlationId = UUID.randomUUID().toString();
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
            CVVersion savedVer = cvVersionRepository.save(version);
            if (savedVer != null) {
                version = savedVer;
            }
        } else {
            version = versions.get(0);
        }

        Map<String, Object> structured = null;
        boolean hasExistingCanonicalDraft = false;

        if (version.getStructuredJsonContent() != null && !version.getStructuredJsonContent().isBlank()) {
            try {
                structured = objectMapper.readValue(version.getStructuredJsonContent(), new TypeReference<>() {});
                if ("2.0".equals(structured.get("schema_version")) || structured.containsKey("personal_info")) {
                    hasExistingCanonicalDraft = true;
                }
            } catch (Exception e) {
                log.warn("Failed to parse structuredJsonContent for version {}", version.getId());
            }
        }

        Map<String, Object> rawStructured = new LinkedHashMap<>();
        if (version.getRawStructuredContent() != null && !version.getRawStructuredContent().isBlank()) {
            try {
                rawStructured = objectMapper.readValue(version.getRawStructuredContent(), new TypeReference<>() {});
            } catch (Exception ignored) {}
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

        if (!hasExistingCanonicalDraft) {
            log.info("CV_DRAFT_INITIALIZATION_STARTED correlation_id={} cv_id={} version_id={} profile_id={}",
                    correlationId, cvId, version.getId(), candidate.getId());

            Map<String, Object> sourceForDraft = !rawStructured.isEmpty() ? rawStructured : (structured != null ? structured : Collections.emptyMap());
            Map<String, Object> canonicalDraft = buildCanonicalDraftFromRaw(sourceForDraft, cv, version.getId());

            try {
                version.setStructuredJsonContent(objectMapper.writeValueAsString(canonicalDraft));
                if (version.getRawStructuredContent() == null || version.getRawStructuredContent().isBlank()) {
                    if (!rawStructured.isEmpty()) {
                        version.setRawStructuredContent(objectMapper.writeValueAsString(rawStructured));
                    }
                }
                CVVersion savedVer = cvVersionRepository.save(version);
                if (savedVer != null) {
                    version = savedVer;
                }
            } catch (Exception e) {
                log.error("Failed to save initialized canonical draft for version {}: {}", version.getId(), e.getMessage());
            }

            structured = canonicalDraft;
            log.info("CV_DRAFT_INITIALIZED correlation_id={} cv_id={} version_id={}",
                    correlationId, cvId, version.getId());
        } else {
            log.info("CV_DRAFT_ALREADY_EXISTS correlation_id={} cv_id={} version_id={}",
                    correlationId, cvId, version.getId());
        }

        Map<String, Object> personalInfo = (structured.get("personal_info") instanceof Map<?, ?> m)
                ? (Map<String, Object>) m : extractPersonalInfoWithLineage(structured, cv);
        Map<String, Object> summary = (structured.get("summary") instanceof Map<?, ?> m)
                ? (Map<String, Object>) m : extractSummaryWithLineage(structured, cv);
        List<Map<String, Object>> skills = (structured.get("skills") instanceof List<?> l)
                ? (List<Map<String, Object>>) l : Collections.emptyList();
        List<Map<String, Object>> experiences = (structured.get("work_experience") instanceof List<?> l)
                ? (List<Map<String, Object>>) l : Collections.emptyList();
        List<Map<String, Object>> projects = (structured.get("projects") instanceof List<?> l)
                ? (List<Map<String, Object>>) l : Collections.emptyList();
        List<Map<String, Object>> education = (structured.get("education") instanceof List<?> l)
                ? (List<Map<String, Object>>) l : Collections.emptyList();
        List<Map<String, Object>> certifications = (structured.get("certifications") instanceof List<?> l)
                ? (List<Map<String, Object>>) l : Collections.emptyList();
        List<Map<String, Object>> languages = (structured.get("languages") instanceof List<?> l)
                ? (List<Map<String, Object>>) l : Collections.emptyList();
        Map<String, Object> links = (structured.get("links") instanceof Map<?, ?> m)
                ? (Map<String, Object>) m : extractLinksWithLineage(structured, personalInfo);

        // Refresh attachment info in certifications and languages
        refreshAttachmentLinks(certifications, cvId, "CERTIFICATION");
        refreshAttachmentLinks(languages, cvId, "LANGUAGE");

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
                .rawStructured(!rawStructured.isEmpty() ? rawStructured : structured)
                .createdAt(version.getCreatedAt() != null ? version.getCreatedAt() : cv.getCreatedAt())
                .updatedAt(version.getUpdatedAt() != null ? version.getUpdatedAt() : cv.getUpdatedAt())
                .build();
    }

    @Transactional
    public CVDraftResponse updateCVDraft(User candidateUser, UUID cvId, UpdateCVDraftRequest request) {
        String correlationId = UUID.randomUUID().toString();
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
                    .rawStructuredContent(latestConfirmed.getRawStructuredContent())
                    .structuredJsonContent(latestConfirmed.getStructuredJsonContent())
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

        Map<String, Object> existingDraft = new LinkedHashMap<>();
        if (targetVersion.getStructuredJsonContent() != null && !targetVersion.getStructuredJsonContent().isBlank()) {
            try {
                existingDraft = objectMapper.readValue(targetVersion.getStructuredJsonContent(), new TypeReference<>() {});
            } catch (Exception ignored) {}
        }
        if (!"2.0".equals(existingDraft.get("schema_version")) && !existingDraft.containsKey("personal_info")) {
            existingDraft = buildCanonicalDraftFromRaw(existingDraft, cv, targetVersion.getId());
        }

        Map<String, Object> updatedStructured = new LinkedHashMap<>(existingDraft);
        updatedStructured.put("schema_version", "2.0");

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            targetVersion.setTitle(request.getTitle());
            cv.setTitle(request.getTitle());
            cvRepository.save(cv);
        }

        if (request.getPersonalInfo() != null) {
            Map<String, Object> oldPersonal = (existingDraft.get("personal_info") instanceof Map<?, ?> m)
                    ? (Map<String, Object>) m : Collections.emptyMap();
            updatedStructured.put("personal_info", computePersonalInfoProvenance(request.getPersonalInfo(), oldPersonal));
        }
        if (request.getSummary() != null) {
            Map<String, Object> oldSummary = (existingDraft.get("summary") instanceof Map<?, ?> m)
                    ? (Map<String, Object>) m : Collections.emptyMap();
            updatedStructured.put("summary", computeSummaryProvenance(request.getSummary(), oldSummary));
        }
        if (request.getSkills() != null) {
            List<Map<String, Object>> oldSkills = (existingDraft.get("skills") instanceof List<?> l)
                    ? (List<Map<String, Object>>) l : Collections.emptyList();
            updatedStructured.put("skills", computeSkillsProvenance(request.getSkills(), oldSkills));
        }
        if (request.getWorkExperience() != null) {
            List<Map<String, Object>> oldExp = (existingDraft.get("work_experience") instanceof List<?> l)
                    ? (List<Map<String, Object>>) l : Collections.emptyList();
            updatedStructured.put("work_experience", computeNestedListProvenance(request.getWorkExperience(), oldExp, cvId, "EXPERIENCE"));
        }
        if (request.getProjects() != null) {
            List<Map<String, Object>> oldProj = (existingDraft.get("projects") instanceof List<?> l)
                    ? (List<Map<String, Object>>) l : Collections.emptyList();
            updatedStructured.put("projects", computeNestedListProvenance(request.getProjects(), oldProj, cvId, "PROJECT"));
        }
        if (request.getEducation() != null) {
            List<Map<String, Object>> oldEdu = (existingDraft.get("education") instanceof List<?> l)
                    ? (List<Map<String, Object>>) l : Collections.emptyList();
            updatedStructured.put("education", computeEducationProvenance(request.getEducation(), oldEdu));
        }
        if (request.getCertifications() != null) {
            List<Map<String, Object>> oldCerts = (existingDraft.get("certifications") instanceof List<?> l)
                    ? (List<Map<String, Object>>) l : Collections.emptyList();
            updatedStructured.put("certifications", computeNestedListProvenance(request.getCertifications(), oldCerts, cvId, "CERTIFICATION"));
        }
        if (request.getLanguages() != null) {
            List<Map<String, Object>> oldLangs = (existingDraft.get("languages") instanceof List<?> l)
                    ? (List<Map<String, Object>>) l : Collections.emptyList();
            updatedStructured.put("languages", computeNestedListProvenance(request.getLanguages(), oldLangs, cvId, "LANGUAGE"));
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
        log.info("CV_DRAFT_UPDATED correlation_id={} cv_id={} version_id={}",
                correlationId, cvId, targetVersion.getId());

        return getCVDraft(candidateUser, cvId);
    }

    @Transactional
    public CVConfirmResponse confirmCV(User candidateUser, UUID cvId) {
        String correlationId = UUID.randomUUID().toString();
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

        log.info("CV_DRAFT_CONFIRMED correlation_id={} cv_id={} version_id={}",
                correlationId, cvId, targetVersion.getId());

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

    public Map<String, Object> buildCanonicalDraftFromRaw(Map<String, Object> rawStructured, CV cv, UUID versionId) {
        Map<String, Object> draft = new LinkedHashMap<>();
        draft.put("schema_version", "2.0");

        Map<String, Object> personalInfo = extractPersonalInfoWithLineage(rawStructured, cv);
        Map<String, Object> summary = extractSummaryWithLineage(rawStructured, cv);
        List<Map<String, Object>> skills = extractSkillsWithLineage(rawStructured, versionId);
        List<Map<String, Object>> experiences = extractExperienceWithLineage(rawStructured, versionId);
        List<Map<String, Object>> projects = extractProjectsWithLineage(rawStructured);
        List<Map<String, Object>> education = extractEducationWithLineage(rawStructured, versionId);
        List<Map<String, Object>> certifications = extractCertificationsWithLineage(rawStructured, cv != null ? cv.getId() : null);
        List<Map<String, Object>> languages = extractLanguagesWithLineage(rawStructured, cv != null ? cv.getId() : null);
        Map<String, Object> links = extractLinksWithLineage(rawStructured, personalInfo);

        draft.put("personal_info", personalInfo);
        draft.put("summary", summary);
        draft.put("skills", skills);
        draft.put("work_experience", experiences);
        draft.put("projects", projects);
        draft.put("education", education);
        draft.put("certifications", certifications);
        draft.put("languages", languages);
        draft.put("links", links);

        return draft;
    }

    private Map<String, Object> computePersonalInfoProvenance(Map<String, Object> incoming, Map<String, Object> oldPersonal) {
        Map<String, Object> result = new LinkedHashMap<>(oldPersonal);

        String[] keys = {"fullName", "full_name", "headline", "email", "phone", "address", "location",
                "githubUrl", "github_url", "linkedinUrl", "linkedin_url", "portfolioUrl", "portfolio_url"};

        for (String key : keys) {
            if (incoming.containsKey(key)) {
                Object inValObj = incoming.get(key);
                String newVal = "";
                if (inValObj instanceof Map<?, ?> m && m.containsKey("value")) {
                    newVal = m.get("value") != null ? m.get("value").toString() : "";
                } else if (inValObj != null) {
                    newVal = inValObj.toString();
                }

                String oldVal = "";
                String oldOrigin = "CV_EXTRACTED";
                Object oldValObj = oldPersonal.get(key);
                if (oldValObj instanceof Map<?, ?> m) {
                    if (m.containsKey("value")) {
                        oldVal = m.get("value") != null ? m.get("value").toString() : "";
                    }
                    if (m.containsKey("origin")) {
                        oldOrigin = m.get("origin") != null ? m.get("origin").toString() : "CV_EXTRACTED";
                    }
                } else if (oldValObj != null) {
                    oldVal = oldValObj.toString();
                }

                String finalOrigin;
                if (newVal.trim().equals(oldVal.trim())) {
                    finalOrigin = oldOrigin;
                } else {
                    if (oldVal.isBlank() && !newVal.isBlank()) {
                        finalOrigin = "USER_ADDED";
                    } else {
                        finalOrigin = "USER_EDITED";
                    }
                }

                Map<String, Object> field = new LinkedHashMap<>();
                field.put("value", newVal);
                field.put("origin", finalOrigin);

                result.put(key, field);

                // Sync canonical pair aliases
                if ("fullName".equals(key)) result.put("full_name", field);
                else if ("full_name".equals(key)) result.put("fullName", field);
                else if ("address".equals(key)) result.put("location", field);
                else if ("location".equals(key)) result.put("address", field);
                else if ("githubUrl".equals(key)) result.put("github_url", field);
                else if ("github_url".equals(key)) result.put("githubUrl", field);
                else if ("linkedinUrl".equals(key)) result.put("linkedin_url", field);
                else if ("linkedin_url".equals(key)) result.put("linkedinUrl", field);
                else if ("portfolioUrl".equals(key)) result.put("portfolio_url", field);
                else if ("portfolio_url".equals(key)) result.put("portfolioUrl", field);
            }
        }

        return result;
    }

    private Map<String, Object> computeSummaryProvenance(Map<String, Object> incoming, Map<String, Object> oldSummary) {
        String newVal = "";
        Object cObj = incoming.get("content");
        if (cObj == null) cObj = incoming.get("summary");
        if (cObj == null) cObj = incoming.get("value");
        if (cObj instanceof Map<?, ?> m && m.containsKey("value")) {
            newVal = m.get("value") != null ? m.get("value").toString() : "";
        } else if (cObj != null) {
            newVal = cObj.toString();
        }
        newVal = sanitizeRichText(newVal);

        String oldVal = "";
        String oldOrigin = "CV_EXTRACTED";
        Object oldCObj = oldSummary.get("content");
        if (oldCObj == null) oldCObj = oldSummary.get("summary");
        if (oldCObj instanceof Map<?, ?> m) {
            if (m.containsKey("value")) {
                oldVal = m.get("value") != null ? m.get("value").toString() : "";
            }
            if (m.containsKey("origin")) {
                oldOrigin = m.get("origin") != null ? m.get("origin").toString() : "CV_EXTRACTED";
            }
        } else if (oldCObj != null) {
            oldVal = oldCObj.toString();
        }

        String finalOrigin;
        if (newVal.trim().equals(oldVal.trim())) {
            finalOrigin = oldOrigin;
        } else {
            finalOrigin = oldVal.isBlank() ? "USER_ADDED" : "USER_EDITED";
        }

        Map<String, Object> field = new LinkedHashMap<>();
        field.put("value", newVal);
        field.put("origin", finalOrigin);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", field);
        result.put("summary", field);
        return result;
    }

    private List<Map<String, Object>> computeNestedListProvenance(
            List<Map<String, Object>> incoming,
            List<Map<String, Object>> oldList,
            UUID cvId,
            String itemType) {

        Map<String, Map<String, Object>> oldById = new HashMap<>();
        if (oldList != null) {
            for (Map<String, Object> item : oldList) {
                if (item.get("id") != null) {
                    oldById.put(item.get("id").toString().trim(), item);
                }
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> item : incoming) {
            Map<String, Object> copy = new LinkedHashMap<>(item);
            String itemId = copy.get("id") != null ? copy.get("id").toString().trim() : null;
            boolean isUuid = false;
            if (itemId != null) {
                try {
                    UUID.fromString(itemId);
                    isUuid = true;
                } catch (IllegalArgumentException ignored) {}
            }

            if (isUuid && oldById.containsKey(itemId)) {
                Map<String, Object> oldItem = oldById.get(itemId);
                boolean changed = hasItemContentChanged(copy, oldItem);
                if (changed) {
                    copy.put("origin", "USER_EDITED");
                } else {
                    copy.put("origin", oldItem.get("origin") != null ? oldItem.get("origin") : "CV_EXTRACTED");
                }
                if (oldItem.containsKey("attachment") && !copy.containsKey("attachment")) {
                    copy.put("attachment", oldItem.get("attachment"));
                }
            } else {
                String newId = isUuid ? itemId : UUID.randomUUID().toString();
                copy.put("id", newId);
                copy.put("origin", "USER_ADDED");
            }

            if (copy.get("description") != null) {
                copy.put("description", sanitizeRichText(copy.get("description").toString()));
            }

            result.add(copy);
        }

        return result;
    }

    private List<Map<String, Object>> computeEducationProvenance(
            List<Map<String, Object>> incoming,
            List<Map<String, Object>> oldList) {

        Map<String, Map<String, Object>> oldById = new HashMap<>();
        if (oldList != null) {
            for (Map<String, Object> item : oldList) {
                if (item.get("id") != null) {
                    oldById.put(item.get("id").toString().trim(), item);
                }
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> edu : incoming) {
            Map<String, Object> copy = new LinkedHashMap<>(edu);
            String itemId = copy.get("id") != null ? copy.get("id").toString().trim() : null;
            boolean isUuid = false;
            if (itemId != null) {
                try {
                    UUID.fromString(itemId);
                    isUuid = true;
                } catch (IllegalArgumentException ignored) {}
            }

            if (isUuid && oldById.containsKey(itemId)) {
                Map<String, Object> oldItem = oldById.get(itemId);
                boolean changed = hasItemContentChanged(copy, oldItem);
                if (changed) {
                    copy.put("origin", "USER_EDITED");
                } else {
                    copy.put("origin", oldItem.get("origin") != null ? oldItem.get("origin") : "CV_EXTRACTED");
                }
            } else {
                String newId = isUuid ? itemId : UUID.randomUUID().toString();
                copy.put("id", newId);
                copy.put("origin", "USER_ADDED");
            }

            // GPA normalization and validation
            Object gpaVal = copy.get("gpa");
            Object scaleVal = copy.get("gpa_scale");
            if (scaleVal == null) scaleVal = copy.get("gpaScale");

            if (gpaVal != null && !gpaVal.toString().isBlank()) {
                try {
                    double gpa = Double.parseDouble(gpaVal.toString().trim());
                    if (gpa < 0.0) {
                        throw new CustomException(ErrorCode.VALIDATION_ERROR, "GPA không được là số âm.");
                    }
                    copy.put("gpa", gpa);
                    if (scaleVal != null && !scaleVal.toString().isBlank()) {
                        double scale = Double.parseDouble(scaleVal.toString().trim());
                        if (gpa > scale) {
                            throw new CustomException(ErrorCode.VALIDATION_ERROR,
                                    "GPA (" + gpa + ") không được lớn hơn thang điểm (" + scale + ").");
                        }
                        copy.put("gpa_scale", scale);
                        Object explicitDisplay = copy.get("gpa_display");
                        if (explicitDisplay == null) explicitDisplay = copy.get("gpaDisplay");
                        if (explicitDisplay != null && !explicitDisplay.toString().isBlank()) {
                            copy.put("gpa_display", explicitDisplay.toString());
                        } else {
                            String scaleFmt = (scale == 4.0 || scale == 10.0) ? String.format(Locale.ROOT, "%.1f", scale) : String.valueOf(scale);
                            copy.put("gpa_display", gpa + "/" + scaleFmt);
                        }
                    } else {
                        copy.put("gpa_scale", null);
                        Object explicitDisplay = copy.get("gpa_display");
                        if (explicitDisplay == null) explicitDisplay = copy.get("gpaDisplay");
                        copy.put("gpa_display", explicitDisplay != null ? explicitDisplay.toString() : String.valueOf(gpa));
                    }
                } catch (NumberFormatException nfe) {
                    throw new CustomException(ErrorCode.VALIDATION_ERROR, "GPA không hợp lệ: " + gpaVal);
                }
            } else {
                copy.put("gpa", null);
                copy.put("gpa_scale", null);
                copy.put("gpa_display", null);
            }

            if (copy.get("description") != null) {
                copy.put("description", sanitizeRichText(copy.get("description").toString()));
            }

            result.add(copy);
        }

        return result;
    }

    private List<Map<String, Object>> computeSkillsProvenance(
            List<Map<String, Object>> incoming,
            List<Map<String, Object>> oldSkills) {

        Set<String> oldSkillNames = new HashSet<>();
        if (oldSkills != null) {
            for (Map<String, Object> s : oldSkills) {
                if (s.get("name") != null) {
                    oldSkillNames.add(s.get("name").toString().trim().toLowerCase(Locale.ROOT));
                }
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> s : incoming) {
            Map<String, Object> copy = new LinkedHashMap<>(s);
            String name = copy.get("name") != null ? copy.get("name").toString().trim() : "";
            if (!name.isBlank() && oldSkillNames.contains(name.toLowerCase(Locale.ROOT))) {
                if (!copy.containsKey("origin")) copy.put("origin", "CV_EXTRACTED");
            } else {
                copy.put("origin", "USER_ADDED");
            }
            if (!copy.containsKey("verified")) {
                copy.put("verified", false);
            }
            result.add(copy);
        }

        return result;
    }

    private boolean hasItemContentChanged(Map<String, Object> newItem, Map<String, Object> oldItem) {
        String[] fields = {"name", "company", "role", "position", "start_date", "startDate",
                "end_date", "endDate", "is_current", "description", "technologies", "techStack",
                "institution", "degree", "field_of_study", "fieldOfStudy", "gpa", "gpa_scale", "gpaScale",
                "issuer", "issue_date", "issueDate", "language", "proficiency"};

        for (String f : fields) {
            if (newItem.containsKey(f)) {
                String nVal = newItem.get(f) != null ? newItem.get(f).toString().trim() : "";
                String oVal = oldItem.get(f) != null ? oldItem.get(f).toString().trim() : "";
                if (!nVal.equals(oVal)) {
                    return true;
                }
            }
        }
        return false;
    }

    private Map<String, Object> extractPersonalInfoWithLineage(Map<String, Object> structured, CV cv) {
        Map<String, Object> personal = new LinkedHashMap<>();
        Object pObj = structured.get("personal_info");
        if (pObj == null) pObj = structured.get("personalInfo");
        Map<?, ?> pMap = (pObj instanceof Map<?, ?>) ? (Map<?, ?>) pObj : Collections.emptyMap();

        Object nameVal = pMap.get("fullName");
        if (nameVal == null) nameVal = pMap.get("full_name");
        if (nameVal == null) nameVal = structured.get("fullName");
        if (nameVal == null) nameVal = structured.get("full_name");
        if (nameVal == null) nameVal = structured.get("name");
        addProvenanceField(personal, "full_name", nameVal, null);
        addProvenanceField(personal, "fullName", nameVal, null);

        Object headlineVal = pMap.get("headline");
        if (headlineVal == null) headlineVal = pMap.get("title");
        if (headlineVal == null) headlineVal = pMap.get("targetRole");
        if (headlineVal == null) headlineVal = structured.get("headline");
        if (headlineVal == null) headlineVal = structured.get("targetRole");
        addProvenanceField(personal, "headline", headlineVal, null);

        Object emailVal = pMap.get("email");
        if (emailVal == null) emailVal = structured.get("email");
        addProvenanceField(personal, "email", emailVal, null);

        Object phoneVal = pMap.get("phone");
        if (phoneVal == null) phoneVal = structured.get("phone");
        addProvenanceField(personal, "phone", phoneVal, null);

        Object locVal = pMap.get("address");
        if (locVal == null) locVal = pMap.get("location");
        if (locVal == null) locVal = structured.get("address");
        if (locVal == null) locVal = structured.get("location");
        addProvenanceField(personal, "location", locVal, null);
        addProvenanceField(personal, "address", locVal, null);

        Object gitVal = pMap.get("githubUrl");
        if (gitVal == null) gitVal = pMap.get("github_url");
        if (gitVal == null) gitVal = structured.get("githubUrl");
        if (gitVal == null) gitVal = structured.get("github_url");
        addProvenanceField(personal, "github_url", gitVal, null);
        addProvenanceField(personal, "githubUrl", gitVal, null);

        Object inVal = pMap.get("linkedinUrl");
        if (inVal == null) inVal = pMap.get("linkedin_url");
        if (inVal == null) inVal = structured.get("linkedinUrl");
        if (inVal == null) inVal = structured.get("linkedin_url");
        addProvenanceField(personal, "linkedin_url", inVal, null);
        addProvenanceField(personal, "linkedinUrl", inVal, null);

        Object portVal = pMap.get("portfolioUrl");
        if (portVal == null) portVal = pMap.get("portfolio_url");
        if (portVal == null) portVal = structured.get("portfolioUrl");
        if (portVal == null) portVal = structured.get("portfolio_url");
        addProvenanceField(personal, "portfolio_url", portVal, null);
        addProvenanceField(personal, "portfolioUrl", portVal, null);

        return personal;
    }

    private Map<String, Object> extractSummaryWithLineage(Map<String, Object> structured, CV cv) {
        Map<String, Object> summary = new LinkedHashMap<>();
        Object sumVal = structured.get("summary");
        if (sumVal == null) sumVal = structured.get("professional_summary");
        if (sumVal == null) sumVal = structured.get("professionalSummary");
        if (sumVal instanceof Map<?, ?> m && m.containsKey("content")) {
            Object inner = m.get("content");
            if (inner instanceof Map<?, ?> innerMap && innerMap.containsKey("value")) {
                sumVal = innerMap.get("value");
            } else {
                sumVal = inner;
            }
        } else if (sumVal instanceof Map<?, ?> m && m.containsKey("summary")) {
            Object inner = m.get("summary");
            if (inner instanceof Map<?, ?> innerMap && innerMap.containsKey("value")) {
                sumVal = innerMap.get("value");
            } else {
                sumVal = inner;
            }
        }
        String content = sumVal != null ? sumVal.toString() : "";
        Map<String, Object> contentField = new LinkedHashMap<>();
        contentField.put("value", content);
        contentField.put("origin", !content.isBlank() ? "CV_EXTRACTED" : "USER_ADDED");
        summary.put("content", contentField);
        summary.put("summary", contentField);
        return summary;
    }

    private void addProvenanceField(Map<String, Object> target, String key, Object extractedVal, Object fallbackVal) {
        Object chosen = extractedVal != null ? extractedVal : fallbackVal;
        if (chosen instanceof Map<?, ?> m && m.containsKey("origin")) {
            target.put(key, m);
        } else {
            Map<String, Object> field = new LinkedHashMap<>();
            String valStr = chosen != null ? chosen.toString() : "";
            field.put("value", valStr);
            field.put("origin", (extractedVal != null && !valStr.isBlank()) ? "CV_EXTRACTED" : "USER_ADDED");
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
                    if (!copy.containsKey("verified")) copy.put("verified", false);
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
        if (expObj == null) expObj = structured.get("experience");
        if (expObj == null) expObj = structured.get("experiences");
        if (expObj == null) expObj = structured.get("workExperience");
        if (expObj instanceof List<?> list) {
            for (Object obj : list) {
                if (obj instanceof Map<?, ?> m) {
                    Map<String, Object> copy = new LinkedHashMap<>((Map<String, Object>) m);
                    ensureValidUuidId(copy, null, "EXPERIENCE");
                    if (!copy.containsKey("origin")) copy.put("origin", "CV_EXTRACTED");

                    Object pos = copy.get("position");
                    Object role = copy.get("role");
                    if (role == null && pos != null) copy.put("role", pos);
                    if (pos == null && role != null) copy.put("position", role);

                    Object sDate = copy.get("startDate");
                    Object sDateSnake = copy.get("start_date");
                    if (sDateSnake == null && sDate != null) copy.put("start_date", sDate);
                    if (sDate == null && sDateSnake != null) copy.put("startDate", sDateSnake);

                    Object eDate = copy.get("endDate");
                    Object eDateSnake = copy.get("end_date");
                    if (eDateSnake == null && eDate != null) copy.put("end_date", eDate);
                    if (eDate == null && eDateSnake != null) copy.put("endDate", eDateSnake);

                    if (copy.get("is_current") == null) {
                        copy.put("is_current", eDate == null && eDateSnake == null);
                    }

                    if (copy.get("description") != null) {
                        copy.put("description", sanitizeRichText(copy.get("description").toString()));
                    }
                    result.add(copy);
                }
            }
        }
        return result;
    }

    private List<Map<String, Object>> extractProjectsWithLineage(Map<String, Object> structured) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (structured.get("projects") instanceof List<?> list) {
            for (Object obj : list) {
                if (obj instanceof Map<?, ?> m) {
                    Map<String, Object> copy = new LinkedHashMap<>((Map<String, Object>) m);
                    ensureValidUuidId(copy, null, "PROJECT");
                    if (!copy.containsKey("origin")) copy.put("origin", "CV_EXTRACTED");
                    if (copy.get("description") != null) {
                        copy.put("description", sanitizeRichText(copy.get("description").toString()));
                    }
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
            for (Object obj : list) {
                if (obj instanceof Map<?, ?> m) {
                    Map<String, Object> copy = new LinkedHashMap<>((Map<String, Object>) m);
                    ensureValidUuidId(copy, null, "EDUCATION");
                    if (!copy.containsKey("origin")) copy.put("origin", "CV_EXTRACTED");

                    Object fos = copy.get("fieldOfStudy");
                    Object fosSnake = copy.get("field_of_study");
                    if (fosSnake == null && fos != null) copy.put("field_of_study", fos);
                    if (fos == null && fosSnake != null) copy.put("fieldOfStudy", fosSnake);

                    Object sDate = copy.get("startDate");
                    Object sDateSnake = copy.get("start_date");
                    if (sDateSnake == null && sDate != null) copy.put("start_date", sDate);
                    if (sDate == null && sDateSnake != null) copy.put("startDate", sDateSnake);

                    Object eDate = copy.get("endDate");
                    Object eDateSnake = copy.get("end_date");
                    if (eDateSnake == null && eDate != null) copy.put("end_date", eDate);
                    if (eDate == null && eDateSnake != null) copy.put("endDate", eDateSnake);

                    // GPA normalization & preservation
                    Object gpa = copy.get("gpa");
                    Object scale = copy.get("gpa_scale");
                    if (scale == null) scale = copy.get("gpaScale");

                    if (gpa != null && !gpa.toString().isBlank()) {
                        try {
                            double gpaNum = Double.parseDouble(gpa.toString().trim());
                            copy.put("gpa", gpaNum);
                            if (scale != null && !scale.toString().isBlank()) {
                                double scaleNum = Double.parseDouble(scale.toString().trim());
                                copy.put("gpa_scale", scaleNum);
                                Object explicitDisplay = copy.get("gpa_display");
                                if (explicitDisplay == null) explicitDisplay = copy.get("gpaDisplay");
                                if (explicitDisplay != null && !explicitDisplay.toString().isBlank()) {
                                    copy.put("gpa_display", explicitDisplay.toString());
                                } else {
                                    String scaleFmt = (scaleNum == 4.0 || scaleNum == 10.0) ? String.format(Locale.ROOT, "%.1f", scaleNum) : String.valueOf(scaleNum);
                                    copy.put("gpa_display", gpaNum + "/" + scaleFmt);
                                }
                            } else {
                                copy.put("gpa_scale", null);
                                Object explicitDisplay = copy.get("gpa_display");
                                if (explicitDisplay == null) explicitDisplay = copy.get("gpaDisplay");
                                copy.put("gpa_display", explicitDisplay != null ? explicitDisplay.toString() : String.valueOf(gpaNum));
                            }
                        } catch (NumberFormatException ignored) {
                            copy.put("gpa_display", String.valueOf(gpa));
                        }
                    } else {
                        copy.put("gpa", null);
                        copy.put("gpa_scale", null);
                        copy.put("gpa_display", null);
                    }

                    if (copy.get("description") != null) {
                        copy.put("description", sanitizeRichText(copy.get("description").toString()));
                    }

                    result.add(copy);
                }
            }
        }
        return result;
    }

    private List<Map<String, Object>> extractCertificationsWithLineage(Map<String, Object> structured, UUID cvId) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (structured.get("certifications") instanceof List<?> list) {
            for (Object obj : list) {
                if (obj instanceof Map<?, ?> m) {
                    Map<String, Object> copy = new LinkedHashMap<>((Map<String, Object>) m);
                    ensureValidUuidId(copy, cvId, "CERTIFICATION");
                    if (!copy.containsKey("origin")) copy.put("origin", "CV_EXTRACTED");
                    String itemId = String.valueOf(copy.get("id"));
                    Map<String, Object> attInfo = findAttachmentInfo(cvId, "CERTIFICATION", itemId);
                    copy.put("attachment", attInfo);
                    result.add(copy);
                } else if (obj != null) {
                    Map<String, Object> c = new LinkedHashMap<>();
                    String certId = UUID.randomUUID().toString();
                    c.put("id", certId);
                    c.put("name", String.valueOf(obj));
                    c.put("origin", "CV_EXTRACTED");
                    Map<String, Object> attInfo = findAttachmentInfo(cvId, "CERTIFICATION", certId);
                    c.put("attachment", attInfo);
                    result.add(c);
                }
            }
        }
        return result;
    }

    private List<Map<String, Object>> extractLanguagesWithLineage(Map<String, Object> structured, UUID cvId) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (structured.get("languages") instanceof List<?> list) {
            for (Object obj : list) {
                if (obj instanceof Map<?, ?> m) {
                    Map<String, Object> copy = new LinkedHashMap<>((Map<String, Object>) m);
                    ensureValidUuidId(copy, cvId, "LANGUAGE");
                    if (!copy.containsKey("origin")) copy.put("origin", "CV_EXTRACTED");
                    Object langName = copy.get("language");
                    if (langName == null) langName = copy.get("name");
                    copy.put("name", langName);
                    copy.put("language", langName);
                    String itemId = String.valueOf(copy.get("id"));
                    Map<String, Object> attInfo = findAttachmentInfo(cvId, "LANGUAGE", itemId);
                    copy.put("attachment", attInfo);
                    result.add(copy);
                } else if (obj != null) {
                    Map<String, Object> l = new LinkedHashMap<>();
                    String langId = UUID.randomUUID().toString();
                    l.put("id", langId);
                    l.put("name", String.valueOf(obj));
                    l.put("language", String.valueOf(obj));
                    l.put("origin", "CV_EXTRACTED");
                    Map<String, Object> attInfo = findAttachmentInfo(cvId, "LANGUAGE", langId);
                    l.put("attachment", attInfo);
                    result.add(l);
                }
            }
        }
        return result;
    }

    private List<Map<String, Object>> extractCertificationsWithLineage(Map<String, Object> structured) {
        return extractCertificationsWithLineage(structured, null);
    }

    private List<Map<String, Object>> extractLanguagesWithLineage(Map<String, Object> structured) {
        return extractLanguagesWithLineage(structured, null);
    }

    private Map<String, Object> extractLinksWithLineage(Map<String, Object> structured, Map<String, Object> personalInfo) {
        Map<String, Object> links = new LinkedHashMap<>();
        if (personalInfo.containsKey("github_url")) links.put("github_url", personalInfo.get("github_url"));
        if (personalInfo.containsKey("linkedin_url")) links.put("linkedin_url", personalInfo.get("linkedin_url"));
        if (personalInfo.containsKey("portfolio_url")) links.put("portfolio_url", personalInfo.get("portfolio_url"));
        return links;
    }

    private void ensureValidUuidId(Map<String, Object> item, UUID cvId, String itemType) {
        Object idObj = item.get("id");
        boolean validUuid = false;
        if (idObj != null && !idObj.toString().isBlank()) {
            try {
                UUID.fromString(idObj.toString().trim());
                validUuid = true;
            } catch (IllegalArgumentException ignored) {
                validUuid = false;
            }
        }
        if (!validUuid) {
            String newUuid = UUID.randomUUID().toString();
            String oldId = idObj != null ? idObj.toString().trim() : null;
            item.put("id", newUuid);

            // Remap legacy attachment if exists (e.g. cert_1, lang_1)
            if (oldId != null && cvId != null && cvEvidenceAttachmentRepository != null && itemType != null) {
                try {
                    cvEvidenceAttachmentRepository.findByCvIdAndItemTypeAndItemId(cvId, itemType, oldId)
                            .ifPresent(att -> {
                                att.setItemId(newUuid);
                                cvEvidenceAttachmentRepository.save(att);
                            });
                } catch (Exception ex) {
                    log.warn("Failed to remap legacy attachment ID {} to {}: {}", oldId, newUuid, ex.getMessage());
                }
            }
        }
    }

    private void refreshAttachmentLinks(List<Map<String, Object>> items, UUID cvId, String itemType) {
        if (items == null || cvId == null) return;
        for (Map<String, Object> item : items) {
            Object idObj = item.get("id");
            if (idObj != null) {
                Map<String, Object> attInfo = findAttachmentInfo(cvId, itemType, idObj.toString());
                item.put("attachment", attInfo);
            }
        }
    }

    private Map<String, Object> findAttachmentInfo(UUID cvId, String itemType, String itemId) {
        if (cvEvidenceAttachmentRepository == null || cvId == null || itemId == null) return null;
        try {
            return cvEvidenceAttachmentRepository.findByCvIdAndItemTypeAndItemId(cvId, itemType, itemId)
                    .map(att -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("id", att.getId().toString());
                        m.put("file_name", att.getFileName());
                        m.put("file_size", att.getFileSize());
                        m.put("file_type", att.getFileType());
                        m.put("status", att.getStatus());
                        m.put("preview_url", "/api/v1/candidate/cvs/" + cvId + "/attachments/" + att.getId());
                        return m;
                    }).orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    public String sanitizeRichText(String html) {
        if (html == null) return null;
        String s = html.trim();
        if (s.isEmpty()) return "";
        return s.replaceAll("(?i)<script[\\s\\S]*?</script>", "")
                .replaceAll("(?i)<style[\\s\\S]*?</style>", "")
                .replaceAll("(?i)<iframe[\\s\\S]*?</iframe>", "")
                .replaceAll("(?i)<object[\\s\\S]*?</object>", "")
                .replaceAll("(?i)<embed[\\s\\S]*?>", "")
                .replaceAll("(?i)javascript:", "")
                .replaceAll("(?i)\\s*on\\w+\\s*=\\s*(\"[^\"]*\"|'[^']*'|[^\\s>]+)", "");
    }

    private void validateAttachmentMagic(byte[] b, String ext) {
        boolean valid = switch (ext) {
            case "pdf" -> b.length >= 4 && b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F';
            case "png" -> b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47;
            case "jpg", "jpeg" -> b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8;
            default -> false;
        };
        if (!valid) {
            throw new CustomException(ErrorCode.INVALID_FILE, "UNSUPPORTED_FILE_TYPE: Nội dung tệp không khớp định dạng " + ext);
        }
    }

    @Transactional
    public CVEvidenceAttachmentResponse uploadEvidenceAttachment(
            User candidateUser,
            UUID cvId,
            org.springframework.web.multipart.MultipartFile file,
            String itemType,
            String itemId) {

        String correlationId = UUID.randomUUID().toString();
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        CV cv = cvRepository.findById(cvId)
                .orElseThrow(() -> new ResourceNotFoundException("CV", "id", cvId));

        if (!cv.getCandidate().getId().equals(candidate.getId())) {
            throw new UnauthorizedAccessException("Candidate does not own this CV");
        }

        String type = itemType != null ? itemType.toUpperCase(Locale.ROOT).trim() : "";
        if (!"CERTIFICATION".equals(type) && !"LANGUAGE".equals(type)) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "itemType must be CERTIFICATION or LANGUAGE");
        }
        if (itemId == null || itemId.isBlank()) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "itemId is required");
        }
        try {
            UUID.fromString(itemId.trim());
        } catch (IllegalArgumentException ex) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Mã mục đính kèm (itemId) không hợp lệ, phải là định dạng UUID: " + itemId);
        }

        List<CVVersion> versions = cvVersionRepository.findByCvIdOrderByVersionNumberDesc(cvId);
        CVVersion targetVersion = versions.isEmpty() ? null : versions.get(0);
        if (targetVersion == null) {
            throw new ResourceNotFoundException("CVVersion", "cvId", cvId);
        }

        // Validate that the item exists in the current version's draft
        boolean itemExists = false;
        if (targetVersion.getStructuredJsonContent() != null && !targetVersion.getStructuredJsonContent().isBlank()) {
            try {
                Map<String, Object> struct = objectMapper.readValue(targetVersion.getStructuredJsonContent(), new TypeReference<>() {});
                String listKey = "CERTIFICATION".equals(type) ? "certifications" : "languages";
                if (struct.get(listKey) instanceof List<?> items) {
                    for (Object it : items) {
                        if (it instanceof Map<?, ?> itemMap && itemId.equals(String.valueOf(itemMap.get("id")))) {
                            itemExists = true;
                            break;
                        }
                    }
                }
            } catch (Exception ex) {
                log.warn("Failed to check item existence in structuredJsonContent: {}", ex.getMessage());
            }
        }
        if (!itemExists) {
            throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND,
                    "Không tìm thấy mục " + type + " có ID " + itemId + " trong hồ sơ CV.");
        }

        if (file == null || file.isEmpty() || file.getSize() == 0) {
            throw new CustomException(ErrorCode.INVALID_FILE, "FILE_EMPTY: Chưa chọn tệp hoặc tệp rỗng (0 bytes).");
        }
        if (file.getSize() > 10L * 1024 * 1024) {
            throw new CustomException(ErrorCode.FILE_SIZE_EXCEEDED, "FILE_TOO_LARGE: Tệp vượt quá giới hạn 10 MB.");
        }

        String originalFileName = Optional.ofNullable(file.getOriginalFilename()).orElse("attachment");
        String sanitizedFileName = originalFileName.replaceAll("[\\\\/:*?\"<>|\\r\\n]", "_");
        if (sanitizedFileName.length() > 200) {
            sanitizedFileName = sanitizedFileName.substring(sanitizedFileName.length() - 200);
        }

        String ext = sanitizedFileName.contains(".")
                ? sanitizedFileName.substring(sanitizedFileName.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT)
                : "";
        if (!List.of("pdf", "png", "jpg", "jpeg").contains(ext)) {
            throw new CustomException(ErrorCode.INVALID_FILE, "UNSUPPORTED_FILE_TYPE: Chỉ hỗ trợ định dạng PDF, PNG, JPG, JPEG.");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "Không thể đọc nội dung tệp tin.");
        }

        validateAttachmentMagic(bytes, ext);

        log.info("ATTACHMENT_UPLOAD_STARTED correlation_id={} cv_id={} item_type={} item_id={}",
                correlationId, cvId, type, itemId);

        UUID attachmentId = UUID.randomUUID();
        String storageKey = attachmentId + "." + ext;
        Path targetPath = documents.path(storageKey);

        try {
            Files.write(targetPath, bytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        } catch (IOException e) {
            log.error("ATTACHMENT_UPLOAD_FAILED correlation_id={} cv_id={} error_code=FILE_STORAGE_FAILED",
                    correlationId, cvId);
            throw new CustomException(ErrorCode.FILE_STORAGE_FAILED, "Không thể lưu tệp minh chứng: " + e.getMessage());
        }

        if (cvEvidenceAttachmentRepository != null) {
            cvEvidenceAttachmentRepository.findByCvIdAndItemTypeAndItemId(cvId, type, itemId).ifPresent(old -> {
                try {
                    Files.deleteIfExists(documents.path(old.getStorageKey()));
                } catch (Exception ignored) {}
                cvEvidenceAttachmentRepository.delete(old);
            });
        }

        String contentType = (file.getContentType() != null && !file.getContentType().isBlank())
                ? file.getContentType()
                : ("pdf".equals(ext) ? "application/pdf" : ("png".equals(ext) ? "image/png" : "image/jpeg"));

        CVEvidenceAttachment attachment = CVEvidenceAttachment.builder()
                .candidate(candidate)
                .cv(cv)
                .cvVersion(targetVersion)
                .itemType(type)
                .itemId(itemId)
                .fileName(sanitizedFileName)
                .storageKey(storageKey)
                .fileType(contentType)
                .fileSize((int) file.getSize())
                .status("UNVERIFIED")
                .build();
        attachment.setId(attachmentId);

        if (cvEvidenceAttachmentRepository != null) {
            try {
                attachment = cvEvidenceAttachmentRepository.save(attachment);
            } catch (Exception dbErr) {
                try {
                    Files.deleteIfExists(targetPath);
                } catch (Exception ignored) {}
                log.error("ATTACHMENT_UPLOAD_FAILED correlation_id={} cv_id={} error_code=INTERNAL_SERVER_ERROR: {}",
                        correlationId, cvId, dbErr.getMessage());
                throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "Không thể lưu thông tin tệp minh chứng vào cơ sở dữ liệu.");
            }
        }

        // Sync into targetVersion.structuredJsonContent
        if (targetVersion.getStructuredJsonContent() != null && !targetVersion.getStructuredJsonContent().isBlank()) {
            try {
                Map<String, Object> struct = objectMapper.readValue(targetVersion.getStructuredJsonContent(), new TypeReference<>() {});
                String listKey = "CERTIFICATION".equals(type) ? "certifications" : "languages";
                if (struct.get(listKey) instanceof List<?> items) {
                    for (Object it : items) {
                        if (it instanceof Map<?, ?> itemMap && itemId.equals(String.valueOf(itemMap.get("id")))) {
                            Map<String, Object> writable = (Map<String, Object>) itemMap;
                            Map<String, Object> attMap = new LinkedHashMap<>();
                            attMap.put("id", attachmentId.toString());
                            attMap.put("file_name", sanitizedFileName);
                            attMap.put("file_size", (int) file.getSize());
                            attMap.put("file_type", contentType);
                            attMap.put("status", "UNVERIFIED");
                            attMap.put("preview_url", "/api/v1/candidate/cvs/" + cvId + "/attachments/" + attachmentId);
                            writable.put("attachment", attMap);
                            break;
                        }
                    }
                    targetVersion.setStructuredJsonContent(objectMapper.writeValueAsString(struct));
                    cvVersionRepository.save(targetVersion);
                }
            } catch (Exception ex) {
                log.warn("Failed to update structuredJsonContent with attachment: {}", ex.getMessage());
            }
        }

        log.info("ATTACHMENT_UPLOAD_COMPLETED correlation_id={} cv_id={} attachment_id={}",
                correlationId, cvId, attachmentId);

        return CVEvidenceAttachmentResponse.builder()
                .attachmentId(attachmentId)
                .cvId(cvId)
                .itemType(type)
                .itemId(itemId)
                .fileName(sanitizedFileName)
                .fileSize((int) file.getSize())
                .fileType(contentType)
                .status("UNVERIFIED")
                .previewUrl("/api/v1/candidate/cvs/" + cvId + "/attachments/" + attachmentId)
                .createdAt(attachment.getCreatedAt() != null ? attachment.getCreatedAt() : java.time.ZonedDateTime.now())
                .build();
    }

    @Transactional(readOnly = true)
    public DownloadResult getEvidenceAttachmentFile(User currentUser, UUID cvId, UUID attachmentId) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(currentUser.getId()).orElse(null);
        CV cv = cvRepository.findById(cvId)
                .orElseThrow(() -> new ResourceNotFoundException("CV", "id", cvId));

        boolean isOwner = candidate != null && cv.getCandidate().getId().equals(candidate.getId());
        if (!isOwner) {
            boolean isAuthorizedStaff = currentUser.getRole() != null &&
                    (currentUser.getRole() == com.platform.recruitment.user.Role.HR
                            || currentUser.getRole() == com.platform.recruitment.user.Role.ADMIN);
            if (!isAuthorizedStaff) {
                throw new UnauthorizedAccessException("Bạn không có quyền truy cập minh chứng này.");
            }
        }

        if (cvEvidenceAttachmentRepository == null) {
            throw new ResourceNotFoundException("EvidenceAttachment", "id", attachmentId);
        }

        CVEvidenceAttachment att = cvEvidenceAttachmentRepository.findByCvIdAndId(cvId, attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("EvidenceAttachment", "id", attachmentId));

        Path path = documents.path(att.getStorageKey());
        if (!Files.exists(path)) {
            throw new ResourceNotFoundException("Tệp tin minh chứng không tồn tại trên hệ thống lưu trữ.");
        }

        try {
            byte[] data = Files.readAllBytes(path);
            return new DownloadResult(data, att.getFileName(), att.getFileType());
        } catch (IOException e) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "Không thể đọc tệp minh chứng từ lưu trữ.");
        }
    }

    @Transactional
    public void deleteEvidenceAttachment(User candidateUser, UUID cvId, UUID attachmentId) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        CV cv = cvRepository.findById(cvId)
                .orElseThrow(() -> new ResourceNotFoundException("CV", "id", cvId));

        if (!cv.getCandidate().getId().equals(candidate.getId())) {
            throw new UnauthorizedAccessException("Candidate does not own this CV");
        }

        if (cvEvidenceAttachmentRepository == null) {
            return;
        }

        CVEvidenceAttachment att = cvEvidenceAttachmentRepository.findByCvIdAndId(cvId, attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("EvidenceAttachment", "id", attachmentId));

        try {
            Files.deleteIfExists(documents.path(att.getStorageKey()));
        } catch (Exception ignored) {}

        cvEvidenceAttachmentRepository.delete(att);

        // Also remove attachment metadata from latest draft structuredJsonContent
        List<CVVersion> versions = cvVersionRepository.findByCvIdOrderByVersionNumberDesc(cvId);
        if (!versions.isEmpty() && versions.get(0).getStructuredJsonContent() != null) {
            CVVersion targetVersion = versions.get(0);
            try {
                Map<String, Object> struct = objectMapper.readValue(targetVersion.getStructuredJsonContent(), new TypeReference<>() {});
                String listKey = "CERTIFICATION".equals(att.getItemType()) ? "certifications" : "languages";
                if (struct.get(listKey) instanceof List<?> items) {
                    for (Object it : items) {
                        if (it instanceof Map<?, ?> itemMap && att.getItemId().equals(String.valueOf(itemMap.get("id")))) {
                            ((Map<String, Object>) itemMap).put("attachment", null);
                            break;
                        }
                    }
                    targetVersion.setStructuredJsonContent(objectMapper.writeValueAsString(struct));
                    cvVersionRepository.save(targetVersion);
                }
            } catch (Exception ignored) {}
        }
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
