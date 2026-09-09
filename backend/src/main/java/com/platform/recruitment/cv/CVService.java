package com.platform.recruitment.cv;

import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.ai.AiWorkerClient;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.file.FileMetadata;
import com.platform.recruitment.file.FileStorageService;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CVService {

    private final CVRepository cvRepository;
    private final CVVersionRepository cvVersionRepository;
    private final CVSectionRepository cvSectionRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final FileStorageService fileStorageService;
    private final AiWorkerClient aiWorkerClient;

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

        FileMetadata meta = fileStorageService.storeFile(file, candidate.getId());
        String cvTitle = (title != null && !title.isBlank()) ? title : meta.getOriginalFileName();

        byte[] fileBytes;
        try {
            fileBytes = file.getBytes();
        } catch (IOException e) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to read uploaded file: " + e.getMessage());
        }

        String declaredType = meta.getOriginalFileName().toLowerCase().endsWith(".docx") ? "DOCX" : "PDF";
        Map<String, Object> extractResult = aiWorkerClient.extractDocument(fileBytes, meta.getOriginalFileName(), declaredType);

        String status = (String) extractResult.getOrDefault("status", "FAILED");
        if (!"SUCCESS".equalsIgnoreCase(status) && !"PARTIAL".equalsIgnoreCase(status)) {
            String errorCode = (String) extractResult.getOrDefault("error_code", "EXTRACTION_FAILED");
            String errorMessage = (String) extractResult.getOrDefault("error_message", "Document text extraction failed");
            throw new CustomException(ErrorCode.INVALID_FILE, errorCode + ": " + errorMessage);
        }

        String extractedText = (String) extractResult.get("text");
        if (extractedText == null || extractedText.isBlank()) {
            throw new CustomException(ErrorCode.INVALID_FILE, "DOCUMENT_TEXT_EMPTY: Document text extraction yielded no readable text");
        }

        CV cv = CV.builder()
                .candidate(candidate)
                .title(cvTitle)
                .creationPath(CVCreationPath.UPLOAD)
                .targetIndustry(targetIndustry)
                .fileName(meta.getOriginalFileName())
                .filePath(meta.getFilePath())
                .fileType(meta.getFileType())
                .fileSize(meta.getFileSize())
                .status("PARSED")
                .rawText(extractedText)
                .isDefault(isDefault != null ? isDefault : false)
                .build();

        CV savedCv = cvRepository.save(cv);

        CVVersion version = CVVersion.builder()
                .cv(savedCv)
                .versionNumber(1)
                .title(savedCv.getTitle() + " v1.0")
                .rawTextContent(extractedText)
                .build();
        version = cvVersionRepository.save(version);

        CVSection section = CVSection.builder()
                .cvVersion(version)
                .sectionType("SUMMARY")
                .content(extractedText)
                .build();
        cvSectionRepository.save(section);

        return mapToResponse(savedCv);
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
