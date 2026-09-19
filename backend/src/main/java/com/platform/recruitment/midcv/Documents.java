package com.platform.recruitment.midcv;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class Documents {
  private final Db db;
  private final JobQueue queue;
  private final Events events;
  private final Path directory;

  public Documents(
      @Qualifier("midcvDb") Db db,
      JobQueue queue,
      Events events,
      @Value("${midcv.upload-dir:./uploads}") String path)
      throws IOException {
    this.db = db;
    this.queue = queue;
    this.events = events;
    directory = Path.of(path).toAbsolutePath().normalize();
    Files.createDirectories(directory);
  }

  public Path path(String key) {
    if (!key.matches("[a-f0-9-]{36}\\.[a-z0-9]+"))
      throw new IllegalStateException("INVALID_STORAGE_KEY");
    return directory.resolve(key);
  }

  public UUID createDocument(UUID owner, String kind, String title) {
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO documents(id,owner_id,kind,title) VALUES (?,?,?,?)", id, owner, kind, title);
    return id;
  }

  public record Saved(UUID documentId, UUID versionId, UUID jobId, int versionNo) {}

  public static String shaHex(byte[] data) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));
    } catch (Exception e) {
      throw new IllegalStateException("SHA256_FAILED", e);
    }
  }

  public static String shaHex(String text) {
    return shaHex(text.getBytes(StandardCharsets.UTF_8));
  }

  @Transactional
  public Saved text(UUID owner, String kind, String title, String text, UUID existing) {
    if (text == null || text.trim().length() < 15 || text.length() > 60000)
      throw ApiFailure.bad("TEXT_LENGTH", "Nội dung cần từ 15 đến 60.000 ký tự.");
    UUID doc = existing == null ? createDocument(owner, kind, title) : existing;
    db.one(
        "SELECT id FROM documents WHERE id=? AND owner_id=? AND kind=? AND archived=false FOR"
            + " UPDATE",
        doc,
        owner,
        kind);
    int version = next(doc);
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO"
            + " document_versions(id,document_id,version_no,filename,source_sha,raw_text,extraction_method)"
            + " VALUES (?,?,?,?,?,?,?)",
        id,
        doc,
        version,
        kind + "-v" + version + ".txt",
        shaHex(text),
        text,
        "builder");
    UUID job = queue.enqueue(owner, "EXTRACT", id);
    return new Saved(doc, id, job, version);
  }

  @Transactional(rollbackFor = Exception.class)
  public Saved upload(UUID owner, String kind, String title, MultipartFile file, UUID existing)
      throws IOException {
    if (file == null || file.isEmpty()) throw ApiFailure.bad("FILE_EMPTY", "Chưa chọn tệp.");
    if (file.getSize() > 15L * 1024 * 1024)
      throw new ApiFailure(413, "FILE_TOO_LARGE", "Tệp vượt quá 15 MB.");
    String filename =
        Optional.ofNullable(file.getOriginalFilename())
            .orElse("document")
            .replaceAll("[\\\\/\\r\\n]", "_");
    if (filename.length() > 200) filename = filename.substring(filename.length() - 200);
    String ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    byte[] bytes = file.getBytes();
    validateMagic(bytes, ext);
    UUID doc = existing == null ? createDocument(owner, kind, title) : existing;
    db.one(
        "SELECT id FROM documents WHERE id=? AND owner_id=? AND kind=? AND archived=false FOR"
            + " UPDATE",
        doc,
        owner,
        kind);
    int version = next(doc);
    UUID id = UUID.randomUUID();
    String key = id + "." + ext;
    Path target = path(key);
    Files.write(target, bytes, StandardOpenOption.CREATE_NEW);
    org.springframework.transaction.support.TransactionSynchronizationManager
        .registerSynchronization(
            new org.springframework.transaction.support.TransactionSynchronization() {
              @Override
              public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED)
                  try {
                    Files.deleteIfExists(target);
                  } catch (IOException e) {
                    events.failure(e, "ORPHAN_FILE_CLEANUP_FAILED");
                  }
              }
            });
    try {
      db.update(
          "INSERT INTO"
              + " document_versions(id,document_id,version_no,filename,storage_key,media_type,size_bytes,source_sha)"
              + " VALUES (?,?,?,?,?,?,?,?)",
          id,
          doc,
          version,
          filename,
          key,
          mime(ext),
          bytes.length,
          shaHex(bytes));
      UUID job = queue.enqueue(owner, "EXTRACT", id);
      events.emit(
          job,
          owner,
          "INFO",
          "UPLOAD",
          "FILE_STORED",
          "Đã lưu tệp và tạo phiên bản tài liệu.",
          null);
      return new Saved(doc, id, job, version);
    } catch (RuntimeException e) {
      try {
        Files.deleteIfExists(target);
      } catch (IOException cleanup) {
        events.emit(
            null,
            owner,
            "ERROR",
            "STORAGE",
            "ORPHAN_FILE",
            "Cần kiểm tra tệp mồ côi sau khi giao dịch thất bại.",
            null);
      }
      throw e;
    }
  }

  private int next(UUID doc) {
    return ((Number)
            db.one(
                    "SELECT coalesce(max(version_no),0)+1 AS n FROM document_versions WHERE"
                        + " document_id=?",
                    doc)
                .get("n"))
        .intValue();
  }

  private String mime(String ext) {
    return switch (ext) {
      case "pdf" -> "application/pdf";
      case "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      case "png" -> "image/png";
      case "jpg", "jpeg" -> "image/jpeg";
      case "webp" -> "image/webp";
      default -> "text/plain";
    };
  }

  private void validateMagic(byte[] b, String ext) {
    if (!Set.of("pdf", "docx", "txt", "md", "png", "jpg", "jpeg", "webp").contains(ext))
      throw ApiFailure.bad("UNSUPPORTED_FILE", "Chỉ hỗ trợ PDF, DOCX, TXT, MD, PNG, JPG và WEBP.");
    boolean valid =
        switch (ext) {
          case "pdf" -> starts(b, "%PDF-");
          case "docx" -> b.length > 4 && b[0] == 80 && b[1] == 75;
          case "png" ->
              b.length > 8 && (b[0] & 255) == 137 && b[1] == 80 && b[2] == 78 && b[3] == 71;
          case "jpg", "jpeg" -> b.length > 3 && (b[0] & 255) == 255 && (b[1] & 255) == 216;
          case "webp" ->
              starts(b, "RIFF")
                  && b.length > 12
                  && new String(b, 8, 4, java.nio.charset.StandardCharsets.US_ASCII).equals("WEBP");
          default -> true;
        };
    if (!valid)
      throw ApiFailure.bad("FILE_SIGNATURE_MISMATCH", "Nội dung tệp không khớp phần mở rộng.");
  }

  private boolean starts(byte[] b, String v) {
    return b.length >= v.length()
        && new String(b, 0, v.length(), java.nio.charset.StandardCharsets.US_ASCII).equals(v);
  }

  public Map<String, Object> accessibleVersion(UUID version, JobQueue.Actor a) {
    return db.one(
        "SELECT"
            + " v.id,v.document_id,v.version_no,v.filename,v.storage_key,v.media_type,v.size_bytes,v.raw_text,v.normalized,v.state,v.error_code,v.error_message,v.created_at,v.extraction_method,v.llm_model,v.embedding_model,v.pipeline_version,d.owner_id,d.kind,d.title"
            + " FROM document_versions v JOIN documents d ON d.id=v.document_id WHERE v.id=? AND"
            + " (d.owner_id=? OR EXISTS(SELECT 1 FROM applications ap JOIN jobs j ON"
            + " j.id=ap.job_id WHERE ap.applied_cv_version_id=v.id AND j.recruiter_id=?) OR (d.kind='JD'"
            + " AND EXISTS(SELECT 1 FROM jobs j WHERE"
            + " ((j.status='OPEN') OR EXISTS(SELECT 1 FROM applications ap"
            + " WHERE ap.job_id=j.id AND ap.candidate_id=?)))))",
        version,
        a.id(),
        a.id(),
        a.id());
  }
}
