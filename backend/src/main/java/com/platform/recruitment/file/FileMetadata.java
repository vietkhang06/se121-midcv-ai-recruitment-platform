package com.platform.recruitment.file;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileMetadata {
    private String originalFileName;
    private String storedFileName;
    private String filePath;
    private String fileType;
    private Integer fileSize;
}
