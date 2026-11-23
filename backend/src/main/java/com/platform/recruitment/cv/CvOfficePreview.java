package com.platform.recruitment.cv;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.document.Documents;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.Set;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

@Service
public class CvOfficePreview {
    private static final long MAX_PDF_BYTES = 25L * 1024 * 1024;
    private final Semaphore conversions = new Semaphore(2);
    private final String executable;

    public CvOfficePreview(@Value("${app.cv-office-executable:${CV_OFFICE_EXECUTABLE:}}") String configuredExecutable) {
        var windows = Path.of(System.getenv().getOrDefault("ProgramFiles", "C:\\Program Files"),
                "LibreOffice", "program", "soffice.exe");
        executable = !configuredExecutable.isBlank() ? configuredExecutable
                : Files.isRegularFile(windows) ? windows.toString() : "soffice";
    }

    public DownloadResult toPdf(DownloadResult original) {
        String extension = Documents.extensionOf(original.filename());
        if (!Set.of("doc", "docx").contains(extension))
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Word preview requires a DOC or DOCX file.");
        if (!conversions.tryAcquire()) throw previewUnavailable();

        Path temporary = null;
        Process process = null;
        try {
            temporary = Files.createTempDirectory("midcv-word-");
            Path profile = temporary.resolve("profile");
            Files.createDirectories(profile.resolve("user"));
            Files.writeString(profile.resolve("user/registrymodifications.xcu"), """
                    <?xml version="1.0" encoding="UTF-8"?>
                    <oor:items xmlns:oor="http://openoffice.org/2001/registry">
                      <item oor:path="/org.openoffice.Office.Common/Security/Scripting">
                        <prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop>
                      </item>
                      <item oor:path="/org.openoffice.Office.Writer/Content/Update">
                        <prop oor:name="Link" oor:op="fuse"><value>2</value></prop>
                      </item>
                    </oor:items>
                    """);
            Path input = Files.write(temporary.resolve("cv." + extension), original.data());
            Path pdf = temporary.resolve("cv.pdf");
            process = new ProcessBuilder(executable, "-env:UserInstallation=" + profile.toUri(),
                    "--headless", "--norestore", "--convert-to", "pdf:writer_pdf_Export",
                    "--outdir", temporary.toString(), input.toString())
                    .redirectOutput(ProcessBuilder.Redirect.DISCARD)
                    .redirectError(ProcessBuilder.Redirect.DISCARD).start();
            if (!process.waitFor(30, TimeUnit.SECONDS) || process.exitValue() != 0
                    || !Files.isRegularFile(pdf) || Files.size(pdf) == 0 || Files.size(pdf) > MAX_PDF_BYTES)
                throw previewUnavailable();
            return new DownloadResult(Files.readAllBytes(pdf), "cv-preview.pdf", "application/pdf");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw previewUnavailable();
        } catch (IOException e) {
            throw previewUnavailable();
        } finally {
            if (process != null && process.isAlive()) {
                process.descendants().forEach(ProcessHandle::destroyForcibly);
                process.destroyForcibly();
            }
            deleteTemporaryFiles(temporary);
            conversions.release();
        }
    }

    private static CustomException previewUnavailable() {
        return new CustomException(ErrorCode.SERVICE_UNAVAILABLE,
                "Word preview is unavailable. Download the original document to view it.");
    }

    private static void deleteTemporaryFiles(Path temporary) {
        if (temporary == null) return;
        try (var files = Files.walk(temporary)) {
            for (Path path : files.sorted(Comparator.reverseOrder()).toList()) {
                try { Files.deleteIfExists(path); } catch (IOException ignored) { }
            }
        } catch (IOException ignored) { }
    }
}
