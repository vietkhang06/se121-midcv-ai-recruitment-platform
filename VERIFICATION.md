# Báo Cáo Kiểm Chứng & Bằng Chứng Tự Động (Verification Report)

Dự án: **MidCV — Nền tảng tuyển dụng thông minh hỗ trợ đối sánh JD–CV**  
Thời điểm thực thi kiểm chứng: **25/09/2026**  
Môi trường thực thi: Windows 11 x64, OpenJDK 21, Python 3.11.9, Node.js 20, Next.js 16.3.3, Playwright 1.50, PostgreSQL 16 pgvector, Local Ollama (`dna5rm/granite4.2:3b-8k`, `bge-m3:latest`).

---

## 1. Tóm Tắt Kết Quả Kiểm Thử Toàn Diện

```
========================================================================================================
TẦNG CÔNG NGHỆ              LỆNH KIỂM CHỨNG                     TỔNG TEST    PASS    FAIL    TRẠNG THÁI
========================================================================================================
1. Backend (Spring Boot)    mvn test                             213         213      0      THÀNH CÔNG (100%)
2. AI Worker (FastAPI)      pytest -v                             82          82      0      THÀNH CÔNG (100%)
3. Frontend TypeScript      npm run build (Turbopack)             23 routes   23      0      THÀNH CÔNG (100%)
4. E2E Strict Role Suite    npx playwright test role-sep          14          14      0      THÀNH CÔNG (100%)
5. E2E Modal Positioning    npx playwright test logout-modal       4           4      0      THÀNH CÔNG (100%)
========================================================================================================
TỔNG CỘNG KIỂM THỬ TỰ ĐỘNG                                       313         313      0      PASS 100%
========================================================================================================
```

---

## 2. Bằng Chứng Thực Thi Chi Tiết

### 2.1. Backend Service (Spring Boot 3.3.2 / Maven)
* **Lệnh chạy:** `mvn test`
* **Mã thoát (Exit Code):** `0`
* **Thời gian thực thi:** 23.73s
* **Trích xuất Log kiểm chứng:**
  ```text
  [INFO] Results:
  [INFO] 
  [INFO] Tests run: 213, Failures: 0, Errors: 0, Skipped: 0
  [INFO] 
  [INFO] ------------------------------------------------------------------------
  [INFO] BUILD SUCCESS
  [INFO] ------------------------------------------------------------------------
  [INFO] Total time:  23.734 s
  [INFO] Finished at: 2026-09-25T17:07:35+07:00
  ```
* **Chi tiết bộ test bảo mật & kiểm soát quyền:**
  1. `SpringSecurityRbacAndMultiTenantIntegrationTest.java`:
     * Lệnh: `mvn test -Dtest=SpringSecurityRbacAndMultiTenantIntegrationTest`
     * Kết quả: `Tests run: 15, Failures: 0, Errors: 0, Skipped: 0`
     * Xác minh:
       * Kiểm thử trực tiếp qua HTTP filter chain thật (`MockMvc` + `JwtAuthenticationFilter` + `SecurityConfig`).
       * Role rỗng hoặc null trong database bị từ chối xác thực (HTTP 403), không fallback vào token.
       * User có trạng thái `isActive = false` trong database bị từ chối truy cập (HTTP 403).
       * HR Recruiter A không thể xem đơn ứng tuyển, bảng xếp hạng hay inspect ứng viên thuộc công ty của Recruiter B.
       * Ứng viên không thể tự ý xem đơn ứng tuyển của ứng viên khác.
  2. `AdminBootstrapRunnerTest.java`:
     * Lệnh: `mvn test -Dtest=AdminBootstrapRunnerTest`
     * Kết quả: `Tests run: 4, Failures: 0, Errors: 0, Skipped: 0`
     * Xác minh: Khởi tạo admin qua biến môi trường an toàn, không có credential nào bị hardcode.
  3. `StrictRoleSeparationSecurityTest.java`:
     * Lệnh: `mvn test -Dtest=StrictRoleSeparationSecurityTest`
     * Kết quả: `Tests run: 10, Failures: 0, Errors: 0, Skipped: 0`

