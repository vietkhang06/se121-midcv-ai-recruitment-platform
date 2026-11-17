package com.platform.recruitment.cv;

import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.document.Documents;
import com.platform.recruitment.user.AccountPlan;
import com.platform.recruitment.user.User;
import java.io.IOException;
import java.nio.file.Files;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/** Owns page-level OCR state and creates one CV review version from an ordered image set. */
@Service
public class CVImageSetService {
  private static final int MAX_PAGES = 10;
  private static final long MAX_TOTAL_BYTES = 30L * 1024 * 1024;
  private final JdbcTemplate jdbc;
  private final Documents documents;
  private final TextReader reader;
  private final CandidateProfileRepository candidates;
  private final CVRepository cvs;
  private final CVVersionRepository versions;

  public CVImageSetService(JdbcTemplate jdbc, Documents documents, TextReader reader,
      CandidateProfileRepository candidates, CVRepository cvs, CVVersionRepository versions) {
    this.jdbc = jdbc; this.documents = documents; this.reader = reader;
    this.candidates = candidates; this.cvs = cvs; this.versions = versions;
  }

  @Transactional
  public Map<String, Object> create(User user, String title, List<MultipartFile> files) {
    if (files == null || files.isEmpty() || files.size() > MAX_PAGES)
      throw new CustomException(ErrorCode.VALIDATION_ERROR, "Tải từ 1 đến 10 ảnh cho một CV.");
    long total = files.stream().filter(Objects::nonNull).mapToLong(MultipartFile::getSize).sum();
    if (total > MAX_TOTAL_BYTES)
      throw new CustomException(ErrorCode.FILE_SIZE_EXCEEDED, "Tổng dung lượng ảnh vượt quá 30 MB.");
    UUID setId = UUID.randomUUID();
    String setTitle = title == null || title.isBlank() ? "CV nhiều trang" : title.trim();
    jdbc.update("INSERT INTO cv_source_page_sets(id,owner_id,title,status) VALUES (?,?,?,'UPLOADED')",
        setId, user.getId(), setTitle);
    int order = 1;
    for (MultipartFile file : files) {
      Documents.Saved saved = saveOriginal(user, setTitle, file);
      PageOcr ocr = runOcr(saved.storageKey());
      jdbc.update("INSERT INTO cv_source_pages(id,set_id,document_id,document_version_id,page_order,status,extracted_text,error_code) VALUES (?,?,?,?,?,?,?,?)",
          UUID.randomUUID(), setId, saved.documentId(), saved.versionId(), order++, ocr.ready ? "READY" : "FAILED", ocr.text, ocr.errorCode);
    }
    return get(user, setId);
  }

  @Transactional(readOnly = true)
  public Map<String, Object> get(User user, UUID setId) {
    Map<String, Object> set = new HashMap<>(ownedSet(user, setId, false));
    List<Map<String, Object>> pages = jdbc.queryForList(
        "SELECT p.id,p.page_order,p.revision,p.status,p.extracted_text,p.error_code,v.filename,v.media_type,v.size_bytes,v.source_sha " +
        "FROM cv_source_pages p JOIN document_versions v ON v.id=p.document_version_id WHERE p.set_id=? ORDER BY p.page_order,p.created_at", setId);
    set.put("pages", pages);
    return set;
  }

  @Transactional
  public Map<String, Object> retry(User user, UUID setId, UUID pageId) {
    Map<String, Object> p = ownedPage(user, setId, pageId, true);
    if ("REMOVED".equals(p.get("status"))) throw state("Không thể thử lại trang đã xóa.");
    if ("DRAFT_CREATED".equals(p.get("set_status"))) throw state("Bản nháp đã được tạo; hãy tải phiên bản CV mới để chạy OCR lại.");
    if (!"FAILED".equals(p.get("status"))) throw state("Chỉ có thể thử lại trang OCR thất bại.");
    int revision = ((Number) p.get("revision")).intValue();
    PageOcr ocr = runOcr((String) p.get("storage_key"));
    jdbc.update("UPDATE cv_source_pages SET revision=?,status=?,extracted_text=?,error_code=?,updated_at=now() WHERE id=? AND revision=?",
        revision + 1, ocr.ready ? "READY" : "FAILED", ocr.text, ocr.errorCode, pageId, revision);
    return get(user, setId);
  }

  @Transactional
  public Map<String, Object> replace(User user, UUID setId, UUID pageId, MultipartFile file) {
    Map<String, Object> p = ownedPage(user, setId, pageId, true);
    if ("DRAFT_CREATED".equals(p.get("set_status"))) throw state("Trang đã được gắn với bản CV; hãy tạo phiên bản CV mới.");
    Documents.Saved saved = saveOriginal(user, Objects.toString(p.get("title"), "CV"), file);
    int revision = ((Number) p.get("revision")).intValue();
    PageOcr ocr = runOcr(saved.storageKey());
    jdbc.update("UPDATE cv_source_pages SET document_id=?,document_version_id=?,revision=?,status=?,extracted_text=?,error_code=?,updated_at=now() WHERE id=? AND revision=?",
        saved.documentId(), saved.versionId(), revision + 1, ocr.ready ? "READY" : "FAILED", ocr.text, ocr.errorCode, pageId, revision);
    return get(user, setId);
  }

