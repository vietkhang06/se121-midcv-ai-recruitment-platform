# CV BUILDER & VERSIONING ARCHITECTURE SPECIFICATION

Tài liệu này đặc tả Kiến trúc CV Builder đa ngành, Quy trình Song đường CV (Two-Path CV), Thư viện Multi-CV Library, Quy trình Nộp đơn nhanh (Quick Apply) và Cơ chế Snapshot CV đơn ứng tuyển không thể thay đổi (`ApplicationCVSnapshot`).

---

## 1. KIẾN TRÚC SONG ĐƯỜNG CV (TWO-PATH CV ARCHITECTURE)

```mermaid
flowchart TD
    Candidate([Candidate Access CV Section]) --> Choice{Chọn phương thức tạo CV}
    
    Choice -- PATH A: Upload Existing CV --> FileUpload[Upload PDF / DOCX File]
    FileUpload --> PyParse[Python Parsing Worker Text Extraction]
    PyParse --> EntityExtract[LLM Skill & Experience Extraction]
    EntityExtract --> SavePathA[Lưu vào Candidate CV Library - Path: UPLOAD]
    
    Choice -- PATH B: Build CV on Platform --> SelectIndustry[Chọn Target Industry & Job Role]
    SelectIndustry --> RecTemplate[Gợi ý Template & Form cấu trúc Đa ngành]
    RecTemplate --> FormFill[Candidate Nhập thông tin & Live Preview UI]
    FormFill --> SavePathB[Lưu vào Candidate CV Library - Path: BUILDER]
    SavePathB --> ExportPDF[Export PDF Client/Server Headless Engine]
    
    SavePathA & SavePathB --> MultiLibrary[(Candidate Multi-CV Library)]
```

---

## 2. QUY TRÌNH NỘP ĐƠN NHANH (QUICK APPLY WORKFLOW)

Candidate không cần phải tải lại file CV cho mỗi lần ứng tuyển:

```mermaid
sequenceDiagram
    autonumber
    actor Candidate
    participant UI as Client UI (Next.js)
    participant API as Application Backend Service
    participant DB as PostgreSQL Database

    Candidate->>UI: Xem Job X và bấm "Ứng tuyển nhanh (Quick Apply)"
    UI->>API: GET /api/v1/candidates/cvs (Fetch Saved CVs)
    API->>DB: Query `cvs` WHERE candidate_id = :id
    DB-->>UI: Return List of Saved CVs
    
    Candidate->>UI: Chọn CV 01 ("Backend Developer CV") & Review prefilled info
    Candidate->>UI: Confirm Submit Application
    
    UI->>API: POST /api/v1/jobs/{jobId}/applications { cvId: "cv-01-uuid" }
    API->>DB: Fetch Full CV Data & Structured JSON of CV 01
    API->>DB: Insert `applications` (Status: SUBMITTED)
    API->>DB: Insert `application_cv_snapshots` (Immutable CV Snapshot)
    API-->>UI: Return HTTP 201 Created (Application Submitted Successfully)
```

---

## 3. CƠ CHẾ NGUYÊN PHONG CỦA CV SNAPSHOT (`ApplicationCVSnapshot`)

```mermaid
gantt
    title Mối quan hệ Thời gian giữa CV Library và Application CV Snapshot
    dateFormat  YYYY-MM-DD
    section Candidate CV 01
    Tạo CV 01 v1.0               :active, cv1, 2026-08-01, 2026-08-15
    Sửa CV 01 v2.0 (Thêm AWS)    :active, cv2, 2026-08-16, 2026-08-30
    section Application #101
    Nộp đơn Job X (Dùng CV 01 v1.0) :crit, app1, 2026-08-10, 1d
    Snapshot #101 vẫn giữ CV 01 v1.0 :done, snap1, 2026-08-10, 2026-08-30
```

### NGUYÊN TẮC BẮT BUỘC (IMMUTABLE SNAPSHOT RULE):
1. Khi Candidate nộp đơn ứng tuyển cho một Job tại thời điểm $T_0$, Backend tự động sao chép toàn bộ dữ liệu văn bản thô và JSON cấu trúc của CV được chọn vào bảng `application_cv_snapshots`.
2. Nếu sau đó tại thời điểm $T_1$, Candidate cập nhật, bổ sung kỹ năng hoặc sửa đổi nội dung CV trong thư viện cá nhân, **bản sao snapshot trong `application_cv_snapshots` KHÔNG BỊ THAY ĐỔI**.
3. Báo cáo AI Matching và màn hình HR xem lại hồ sơ ứng tuyển của đơn ứng tuyển đó sẽ **luôn luôn dựa trên bản snapshot tại thời điểm nộp đơn**.
