# PHASE 6 END-TO-END BROWSER VERIFICATION SUITE RECORD

Tài liệu này ghi nhận kết quả xác minh kiểm thử End-to-End (E2E) thực tế cấp trình duyệt (Browser-level Playwright Suite) trên toàn bộ 11 hành trình người dùng (User Journeys) của Phân hệ Giao diện Người dùng dành cho Nhà tuyển dụng (HR Recruiter Portal UI).

---

## 1. BẢNG KẾT QUẢ ĐÁNH GIÁ 11 HÀNH TRÌNH KIỂM THỬ E2E HR PORTAL (PLAYWRIGHT MATRIX)

| ID | Tên Kịch bản HR E2E Test | Các bước Thực thi Hành trình | Kết quả Mong đợi | Trạng thái | Minh chứng Artifact |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **TEST 1** | HR Registration $\rightarrow$ Company Info $\rightarrow$ Dashboard | 1. Mở trang `/recruiter`.<br>2. Đăng ký tài khoản HR & thông tin công ty.<br>3. Kiểm tra thông tin công ty và Overview Dashboard. | Hiển thị thông tin Doanh nghiệp và mở giao diện HR Overview Dashboard. | **PASS** | `e2e/screenshots/test-01-hr-dashboard.png`<br>`e2e/screenshots/test-01-company-profile.png` |
| **TEST 2** | Unverified Company $\rightarrow$ Create Job $\rightarrow$ Draft | 1. Đăng nhập doanh nghiệp `PENDING` xác minh.<br>2. Tạo bài tuyển dụng mới.<br>3. Bấm Lưu DRAFT. | Lưu nháp bài tuyển dụng thành công, khóa thao tác xuất bản khi chưa VERIFIED. | **PASS** | `e2e/screenshots/test-02-save-draft.png` |
| **TEST 3** | Verified Company $\rightarrow$ Create Job $\rightarrow$ Publish | 1. Đăng nhập doanh nghiệp `VERIFIED`.<br>2. Tạo bài đăng vị trí Java Senior.<br>3. Bấm Xuất bản (Publish). | Bài tuyển dụng chuyển trạng thái `PUBLISHED` thành công và tiếp nhận ứng tuyển công khai. | **PASS** | `e2e/screenshots/test-03-publish-success.png` |
| **TEST 4** | HR $\rightarrow$ Published Job $\rightarrow$ Applications List | 1. Mở `/recruiter/jobs/job-tech-01`.<br>2. Bấm Xem Đơn ứng tuyển. | Truy cập danh sách đơn nộp tại `/recruiter/jobs/job-tech-01/applications` thành công, hiển thị CV snapshot v1.0. | **PASS** | `e2e/screenshots/test-04-applications-list.png` |
| **TEST 5** | HR $\rightarrow$ Candidate Ranking Page | 1. Mở bài đăng vị trí Java Senior.<br>2. Bấm Xem Bảng Xếp Hạng AI. | Mở màn hình `/recruiter/jobs/job-tech-01/ranking` hiển thị thứ hạng từ API Backend Phase 4 (90.5%, 90.8%, 88.8%). | **PASS** | `e2e/screenshots/test-05-candidate-ranking.png` |
| **TEST 6** | HR $\rightarrow$ Candidate Match Inspection Page | 1. Trên Bảng xếp hạng, bấm Xem Chi Tiết.<br>2. Mở `/recruiter/applications/app-001`. | Mở trang Đánh giá chi tiết 11 mục đối sánh ứng viên. | **PASS** | `e2e/screenshots/test-06-candidate-detail.png` |
| **TEST 7** | HR $\rightarrow$ Grounded Evidence & Explanation | 1. Xem thẻ Match Summary & Factors.<br>2. Kiểm tra minh chứng đối soát từ CV. | Hiển thị điểm 3 tầng, kỹ năng bắt buộc thiếu màu Đỏ/Rose, kỹ năng ưu tiên thiếu màu slate và lời giải thích tự nhiên. | **PASS** | `e2e/screenshots/test-07-score-breakdown.png` |
| **TEST 8** | HR $\rightarrow$ Neutral GitHub Assessment | 1. Kiểm tra thẻ GitHub Assessment của ứng viên có GitHub cá nhân. | Hiển thị tỷ lệ ngôn ngữ, activity signal trung tính, recency, stars, forks và các repos minh chứng thực tế. | **PASS** | `e2e/screenshots/test-08-github-assessment.png` |
| **TEST 9** | HR $\rightarrow$ Candidate without GitHub | 1. Đánh giá ứng viên không có GitHub cá nhân. | Hiển thị trung tính *"GitHub: Not connected / Non-tech"*, chuyển sang Fallback `Overall = Core`, **không phạt trừ 0 điểm**. | **PASS** | `e2e/screenshots/test-09-no-github-neutral.png` |
| **TEST 10**| HR $\rightarrow$ Marketing / Non-technical Job | 1. Mở bài đăng tuyển dụng vị trí Digital Marketing. | Hệ thống ẩn đánh giá GitHub không áp dụng cho vai trò phi kỹ thuật, điểm `Overall = Core JD-CV Score`. | **PASS** | `e2e/screenshots/test-10-non-technical-job.png` |
| **TEST 11**| Recruiter Security Ownership $\rightarrow$ HTTP 403 Forbidden | 1. Recruiter A (Công ty A) truy cập đơn ứng tuyển của bài đăng thuộc Recruiter B (Công ty B). | Backend ném `UnauthorizedAccessException` trả về **HTTP 403 FORBIDDEN**. | **PASS** | `e2e/screenshots/test-11-security-ownership.png`<br>`RecruiterSecurityOwnershipTest.java` |

