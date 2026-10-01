# Quy Trình Lưu Trữ & Xử Lý Tệp CV (CV Storage & Upload Pipeline)

Tài liệu này mô tả chi tiết kiến trúc lưu trữ tệp CV, cơ chế xử lý lỗi và kết quả kiểm thử kiểm chứng sau khi khắc phục lỗi `500 Internal Server Error` khi người dùng tải CV lên hệ thống.

---

## 1. Nguyên nhân gốc của sự cố (Root Cause Analysis)

### 1.1 Hiện tượng lỗi
Khi người dùng tải tệp CV và nhấn **“Tải Lên & Phân Tích”**, frontend gọi:
```http
POST /api/v1/candidate/cvs/upload
```
Backend trả về HTTP 500 với thông điệp:
```text
Failed to store uploaded file: C:\Users\Khang\OneDrive\Desktop\SE121\ai-recruitment-platform\backend\uploads\<uuid>.pdf
```
Frontend hiển thị lỗi sai lệch:
```text
Phân Tích Thất Bại: Định dạng tệp tin hoặc nội dung văn bản không thể nhận diện. Vui lòng kiểm tra lại file.
```

### 1.2 Nguyên nhân kỹ thuật cụ thể
1. **Thư mục lưu trữ không tồn tại lúc runtime**:
   - `Documents.java` trước đây chỉ gọi `Files.createDirectories(directory)` một lần duy nhất trong constructor.
   - Khi thư mục `backend/uploads` chưa được tạo hoặc bị dọn dẹp lúc runtime, phương thức `Files.write(target, bytes, CREATE_NEW)` ném ra `java.nio.file.NoSuchFileException`.
2. **Lộ đường dẫn tuyệt đối của máy chủ**:
   - Trong `CVService.java:164`:
     ```java
     throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to store uploaded file: " + e.getMessage());
     ```
     `e.getMessage()` của `NoSuchFileException` trên Windows chính là đường dẫn tuyệt đối `C:\...\backend\uploads\<uuid>.pdf`, dẫn đến việc lộ cấu trúc thư mục máy chủ cho client.
3. **Cấu hình storage phân tán và không đồng nhất**:
   - `application.yml` tồn tại đồng thời:
     - `app.upload-dir: ./uploads` (được dùng bởi `Documents.java`).
     - `app.file-storage-path: ./uploads/cvs/private` (được dùng bởi `FileStorageService.java`).
4. **Thông báo lỗi frontend bị ghi đè**:
   - Trong `CVUploadModal.tsx`, khi `status === 'FAILED'`, giao diện bỏ qua biến `errorMessage` và hiển thị chuỗi tĩnh cảnh báo định dạng tệp, gây hiểu nhầm cho người dùng khi backend thực tế gặp lỗi lưu tệp.
5. **Thiếu chữ ký ma thuật (magic bytes) cho tệp `.doc` (Word Binary)**:
   - `Documents.validateMagic` hỗ trợ PDF, DOCX, nhưng thiếu định dạng OLE binary (`0xD0, 0xCF, 0x11, 0xE0`) của Microsoft Word legacy (`.doc`).

---

## 2. Kiến trúc giải pháp đã triển khai (Implemented Solution)

### 2.1 Chuẩn hóa cấu hình Storage
Trong `backend/src/main/resources/application.yml`:
```yaml
app:
  upload-dir: ${UPLOAD_DIR:${FILE_STORAGE_PATH:./uploads}}
  file-storage-path: ${FILE_STORAGE_PATH:${UPLOAD_DIR:./uploads}}
```
Đường dẫn được chuẩn hóa tự động sang đường dẫn tuyệt đối bằng `Path.of(path).toAbsolutePath().normalize()` khi khởi tạo service. Hoạt động đồng nhất trên cả Windows và Linux.

### 2.2 Tự tạo thư mục lưu trữ & Tự phục hồi runtime
Trong `Documents.java`:
- Khởi tạo thư mục và kiểm tra quyền ghi `isWritable` ngay khi service khởi động (fail-fast).
- Trong mỗi thao tác `upload`, gọi `Files.createDirectories(this.directory)` để tự phục hồi ngay lập tức nếu thư mục bị xóa ngoài ý muốn.

