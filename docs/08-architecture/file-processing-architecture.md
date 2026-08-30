# FILE PROCESSING ARCHITECTURE SPECIFICATION (REVISED)

Tài liệu này đặc tả Kiến trúc Xử lý Tập tin cho cả 2 con đường CV (Path A Upload & Path B CV Builder Export PDF), Bảo mật Lưu trữ Riêng tư và Vòng đời Trạng thái Xử lý Tác vụ Bất đồng bộ.

---

## 1. SONG ĐƯỜNG XỬ LÝ VÀ TẠO FILE CV (TWO-PATH FILE ARCHITECTURE)

```mermaid
flowchart TD
    subgraph Path A [Upload Existing File]
        UploadReq[Candidate Upload PDF/DOCX] --> Validate[Check MIME, Size <= 10MB, Magic Bytes]
        Validate --> StorePrivate[Save to Private Storage Bucket]
        StorePrivate --> AsyncParse[Trigger Python Worker Text Extraction]
    end
    
    subgraph Path B [Platform CV Builder]
        FormInput[Candidate Điền Structured Form] --> TemplateRecommend[Select Industry Template]
        TemplateRecommend --> RenderHTML[Render Dynamic HTML/CSS Layout]
        RenderHTML --> PDFExportEngine[Headless PDF Exporter Service]
        PDFExportEngine --> StorePrivate
    end
    
    AsyncParse & StorePrivate --> CanonicalProfile[Canonical Candidate Profile & CV Record]
```

---

## 2. VÒNG ĐỜI TRẠNG THÁI TÁC VỤ BẤT ĐỒNG BỘ (ASYNC TASK LIFECYCLE)

```mermaid
stateDiagram-v2
    [*] --> QUEUED: Task Submitted (Parse / Sync / Export)
    QUEUED --> PROCESSING: Worker Picks Up Task
    
    PROCESSING --> COMPLETED: Success (Parsed & Vectorized)
    PROCESSING --> FAILED: Error (Format Corrupted / API Limit)
    
    FAILED --> RETRYING: Exponential Backoff Retry (Max 3)
    RETRYING --> PROCESSING: Retry Execution
    RETRYING --> FAILED: Hard Failure (Max Retries Reached)
    COMPLETED --> [*]
```

---

## 3. BẢO MẬT STREAMING FILE CV VÀ ACCESSIBILITY

* **No Public URLs:** Tập tin CV tải lên hoặc export không cấp URL tĩnh công khai.
* **Authorized Streaming Controller:** Truy cập qua API `GET /api/v1/candidates/cv/{cvId}/download`. Backend xác thực Token và kiểm tra xem User có phải là chính chủ Candidate sở hữu CV hoặc HR của Job đã ứng tuyển. Thỏa mãn thì stream dưới dạng HTTP Response `application/pdf`.
