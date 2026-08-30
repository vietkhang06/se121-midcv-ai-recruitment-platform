# 10. ĐẶC TẢ LỒNG QUY TRÌNH NGƯỜI DÙNG VÀ HỆ THỐNG (USER FLOWS)

Tài liệu này đặc tả quy trình thao tác từng bước bằng sơ đồ Mermaid cho Candidate Flow, HR Flow và AI Matching System Flow.

---

## 1. LUỒNG ỨNG VIÊN (CANDIDATE USER FLOW)

```mermaid
flowchart TD
    Start([Trang chủ / Landing Page]) --> Search[Tìm kiếm Việc làm theo Từ khóa/Địa điểm]
    Search --> JobCard[Xem Danh sách Job Cards]
    JobCard --> JobDetail[Xem Chi tiết JD Công việc]
    JobDetail --> CheckAuth{Đã đăng nhập?}
    
    CheckAuth -- Chưa --> LoginScreen[Chuyển hướng Đăng nhập / Đăng ký]
    LoginScreen --> JobDetail
    
    CheckAuth -- Đã đăng nhập --> ApplyBtn[Nhấn nút Ứng tuyển ngay]
    ApplyBtn --> SelectCV{Chọn Phương thức CV}
    
    SelectCV -- Upload CV Mới --> UploadModal[Tải lên File PDF/DOCX]
    UploadModal --> ParseCV[Hệ thống Parse & Extract CV]
    ParseCV --> SubmitApp
    
    SelectCV -- Dùng CV Đã có --> SubmitApp[Xác nhận Nộp đơn]
    
    SubmitApp --> CheckDup{Đã nộp trước đó?}
    CheckDup -- Rất tiếc, đã nộp --> ErrMsg[Hiển thị thông báo trùng đơn]
    CheckDup -- Chưa nộp --> CreateApp[Tạo bản ghi Application]
    
    CreateApp --> TriggerAI[Kích hoạt Luồng AI Matching]
    TriggerAI --> AppSuccess[Hiển thị Thông báo Nộp đơn Thành công]
    AppSuccess --> AppTracking[Theo dõi Trạng thái trong Lịch sử Ứng tuyển]
```

---

## 2. LUỒNG NHÀ TUYỂN DỤNG (HR / RECRUITER USER FLOW)

```mermaid
flowchart TD
    HRStart([HR Dashboard]) --> CreateJobBtn[Nhấn nút Tạo bài Tuyển dụng]
    CreateJobBtn --> JobForm[Màn hình Nhập JD Công việc]
    
    JobForm --> InputMode{Chọn chế độ nhập JD}
    InputMode -- Nhập thủ công --> FillForm[Điền Required/Preferred Skills, Experience, Salary]
    InputMode -- Dán JD thô --> AIParseJD[AI Trích xuất JD thành Dữ liệu cấu trúc]
    AIParseJD --> FillForm
    
    FillForm --> SaveDraft{Lưu Nháp hay Đăng ngay?}
    SaveDraft -- Lưu Nháp --> DraftSaved[Lưu Job với trạng thái DRAFT]
    SaveDraft -- Đăng ngay --> PublishJob[Đăng bài Tuyển dụng - State PUBLISHED]
    
    PublishJob --> EmbedJD[Tạo Vector Embedding cho JD trong Pgvector]
    EmbedJD --> DashboardJobs[Quản lý Bài đăng trên Dashboard]
    
    DashboardJobs --> ViewApps[Xem Danh sách Ứng viên nộp đơn cho Job]
    ViewApps --> RankingTab[Truy cập Tab Ranking & AI Matching]
    
    RankingTab --> ViewRankList[Xem Bảng xếp hạng Ứng viên theo Match Score %]
    ViewRankList --> FilterOptions[Lọc theo Match Score >= 70% hoặc theo Skill]
    
    FilterOptions --> SelectCand[Chọn 1 Ứng viên cụ thể]
    SelectCand --> CandDetail[Màn hình Chi tiết Ứng viên & CV]
    CandDetail --> AIInspect[Mở Modal / Tab AI Matching Explanation]
    AIInspect --> ReviewEvidence[Kiểm tra Kỹ năng trùng/thiếu & Minh chứng từ CV]
```

---

## 3. LUỒNG XỬ LÝ NỘI BỘ AI MATCHING ENGINE (SYSTEM AI FLOW)

```mermaid
sequenceDiagram
    autonumber
    actor Candidate
    actor HR
    participant API as API Gateway / Backend
    participant Worker as Background Task Worker
    participant Parser as Python Parsing Service
    participant LLM as LLM API (OpenAI/Anthropic)
    participant VectorDB as PostgreSQL + Pgvector
    
    Note over HR, VectorDB: Giai đoạn 1: Xử lý JD khi Đăng bài
    HR->>API: Publish Job (Text / Structured Form)
    API->>Parser: Extract JD Requirements
    Parser->>LLM: Prompt JSON Extraction (Skills, Exp, Edu)
    LLM-->>Parser: Return Structured JD JSON
    Parser->>API: Save Job Requirements
    API->>Parser: Generate JD Embedding Vector
    Parser->>LLM: Text Embedding Call
    LLM-->>Parser: Return Vector Array (1536 dim)
    Parser->>VectorDB: Save Vector to `jobs.embedding`
    
    Note over Candidate, VectorDB: Giai đoạn 2: Xử lý CV & Nộp đơn
    Candidate->>API: Submit Application (Upload CV)
    API->>VectorDB: Create `Application` Record (SUBMITTED)
    API->>Worker: Trigger Async Matching Task (JobId, ApplicationId)
    
    Worker->>Parser: Parse & Extract CV Text (PDF/DOCX)
    Parser->>LLM: Prompt JSON Extraction (Skills, Experience, Edu)
    LLM-->>Parser: Return Structured Candidate Profile
    Parser->>VectorDB: Save Candidate Skills & Experience
    
    Parser->>LLM: Text Embedding Call for CV Profile
    LLM-->>Parser: Return CV Vector Array (1536 dim)
    Parser->>VectorDB: Save Vector to `cvs.embedding`
    
    Note over Worker, VectorDB: Giai đoạn 3: Calculated Hybrid Match Score & Explanation
    Worker->>VectorDB: Compute Cosine Distance (JD Vector <-> CV Vector)
    VectorDB-->>Worker: Return Semantic Similarity Score
    Worker->>Worker: Calculate Structured Scores (Skill, Exp, Edu)
    Worker->>Worker: Compute Weighted Overall Match Score (0 - 100%)
    
    Worker->>LLM: Prompt Evidence Extraction (Grounding Evidence in CV)
    LLM-->>Worker: Return Matched Snippets & AI Summary
    Worker->>VectorDB: Save to `match_results`, `match_factors`, `evidences`
    
    Worker-->>HR: Push Notification / Ranking Ready on UI Dashboard
```