  @Transactional
  public Map<String, Object> remove(User user, UUID setId, UUID pageId) {
    Map<String, Object> p = ownedPage(user, setId, pageId, true);
    if ("DRAFT_CREATED".equals(p.get("set_status"))) throw state("Trang đã được gắn với bản CV; hãy tạo phiên bản CV mới.");
    jdbc.update("UPDATE cv_source_pages SET status='REMOVED',extracted_text=NULL,error_code=NULL,revision=revision+1,updated_at=now() WHERE id=?", pageId);
    return get(user, setId);
  }

  @Transactional
  public Map<String, Object> reorder(User user, UUID setId, List<UUID> orderedPageIds) {
    Map<String, Object> set = ownedSet(user, setId, true);
    if ("DRAFT_CREATED".equals(set.get("status"))) throw state("Trang đã được gắn với bản CV; hãy tạo phiên bản CV mới.");
    List<UUID> current = jdbc.query("SELECT id FROM cv_source_pages WHERE set_id=? AND status <> 'REMOVED' ORDER BY page_order",
        (rs, n) -> rs.getObject(1, UUID.class), setId);
    if (orderedPageIds == null || orderedPageIds.size() != current.size() || !new HashSet<>(orderedPageIds).equals(new HashSet<>(current)))
      throw new CustomException(ErrorCode.VALIDATION_ERROR, "Thứ tự trang phải chứa chính xác tất cả trang còn lại.");
    for (int i = 0; i < orderedPageIds.size(); i++) jdbc.update("UPDATE cv_source_pages SET page_order=?,updated_at=now() WHERE id=? AND set_id=?", i + 1, orderedPageIds.get(i), setId);
    return get(user, setId);
  }

  @Transactional
  public CVUploadAsyncResponse createDraft(User user, UUID setId, Boolean isDefault) {
    Map<String, Object> set = ownedSet(user, setId, true);
    if ("DRAFT_CREATED".equals(set.get("status"))) throw state("Bản nháp của tập ảnh này đã được tạo.");
    List<Map<String, Object>> pages = jdbc.queryForList(
        "SELECT p.id,p.page_order,p.status,p.extracted_text,v.size_bytes FROM cv_source_pages p JOIN document_versions v ON v.id=p.document_version_id WHERE p.set_id=? AND p.status <> 'REMOVED' ORDER BY p.page_order FOR UPDATE OF p", setId);
    if (pages.isEmpty() || pages.stream().anyMatch(p -> !"READY".equals(p.get("status"))))
      throw state("Mỗi trang còn lại phải hoàn tất OCR trước khi tạo bản nháp.");
    CandidateProfile candidate = candidates.findByUserIdForUpdate(user.getId())
        .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", user.getId()));
    AccountPlan plan = candidate.getUser() != null && candidate.getUser().getAccountPlan() != null
        ? candidate.getUser().getAccountPlan() : (user.getAccountPlan() != null ? user.getAccountPlan() : AccountPlan.STANDARD);
    if (cvs.countActiveByCandidateId(candidate.getId()) >= plan.getMaxCvLimit())
      throw new CustomException(ErrorCode.CV_QUOTA_EXCEEDED, "Đã đạt giới hạn số CV của gói hiện tại.");
    String merged = mergePageTexts(pages.stream().map(page -> Objects.toString(page.get("extracted_text"), "")).toList());
    String title = Objects.toString(set.get("title"), "CV nhiều trang");
    Documents.Saved saved;
    try { saved = documents.text(user.getId(), "CV", title, merged, null); }
    catch (CustomException e) { throw e; }
    catch (Exception e) { throw new CustomException(ErrorCode.FILE_STORAGE_FAILED, "Không thể lưu nội dung CV đã trích xuất."); }
    CV cv = CV.builder().candidate(candidate).title(title).creationPath(CVCreationPath.UPLOAD)
        .fileName(title + ".images").fileType("application/x-midcv-image-set")
        .fileSize((int) Math.min(Integer.MAX_VALUE, pages.stream().mapToLong(p -> ((Number) p.get("size_bytes")).longValue()).sum()))
        .status("PROCESSING").isDefault(Boolean.TRUE.equals(isDefault)).build();
    cv.setId(saved.documentId());
    CV persistedCv = cvs.saveAndFlush(cv);
    CVVersion version = CVVersion.builder().cv(persistedCv).versionNumber(saved.versionNo())
        .title(title + " v" + saved.versionNo() + ".0").status("PROCESSING").rawTextContent(merged).build();
    version.setId(saved.versionId());
    versions.saveAndFlush(version);
    for (int i = 0; i < pages.size(); i++) jdbc.update("INSERT INTO cv_version_source_pages(cv_version_id,source_page_id,page_order) VALUES (?,?,?)",
        saved.versionId(), pages.get(i).get("id"), i + 1);
    jdbc.update("UPDATE cv_source_page_sets SET status='DRAFT_CREATED',cv_id=?,cv_version_id=?,updated_at=now() WHERE id=?", saved.documentId(), saved.versionId(), setId);
    return CVUploadAsyncResponse.builder().cvId(saved.documentId()).versionId(saved.versionId()).jobId(saved.jobId())
        .status("UPLOADED").stage("UPLOADED").progress(5).build();
  }

