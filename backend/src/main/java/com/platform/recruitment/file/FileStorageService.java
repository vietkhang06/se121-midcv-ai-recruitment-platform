package com.platform.recruitment.file;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Slf4j
@Service
public class FileStorageService {

    private final Path storageLocation;

    public FileStorageService(@Value("${app.file-storage-path:./uploads/cvs/private}") String storagePath) {
        this.storageLocation = Paths.get(storagePath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.storageLocation);
        } catch (IOException ex) {
            log.error("Could not create storage directory: {}", this.storageLocation, ex);
        }
    }

    public FileMetadata storeFile(MultipartFile file, UUID candidateId) {
        if (file == null || file.isEmpty() || file.getSize() == 0) {
            throw new CustomException(ErrorCode.INVALID_FILE, "FILE_EMPTY: Uploaded file is empty (0 bytes)");
        }

        // Validate File Size <= 10MB
        if (file.getSize() > 10 * 1024 * 1024) {
            throw new CustomException(ErrorCode.FILE_SIZE_EXCEEDED, "FILE_TOO_LARGE: File size exceeds maximum limit of 10MB");
        }

        String originalFileName = file.getOriginalFilename();
        if (originalFileName == null || (!originalFileName.toLowerCase().endsWith(".pdf") && !originalFileName.toLowerCase().endsWith(".docx"))) {
            throw new CustomException(ErrorCode.INVALID_FILE, "UNSUPPORTED_FILE_TYPE: Only .pdf and .docx file formats are supported");
        }

        // Validate Magic Bytes
        try {
            byte[] header = new byte[5];
            int read = file.getInputStream().read(header);
            if (read >= 4) {
                if (originalFileName.toLowerCase().endsWith(".pdf")) {
                    if (header[0] != 0x25 || header[1] != 0x50 || header[2] != 0x44 || header[3] != 0x46) {
                        throw new CustomException(ErrorCode.INVALID_FILE, "UNSUPPORTED_FILE_TYPE: File declared as PDF does not have valid %PDF header");
                    }
                } else if (originalFileName.toLowerCase().endsWith(".docx")) {
                    if (header[0] != 0x50 || header[1] != 0x4B || header[2] != 0x03 || header[3] != 0x04) {
                        throw new CustomException(ErrorCode.INVALID_FILE, "UNSUPPORTED_FILE_TYPE: File declared as DOCX does not have valid PK zip header");
                    }
                }
            }
        } catch (IOException e) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to inspect file header: " + e.getMessage());
        }

        String contentType = file.getContentType();
        if (contentType == null || contentType.isBlank()) {
            contentType = originalFileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        }
        String fileExtension = "";
        if (originalFileName != null && originalFileName.contains(".")) {
            fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }

        String uniqueFileName = UUID.randomUUID().toString() + fileExtension;
        Path targetPath = this.storageLocation.resolve(uniqueFileName);

        try {
            Files.copy(file.getInputStream(), targetPath);
        } catch (IOException ex) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "Could not store file. Please try again!");
        }

        return FileMetadata.builder()
                .originalFileName(originalFileName)
                .storedFileName(uniqueFileName)
                .filePath(targetPath.toString())
                .fileType(contentType)
                .fileSize((int) file.getSize())
                .build();
    }
}
