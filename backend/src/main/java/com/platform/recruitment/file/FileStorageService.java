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
        // Validate MIME type
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("application/pdf") && 
            !contentType.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document"))) {
            throw new CustomException(ErrorCode.INVALID_FILE, "Only PDF and DOCX files are allowed");
        }

        // Validate File Size <= 10MB
        if (file.getSize() > 10 * 1024 * 1024) {
            throw new CustomException(ErrorCode.FILE_SIZE_EXCEEDED, "File size exceeds maximum limit of 10MB");
        }

        String originalFileName = file.getOriginalFilename();
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