  @Transactional(readOnly = true)
  public List<Map<String, Object>> pagesForVersion(UUID versionId) {
    return jdbc.queryForList("SELECT p.id AS page_id,v.filename,v.media_type,v.size_bytes,v.source_sha,s.page_order " +
        "FROM cv_version_source_pages s JOIN cv_source_pages p ON p.id=s.source_page_id JOIN document_versions v ON v.id=p.document_version_id " +
        "WHERE s.cv_version_id=? ORDER BY s.page_order", versionId);
  }

  @Transactional(readOnly = true)
  public DownloadResult pageContentForCandidate(User user, UUID setId, UUID pageId) {
    Map<String, Object> p = ownedPage(user, setId, pageId, false);
    return readPage(p);
  }

  @Transactional(readOnly = true)
  public DownloadResult pageContentForApplication(UUID applicationId, int pageOrder) {
    List<Map<String, Object>> rows = jdbc.queryForList("SELECT v.storage_key,s.filename_snapshot AS filename,s.media_type_snapshot AS media_type,s.size_bytes_snapshot AS size_bytes " +
        "FROM application_cv_snapshot_pages s JOIN document_versions v ON v.id=s.source_document_version_id " +
        "WHERE s.application_id=? AND s.page_order=?", applicationId, pageOrder);
    if (rows.isEmpty()) throw new ResourceNotFoundException("ApplicationCVSnapshotPage", "pageOrder", pageOrder);
    return readPage(rows.get(0));
  }

  private DownloadResult readPage(Map<String, Object> row) {
    try { return new DownloadResult(Files.readAllBytes(documents.path((String) row.get("storage_key"))),
        Objects.toString(row.get("filename"), "cv-page.png"), Objects.toString(row.get("media_type"), "image/png")); }
    catch (IOException e) { throw new CustomException(ErrorCode.FILE_STORAGE_FAILED, "Không thể đọc ảnh CV đã lưu."); }
  }

  private Documents.Saved saveOriginal(User user, String title, MultipartFile file) {
    try { return documents.uploadSourceImage(user.getId(), title, file); }
    catch (IOException e) { throw new CustomException(ErrorCode.FILE_STORAGE_FAILED, "Không thể lưu ảnh CV."); }
  }

  private PageOcr runOcr(String storageKey) {
    try {
      TextReader.Extracted extracted = reader.read(documents.path(storageKey));
      if (extracted.text() == null || extracted.text().isBlank()) return new PageOcr(false, null, "OCR_EMPTY");
      return new PageOcr(true, extracted.text(), null);
    } catch (Exception e) { return new PageOcr(false, null, "OCR_FAILED"); }
  }

  private Map<String, Object> ownedSet(User user, UUID setId, boolean lock) {
    List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM cv_source_page_sets WHERE id=? AND owner_id=?" + (lock ? " FOR UPDATE" : ""), setId, user.getId());
    if (rows.isEmpty()) throw new ResourceNotFoundException("CVImageSet", "id", setId);
    return rows.get(0);
  }

  private Map<String, Object> ownedPage(User user, UUID setId, UUID pageId, boolean lock) {
    List<Map<String, Object>> rows = jdbc.queryForList("SELECT p.*,s.title,s.status AS set_status,v.storage_key FROM cv_source_pages p " +
        "JOIN cv_source_page_sets s ON s.id=p.set_id JOIN document_versions v ON v.id=p.document_version_id " +
        "WHERE p.id=? AND p.set_id=? AND s.owner_id=?" + (lock ? " FOR UPDATE OF p,s" : ""), pageId, setId, user.getId());
    if (rows.isEmpty()) throw new ResourceNotFoundException("CVSourcePage", "id", pageId);
    return rows.get(0);
  }

  private CustomException state(String message) { return new CustomException(ErrorCode.INVALID_STATE_TRANSITION, message); }
  static String mergePageTexts(List<String> orderedTexts) { return String.join("\n\n", orderedTexts); }
  private record PageOcr(boolean ready, String text, String errorCode) {}
}
