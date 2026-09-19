package com.platform.recruitment.midcv;

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.TimeUnit;
import javax.imageio.ImageIO;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;

/**
 * Robust document processing and text extraction service (Phase 2).
 *
 * <p>Supports:
 * <ul>
 *   <li>Text-based and scanned PDF (page-level extraction and tracing)</li>
 *   <li>Word documents (.docx via Apache POI)</li>
 *   <li>Plain text and Markdown (.txt, .md)</li>
 *   <li>Images (.png, .jpg, .jpeg, .webp via Tesseract OCR)</li>
 * </ul>
 * Enforces defensive validation, explicit error classification, and no fabricated metadata.
 */
@Service
public class TextReader {

  public static final long MAX_FILE_SIZE = 15L * 1024 * 1024; // 15 MB
  public static final int MAX_DOCUMENT_CHARS = 60000;
  public static final int MAX_PDF_PAGES = 30;

  public record PageSegment(
      Integer pageNumber, // 1-indexed for PDF; null when format is unpaged (DOCX, TXT, images)
      String text,
      String method,      // "pdf-text", "pdf+ocr", "docx", "text", "ocr"
      boolean ocrUsed
  ) {}

  public record Extracted(
      String text,
      String method,
      Integer pageCount,  // Actual page count for paginated docs (PDF); null when unpaged
      boolean ocrUsed,
      boolean truncated,
      List<PageSegment> pages
  ) {
    // Backward-compatible constructor for existing callers and tests
    public Extracted(String text, String method) {
      this(text, method, null, method != null && method.contains("ocr"), false, List.of());
    }
  }

  public Extracted read(Path file) {
    validateFile(file);

    String ext = getExtension(file);
    try {
      if (Set.of("txt", "md").contains(ext)) {
        String text = Files.readString(file, StandardCharsets.UTF_8);
        Extracted res = checked(text, "text");
        return new Extracted(
            res.text(),
            res.method(),
            null, // Unpaged format: pageCount is null
            false,
            false,
            List.of(new PageSegment(null, res.text(), "text", false))
        );
      }

      if (ext.equals("docx")) {
        try (var in = Files.newInputStream(file);
            var doc = new XWPFDocument(in);
            var extractor = new XWPFWordExtractor(doc)) {
          String text = extractor.getText();
          Extracted res = checked(text, "docx");
          return new Extracted(
              res.text(),
              res.method(),
              null, // DOCX is flow-based: pageCount is null
              false,
              false,
              List.of(new PageSegment(null, res.text(), "docx", false))
          );
        }
      }

      if (ext.equals("pdf")) {
        return readPdf(file);
      }

      if (Set.of("png", "jpg", "jpeg", "webp").contains(ext)) {
        String text = ocr(file);
        Extracted res = checked(text, "ocr");
        return new Extracted(
            res.text(),
            res.method(),
            null, // Single standalone image: pageCount is null
            true,
            false,
            List.of(new PageSegment(null, res.text(), "ocr", true))
        );
      }

      throw ApiFailure.bad("UNSUPPORTED_FILE", "Định dạng tệp không được hỗ trợ.");
    } catch (ApiFailure e) {
      throw e;
    } catch (Exception e) {
      throw new ApiFailure(
          422,
          "DOCUMENT_READ_FAILED",
          "Không đọc được tài liệu. Kiểm tra tệp có hỏng hoặc có mật khẩu hay không.",
          e);
    }
  }