### 2.3 Cơ chế ghi file nguyên tử (Atomic Streaming Storage)
- Không ghi trực tiếp tên file do người dùng cung cấp. Khóa lưu trữ được sinh theo định dạng: `<UUID>.<extension>`.
- Kiểm tra Path Traversal: Chặn mọi nỗ lực khai thác đường dẫn (`../`, `..\`) qua phương thức `path(key)` với regex UUID chuẩn và kiểm tra `resolved.startsWith(directory)`.
- Ghi streaming thông qua tệp tạm `.tmp` trong cùng thư mục lưu trữ:
  ```java
  tempFile = Files.createTempFile(this.directory, "upload_", ".tmp");
  try (InputStream in = file.getInputStream();
       OutputStream out = Files.newOutputStream(tempFile, StandardOpenOption.WRITE)) {
      in.transferTo(out);
  }
  Files.move(tempFile, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
  ```
- Nếu có lỗi ghi dở dang, tệp tạm được xóa ngay lập tức trong khối `catch`/`finally`.

### 2.4 Dọn dẹp tệp mồ côi (Orphan File Cleanup)
- Tích hợp `TransactionSynchronizationManager.registerSynchronization` để xóa tệp đã ghi nếu transaction rollback.
- Bổ sung khối `catch (RuntimeException e)` dự phòng để xóa tệp nếu câu lệnh INSERT `document_versions` thất bại.

### 2.5 Chuẩn hóa mã lỗi Domain & Không lộ đường dẫn
- Thêm các mã lỗi mới trong `ErrorCode.java`:
  - `FILE_STORAGE_FAILED` (HTTP 500)
  - `CV_TEXT_EXTRACTION_FAILED` (HTTP 422)
  - `CV_STRUCTURING_FAILED` (HTTP 422)
  - `CV_PROCESSING_FAILED` (HTTP 500)
- `CVService.java` ghi log kỹ thuật nội bộ trên server và trả về cho client thông báo an toàn không chứa đường dẫn máy chủ.

### 2.6 Ánh xạ lỗi và hiển thị chính xác trên Frontend
Trong `CVUploadModal.tsx`, hàm `mapErrorMessage` trích xuất `err.responseBody.code` và hiển thị thông báo tương ứng từ từ điển ngôn ngữ (`vi.ts` / `en.ts`):
- `FILE_STORAGE_FAILED`: "Hệ thống không thể lưu trữ tệp CV lúc này. Vui lòng thử lại."
- `INVALID_FILE` / `INVALID_FILE_TYPE`: "Định dạng tệp không được hỗ trợ. Vui lòng tải lên PDF, DOCX, DOC hoặc ảnh PNG/JPG."
- `FILE_SIZE_EXCEEDED` / `FILE_TOO_LARGE`: "Dung lượng tệp vượt quá giới hạn tối đa 10MB."
- `CV_TEXT_EXTRACTION_FAILED`: "Không thể trích xuất nội dung văn bản từ tệp CV đã tải lên."
- Kèm mã yêu cầu truy vết an toàn: `(Mã yêu cầu: <requestId>)`.

---

## 3. Kết quả kiểm thử tự động

### 3.1 Backend Tests (`mvn test`)
- `FileStorageRobustnessTest`: 11/11 tests pass (0 failures, 0 errors, 0 skipped).
  - Tự động tạo thư mục lồng nhau.
  - Lưu PDF hợp lệ thành công và kiểm tra byte thật trên đĩa.
  - Lưu DOCX hợp lệ thành công.
  - Lưu ảnh PNG/JPG hợp lệ thành công.
  - Lưu DOC legacy binary hợp lệ thành công.
  - Chặn Path Traversal tuyệt đối.
  - Từ chối tệp rỗng (0 byte).
  - Từ chối tệp vượt quá 10MB.
  - Từ chối loại tệp không hỗ trợ hoặc sai chữ ký.
  - Khôi phục thư mục lưu trữ khi bị xóa lúc runtime.
  - Dọn dẹp tệp mồ côi khi cơ sở dữ liệu gặp lỗi.
- `UnifiedCandidateCvIngestionTest`: 6/6 tests pass.
- `CVOwnershipTest`: 4/4 tests pass.
- `StrictRoleSeparationSecurityTest`: 10/10 tests pass.
- **Tổng cộng**: 31/31 backend tests pass, exit code `0`.

### 3.2 Frontend Tests (`npx playwright test`)
- `cv-upload-error-mapping.spec.ts`: 4/4 tests pass (exit code `0`).
  1. `FILE_STORAGE_FAILED`: Hiển thị chính xác thông báo lỗi lưu trữ và mã yêu cầu.
  2. `INVALID_FILE_TYPE`: Hiển thị lỗi định dạng tệp không hợp lệ.
  3. `CV_TEXT_EXTRACTION_FAILED`: Hiển thị lỗi bóc tách nội dung văn bản.
  4. `Upload thành công`: Hoàn tất pipeline và đóng modal.