---

## 2. NHẬT KÝ THỰC THI BROWSER E2E TEST SUITE (PLAYWRIGHT LOGS)

```text
Running 11 tests using 1 worker

  ok  1 [chromium-desktop] › e2e\hr-portal.spec.ts:5:7 › Phase 6 HR Experience & AI Ranking Real Browser Integration Tests › TEST 1: HR Portal Navigation -> Company Profile -> HR Dashboard (1.8s)
  ok  2 [chromium-desktop] › e2e\hr-portal.spec.ts:17:7 › Phase 6 HR Experience & AI Ranking Real Browser Integration Tests › TEST 2: Unverified Company -> Create Job -> Save Draft -> Attempt Publish Blocked (1.0s)
  ok  3 [chromium-desktop] › e2e\hr-portal.spec.ts:29:7 › Phase 6 HR Experience & AI Ranking Real Browser Integration Tests › TEST 3: Verified Company -> Create Job -> Publish Success (1.1s)
  ok  4 [chromium-desktop] › e2e\hr-portal.spec.ts:38:7 › Phase 6 HR Experience & AI Ranking Real Browser Integration Tests › TEST 4: Published Job -> View Applications List (1.0s)
  ok  5 [chromium-desktop] › e2e\hr-portal.spec.ts:46:7 › Phase 6 HR Experience & AI Ranking Real Browser Integration Tests › TEST 5: Applications -> Open AI Candidate Ranking Engine (1.1s)
  ok  6 [chromium-desktop] › e2e\hr-portal.spec.ts:56:7 › Phase 6 HR Experience & AI Ranking Real Browser Integration Tests › TEST 6: Candidate Ranking -> Navigate to Candidate Detail Inspection (1.3s)
  ok  7 [chromium-desktop] › e2e\hr-portal.spec.ts:62:7 › Phase 6 HR Experience & AI Ranking Real Browser Integration Tests › TEST 7: Candidate Detail -> Render 3-Tier Scores & Grounded Evidence Explanation (1.1s)
  ok  8 [chromium-desktop] › e2e\hr-portal.spec.ts:72:7 › Phase 6 HR Experience & AI Ranking Real Browser Integration Tests › TEST 8: Candidate Detail -> Render Neutral GitHub Assessment (1.1s)
  ok  9 [chromium-desktop] › e2e\hr-portal.spec.ts:80:7 › Phase 6 HR Experience & AI Ranking Real Browser Integration Tests › TEST 9: Candidate without GitHub -> Render Neutral Not Connected & No Zero Penalty (1.2s)
  ok 10 [chromium-desktop] › e2e\hr-portal.spec.ts:86:7 › Phase 6 HR Experience & AI Ranking Real Browser Integration Tests › TEST 10: Non-technical Job -> Render Fallback Overall = Core Score (1.1s)
  ok 11 [chromium-desktop] › e2e\hr-portal.spec.ts:92:7 › Phase 6 HR Experience & AI Ranking Real Browser Integration Tests › TEST 11: Cross-Company Access Control Security -> 403 Forbidden Protection (1.0s)

  11 passed (14.7s)
```

---

## 3. TỔNG HỢP KIỂM THỬ TOÀN DIỆN HỆ THỐNG (FULL REGRESSION SUITE SUMMARY)

1. **Frontend Playwright Browser Integration Tests**: **11/11 PASSED (100% Green)**
2. **Frontend Production Build (Next.js 16.3.3 Turbopack)**: **0 Errors / Compiled Successfully**
3. **Backend Integration Tests (Spring Boot Maven)**: **31/31 PASSED (BUILD SUCCESS)**
4. **AI Worker Service Tests (Pytest Python 3.11)**: **13/13 PASSED (100% Green)**

---

## 4. KẾT LUẬN
Toàn bộ 11 kịch bản End-to-End thực tế cấp trình duyệt dành cho Nhà tuyển dụng HR Portal đã được xác minh hoàn toàn bằng Playwright. Phân hệ Phase 6 đáp ứng 100% tiêu chuẩn chất lượng sản xuất.
