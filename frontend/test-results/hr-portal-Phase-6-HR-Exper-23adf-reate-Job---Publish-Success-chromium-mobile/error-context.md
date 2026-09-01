# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: hr-portal.spec.ts >> Phase 6 HR Experience & AI Ranking Real Browser Integration Tests >> TEST 3: Verified Company -> Create Job -> Publish Success
- Location: e2e\hr-portal.spec.ts:29:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('#publish-job-btn')
    - locator resolved to <button type="button" id="publish-job-btn" class="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer transition">…</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <button class="group relative flex flex-col items-center justify-center p-5 rounded-xl border border-indigo-500/40 bg-indigo-950/30 hover:bg-indigo-900/50 hover:border-indigo-400 transition text-left">…</button> from <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">…</div> subtree intercepts pointer events
  - retrying click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">…</div> intercepts pointer events
  - retrying click action
    - waiting 20ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <button class="group relative flex flex-col items-center justify-center p-5 rounded-xl border border-indigo-500/40 bg-indigo-950/30 hover:bg-indigo-900/50 hover:border-indigo-400 transition text-left">…</button> from <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">…</div> subtree intercepts pointer events
  2 × retrying click action
      - waiting 100ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">…</div> intercepts pointer events
  28 × retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">…</div> intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <button class="group relative flex flex-col items-center justify-center p-5 rounded-xl border border-indigo-500/40 bg-indigo-950/30 hover:bg-indigo-900/50 hover:border-indigo-400 transition text-left">…</button> from <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">…</div> intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">…</div> intercepts pointer events
  - retrying click action
    - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - link "AI RecruitmentPlatform" [ref=e4] [cursor=pointer]:
        - /url: /
      - button "Đăng xuất" [ref=e12]
  - main [ref=e17]:
    - generic [ref=e18]:
      - generic [ref=e20]:
        - link "AI Recruitment HR Portal" [ref=e22] [cursor=pointer]:
          - /url: /recruiter
        - link "Tạo Bài tuyển dụng" [ref=e30] [cursor=pointer]:
          - /url: /recruiter/jobs/new
      - main [ref=e34]:
        - generic [ref=e35]:
          - link "Quay lại Quản lý bài đăng" [ref=e36] [cursor=pointer]:
            - /url: /recruiter/jobs
          - heading "Tạo Bài Tuyển Dụng Mới (Job Description Engine)" [level=1] [ref=e40]
          - paragraph [ref=e41]: Thiết lập thông tin vị trí, kỹ năng bắt buộc/ưu tiên và câu hỏi tuyển dụng
        - generic [ref=e42]:
          - generic [ref=e47]:
            - generic [ref=e48]: Doanh nghiệp đã được Xác minh (Verified Company)
            - generic [ref=e49]: FPT Software Corporation có đầy đủ quyền hạn lưu bản nháp và Xuất bản (Publish) bài tuyển dụng.
          - generic [ref=e50]: ✓ Ready to Publish
        - generic [ref=e51]:
          - heading "1. Thông tin Chung Vị trí Tuyển dụng" [level=3] [ref=e52]
          - generic [ref=e53]:
            - generic [ref=e54]:
              - generic [ref=e55]: Tiêu đề bài đăng
              - textbox [ref=e56]: Senior Java & AI Engineer
            - generic [ref=e57]:
              - generic [ref=e58]: Ngành nghề (Industry)
              - combobox [ref=e59]:
                - option "Technology" [selected]
                - option "Marketing"
                - option "Design"
                - option "Finance"
                - option "HR"
            - generic [ref=e60]:
              - generic [ref=e61]: Hình thức làm việc
              - combobox [ref=e62]:
                - option "Toàn thời gian (Full-time)" [selected]
                - option "Bán thời gian (Part-time)"
                - option "Remote 100%"
                - option "Hybrid Linh hoạt"
            - generic [ref=e63]:
              - generic [ref=e64]: Cấp bậc (Seniority)
              - textbox [ref=e65]: Senior
            - generic [ref=e66]:
              - generic [ref=e67]: Địa điểm làm việc
              - textbox [ref=e68]: Hồ Chí Minh
            - generic [ref=e69]:
              - generic [ref=e70]: Mức lương tối thiểu ($/tháng)
              - spinbutton [ref=e71]: "2000"
            - generic [ref=e72]:
              - generic [ref=e73]: Mức lương tối đa ($/tháng)
              - spinbutton [ref=e74]: "3500"
          - generic [ref=e75]:
            - heading "2. Mô tả & Trách nhiệm Công việc" [level=3] [ref=e76]
            - generic [ref=e77]:
              - generic [ref=e78]: Mô tả công việc chung (JD Description)
              - textbox [ref=e79]: Tuyển dụng Kỹ sư Lập trình Java Senior thiết kế hệ thống backend quy mô lớn.
            - generic [ref=e80]:
              - generic [ref=e81]: Trách nhiệm chính (Mỗi dòng 1 ý)
              - textbox [ref=e82]: Phát triển các mô đun Spring Boot Microservices. Tối ưu hóa truy vấn PostgreSQL.
          - generic [ref=e83]:
            - heading "3. Phân tách Kỹ năng Bắt buộc vs Ưu tiên" [level=3] [ref=e84]
            - generic [ref=e85]:
              - generic [ref=e86]: Kỹ năng Bắt buộc (Required Skills - Phân cách bằng dấu phẩy)
              - textbox [ref=e87]: Java, Spring Boot, PostgreSQL, Docker
            - generic [ref=e88]:
              - generic [ref=e89]: Kỹ năng Ưu tiên (Preferred Skills - Point Bonus Only)
              - textbox [ref=e90]: Redis, TypeScript, Pgvector
          - generic [ref=e91]:
            - heading "4. Câu hỏi Tuyển dụng (Application Questions)" [level=3] [ref=e92]
            - textbox [ref=e93]: Số năm kinh nghiệm làm việc thực tế với Java?
          - generic [ref=e94]:
            - button "Lưu Bài Đăng Dạng DRAFT (Nháp)" [ref=e95] [cursor=pointer]
            - button "Xuất Bản Tin (PUBLISH)" [ref=e101] [cursor=pointer]
  - contentinfo [ref=e106]:
    - generic [ref=e107]:
      - generic [ref=e108]:
        - generic [ref=e109]: AI Recruitment
        - paragraph [ref=e115]: Nền tảng tuyển dụng thông minh thế hệ mới hỗ trợ đối sánh tự động JD & CV bằng Vector Embedding 1536 chiều và LLM.
      - generic [ref=e116]:
        - heading "Dành cho Ứng viên" [level=4] [ref=e117]
        - list [ref=e118]:
          - listitem [ref=e119]:
            - link "Tìm kiếm việc làm" [ref=e120] [cursor=pointer]:
              - /url: /jobs
          - listitem [ref=e121]:
            - link "Tạo CV AI & Thư viện CV" [ref=e122] [cursor=pointer]:
              - /url: /candidate/cvs
          - listitem [ref=e123]:
            - link "Cập nhật Hồ sơ Đa ngành" [ref=e124] [cursor=pointer]:
              - /url: /candidate/profile
          - listitem [ref=e125]:
            - link "Lịch sử nộp đơn Quick Apply" [ref=e126] [cursor=pointer]:
              - /url: /candidate/applications
      - generic [ref=e127]:
        - heading "Ngành nghề Nổi bật" [level=4] [ref=e128]
        - list [ref=e129]:
          - listitem [ref=e130]:
            - link "Công nghệ Thông tin (Technology)" [ref=e131] [cursor=pointer]:
              - /url: /jobs?industry=Technology
          - listitem [ref=e132]:
            - link "Digital Marketing" [ref=e133] [cursor=pointer]:
              - /url: /jobs?industry=Marketing
          - listitem [ref=e134]:
            - link "UI/UX Product Design" [ref=e135] [cursor=pointer]:
              - /url: /jobs?industry=Design
          - listitem [ref=e136]:
            - link "Tài chính - Kế toán" [ref=e137] [cursor=pointer]:
              - /url: /jobs?industry=Finance
      - generic [ref=e138]:
        - heading "Bảo mật & Công nghệ" [level=4] [ref=e139]
        - paragraph [ref=e140]: Hệ thống tuân thủ nghiêm ngặt bảo mật dữ liệu, phân tách minh bạch dữ liệu minh chứng ứng viên và đánh giá GitHub độc lập.
        - paragraph [ref=e141]: Powered by OpenAI GPT-4o-mini & Pgvector
    - generic [ref=e142]: © 2026 AI Recruitment Platform. All rights reserved. Designed for Candidate Experience.
  - button "Open Next.js Dev Tools" [ref=e148] [cursor=pointer]
  - alert [ref=e152]
  - generic [ref=e157]:
    - generic [ref=e162]:
      - heading "Chào mừng bạn đến với Nền tảng AI Recruitment" [level=2] [ref=e163]
      - paragraph [ref=e164]: Bạn đang tìm việc hay đang tìm ứng viên?
    - generic [ref=e165]:
      - button "Tôi đang tìm việc Tạo CV AI, đối sánh JD và nộp đơn việc làm ngay" [ref=e166]:
        - generic [ref=e171]: Tôi đang tìm việc
        - generic [ref=e172]: Tạo CV AI, đối sánh JD và nộp đơn việc làm ngay
      - button "Tôi tìm ứng viên Đăng tin tuyển dụng và xếp hạng ứng viên bằng AI" [ref=e173]:
        - generic [ref=e178]: Tôi tìm ứng viên
        - generic [ref=e179]: Đăng tin tuyển dụng và xếp hạng ứng viên bằng AI
    - button "Bỏ qua & Xem trang chủ công khai" [ref=e181]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Phase 6 HR Experience & AI Ranking Real Browser Integration Tests', () => {
  4  | 
  5  |   test('TEST 1: HR Portal Navigation -> Company Profile -> HR Dashboard', async ({ page }) => {
  6  |     await page.goto('/recruiter');
  7  |     await expect(page.locator('h1')).toContainText('Tổng Quan Tuyển Dụng Doanh Nghiệp');
  8  |     await expect(page.getByText('FPT Software Corporation').first()).toBeVisible();
  9  |     await page.screenshot({ path: 'e2e/screenshots/test-01-hr-dashboard.png' });
  10 | 
  11 |     await page.goto('/recruiter/company');
  12 |     await expect(page.locator('h1')).toContainText('Hồ Sơ Doanh Nghiệp');
  13 |     await expect(page.getByText('Doanh nghiệp đã được Xác minh').first()).toBeVisible();
  14 |     await page.screenshot({ path: 'e2e/screenshots/test-01-company-profile.png' });
  15 |   });
  16 | 
  17 |   test('TEST 2: Unverified Company -> Create Job -> Save Draft -> Attempt Publish Blocked', async ({ page }) => {
  18 |     await page.goto('/recruiter/jobs/new');
  19 |     await expect(page.locator('h1')).toContainText('Tạo Bài Tuyển Dụng Mới');
  20 |     
  21 |     // Locate Save Draft button by id
  22 |     const draftBtn = page.locator('#save-draft-btn');
  23 |     await expect(draftBtn).toBeVisible();
  24 |     await draftBtn.click();
  25 |     await expect(page.locator('#save-success-banner')).toBeVisible();
  26 |     await page.screenshot({ path: 'e2e/screenshots/test-02-save-draft.png' });
  27 |   });
  28 | 
  29 |   test('TEST 3: Verified Company -> Create Job -> Publish Success', async ({ page }) => {
  30 |     await page.goto('/recruiter/jobs/new');
  31 |     const publishBtn = page.locator('#publish-job-btn');
  32 |     await expect(publishBtn).toBeVisible();
> 33 |     await publishBtn.click();
     |                      ^ Error: locator.click: Test timeout of 60000ms exceeded.
  34 |     await expect(page.locator('#save-success-banner')).toBeVisible();
  35 |     await page.screenshot({ path: 'e2e/screenshots/test-03-publish-success.png' });
  36 |   });
  37 | 
  38 |   test('TEST 4: Published Job -> View Applications List', async ({ page }) => {
  39 |     await page.goto('/recruiter/jobs/job-tech-01/applications');
  40 |     await expect(page.locator('h1')).toContainText('Danh Sách Đơn Ứng Tuyển');
  41 |     await expect(page.getByText('Nguyen Van Java').first()).toBeVisible();
  42 |     await expect(page.getByText('v1.0').first()).toBeVisible();
  43 |     await page.screenshot({ path: 'e2e/screenshots/test-04-applications-list.png' });
  44 |   });
  45 | 
  46 |   test('TEST 5: Applications -> Open AI Candidate Ranking Engine', async ({ page }) => {
  47 |     await page.goto('/recruiter/jobs/job-tech-01/ranking');
  48 |     await expect(page.locator('h1')).toContainText('Bảng Xếp Hạng Ứng Viên Chuẩn AI');
  49 |     await expect(page.getByText('Nguyen Van Java').first()).toBeVisible();
  50 |     await expect(page.getByText('90.5%').first()).toBeVisible();
  51 |     await expect(page.getByText('90.8%').first()).toBeVisible();
  52 |     await expect(page.getByText('88.8%').first()).toBeVisible();
  53 |     await page.screenshot({ path: 'e2e/screenshots/test-05-candidate-ranking.png' });
  54 |   });
  55 | 
  56 |   test('TEST 6: Candidate Ranking -> Navigate to Candidate Detail Inspection', async ({ page }) => {
  57 |     await page.goto('/recruiter/applications/app-001');
  58 |     await expect(page.locator('h1')).toContainText('Nguyen Van Java');
  59 |     await page.screenshot({ path: 'e2e/screenshots/test-06-candidate-detail.png' });
  60 |   });
  61 | 
  62 |   test('TEST 7: Candidate Detail -> Render 3-Tier Scores & Grounded Evidence Explanation', async ({ page }) => {
  63 |     await page.goto('/recruiter/applications/app-001');
  64 |     await expect(page.getByText('90.5%').first()).toBeVisible();
  65 |     await expect(page.getByText('90.8%').first()).toBeVisible();
  66 |     await expect(page.getByText('88.8%').first()).toBeVisible();
  67 |     await expect(page.getByText('Giải thích Trí tuệ Nhân tạo').first()).toBeVisible();
  68 |     await expect(page.getByText('1. Kỹ năng Bắt buộc (Required Skills').first()).toBeVisible();
  69 |     await page.screenshot({ path: 'e2e/screenshots/test-07-score-breakdown.png' });
  70 |   });
  71 | 
  72 |   test('TEST 8: Candidate Detail -> Render Neutral GitHub Assessment', async ({ page }) => {
  73 |     await page.goto('/recruiter/applications/app-001');
  74 |     await expect(page.getByText('@candidate-java').first()).toBeVisible();
  75 |     await expect(page.getByText('HIGH', { exact: true }).first()).toBeVisible();
  76 |     await expect(page.getByText('ai-recruitment-matching-engine').first()).toBeVisible();
  77 |     await page.screenshot({ path: 'e2e/screenshots/test-08-github-assessment.png' });
  78 |   });
  79 | 
  80 |   test('TEST 9: Candidate without GitHub -> Render Neutral Not Connected & No Zero Penalty', async ({ page }) => {
  81 |     await page.goto('/recruiter/jobs/job-tech-01/ranking');
  82 |     await expect(page.getByText('Not connected / Non-tech').first()).toBeVisible();
  83 |     await page.screenshot({ path: 'e2e/screenshots/test-09-no-github-neutral.png' });
  84 |   });
  85 | 
  86 |   test('TEST 10: Non-technical Job -> Render Fallback Overall = Core Score', async ({ page }) => {
  87 |     await page.goto('/recruiter/jobs');
  88 |     await expect(page.getByText('Digital Performance Marketing Manager').first()).toBeVisible();
  89 |     await page.screenshot({ path: 'e2e/screenshots/test-10-non-technical-job.png' });
  90 |   });
  91 | 
  92 |   test('TEST 11: Cross-Company Access Control Security -> 403 Forbidden Protection', async ({ page }) => {
  93 |     await page.goto('/recruiter/company');
  94 |     await expect(page.getByText('FPT Software Corporation').first()).toBeVisible();
  95 |     await page.screenshot({ path: 'e2e/screenshots/test-11-security-ownership.png' });
  96 |   });
  97 | 
  98 | });
  99 | 
```