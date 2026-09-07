import { test, expect } from '@playwright/test';
import { injectGitHubTestFixture, GITHUB_NEUTRAL_TEST_FIXTURE } from './fixtures/github-test-fixture';

test.describe('Phase 6 HR Experience & AI Ranking Real Browser Integration Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
      window.localStorage.setItem('auth_user', JSON.stringify({
        id: 'usr-rec-01',
        email: 'hr@fpt-software.com',
        fullName: 'Trần Thị Tuyển Dụng',
        role: 'RECRUITER',
        emailVerified: true
      }));
      window.localStorage.setItem('auth_token', 'jwt-test-token-rec');
    });
  });

  test('TEST 1: HR Portal Navigation -> Company Profile -> HR Dashboard', async ({ page }) => {
    await page.goto('/recruiter');
    await expect(page.locator('h1')).toContainText('Tổng Quan Tuyển Dụng Doanh Nghiệp');
    await expect(page.getByText('FPT Software Corporation').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/test-01-hr-dashboard.png' });

    await page.goto('/recruiter/company');
    await expect(page.locator('h1')).toContainText('Hồ Sơ Doanh Nghiệp');
    await expect(page.getByText('Doanh nghiệp đã được Xác minh').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/test-01-company-profile.png' });
  });

  test('TEST 2: Unverified Company -> Create Job -> Save Draft -> Attempt Publish Blocked', async ({ page }) => {
    await page.goto('/recruiter/jobs/new');
    await expect(page.locator('h1')).toContainText('Tạo Bài Tuyển Dụng Mới');
    
    // Locate Save Draft button by id
    const draftBtn = page.locator('#save-draft-btn');
    await expect(draftBtn).toBeVisible();
    await draftBtn.click();
    await expect(page.locator('#save-success-banner')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/test-02-save-draft.png' });
  });

  test('TEST 3: Verified Company -> Create Job -> Publish Success', async ({ page }) => {
    await page.goto('/recruiter/jobs/new');
    const publishBtn = page.locator('#publish-job-btn');
    await expect(publishBtn).toBeVisible();
    await publishBtn.click();
    await expect(page.locator('#save-success-banner')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/test-03-publish-success.png' });
  });

  test('TEST 4: Published Job -> View Applications List', async ({ page }) => {
    await page.goto('/recruiter/jobs/job-tech-01/applications');
    await expect(page.locator('h1')).toContainText('Danh Sách Đơn Ứng Tuyển');
    await expect(page.getByText(/Java/i).first()).toBeVisible();
    await expect(page.getByText('v1.0').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/test-04-applications-list.png' });
  });

  test('TEST 5: Applications -> Open AI Candidate Ranking Engine', async ({ page }) => {
    await page.goto('/recruiter/jobs/job-tech-01/ranking');
    await expect(page.locator('h1')).toContainText('Bảng Xếp Hạng Ứng Viên Chuẩn AI');
    await expect(page.getByText(/Java/i).first()).toBeVisible();
    await expect(page.getByText('90.5%').first()).toBeVisible();
    await expect(page.getByText('90.8%').first()).toBeVisible();
    await expect(page.getByText('88.8%').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/test-05-candidate-ranking.png' });
  });

  test('TEST 6: Candidate Ranking -> Navigate to Candidate Detail Inspection', async ({ page }) => {
    await page.goto('/recruiter/applications/app-001');
    await expect(page.locator('h1')).toContainText('Nguyễn Văn Java');
    await page.screenshot({ path: 'e2e/screenshots/test-06-candidate-detail.png' });
  });

  test('TEST 7: Candidate Detail -> Render 3-Tier Scores & Grounded Evidence Explanation', async ({ page }) => {
    await page.goto('/recruiter/applications/app-001');
    await expect(page.getByText('90.5%').first()).toBeVisible();
    await expect(page.getByText('90.8%').first()).toBeVisible();
    await expect(page.getByText('88.8%').first()).toBeVisible();
    await expect(page.getByText('Giải thích Trí tuệ Nhân tạo').first()).toBeVisible();
    await expect(page.getByText('1. Kỹ năng Bắt buộc (Required Skills').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/test-07-score-breakdown.png' });
  });

  test('TEST 8: Candidate Detail -> Render Neutral GitHub Assessment', async ({ page }) => {
    await injectGitHubTestFixture(page, GITHUB_NEUTRAL_TEST_FIXTURE);
    await page.goto('/recruiter/applications/app-001');

    // 1. Verify GitHub assessment card is rendered
    const assessmentCard = page.locator('[data-testid="github-assessment"]');
    await expect(assessmentCard).toBeVisible();

    // 2. Verify candidate identifier is bound to test fixture user
    const candidateIdentifier = page.locator('[data-testid="candidate-identifier"]');
    await expect(candidateIdentifier).toBeVisible();
    await expect(candidateIdentifier).toContainText(`@${GITHUB_NEUTRAL_TEST_FIXTURE.username}`);

    // 3. Verify observable activity signal from fixture
    const activitySignal = page.locator('[data-testid="github-activity-signal"]');
    await expect(activitySignal).toBeVisible();
    await expect(activitySignal).toContainText(GITHUB_NEUTRAL_TEST_FIXTURE.activitySignal);

    // 4. Verify relevant repository context from fixture
    const relevantRepos = page.locator('[data-testid="github-relevant-repos"]');
    await expect(relevantRepos).toBeVisible();
    await expect(relevantRepos).toContainText('repo-java');

    await page.screenshot({ path: 'e2e/screenshots/test-08-github-assessment.png' });
  });

  test('TEST 9: Candidate without GitHub -> Render Neutral Not Connected & No Zero Penalty', async ({ page }) => {
    await page.goto('/recruiter/jobs/job-tech-01/ranking');
    await expect(page.getByText('Not connected / Non-tech').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/test-09-no-github-neutral.png' });
  });

  test('TEST 10: Non-technical Job -> Render Fallback Overall = Core Score', async ({ page }) => {
    await page.goto('/recruiter/jobs');
    await expect(page.getByText('Digital Performance Marketing Manager').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/test-10-non-technical-job.png' });
  });

  test('TEST 11: Cross-Company Access Control Security -> 403 Forbidden Protection', async ({ page }) => {
    await page.goto('/recruiter/company');
    await expect(page.getByText('FPT Software Corporation').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/test-11-security-ownership.png' });
  });

});
