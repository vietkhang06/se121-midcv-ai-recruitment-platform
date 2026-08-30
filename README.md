# AI Recruitment Platform — JD & CV Matching Engine (Multi-Industry Edition)

Nền tảng tuyển dụng thông minh trực tuyến hỗ trợ đối sánh tự động giữa Yêu cầu công việc (Job Description - JD) và Hồ sơ ứng viên (CV) bằng công nghệ **Vector Embedding** và **Large Language Model (LLM)** trên định hướng Đa ngành (Technology, Marketing, Design, Finance, Healthcare, v.v.).

---

## 🛠 TECH STACK & ARCHITECTURE HIGHLIGHTS

* **Frontend:** Next.js 14+ (React 19, TypeScript, App Router).
* **Backend Core:** Java 21 & Spring Boot 3 (Modular Monolith, Spring Security JWT, JPA Hibernate).
* **AI Processing Service:** Python 3.11 & FastAPI (PDF/DOCX Text Extraction, OpenAI Client API).
* **Database & Vector Engine:** PostgreSQL 16 + `pgvector` extension (HNSW Vector Indexing).
* **Core Product Capabilities:**
  * **First-Visit Onboarding & Auth Gate:** Phân luồng `[ Tôi đang tìm việc ]`, `[ Tôi đang tìm ứng viên ]`, `[ Skip ]` duyệt job công khai tự do.
  * **Two-Path CV Management:** Path A (Upload CV PDF/DOCX Parsing) & Path B (Platform CV Builder với Template gợi ý theo ngành & Export PDF).
  * **Immutable CV Application Snapshot:** Lưu vết nguyên phong bản CV tại thời điểm nộp đơn.
  * **Official 3-Tier Scoring Engine:** 
    * Core JD-CV Score ($S_{\text{core}}$ - 85% trọng số)
    * GitHub Supporting Signal ($S_{\text{github}}$ - 15% trọng số khi kích hoạt)
    * Available-Data Normalization Fallback Strategy ($S_{\text{overall}} = S_{\text{core}}$ khi thiếu GitHub, không phạt trừ điểm).

---

## 📁 CẤU TRÚC KHO MÃ NGUỒN (MONOREPO STRUCTURE)

```text
ai-recruitment-platform/
├── docs/                     # Bộ tài liệu Kiến trúc & Đặc tả Kỹ thuật
│   ├── phase-0/              # 26 Tài liệu đặc tả hệ thống Phase 0
│   ├── 08-architecture/      # 13 Tài liệu Kiến trúc Kỹ thuật Phase 1 Alignment
│   ├── adr/                  # 10 Báo cáo Quyết định Kiến trúc (ADRs 001-010)
│   └── bruno-api-collection/ # Bộ Test Suite API Bruno
│
├── docker-compose.yml        # Cấu hình Container PostgreSQL 16 + Pgvector local
├── .env.example              # Mẫu biến môi trường phát triển
└── README.md                 # Tài liệu hướng dẫn chính
```

---

## 📚 TÀI LIỆU THAM CHIẾU KIẾN TRÚC PHÁT TRIỂN

* **[Official Matching & Scoring Architecture](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/08-architecture/matching-scoring-architecture.md)**
* **[Secondary GitHub Assessment Architecture](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/08-architecture/github-assessment-architecture.md)**
* **[System Architecture](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/08-architecture/system-architecture.md)**
* **[Backend Architecture](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/08-architecture/backend-architecture.md)**
* **[Frontend Architecture](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/08-architecture/frontend-architecture.md)**
* **[AI Architecture](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/08-architecture/ai-architecture.md)**
* **[CV Builder & Snapshot Architecture](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/08-architecture/cv-builder-architecture.md)**
* **[Architecture Traceability Matrix](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/08-architecture/architecture-traceability.md)**
