# AI Recruitment Platform — JD & CV Matching Engine (Multi-Industry Edition)

Nền tảng tuyển dụng thông minh trực tuyến hỗ trợ đối sánh tự động giữa Yêu cầu công việc (Job Description - JD) và Hồ sơ ứng viên (CV) bằng công nghệ **Vector Embedding** và **Large Language Model (LLM)** trên định hướng Đa ngành (Technology, Marketing, Design, Finance, Healthcare, v.v.).

---

## 🛠 TECH STACK & ARCHITECTURE HIGHLIGHTS

* **Frontend:** Next.js 16 (16.3.3, React 19, TypeScript, App Router, Turbopack).
* **Backend Core:** Java 21 & Spring Boot 3 (Modular Monolith, Spring Security JWT, JPA Hibernate, Flyway Migrations).
* **AI Processing Service:** Python 3.11 & FastAPI (PDF/DOCX Text Extraction, OpenAI Client API).
* **Database & Vector Engine:** PostgreSQL 16 + `pgvector` extension (HNSW Vector Indexing).
* **Core Product Capabilities:**
  * **First-Visit Onboarding & Auth Gate:** Phân luồng `[ Tôi đang tìm việc ]`, `[ Tôi đang tìm ứng viên ]`, `[ Skip ]` duyệt job công khai tự do.
  * **Two-Path CV Management:** Path A (Upload CV PDF/DOCX Parsing) & Path B (Platform CV Builder với Template gợi ý theo ngành & Export PDF).
  * **Immutable CV Application Snapshot:** Lưu vết nguyên phong bản CV tại thời điểm nộp đơn.
  * **Database-Enforced Duplicate Application Protection:** Database unique constraint `CONSTRAINT uk_candidate_job UNIQUE(candidate_id, job_id)` & HTTP `409 CONFLICT` (`APPLICATION_ALREADY_EXISTS`).
  * **Official 3-Tier Scoring Engine:** 
    * Core JD-CV Score ($S_{\text{core}}$ - 85% trọng số)
    * GitHub Supporting Signal ($S_{\text{github}}$ - 15% trọng số khi kích hoạt)
    * Available-Data Normalization Fallback Strategy ($S_{\text{overall}} = S_{\text{core}}$ khi thiếu GitHub, không phạt trừ điểm).

---

## 📁 CẤU TRÚC KHO MÃ NGUỒN (MONOREPO STRUCTURE)

```text
ai-recruitment-platform/
├── backend/                  # Spring Boot 3 Backend Microservice
├── ai-worker/                # Python FastAPI Microservice
├── frontend/                 # Next.js 16 Frontend Web Application
├── docs/                     # Bộ tài liệu Kiến trúc & Đặc tả Kỹ thuật
│   ├── phase-0/              # 26 Tài liệu đặc tả hệ thống Phase 0
│   ├── 08-architecture/      # 13 Tài liệu Kiến trúc Kỹ thuật Phase 1 Alignment
│   ├── ui/                   # Tài liệu đặc tả Giao diện & Kiểm thử Phase 5
│   └── adr/                  # Báo cáo Quyết định Kiến trúc (ADRs)
├── docker-compose.yml        # Cấu hình Container PostgreSQL 16 + Pgvector local
└── README.md                 # Tài liệu hướng dẫn chính
```

---

## 📚 TÀI LIỆU THAM CHIẾU KIẾN TRÚC PHÁT TRIỂN

* **[Official Matching & Scoring Architecture](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/08-architecture/matching-scoring-architecture.md)**
* **[Secondary GitHub Assessment Architecture](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/08-architecture/github-assessment-architecture.md)**
* **[System Architecture](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/08-architecture/system-architecture.md)**
* **[Backend Architecture](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/08-architecture/backend-architecture.md)**
* **[Frontend Architecture](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/08-architecture/frontend-architecture.md)**
* **[PDF Export Verification Record](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/ui/pdf-export-verification.md)**
* **[Responsive UI Verification Record](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/ui/responsive-ui-verification.md)**
* **[Architecture Traceability Matrix](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/08-architecture/architecture-traceability.md)**
