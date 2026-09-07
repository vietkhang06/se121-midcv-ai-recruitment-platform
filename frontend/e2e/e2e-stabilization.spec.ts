import { test, expect } from '@playwright/test';
import { injectGitHubTestFixture, GITHUB_NEUTRAL_TEST_FIXTURE } from './fixtures/github-test-fixture';

test.describe('Stabilization & Complete Product Verification Suite', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
      window.localStorage.setItem('auth_user', JSON.stringify({
        id: 'usr-cand-01',
        email: 'nguyenvanjava@example.com',
        fullName: 'Nguyễn Văn Java',
        role: 'CANDIDATE',
        age: 24,
        targetIndustry: 'Technology',
        emailVerified: true
      }));
      window.localStorage.setItem('auth_token', 'jwt-test-token-cand');
    });
  });

  test('01: Landing Hero with Bespoke Vector Matching Illustration', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Đối Sánh JD & Hồ Sơ');
    await expect(page.getByText('Vector Embedding 1536D').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/01-landing-hero.png', fullPage: false });
  });

  test('02: Job Discovery Catalog with Filters', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page.locator('h1')).toContainText('Tìm Kiếm Việc Làm Toàn Quốc');
    await expect(page.getByText('Senior Java Backend Engineer').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/02-job-discovery-filters.png', fullPage: false });
  });

  test('03: Job Detail Page with Requirements & Company Trust Badge', async ({ page }) => {
    await page.goto('/jobs/job-tech-01');
    await expect(page.locator('h1')).toContainText('Senior Java Backend Engineer');
    await expect(page.getByText('Verified Company').first()).toBeVisible();
    await expect(page.getByText('Kỹ năng Bắt buộc').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/03-job-detail.png', fullPage: false });
  });

  test('04: Quick Apply 5-Step Stepper Modal', async ({ page }) => {
    await page.goto('/jobs/job-tech-01');
    const applyBtn = page.getByRole('button', { name: /nộp đơn/i }).first();
    await applyBtn.click();
    await expect(page.getByText('Quick Apply 5-Step Stepper').first()).toBeVisible();
    await expect(page.getByText('Bước 1: Chọn Bản CV Ứng Tuyển').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/04-quick-apply-stepper.png', fullPage: false });
  });

  test('05: Candidate Profile with Multi-Industry & Skills', async ({ page }) => {
    await page.goto('/candidate/profile');
    await expect(page.locator('h1')).toContainText('Hồ Sơ Cá Nhân Ứng Viên');
    await expect(page.getByText('Định hướng Nghề nghiệp Đa ngành').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/05-candidate-profile.png', fullPage: false });
  });

  test('06: Flagship CV Builder 3-Column Desktop Layout', async ({ page }) => {
    await page.goto('/candidate/cvs/builder');
    await expect(page.getByText('Flagship 3-Column Studio').first()).toBeVisible();
    await expect(page.getByText('Live A4 Document Preview').first()).toBeVisible();
    await expect(page.getByText('Các Mục Nội Dung CV').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/06-cv-builder-3column.png', fullPage: false });
  });

  test('07: CV Library Multi-CV Catalog', async ({ page }) => {
    await page.goto('/candidate/cvs');
    await expect(page.locator('h1')).toContainText('Thư Viện CV Cá Nhân');
    await expect(page.getByText('CV Senior Java Backend Engineer').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/07-cv-library.png', fullPage: false });
  });

  test('08: Application History Tracker with Immutable Snapshot', async ({ page }) => {
    await page.goto('/candidate/applications');
    await expect(page.locator('h1')).toContainText('Danh Sách Việc Làm Đã Nộp Đơn');
    await expect(page.getByText('Immutable Snapshot').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/08-application-history.png', fullPage: false });
  });

  test('09: HR Recruiter Dashboard with Verification Banner', async ({ page }) => {
    await page.goto('/recruiter');
    await expect(page.locator('h1')).toContainText('Tổng Quan Tuyển Dụng Doanh Nghiệp');
    await expect(page.getByText('FPT Software Corporation').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/09-recruiter-dashboard.png', fullPage: false });
  });

  test('10: Company Profile & Verification Status', async ({ page }) => {
    await page.goto('/recruiter/company');
    await expect(page.locator('h1')).toContainText('Hồ Sơ Doanh Nghiệp');
    await expect(page.getByText('Doanh nghiệp đã được Xác minh').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/10-company-profile-verification.png', fullPage: false });
  });

  test('11: Job Creation Form Engine', async ({ page }) => {
    await page.goto('/recruiter/jobs/new');
    await expect(page.locator('h1')).toContainText('Tạo Bài Tuyển Dụng Mới');
    await expect(page.locator('#save-draft-btn')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/11-job-creation-form.png', fullPage: false });
  });

  test('12: Recruiter Jobs Management List', async ({ page }) => {
    await page.goto('/recruiter/jobs');
    await expect(page.locator('h1')).toContainText('Danh Sách Tin Tuyển Dụng Doanh Nghiệp');
    await page.screenshot({ path: 'e2e/screenshots/12-recruiter-jobs-list.png', fullPage: false });
  });

  test('13: Applications for Job', async ({ page }) => {
    await page.goto('/recruiter/jobs/job-tech-01/applications');
    await expect(page.locator('h1')).toContainText('Danh Sách Đơn Ứng Tuyển');
    await expect(page.getByText('Nguyễn Văn Java').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/13-applications-for-job.png', fullPage: false });
  });

  test('14: AI Candidate Ranking Table with Linear Progress Bars', async ({ page }) => {
    await page.goto('/recruiter/jobs/job-tech-01/ranking');
    await expect(page.locator('h1')).toContainText('Bảng Xếp Hạng Ứng Viên Chuẩn AI');
    await expect(page.getByText('Nguyễn Văn Java').first()).toBeVisible();
    await expect(page.getByText('90.5%').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/14-candidate-ranking-table.png', fullPage: false });
  });

  test('15: Match Inspection with 3-Tier Scores & Contact Privacy Masking', async ({ page }) => {
    await page.goto('/recruiter/applications/app-001');
    await expect(page.locator('h1')).toContainText('Nguyễn Văn Java');
    await expect(page.getByText('Bảo Mật Thông Tin Liên Hệ').first()).toBeVisible();
    await expect(page.getByText('Overall Match Score').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/15-match-inspection-scores-evidence.png', fullPage: false });
  });

  test('16: Neutral GitHub Assessment with Language Distribution', async ({ page }) => {
    await injectGitHubTestFixture(page, GITHUB_NEUTRAL_TEST_FIXTURE);
    await page.goto('/recruiter/applications/app-001');

    // 1. Verify GitHub assessment card is rendered
    const assessmentCard = page.locator('[data-testid="github-assessment"]');
    await expect(assessmentCard).toBeVisible();

    // 2. Verify candidate GitHub identifier is bound to the test fixture user
    const candidateIdentifier = page.locator('[data-testid="candidate-identifier"]');
    await expect(candidateIdentifier).toBeVisible();
    await expect(candidateIdentifier).toContainText(`@${GITHUB_NEUTRAL_TEST_FIXTURE.username}`);

    // 3. Verify GitHub status indicator
    const githubStatus = page.locator('[data-testid="github-status"]');
    await expect(githubStatus).toBeVisible();

    // 4. Verify language distribution data rendered from fixture
    const langDistribution = page.locator('[data-testid="github-language-distribution"]');
    await expect(langDistribution).toBeVisible();
    for (const lang of GITHUB_NEUTRAL_TEST_FIXTURE.languages) {
      await expect(langDistribution).toContainText(lang);
    }

    // 5. Verify relevant repository context rendered from fixture
    const relevantRepos = page.locator('[data-testid="github-relevant-repos"]');
    await expect(relevantRepos).toBeVisible();
    await expect(relevantRepos).toContainText('repo-java');

    await page.screenshot({ path: 'e2e/screenshots/16-github-assessment.png', fullPage: false });
  });

  test('17: Side-by-Side Candidate Comparison Modal', async ({ page }) => {
    await page.goto('/recruiter/jobs/job-tech-01/ranking');
    const compareButtons = page.getByRole('button', { name: 'So sánh' });
    if (await compareButtons.count() >= 2) {
      await compareButtons.nth(0).click();
      await compareButtons.nth(1).click();
      const openModalBtn = page.getByRole('button', { name: /So Sánh/i });
      await openModalBtn.click();
      await expect(page.getByText('So Sánh Chi Tiết Ứng Viên')).toBeVisible();
      await page.screenshot({ path: 'e2e/screenshots/17-candidate-comparison-modal.png', fullPage: false });
    }
  });

});
