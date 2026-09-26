package com.platform.recruitment.cv;

public record DownloadResult(
        byte[] data,
        String filename,
        String contentType
) {
}