### 2.2. AI Worker Service (Python 3.11 / Pytest)
* **Lệnh chạy:** `pytest -v`
* **Mã thoát (Exit Code):** `0`
* **Thời gian thực thi:** 179.82s (2 phút 59 giây với local inference thực tế)
* **Trích xuất Log kiểm chứng:**
  ```text
  ============================= test session starts =============================
  platform win32 -- Python 3.11.9, pytest-9.1.1, pluggy-1.6.0
  rootdir: C:\Users\Khang\OneDrive\Desktop\SE121\ai-recruitment-platform\ai-worker
  collected 82 items

  tests/test_academic_evaluation.py ...                                  [  4%]
  tests/test_api_endpoints.py ...                                       [  9%]
  tests/test_cv_information_extraction.py ...                           [ 21%]
  tests/test_cv_non_fabrication.py ...                                  [ 28%]
  tests/test_cv_parser.py ...                                            [ 30%]
  tests/test_document_extractor.py ...                                  [ 42%]
  tests/test_extraction_quality.py ...                                  [ 45%]
  tests/test_failure_resilience.py ...                                  [ 47%]
  tests/test_github_analyzer.py ...                                     [ 52%]
  tests/test_github_pipeline.py ...                                     [ 60%]
  tests/test_idempotency_lifecycle.py ...                               [ 63%]
  tests/test_jd_parser.py ...                                           [ 64%]
  tests/test_llm_client.py ...                                          [ 89%]
  tests/test_normalizer.py ...                                          [ 91%]
  tests/test_prompt_injection.py ...                                    [ 92%]
  tests/test_reality_manipulation.py ...                                [100%]

  ======================= 82 passed in 179.82s (0:02:59) ========================
  ```

### 2.3. Frontend Application Build (Next.js 16.3.3 Turbopack)
* **Lệnh chạy:** `npm run build`
* **Mã thoát (Exit Code):** `0`
* **Thời gian thực thi:** 6.7s compile + 3.5s typecheck
* **Kết quả:** Biên dịch thành công 23 routes tĩnh và động, 0 lỗi TypeScript, 0 lỗi cú pháp.

### 2.4. Playwright End-to-End Test Suite
* **Lệnh 1:** `npx playwright test e2e/strict-role-separation.spec.ts`
  * Kết quả: `14 passed (18.1s)`
  * Nội dung: Kiểm tra phân lập hoàn toàn giao diện giữa Admin, HR Recruiter và Candidate; kiểm tra RoleGuard chặn 403 khi đổi URL thủ công.
* **Lệnh 2:** `npx playwright test e2e/logout-modal-positioning.spec.ts`
  * Kết quả: `4 passed (5.4s)`
  * Nội dung: Kiểm tra vị trí hiển thị modal đăng xuất luôn nằm chính giữa màn hình ở 4 độ phân giải: Desktop (1280x800), Scrolled (cuộn 500px), Tablet (768x1024), Mobile (375x667).

---

## 3. Phân Định Minh Bạch Mock và Real Provider

1. **Production Runtime**:
   * Không sử dụng bất kỳ mock data nào.
   * `llm_client.py` có cơ chế bảo vệ cấm gọi mock (`raise LLMAPIError("Mock provider is prohibited in production runtime")`).
   * Database: Kết nối PostgreSQL thật với Flyway migration V1 -> V9.
   * Vector search: Sử dụng extension `pgvector` thật với toán tử cosine (`<=>`) và chỉ mục HNSW.
2. **Test Fixtures (Phục vụ Unit Test)**:
   * `mock_github.py` và `test_cv_parser.py`: Chỉ dùng làm chuỗi đầu vào cố định trong một số unit test để đo lường tính bất biến (determinism) của thuật toán chuẩn hóa.
