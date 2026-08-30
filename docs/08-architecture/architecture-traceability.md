# ARCHITECTURE TRACEABILITY MATRIX (PHASE 3 AI WORKER BASELINE)

Tài liệu này đặc tả Ma trận Truy xuất Kỹ thuật (Architecture Traceability Matrix) liên kết khép kín 100% giữa Requirement $\rightarrow$ Use Case $\rightarrow$ Domain Entity $\rightarrow$ Architecture Component $\rightarrow$ Database Table $\rightarrow$ REST API $\rightarrow$ UI Screen $\rightarrow$ Automated Test Case ID.

---

## MA TRẬN TRUY XUẤT CÁC TÍNH NĂNG AI PARSING & EXTRACTION ENGINE (PHASE 3 BASELINE TRACEABILITY)

| Req ID | Business Requirement | Use Case | Domain Entity | Architecture Component | DB Table | REST API Endpoint | UI Screen ID | Automated Test ID |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `REQ-AI-JD-01` | Trích xuất JD phân tách REQUIRED vs PREFERRED | `UC-AI-01` | `JobRequirement`, `Evidence` | Python JDParser, LLMClient | `job_requirements`, `evidences` | `POST /internal/ai/extract-jd` | System Engine | `test_jd_parser.test_parse_job_description_required_vs_preferred` |
| `REQ-AI-CV-01` | Đọc CV PDF/DOCX, nhận diện 7+ phân đoạn & versioning | `UC-AI-02` | `CVVersion`, `CVSection`, `Evidence` | Python CVParser, LLMClient | `cv_versions`, `cv_sections`, `evidences` | `POST /internal/ai/extract-cv` | System Engine | `test_cv_parser.test_parse_cv_document_text` |
| `REQ-AI-GH-01` | Phân tích GitHub Language Distribution & Activity Signal | `UC-AI-03` | `GitHubProfile`, `GitHubRepositoryLanguage`, `GitHubAssessment` | Python GitHubAnalyzer, GitHubClient | `github_profiles`, `github_repository_languages`, `github_assessments` | `POST /internal/ai/analyze-github` | `15 AI Inspector (Tab 2)` | `test_github_analyzer.test_analyze_candidate_github_language_distribution_and_activity` |
| `REQ-AI-SEC-01`| Phòng chống Prompt Injection cô lập Untrusted Data | `UC-AI-04` | System Security Boundary | LLMClient Abstraction | System Security | Internal API | System Security | `test_prompt_injection.test_prompt_injection_defense_isolates_untrusted_input` |
| `REQ-AI-EVAL-01`| Đo lường Benchmark Dataset trích xuất AI 100% PASS | `UC-AI-05` | Evaluation Benchmark Dataset | Benchmark EvalRunner | Benchmark Data | CLI Runner | System Benchmark | `app/evaluation/eval_runner.py` |
| `REQ-AI-INT-01` | Orchestration Vòng đời Xử lý từ Spring Boot Backend | `UC-AI-06` | `ProcessingStatus` | ProcessingLifecycleService, AiWorkerClient | `jobs`, `cvs`, `github_profiles` | `POST /api/v1/processing/jobs/{id}` | System Engine | `AiWorkerClientTest` |
