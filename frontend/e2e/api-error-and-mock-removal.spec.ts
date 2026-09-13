import { test, expect } from '@playwright/test';

test.describe('P0 Final Cleanup: API Error != Empty, API Error != Mock, Zero Production Mock Bypass', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
      window.localStorage.setItem('midcv_lang', 'vi');
    });
  });

  // TEST A: DB empty: GET /api/v1/jobs => 200 [] => UI shows EMPTY state, NOT MOCK/SEED
  test('TEST A: DB empty (GET /jobs => 200 []) renders genuine EMPTY state, never SEED jobs', async ({ page }) => {
    await page.route('**/api/v1/jobs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('/jobs');
    const emptyState = page.locator('[data-testid="empty-state-empty"]');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('Chưa có việc làm');

    // Must NOT show SEED jobs
    await expect(page.getByText('Senior Backend Distributed Systems')).not.toBeVisible();
    await expect(page.getByText('Senior Infrastructure Engineer (Go/K8s)')).not.toBeVisible();
  });

  // TEST B: GET jobs = 500 => ERROR => KHÔNG SEED JOBS & KHÔNG EMPTY
  test('TEST B: GET jobs = 500 renders ERROR state with retry, NOT SEED and NOT EMPTY', async ({ page }) => {
    await page.route('**/api/v1/jobs', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error: Database failure' })
      });
    });

    await page.goto('/jobs');
    const errorState = page.locator('[data-testid="empty-state-error"]');
    await expect(errorState).toBeVisible();

    // Must NOT show EMPTY state or SEED jobs
    await expect(page.locator('[data-testid="empty-state-empty"]')).not.toBeVisible();
    await expect(page.getByText('Senior Backend Distributed Systems')).not.toBeVisible();
  });

  // TEST C: GET CV = 500 => ERROR => KHÔNG SEED CV
  test('TEST C: GET CV = 500 renders ERROR state, NOT SEED CV', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_user', JSON.stringify({
        id: 'usr-cand-01',
        email: 'candidate@example.com',
        fullName: 'Candidate Test',
        role: 'CANDIDATE',
        emailVerified: true
      }));
      window.localStorage.setItem('auth_token', 'jwt-test-cand-token');
    });

    await page.route('**/api/v1/candidate/cvs', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' })
      });
    });

    await page.goto('/candidate/cvs');
    const errorState = page.locator('[data-testid="empty-state-error"]');
    await expect(errorState).toBeVisible();

    // Must NOT show SEED CV
    await expect(page.getByText('Senior Backend Engineer CV')).not.toBeVisible();
    await expect(page.locator('[data-testid="empty-state-empty"]')).not.toBeVisible();
  });

  // TEST D: GET applications = 500 => ERROR => KHÔNG app-001
  test('TEST D: GET applications = 500 renders ERROR state, NOT app-001 seed', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_user', JSON.stringify({
        id: 'usr-cand-01',
        email: 'candidate@example.com',
        fullName: 'Candidate Test',
        role: 'CANDIDATE',
        emailVerified: true
      }));
      window.localStorage.setItem('auth_token', 'jwt-test-cand-token');
    });

    await page.route('**/api/v1/candidate/applications', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' })
      });
    });

    await page.goto('/candidate/applications');
    const errorState = page.locator('[data-testid="empty-state-error"]');
    await expect(errorState).toBeVisible();

    // Must NOT show SEED application
    await expect(page.getByText('app-001')).not.toBeVisible();
    await expect(page.locator('[data-testid="empty-state-empty"]')).not.toBeVisible();
  });

  // TEST E: Ranking = 500 => ERROR => KHÔNG ranking seed
  test('TEST E: Ranking = 500 renders ERROR state, NOT ranking seed', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_user', JSON.stringify({
        id: 'usr-rec-01',
        email: 'recruiter@example.com',
        fullName: 'Recruiter Test',
        role: 'RECRUITER',
        emailVerified: true
      }));
      window.localStorage.setItem('auth_token', 'jwt-test-rec-token');
    });

    await page.route('**/api/v1/jobs/job-01', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'job-01',
          title: 'Backend Engineer',
          department: 'Engineering',
          status: 'PUBLISHED'
        })
      });
    });

    await page.route('**/api/v1/**/job-01/rankings', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Ranking Engine Internal Failure' })
      });
    });

    await page.goto('/recruiter/jobs/job-01/ranking');
    const errorState = page.locator('[data-testid="empty-state-error"]');
    await expect(errorState).toBeVisible();

    // Must NOT show SEED top candidate
    await expect(page.getByText('Nguyễn Văn Java')).not.toBeVisible();
    await expect(page.getByText('94.8% MATCH')).not.toBeVisible();
  });

  // TEST F: Match inspection = 500 => ERROR => KHÔNG app-001 inspection
  test('TEST F: Match inspection = 500 renders ERROR state, NOT app-001 inspection', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_user', JSON.stringify({
        id: 'usr-rec-01',
        email: 'recruiter@example.com',
        fullName: 'Recruiter Test',
        role: 'RECRUITER',
        emailVerified: true
      }));
      window.localStorage.setItem('auth_token', 'jwt-test-rec-token');
    });

    await page.route('**/api/v1/**/app-001/inspection', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Inspection Service Error' })
      });
    });

    await page.goto('/recruiter/applications/app-001');
    const errorState = page.locator('[data-testid="empty-state-error"]');
    await expect(errorState).toBeVisible();

    // Must NOT show SEED inspection data
    await expect(page.getByText('CONFIDENCE INTERVAL: 94-98%')).not.toBeVisible();
  });

  // TEST G: localStorage có e2e_seed_benchmark=true => production runtime vẫn KHÔNG được tự động sử dụng fixture
  test('TEST G: e2e_seed_benchmark in localStorage/sessionStorage is ignored by production runtime', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('e2e_seed_benchmark', 'true');
      window.sessionStorage.setItem('e2e_seed_benchmark', 'true');
    });

    // Provide 500 response from backend
    await page.route('**/api/v1/jobs', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Backend unreachable' })
      });
    });

    await page.goto('/jobs');
    // Because e2e_seed_benchmark is ignored, it must show ERROR, NOT SEED jobs
    const errorState = page.locator('[data-testid="empty-state-error"]');
    await expect(errorState).toBeVisible();
    await expect(page.getByText('Senior Backend Distributed Systems')).not.toBeVisible();
  });

  // TEST H: Backend trả object thiếu field => KHÔNG tự bịa dữ liệu nghiệp vụ
  test('TEST H: Backend object missing fields is not fabricated', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_user', JSON.stringify({
        id: 'usr-rec-01',
        email: 'recruiter@example.com',
        fullName: 'Recruiter Test',
        role: 'RECRUITER',
        emailVerified: true
      }));
      window.localStorage.setItem('auth_token', 'jwt-test-rec-token');
    });

    await page.route('**/api/v1/jobs/job-partial-01', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'job-partial-01',
          title: 'Custom Role',
          status: 'PUBLISHED'
        })
      });
    });

    await page.route('**/api/v1/**/job-partial-01/rankings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            rank: 1,
            applicationId: 'app-custom-01',
            candidateId: 'cand-01',
            candidateName: 'Trần Văn Thực',
            overallMatchScore: 82.5,
            coreJdCvScore: 82.5,
            requiredSkillsMatched: 2,
            requiredSkillsTotal: 3,
            requiredSkillsMissingNames: ['K8s'],
            relevantExperienceYears: 1.5, // Specifically NOT 3.0
            appliedDate: '2026-09-08',
            status: 'SUBMITTED',
            gitHubConnected: false
          }
        ])
      });
    });

    await page.goto('/recruiter/jobs/job-partial-01/ranking');
    await expect(page.getByText('Trần Văn Thực').first()).toBeVisible();
    // Verify experience is 1.5, not hardcoded 3.0
    await expect(page.getByText('1.5 năm').first()).toBeVisible();
  });

});