  private Extracted readPdf(Path file) throws Exception {
    try (var pdf = Loader.loadPDF(file.toFile())) {
      int totalPages = pdf.getNumberOfPages();
      if (totalPages > MAX_PDF_PAGES) {
        throw ApiFailure.bad("PDF_PAGE_LIMIT", "PDF vượt quá 30 trang.");
      }

      long deadline = System.nanoTime() + TimeUnit.MINUTES.toNanos(5);
      StringBuilder out = new StringBuilder();
      PDFTextStripper stripper = new PDFTextStripper();
      stripper.setSortByPosition(true);
      PDFRenderer renderer = new PDFRenderer(pdf);

      boolean anyOcr = false;
      List<PageSegment> segments = new ArrayList<>();

      for (int i = 0; i < totalPages; i++) {
        if (System.nanoTime() > deadline) {
          throw new ApiFailure(
              504, "DOCUMENT_READ_TIMEOUT", "Đọc tài liệu vượt 5 phút; vui lòng chia nhỏ tệp.");
        }

        stripper.setStartPage(i + 1);
        stripper.setEndPage(i + 1);
        String pageText = stripper.getText(pdf);
        String pageMethod = "pdf-text";
        boolean ocrOnPage = false;

        // Scanned page fallback: if page contains insufficient embedded text (< 35 non-whitespace chars)
        if (pageText.replaceAll("\\s", "").length() < 35) {
          Path tempImage = Files.createTempFile("midcv-page-", ".png");
          try {
            var box = pdf.getPage(i).getCropBox();
            float scale = Math.min(2f, 2400f / Math.max(box.getWidth(), box.getHeight()));
            BufferedImage rendered = renderer.renderImage(i, scale);
            BufferedImage preprocessed = toGrayscale(rendered);
            ImageIO.write(preprocessed, "png", tempImage.toFile());

            pageText = ocr(tempImage);
            pageMethod = "pdf+ocr";
            ocrOnPage = true;
            anyOcr = true;
          } catch (Exception ex) {
            if (pageText.isBlank()) throw ex;
          } finally {
            Files.deleteIfExists(tempImage);
          }
        }

        segments.add(new PageSegment(i + 1, pageText, pageMethod, ocrOnPage));
        out.append(pageText).append('\n');

        if (out.length() > MAX_DOCUMENT_CHARS) {
          throw ApiFailure.bad(
              "DOCUMENT_TEXT_LIMIT", "Tài liệu vượt quá 60.000 ký tự; vui lòng tách nhỏ.");
        }
      }

      Extracted res = checked(out.toString(), anyOcr ? "pdf+ocr" : "pdf-text");
      return new Extracted(
          res.text(),
          res.method(),
          totalPages,
          anyOcr,
          false,
          Collections.unmodifiableList(segments)
      );
    }
  }

  private void validateFile(Path file) {
    if (file == null || !Files.isRegularFile(file) || !Files.isReadable(file)) {
      throw ApiFailure.bad("UNREADABLE_FILE", "Tệp không tồn tại hoặc không thể đọc.");
    }

    try {
      long size = Files.size(file);
      if (size == 0) {
        throw ApiFailure.bad("FILE_EMPTY", "Tệp rỗng.");
      }
      if (size > MAX_FILE_SIZE) {
        throw new ApiFailure(413, "FILE_TOO_LARGE", "Tệp vượt quá 15 MB.");
      }
    } catch (ApiFailure af) {
      throw af;
    } catch (IOException e) {
      throw ApiFailure.bad("UNREADABLE_FILE", "Không thể xác định kích thước tệp.");
    }

    String ext = getExtension(file);
    if (!Set.of("pdf", "docx", "txt", "md", "png", "jpg", "jpeg", "webp").contains(ext)) {
      throw ApiFailure.bad("UNSUPPORTED_FILE", "Định dạng tệp không được hỗ trợ.");
    }

    byte[] header = readHeader(file, 16);
    validateMagic(header, ext);
  }

  private String getExtension(Path file) {
    String filename = file.getFileName() != null ? file.getFileName().toString() : file.toString();
    int dot = filename.lastIndexOf('.');
    return (dot >= 0 ? filename.substring(dot + 1) : "").toLowerCase(Locale.ROOT);
  }

  private byte[] readHeader(Path file, int maxBytes) {
    try (var in = Files.newInputStream(file)) {
      return in.readNBytes(maxBytes);
    } catch (Exception e) {
      return new byte[0];
    }
  }

