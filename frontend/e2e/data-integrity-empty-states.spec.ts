import { test, expect } from '@playwright/test';

const STORAGE_KEYS = {
  JOBS: 'airecruit_persistent_jobs',
  CVS: 'airecruit_persistent_cvs',
  APPLICATIONS: 'airecruit_persistent_applications',
  PROFILE: 'airecruit_persistent_profile',
  COMPANY: 'airecruit_persistent_company',
  RANKINGS: 'airecruit_persistent_rankings'
};

test.describe('WP-DATA-01: Runtime Data Purification & Empty-State Integrity Tests', () => {

  let mockJobsResponse: any[] = [];
  let mockRecruiterJobsResponse: any[] = [];

  test.beforeEach(async ({ page }) => {
    mockJobsResponse = [];
    mockRecruiterJobsResponse = [];
    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/api/v1/recruiter/jobs')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockRecruiterJobsResponse) });
      } else if (url.includes('/api/v1/jobs')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockJobsResponse) });
      } else if (url.includes('/api/v1/candidate/cvs')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      } else if (url.includes('/api/v1/candidate/applications')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      } else if (url.includes('/api/v1/recruiter/profile')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ company: null }) });
      } else if (url.includes('/inspection')) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Inspection not found' }) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
    });
  });

  test.describe('Default Pristine Session (0 DB / 0 LocalStorage Records)', () => {

    test('DATA-01: Landing Page renders genuine empty state for featured jobs without fabricated metrics', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
        window.localStorage.setItem('midcv_lang', 'vi');
      });

      await page.goto('/');

      // Verify the hero title is present
      await expect(page.locator('h1')).toBeVisible();

      // Verify empty state is rendered for featured jobs
      const emptyState = page.locator('[data-testid="empty-state-empty"]');
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText('Chưa có vị trí tuyển dụng');

      // Verify fabricated metrics like 320k+ and 98.4% are NOT present
      await expect(page.getByText('320k+')).not.toBeVisible();
      await expect(page.getByText('98.4%')).not.toBeVisible();
    });

    test('DATA-02: Public Job Search renders genuine EMPTY state when 0 jobs exist', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
        window.localStorage.setItem('midcv_lang', 'vi');
      });

      await page.goto('/jobs');

      // Verify empty state with type="EMPTY"
      const emptyState = page.locator('[data-testid="empty-state-empty"]');
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText('Chưa có việc làm');

      // Verify NO_MATCH is not displayed since filters were not applied
      await expect(page.locator('[data-testid="empty-state-no_match"]')).not.toBeVisible();
    });

    test('DATA-03: Candidate CV Library renders authentic EMPTY state without fabricated profiles', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
        window.localStorage.setItem('midcv_lang', 'vi');
        window.localStorage.setItem('auth_user', JSON.stringify({
          id: 'user-clean-01',
          email: 'clean@candidate.vn',
          fullName: 'Nguyễn Sạch Dữ Liệu',
          role: 'CANDIDATE',
          emailVerified: true
        }));
        window.localStorage.setItem('auth_token', 'jwt-clean-token');
      });

      await page.goto('/candidate/cvs');

      // Verify empty state
      const emptyState = page.locator('[data-testid="empty-state-empty"]');
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText('Bạn chưa có CV nào');

      // Primary CTA to create CV
      await expect(page.getByRole('link', { name: 'Tạo CV Mới' }).first()).toBeVisible();
      // Fabricated Andrew Sterling or fake scores must NOT exist
      await expect(page.getByText('Andrew Sterling')).not.toBeVisible();
      await expect(page.getByText('94.8%')).not.toBeVisible();
    });

    test('DATA-04: Candidate Applications renders authentic EMPTY state without fallback app-001', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
        window.localStorage.setItem('midcv_lang', 'vi');
        window.localStorage.setItem('auth_user', JSON.stringify({
          id: 'user-clean-01',
          email: 'clean@candidate.vn',
          fullName: 'Nguyễn Sạch Dữ Liệu',
          role: 'CANDIDATE',
          emailVerified: true
        }));
        window.localStorage.setItem('auth_token', 'jwt-clean-token');
      });

      await page.goto('/candidate/applications');

      const emptyState = page.locator('[data-testid="empty-state-empty"]');
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText('Bạn chưa có đơn ứng tuyển nào');
      await expect(page.getByText('app-001')).not.toBeVisible();
    });

    test('DATA-05: Recruiter Jobs Management renders authentic EMPTY state', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
        window.localStorage.setItem('midcv_lang', 'vi');
        window.localStorage.setItem('auth_user', JSON.stringify({
          id: 'rec-clean-01',
          email: 'recruiter@clean.vn',
          fullName: 'Tuyển Dụng Chuẩn',
          role: 'RECRUITER',
          emailVerified: true
        }));
        window.localStorage.setItem('auth_token', 'jwt-rec-clean');
      });

      await page.goto('/recruiter/jobs');

      const emptyState = page.locator('[data-testid="empty-state-empty"]');
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText('Chưa có bài tuyển dụng');
      await expect(page.getByRole('link', { name: 'Tạo Bài Tuyển Dụng Mới' }).first()).toBeVisible();
    });

    test('DATA-06: Recruiter Candidate Ranking renders authentic EMPTY state when zero candidates exist', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
        window.localStorage.setItem('midcv_lang', 'vi');
        window.localStorage.setItem('auth_user', JSON.stringify({
          id: 'rec-clean-01',
          email: 'recruiter@clean.vn',
          fullName: 'Tuyển Dụng Chuẩn',
          role: 'RECRUITER',
          emailVerified: true
        }));
        window.localStorage.setItem('auth_token', 'jwt-rec-clean');
      });

      await page.route('**/api/v1/jobs/job-empty-01', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'job-empty-01',
            title: 'Software Engineer',
            department: 'Engineering',
            location: 'Hanoi',
            workplaceType: 'HYBRID',
            employmentType: 'FULL_TIME',
            industry: 'Technology',
            salaryMin: 1000,
            salaryMax: 2000,
            currency: 'USD',
            status: 'PUBLISHED',
            requiredSkills: [{ skillName: 'React', importanceWeight: 1.0 }],
            optionalSkills: []
          })
        });
      });

      await page.route('**/api/v1/**/job-empty-01/rankings', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      });

      await page.goto('/recruiter/jobs/job-empty-01/ranking');

      const emptyState = page.locator('[data-testid="empty-state-empty"]');
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText('Chưa có ứng viên');
      await expect(page.locator('[data-testid="empty-state-no_match"]')).not.toBeVisible();
    });

    test('DATA-07: Recruiter Match Inspection renders authentic EMPTY state for non-existent match calculation', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
        window.localStorage.setItem('midcv_lang', 'vi');
        window.localStorage.setItem('auth_user', JSON.stringify({
          id: 'rec-clean-01',
          email: 'recruiter@clean.vn',
          fullName: 'Tuyển Dụng Chuẩn',
          role: 'RECRUITER',
          emailVerified: true
        }));
        window.localStorage.setItem('auth_token', 'jwt-rec-clean');
      });

      await page.goto('/recruiter/applications/app-nonexistent-999');

      const emptyState = page.locator('[data-testid="empty-state-empty"]');
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText('Không tìm thấy dữ liệu đối sánh');
    });

  });

  test.describe('Bilingual Empty State Synchronization (VI <-> EN)', () => {

    test('DATA-08: Empty state messages seamlessly switch between Vietnamese and English', async ({ page }) => {
      // 1. Initial State: Vietnamese
      await page.addInitScript(() => {
        window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
        window.localStorage.setItem('midcv_lang', 'vi');
      });

      await page.goto('/jobs');

      const emptyStateVI = page.locator('[data-testid="empty-state-empty"]');
      await expect(emptyStateVI).toBeVisible();
      await expect(emptyStateVI).toContainText('Chưa có việc làm');

      // 2. Switch Language: toggle to English
      const langBtn = page.getByRole('button', { name: 'VI' });
      await expect(langBtn).toBeVisible();
      await langBtn.click();

      // Verify the empty state is now in English
      const emptyStateEN = page.locator('[data-testid="empty-state-empty"]');
      await expect(emptyStateEN).toBeVisible();
      await expect(emptyStateEN).toContainText('No jobs found');
    });

  });

  test.describe('Filter NO_MATCH vs Database EMPTY State Differentiation', () => {

    test('DATA-09: Filtering jobs with non-matching query displays NO_MATCH, resetting returns EMPTY or items', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
        window.localStorage.setItem('midcv_lang', 'vi');
      });

      mockJobsResponse = [{
        id: 'job-real-01',
        title: 'Golang Distributed Engineer',
        department: 'Core Infrastructure',
        location: 'Da Nang',
        workplaceType: 'REMOTE',
        employmentType: 'FULL_TIME',
        industry: 'Technology',
        salaryMin: 2000,
        salaryMax: 3500,
        currency: 'USD',
        status: 'PUBLISHED',
        requiredSkills: [{ skillName: 'Go', importanceWeight: 1.0 }],
        optionalSkills: []
      }];

      await page.goto('/jobs');

      // Verify the real job is displayed
      await expect(page.getByText('Golang Distributed Engineer')).toBeVisible();

      // Search for non-matching keyword
      const searchInput = page.getByPlaceholder(/Infrastructure/i);
      await expect(searchInput).toBeVisible();
      await searchInput.fill('NonExistentQuantumSkillXYZ');

      // NO_MATCH state should now appear
      const noMatchState = page.locator('[data-testid="empty-state-no_match"]');
      await expect(noMatchState).toBeVisible();
      await expect(noMatchState).toContainText('Không tìm thấy việc làm phù hợp');

      // Reset filters CTA
      const resetBtn = page.getByRole('button', { name: 'Xóa tất cả bộ lọc' });
      await expect(resetBtn).toBeVisible();
      await resetBtn.click();

      // Job should reappear
      await expect(page.getByText('Golang Distributed Engineer')).toBeVisible();
    });

  });

  test.describe('Dynamic CRUD Lifecycle: Empty -> Created -> Deleted -> Empty', () => {

    test('DATA-10: Database empty -> Job added -> UI shows exact job -> Job deleted -> UI returns to empty state', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
        window.localStorage.setItem('midcv_lang', 'vi');
        window.localStorage.setItem('auth_user', JSON.stringify({
          id: 'rec-lifecycle-01',
          email: 'recruiter@lifecycle.vn',
          fullName: 'Lifecycle Recruiter',
          role: 'RECRUITER',
          emailVerified: true
        }));
        window.localStorage.setItem('auth_token', 'jwt-rec-lifecycle');
      });

      mockRecruiterJobsResponse = [];

      // 1. Initial State: Empty
      await page.goto('/recruiter/jobs');
      await expect(page.locator('[data-testid="empty-state-empty"]')).toBeVisible();

      // 2. Add single record to backend
      mockRecruiterJobsResponse = [{
        id: 'job-lifecycle-01',
        title: 'Fullstack Rust & Next.js Engineer',
        companyName: 'Clean Code Labs',
        description: 'High performance systems',
        department: 'Platform',
        location: 'Ho Chi Minh',
        workplaceType: 'ON_SITE',
        employmentType: 'FULL_TIME',
        industry: 'Technology',
        salaryMin: 2500,
        salaryMax: 4000,
        currency: 'USD',
        seniority: 'Senior',
        requirements: [],
        requiredSkills: [],
        optionalSkills: []
      }];
      await page.goto('/recruiter/jobs');

      // 3. Verified State: Exact record is rendered, empty state is gone
      await expect(page.locator('[data-testid="empty-state-empty"]')).not.toBeVisible();
      await expect(page.getByText('Fullstack Rust & Next.js Engineer')).toBeVisible();

      // 4. Delete record from backend
      mockRecruiterJobsResponse = [];
      await page.goto('/recruiter/jobs');

      // 5. Final State: Returns authentically to empty state
      await expect(page.locator('[data-testid="empty-state-empty"]')).toBeVisible();
      await expect(page.getByText('Fullstack Rust & Next.js Engineer')).not.toBeVisible();
    });

  });

});
