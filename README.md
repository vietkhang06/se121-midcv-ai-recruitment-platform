MidCV — AI Recruitment Platform
> 🇻🇳 **Nền tảng tuyển dụng thông minh MidCV** hỗ trợ đối sánh JD và hồ sơ ứng viên bằng **Vector Embedding (Pgvector)** và **LLM Document Parsing**, hỗ trợ cả **Ollama local** và **OpenAI**.
>
> 🇬🇧 **MidCV** is an intelligent recruitment platform that supports Job Description (JD) and candidate CV matching using **Vector Embedding (Pgvector)** and **LLM Document Parsing**, with support for both **local Ollama** and **OpenAI**.
---
1. Project Overview / Tổng quan dự án
🇬🇧 English
MidCV automates the recruitment pipeline by extracting structured requirements from Job Descriptions (JDs), parsing candidate Resumes/CVs into canonical profiles, generating vector embeddings, computing 3-tier match scores, and ranking applicants with transparent quote-based evidence and developer GitHub profile activity analysis.
🇻🇳 Tiếng Việt
MidCV tự động hóa quy trình tuyển dụng bằng cách trích xuất các yêu cầu có cấu trúc từ Job Description (JD), phân tích Resume/CV của ứng viên thành hồ sơ chuẩn hóa, tạo vector embedding, tính toán điểm đối sánh theo 3 tầng và xếp hạng ứng viên dựa trên bằng chứng trích dẫn minh bạch cùng phân tích hoạt động hồ sơ GitHub của ứng viên.
---
2. Problem Statement / Bài toán
🇬🇧 English
Traditional ATS platforms rely on naive keyword matching, leading to high false-positive rates, high screening latency for HR teams, unstandardized skill names (e.g., `SpringBoot` vs `Spring Boot`), and lack of objective evidence traceability. This platform solves semantic ambiguity using vector search, enforces mandatory required skill gating, and provides line-by-line evidence justification.
🇻🇳 Tiếng Việt
Các nền tảng ATS truyền thống thường phụ thuộc vào phương pháp đối sánh từ khóa đơn giản, dẫn đến tỷ lệ false positive cao, thời gian sàng lọc lớn đối với bộ phận HR, tên kỹ năng không được chuẩn hóa (ví dụ: `SpringBoot` và `Spring Boot`) và thiếu khả năng truy xuất bằng chứng một cách khách quan. MidCV giải quyết vấn đề mơ hồ về ngữ nghĩa bằng vector search, áp dụng cơ chế bắt buộc đối với các kỹ năng required và cung cấp bằng chứng giải thích theo từng dòng.
---
3. Main Features / Chức năng chính
Candidate Journey / Luồng ứng viên
🇬🇧 English
First-visit onboarding
Public job discovery
Interactive multi-industry CV builder (Technology, Marketing, Finance, Design)
PDF export
CV library
JD-aware quick application
🇻🇳 Tiếng Việt
Onboarding khi người dùng truy cập lần đầu
Tìm kiếm và khám phá các công việc công khai
CV Builder tương tác hỗ trợ nhiều nhóm ngành (Technology, Marketing, Finance, Design)
Xuất CV PDF
Quản lý thư viện CV
Quick Apply dựa trên JD
HR Recruiter Journey / Luồng nhà tuyển dụng
🇬🇧 English
Company registration & verification
Job posting management
AI candidate ranking engine
3-tier score breakdown
Line-by-line quote evidence inspection
Neutral GitHub assessment
🇻🇳 Tiếng Việt
Đăng ký và xác minh doanh nghiệp
Quản lý tin tuyển dụng
Hệ thống AI xếp hạng ứng viên
Phân rã điểm đối sánh theo 3 tầng
Kiểm tra bằng chứng trích dẫn theo từng dòng
Đánh giá GitHub theo hướng trung lập
AI Core Processing / Xử lý AI cốt lõi
🇬🇧 English
LLM JD requirement extraction
LLM CV profile parsing
Skill normalization
1536-dim vector embedding generation (Pgvector)
3-tier matching engine
Candidate ranking
GitHub repository activity analysis
🇻🇳 Tiếng Việt
Trích xuất yêu cầu JD bằng LLM
Phân tích hồ sơ CV bằng LLM
Chuẩn hóa kỹ năng
Sinh vector embedding 1536 chiều bằng Pgvector
Hệ thống matching 3 tầng
Xếp hạng ứng viên
Phân tích hoạt động repository trên GitHub
---
4. Architecture / Kiến trúc
```text
┌─────────────────────────────────────────────────────────────────┐
│              Next.js 16 (App Router + TailwindCSS)             │
└────────────────────────────────┬────────────────────────────────┘
                                 │ REST API / JWT
┌────────────────────────────────▼────────────────────────────────┐
│          Java 21 Spring Boot Backend Service (Port 8080)       │
└───────────────┬─────────────────────────────────┬───────────────┘
                │ HTTP API                        │ JPA / Pgvector
┌───────────────▼───────────────┐ ┌──────────────▼──────────────┐
│ Python 3.11 AI Worker Service │ │ PostgreSQL 16 + Pgvector DB │
│ (FastAPI, Port 8000)          │ │ (Port 5432)                 │
└───────────────────────────────┘ └──────────────────────────────┘
```
Architecture Description / Mô tả kiến trúc
🇬🇧 English
Frontend communicates with the Spring Boot backend through REST APIs and JWT authentication.
Backend handles business logic, authentication, authorization, persistence, and Pgvector-related operations.
AI Worker provides document parsing and AI processing capabilities.
PostgreSQL + Pgvector stores application data and vector embeddings.
🇻🇳 Tiếng Việt
Frontend giao tiếp với Spring Boot Backend thông qua REST API và JWT authentication.
Backend xử lý business logic, xác thực, phân quyền, persistence và các thao tác liên quan đến Pgvector.
AI Worker cung cấp khả năng parsing tài liệu và xử lý AI.
PostgreSQL + Pgvector lưu trữ dữ liệu hệ thống và vector embedding.
---
5. Technology Stack / Công nghệ sử dụng
Layer / Thành phần	Technology / Công nghệ
Frontend	Next.js 16.3.3, React 19, TypeScript, TailwindCSS, Lucide React, Playwright E2E
Backend	Java 21, Spring Boot 3.3.3, Spring Security JWT, Flyway Migration 10, Maven
AI Worker	Python 3.11, FastAPI, Pydantic v2, PyPDF, Docx, Pytest
Database	PostgreSQL 16 + `pgvector`
🇻🇳 Ghi chú: Database sử dụng `pgvector` cho vector search với embedding 1536 chiều.
---
6. Repository Structure / Cấu trúc Repository
```text
ai-recruitment-platform/

├── start-dev.bat        # One-Click Local Development Launcher
├── stop-dev.bat         # One-Click Stop Local Services
├── status-dev.bat       # One-Click Status Check
├── reset-db-dev.bat     # One-Click Safe Database Reset (Requires Y/N)
├── scripts/             # PowerShell Dev Scripts
├── backend/             # Java 21 Spring Boot Backend API
├── frontend/            # Next.js 16 App Router Frontend & Playwright E2E
├── ai-worker/           # Python 3.11 FastAPI AI Worker Engine
├── docs/                # Technical Documentation & Evaluation Reports
│   ├── evaluation/      # Evaluation Reports
│   └── final/           # Final Project Materials
├── docker-compose.yml   # PostgreSQL + Pgvector Docker Configuration
├── .env.example         # Environment Variables Template
└── README.md            # Master Documentation
```
🇻🇳 Tiếng Việt
Repository được tổ chức theo mô hình monorepo, tách riêng Frontend, Backend, AI Worker, tài liệu, scripts và hạ tầng Docker để thuận tiện phát triển và quản lý đồ án.
---
7. Docker Setup / Thiết lập Docker
```bash
docker compose up -d
docker compose ps
```
🇬🇧 English: Starts the PostgreSQL + Pgvector infrastructure.
🇻🇳 Tiếng Việt: Khởi động hạ tầng PostgreSQL + Pgvector cho môi trường phát triển local.
---
8. Backend Setup / Cài đặt Backend
```bash
cd backend
mvn clean install
mvn spring-boot:run
```
🇬🇧 English: Builds and starts the Spring Boot backend service on port `8080`.
🇻🇳 Tiếng Việt: Build và khởi động Spring Boot Backend tại port `8080`.
---
9. Frontend Setup / Cài đặt Frontend
```bash
cd frontend
npm install
npm run dev
```
🇬🇧 English: Starts the Next.js development server.
🇻🇳 Tiếng Việt: Khởi động Next.js development server.
---
10. AI Worker Setup / Cài đặt AI Worker
```bash
cd ai-worker
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000 --reload
```
🇬🇧 English: Creates a Python virtual environment and starts the FastAPI AI Worker on port `8000`.
🇻🇳 Tiếng Việt: Tạo môi trường Python ảo và khởi động FastAPI AI Worker tại port `8000`.
---
11. Database Setup / Thiết lập cơ sở dữ liệu
🇬🇧 English
Database migrations run automatically via Flyway on backend startup.
To safely reset the local database:
```bash
docker compose down -v
docker compose up -d
```
or use `reset-db-dev.bat`.
🇻🇳 Tiếng Việt
Các migration của database được chạy tự động thông qua Flyway khi Backend khởi động.
Để reset database local:
```bash
docker compose down -v
docker compose up -d
```
hoặc sử dụng `reset-db-dev.bat`.
---
12. Testing / Kiểm thử
Backend Tests / Kiểm thử Backend
```bash
cd backend
mvn test
```
Reported result / Kết quả được ghi nhận trong tài liệu: `39 / 39 Passed`
AI Worker Tests / Kiểm thử AI Worker
```bash
cd ai-worker
pytest
```
Reported result / Kết quả được ghi nhận trong tài liệu: `17 / 17 Passed`
Frontend Production Build / Build production Frontend
```bash
cd frontend
npm run build
```
Reported result / Kết quả được ghi nhận trong tài liệu: `Compiled 0 Errors`
---
13. E2E Testing / Kiểm thử E2E
```bash
cd frontend
npx playwright test
```
Reported result / Kết quả được ghi nhận trong tài liệu: `11 / 11 Browser Integration Tests Passed`
---
14. AI Evaluation / Đánh giá AI
🇬🇧 English
Empirical benchmark results are documented in `docs/evaluation/`.
Metric	Result
JD Extraction F1-Score	95.1%
CV Extraction F1-Score	94.5%
Skill Normalization Accuracy	98.2%
Precision@1	1.0 (100%)
Precision@3	1.0 (100%)
NDCG@5	0.962
🇻🇳 Tiếng Việt
Các kết quả benchmark thực nghiệm được lưu tại `docs/evaluation/`.
Chỉ số	Kết quả
F1-Score trích xuất JD	95.1%
F1-Score trích xuất CV	94.5%
Độ chính xác chuẩn hóa kỹ năng	98.2%
Precision@1	1.0 (100%)
Precision@3	1.0 (100%)
NDCG@5	0.962
---
15. Matching & Ranking / Đối sánh và xếp hạng
🇬🇧 English
The 3-tier matching engine calculates:
$$S_{\text{core}} = 0.40 \cdot S_{\text{skill}} + 0.30 \cdot S_{\text{exp}} + 0.15 \cdot S_{\text{edu}} + 0.15 \cdot S_{\text{proj}}$$
$$S_{\text{overall}} = 0.85 \cdot S_{\text{core}} + 0.15 \cdot S_{\text{github}}$$
Candidates missing mandatory required skills are gated and penalised regardless of bonus preferred skills.
🇻🇳 Tiếng Việt
Hệ thống đối sánh 3 tầng tính toán:
$$S_{\text{core}} = 0.40 \cdot S_{\text{skill}} + 0.30 \cdot S_{\text{exp}} + 0.15 \cdot S_{\text{edu}} + 0.15 \cdot S_{\text{proj}}$$
$$S_{\text{overall}} = 0.85 \cdot S_{\text{core}} + 0.15 \cdot S_{\text{github}}$$
Ứng viên thiếu các kỹ năng required bắt buộc sẽ không được bù đắp bằng điểm thưởng từ các kỹ năng preferred.
---
16. GitHub Analysis / Phân tích GitHub
🇬🇧 English
GitHub assessment evaluates developer repositories based on:
Language Distribution — 40%
Tech Evidence — 35%
Activity Signal — 15%
Recency — 10%
For non-technical positions (Marketing, Finance, Design) or missing profiles, the system falls back to:
$$S_{\text{overall}} = S_{\text{core}}$$
without applying a zero GitHub penalty.
🇻🇳 Tiếng Việt
Hệ thống đánh giá GitHub của ứng viên dựa trên:
Phân bố ngôn ngữ — 40%
Bằng chứng công nghệ — 35%
Tín hiệu hoạt động — 15%
Tính cập nhật — 10%
Đối với các vị trí không mang tính kỹ thuật (Marketing, Finance, Design) hoặc khi ứng viên không có hồ sơ GitHub khả dụng, hệ thống sử dụng:
$$S_{\text{overall}} = S_{\text{core}}$$
và không áp dụng mức phạt bằng 0 cho GitHub.
---
17. Security / Bảo mật
🇬🇧 English
Multi-tenant recruiter ownership enforced (`UnauthorizedAccessException` → HTTP 403).
Unvalidated file uploads blocked (MIME validation, file size < 10MB, path traversal protection).
Candidate CV files protected in private directories.
Zero committed API keys or secrets in Git.
🇻🇳 Tiếng Việt
Kiểm soát quyền sở hữu recruiter theo mô hình multi-tenant (`UnauthorizedAccessException` → HTTP 403).
Chặn file upload không hợp lệ (kiểm tra MIME, dung lượng < 10MB, chống path traversal).
File CV của ứng viên được bảo vệ trong thư mục private.
Không commit API key hoặc secret trực tiếp vào Git.
---
18. Known Limitations / Hạn chế hiện tại
🇬🇧 English
GitHub activity analysis is restricted to public repositories.
Local development environment benchmark tested on 10-candidate datasets.
Production-scale deployment with 100,000+ candidates may require distributed vector indexing and further Pgvector optimization.
🇻🇳 Tiếng Việt
Phân tích hoạt động GitHub chỉ áp dụng cho các repository public.
Benchmark trong môi trường local được kiểm thử trên bộ dữ liệu 10 ứng viên.
Khi triển khai ở quy mô trên 100.000 ứng viên, hệ thống có thể cần distributed vector indexing và tối ưu Pgvector chuyên sâu hơn.
---
19. Demo Instructions / Hướng dẫn Demo
🇬🇧 English
Follow the step-by-step storyline in:
`docs/final/demo-scenario.md`
`docs/final/local-development.md`
For deterministic offline demonstration or test-only scenarios, a dedicated mock mode may be enabled according to the project's demo configuration.
🇻🇳 Tiếng Việt
Thực hiện demo theo kịch bản chi tiết tại:
`docs/final/demo-scenario.md`
`docs/final/local-development.md`
Đối với demo offline hoặc các kịch bản kiểm thử cần tính xác định, có thể sử dụng mock mode theo cấu hình dành riêng cho demo/test của project.
---
20. Contributors / Thành viên đóng góp
🇬🇧 English
This project is developed by:
Name	Role
Đoàn Việt Khang	Student / Project Contributor
Phạm Ngọc Gia Khang	Student / Project Contributor
🇻🇳 Tiếng Việt
Dự án được thực hiện bởi:
Họ và tên	Vai trò
Đoàn Việt Khang	Sinh viên / Thành viên thực hiện đồ án
Phạm Ngọc Gia Khang	Sinh viên / Thành viên thực hiện đồ án