  private void validateMagic(byte[] b, String ext) {
    boolean valid =
        switch (ext) {
          case "pdf" -> starts(b, "%PDF-");
          case "docx" -> b.length >= 4 && b[0] == 0x50 && b[1] == 0x4B; // PK (ZIP)
          case "png" ->
              b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47;
          case "jpg", "jpeg" -> b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8;
          case "webp" ->
              starts(b, "RIFF")
                  && b.length >= 12
                  && new String(b, 8, 4, StandardCharsets.US_ASCII).equals("WEBP");
          default -> true; // txt, md have no fixed binary signature
        };
    if (!valid) {
      throw ApiFailure.bad("FILE_SIGNATURE_MISMATCH", "Nội dung tệp không khớp phần mở rộng.");
    }
  }

  private boolean starts(byte[] b, String v) {
    return b.length >= v.length()
        && new String(b, 0, v.length(), StandardCharsets.US_ASCII).equals(v);
  }

  private BufferedImage toGrayscale(BufferedImage src) {
    if (src == null) return null;
    if (src.getType() == BufferedImage.TYPE_BYTE_GRAY) return src;
    BufferedImage gray = new BufferedImage(src.getWidth(), src.getHeight(), BufferedImage.TYPE_BYTE_GRAY);
    Graphics2D g = gray.createGraphics();
    try {
      g.drawImage(src, 0, 0, null);
    } finally {
      g.dispose();
    }
    return gray;
  }

  private Extracted checked(String text, String method) {
    if (text == null || text.strip().length() < 15) {
      throw new ApiFailure(
          422, "NO_READABLE_TEXT", "Chưa đọc được văn bản; cần ảnh rõ hơn hoặc nội dung văn bản.");
    }
    if (text.length() > MAX_DOCUMENT_CHARS) {
      throw ApiFailure.bad("DOCUMENT_TEXT_LIMIT", "Tài liệu vượt quá 60.000 ký tự.");
    }
    return new Extracted(text, method);
  }

  private String ocr(Path input) throws Exception {
    Path dir = Files.createTempDirectory("midcv-ocr-");
    Path out = dir.resolve("result.txt"), err = dir.resolve("stderr.log");
    try {
      Process process;
      try {
        process =
            new ProcessBuilder(
                    "tesseract", input.toString(), "stdout", "-l", "eng+vie", "--psm", "3")
                .redirectOutput(out.toFile())
                .redirectError(err.toFile())
                .start();
      } catch (java.io.IOException e) {
        throw new ApiFailure(
            503,
            "OCR_ENGINE_UNAVAILABLE",
            "Worker chưa có Tesseract và bộ ngôn ngữ eng/vie. Không thể đọc ảnh hoặc PDF scan.");
      }

      if (!process.waitFor(90, TimeUnit.SECONDS)) {
        process.destroyForcibly();
        throw new ApiFailure(504, "OCR_TIMEOUT", "Nhận dạng một trang vượt quá 90 giây.");
      }

      String diagnostics = Files.readString(err);
      if (diagnostics.contains("Failed loading language")
          || diagnostics.contains("Error opening data file")) {
        throw new ApiFailure(
            503,
            "OCR_LANGUAGE_MISSING",
            "Tesseract thiếu bộ ngôn ngữ eng hoặc vie; không chấp nhận kết quả OCR thiếu ngôn ngữ.");
      }

      if (process.exitValue() != 0) {
        throw new ApiFailure(
            422,
            "OCR_FAILED",
            "Tesseract không nhận dạng được ảnh. Kiểm tra định dạng và bộ ngôn ngữ.");
      }

      String result = Files.readString(out);
      if (result == null || result.strip().isEmpty()) {
        throw new ApiFailure(
            422,
            "EMPTY_OCR_RESULT",
            "Tesseract đã quét hình ảnh nhưng không phát hiện được ký tự nào.");
      }

      return result;
    } finally {
      try (var paths = Files.walk(dir)) {
        for (Path p : paths.sorted(Comparator.reverseOrder()).toList()) {
          try {
            Files.deleteIfExists(p);
          } catch (IOException ignored) {}
        }
      }
    }
  }
}
