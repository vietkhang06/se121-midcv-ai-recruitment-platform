package com.platform.recruitment.cv;

import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.document.Documents;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CVService {

    private final CVRepository cvRepository;
    private final CVVersionRepository cvVersionRepository;
    private final CVSectionRepository cvSectionRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final Documents documents;
    private final TextReader textReader;
    private final JdbcTemplate jdbcTemplate;

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

        // Ownership Protection Check
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

        // 1. Native document ingestion (validates file size, formats, magic bytes, writes to storage, creates documents & document_versions records, enqueues EXTRACT job)
        Documents.Saved savedDoc;
        try {
            savedDoc = documents.upload(candidateUser.getId(), "CV", cvTitle, file, null);
        } catch (IOException e) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to store uploaded file: " + e.getMessage());
        }

        // 2. Extract text using native TextReader (supports PDF via PDFBox + OCR fallback, DOCX via POI, TXT, images)
        String ext = originalFileName.contains(".")
                ? originalFileName.substring(originalFileName.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT)
                : "pdf";
        String storageKey = savedDoc.versionId() + "." + ext;
        TextReader.Extracted extracted = textReader.read(documents.path(storageKey));

        String extractedText = extracted.text();
        if (extractedText == null || extractedText.isBlank()) {
            throw new CustomException(ErrorCode.INVALID_FILE, "DOCUMENT_TEXT_EMPTY: Document text extraction yielded no readable text");
        }

        // Update raw_text & extraction_method on the native document_version so PipelineWorker can immediately proceed to LLM extraction & embedding
        jdbcTemplate.update(
                "UPDATE document_versions SET raw_text=?, extraction_method=? WHERE id=?",
                extractedText, extracted.method(), savedDoc.versionId()
        );

        // 3. Persist legacy CV entity with synchronized IDs for 100% backward compatibility
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
