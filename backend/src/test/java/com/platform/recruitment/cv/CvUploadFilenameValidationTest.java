package com.platform.recruitment.cv;

import com.platform.recruitment.common.CustomException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CvUploadFilenameValidationTest {
    @Test
    void sanitizesWindowsPathBeforeResolvingTheExtension() {
        assertEquals("folder_resume.PDF", CVService.validateCvUploadFilename("folder\\resume.PDF"));
    }

    @Test
    void rejectsExtensionsThatTheCvPipelineCannotProcess() {
        assertThrows(CustomException.class, () -> CVService.validateCvUploadFilename("resume.txt"));
        assertThrows(CustomException.class, () -> CVService.validateCvUploadFilename("resume.pdf\n"));
        assertThrows(CustomException.class, () -> CVService.validateCvUploadFilename("payload.exe"));
    }

    @Test
    void acceptsOnlySupportedCvFormatsCaseInsensitively() {
        for (String filename : new String[]{"cv.pdf", "cv.doc", "cv.docx", "cv.png", "cv.jpg", "cv.jpeg", "cv.webp"}) {
            assertDoesNotThrow(() -> CVService.validateCvUploadFilename(filename), filename);
        }
    }
}
