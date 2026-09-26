import { test, expect } from '@playwright/test';

test.describe('Strict Role Separation Suite: HR (Recruiter) vs Candidate', () => {

  const setupCandidateSession = () => {
    window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    window.localStorage.setItem('midcv_lang', 'vi');
    window.localStorage.setItem('auth_user', JSON.stringify({
      id: 'usr-cand-01',
      email: 'candidate@midcv.io',
      fullName: 'Trần Văn Candidate',
      role: 'CANDIDATE',
      emailVerified: true
    }));
    window.localStorage.setItem('auth_token', 'jwt-test-token-cand');
  };

  const setupRecruiterSession = () => {
    window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    window.localStorage.setItem('midcv_lang', 'vi');
    window.localStorage.setItem('auth_user', JSON.stringify({
      id: 'usr-hr-01',
      email: 'hr@techcorp.vn',
      fullName: 'Nguyễn Thị HR',
      role: 'RECRUITER',
      emailVerified: true
    }));
    window.localStorage.setItem('auth_token', 'jwt-test-token-hr');
  };

  test('01: HR Access to HR Portal & Navbar Isolation', async ({ page }) => {
    await page.addInitScript(setupRecruiterSession);
    await page.goto('/recruiter');

    // HR Dashboard renders
    await expect(page.locator('text=HR Portal').first()).toBeVisible();
    await expect(page.locator('a[href="/recruiter"]').first()).toBeVisible();

    // HR profile badge and desktop logout button exist
    await expect(page.locator('#recruiter-navbar-logout-btn')).toBeVisible();

    // Misleading "Về Cổng Ứng viên" button is NOT present
    await expect(page.locator('text=Về Cổng Ứng viên')).toHaveCount(0);
  });

  test('02: HR Direct Access to Candidate Routes is strictly blocked by RoleGuard', async ({ page }) => {
    await page.addInitScript(setupRecruiterSession);

    // Attempt direct URL access to /candidate/cvs
    await page.goto('/candidate/cvs');

    // RoleGuard intercepts and shows 403 Forbidden
    const forbiddenBanner = page.locator('#role-guard-forbidden');
    await expect(forbiddenBanner).toBeVisible();
    await expect(forbiddenBanner).toContainText('Không Có Quyền Truy Cập (403)');
    await expect(forbiddenBanner).toContainText('RECRUITER');

    // Candidate CV content must NOT be rendered
    await expect(page.locator('text=Thư viện CV')).toHaveCount(0);

    // Attempt direct URL access to /candidate/profile
    await page.goto('/candidate/profile');
    await expect(page.locator('#role-guard-forbidden')).toBeVisible();
  });

  test('03: Candidate Access to Candidate Portal & Navbar Isolation', async ({ page }) => {
    await page.addInitScript(setupCandidateSession);
    await page.goto('/');

    // Candidate navigation links exist
    await expect(page.locator('text=Tạo CV').first()).toBeVisible();
    await expect(page.locator('text=Công cụ').first()).toBeVisible();

    // Candidate should NOT see Recruiter Portal CTA button
    await expect(page.locator('a[href="/recruiter"]:has-text("Recruiter Portal")')).toHaveCount(0);
    await expect(page.locator('a[href="/recruiter"]:has-text("Đăng tuyển & tìm hồ sơ")')).toHaveCount(0);
  });

  test('04: Candidate Direct Access to HR Routes is strictly blocked by RoleGuard', async ({ page }) => {
    await page.addInitScript(setupCandidateSession);

    // Attempt direct URL access to /recruiter
    await page.goto('/recruiter');

    // RoleGuard intercepts and shows 403 Forbidden
    const forbiddenBanner = page.locator('#role-guard-forbidden');
    await expect(forbiddenBanner).toBeVisible();
    await expect(forbiddenBanner).toContainText('Không Có Quyền Truy Cập (403)');
    await expect(forbiddenBanner).toContainText('CANDIDATE');

    // HR Dashboard content must NOT be rendered
    await expect(page.locator('text=Tổng quan hoạt động tuyển dụng')).toHaveCount(0);

    // Attempt direct URL access to /recruiter/jobs
    await page.goto('/recruiter/jobs');
    await expect(page.locator('#role-guard-forbidden')).toBeVisible();
  });

  test('05: Unauthenticated Access to Protected Routes prompts for Login', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
      window.localStorage.removeItem('auth_user');
      window.localStorage.removeItem('auth_token');
    });

    // Anonymous to /recruiter
    await page.goto('/recruiter');
    await expect(page.locator('#role-guard-unauthenticated')).toBeVisible();
    await expect(page.locator('text=Yêu cầu đăng nhập')).toBeVisible();

    // Anonymous to /candidate/profile
    await page.goto('/candidate/profile');
    await expect(page.locator('#role-guard-unauthenticated')).toBeVisible();
  });

  const mockJobFixture = {
    id: 'job-mock-01',
    title: 'Senior Fullstack Engineer',
    companyName: 'Tech Innovations Corp',
    companyVerified: true,
    industry: 'Technology',
    employmentType: 'FULL_TIME',
    seniority: 'SENIOR',
    location: 'Ho Chi Minh City',
    minSalary: 2000,
    maxSalary: 3500,
    createdAt: '2026-03-01T00:00:00Z',
    description: 'Lead engineering tasks\nMaintain cloud systems',
    requirements: [
      { id: 'req-1', skillName: 'Java Spring Boot', requirementType: 'REQUIRED', minYearsExp: 3 },
      { id: 'req-2', skillName: 'Next.js', requirementType: 'PREFERRED', minYearsExp: 2 }
    ],
    status: 'PUBLISHED'
  };

  const setupJobMock = async (page: any) => {
    await page.route(/\/api\/v1\/jobs/, async (route: any) => {
      const url = route.request().url();
      if (url.includes('/api/v1/jobs/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'OK',
            data: mockJobFixture
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'OK',
            data: [mockJobFixture]
          })
        });
      }
    });
  };

  test('06: Candidate viewing job details sees Quick Apply CTA', async ({ page }) => {
    await setupJobMock(page);
    await page.addInitScript(setupCandidateSession);
    await page.goto('/jobs');
    const firstJob = page.locator('h3 a').first();
    await expect(firstJob).toBeVisible();
    const jobUrl = await firstJob.getAttribute('href');
    await page.goto(jobUrl!);

    // Candidate sees Quick Apply button
    await expect(page.locator('#job-quick-apply-btn')).toBeVisible();
  });

  test('07: HR viewing job details sees HR notice instead of Quick Apply CTA', async ({ page }) => {
    await setupJobMock(page);
    await page.addInitScript(setupRecruiterSession);
    await page.goto('/jobs');
    const firstJob = page.locator('h3 a').first();
    await expect(firstJob).toBeVisible();
    const jobUrl = await firstJob.getAttribute('href');
    await page.goto(jobUrl!);

    // HR does NOT see Quick Apply button, sees HR notice
    await expect(page.locator('#job-quick-apply-btn')).toHaveCount(0);
    await expect(page.locator('text=Tài khoản Nhà tuyển dụng (HR)')).toBeVisible();
  });

  const setupAdminSession = () => {
    window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    window.localStorage.setItem('midcv_lang', 'vi');
    window.localStorage.setItem('auth_user', JSON.stringify({
      id: 'usr-admin-01',
      email: 'admin@midcv.io',
      fullName: 'Quản Trị Viên',
      role: 'ADMIN',
      emailVerified: true
    }));
    window.localStorage.setItem('auth_token', 'jwt-test-token-admin');
  };

  test('08: HR Logout from Recruiter Portal sanitizes session state completely', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(setupRecruiterSession);
    await page.goto('/recruiter');

    // Click logout directly in RecruiterNavbar
    const logoutBtn = page.locator('#recruiter-navbar-logout-btn');
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Modal opens
    const confirmLogout = page.locator('#confirm-logout-btn');
    await expect(confirmLogout).toBeVisible();
    await confirmLogout.click();

    // Auth data cleared
    await expect(page.locator('#navbar-logout-btn')).toHaveCount(0);
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    const user = await page.evaluate(() => localStorage.getItem('auth_user'));
    expect(token).toBeNull();
    expect(user).toBeNull();
  });

  test('09: HR does NOT have Admin AI Settings in RecruiterNavbar (Strict Separation)', async ({ page }) => {
    await page.addInitScript(setupRecruiterSession);
    await page.goto('/recruiter');

    // RecruiterNavbar has Dashboard, Jobs, Company
    await expect(page.locator('a[href="/recruiter"]').first()).toBeVisible();
    await expect(page.locator('a[href="/recruiter/jobs"]').first()).toBeVisible();
    await expect(page.locator('a[href="/recruiter/company"]').first()).toBeVisible();

    // "Cấu hình AI" pointing to /admin/ai-settings MUST NOT exist in RecruiterNavbar
    await expect(page.locator('a[href="/admin/ai-settings"]')).toHaveCount(0);
    await expect(page.locator('text=Cấu hình AI')).toHaveCount(0);
  });

  test('10: Admin Access to Admin Portal & AdminNavbar Isolation', async ({ page }) => {
    await page.addInitScript(setupAdminSession);
    await page.goto('/admin');

    // Admin Portal indicator and AdminNavbar render
    await expect(page.locator('text=Admin Portal').first()).toBeVisible();
    await expect(page.locator('#admin-navbar-logout-btn')).toBeVisible();

    // Admin navigation links exist
    await expect(page.locator('a[href="/admin"]').first()).toBeVisible();
    await expect(page.locator('a[href="/admin/ai-settings"]').first()).toBeVisible();
    await expect(page.locator('a[href="/admin/companies"]').first()).toBeVisible();

    // Dashboard content renders
    await expect(page.locator('text=Bảng Điều Khiển Quản Trị Hệ Thống MidCV')).toBeVisible();
  });

  test('11: HR Direct Access to Admin Routes is strictly blocked by RoleGuard (403)', async ({ page }) => {
    await page.addInitScript(setupRecruiterSession);
    await page.goto('/admin');
    await expect(page.locator('#role-guard-forbidden')).toBeVisible();
    await expect(page.locator('#role-guard-forbidden')).toContainText('RECRUITER');

    // HR tries to visit /admin/ai-settings
    await page.goto('/admin/ai-settings');
    await expect(page.locator('#role-guard-forbidden')).toBeVisible();
    await expect(page.locator('#role-guard-forbidden')).toContainText('RECRUITER');
  });

  test('12: Candidate Direct Access to Admin Routes is strictly blocked by RoleGuard (403)', async ({ page }) => {
    await page.addInitScript(setupCandidateSession);
    await page.goto('/admin');
    await expect(page.locator('#role-guard-forbidden')).toBeVisible();
    await expect(page.locator('#role-guard-forbidden')).toContainText('CANDIDATE');

    // Candidate tries to visit /admin/companies
    await page.goto('/admin/companies');
    await expect(page.locator('#role-guard-forbidden')).toBeVisible();
    await expect(page.locator('#role-guard-forbidden')).toContainText('CANDIDATE');
  });

  test('13: Top Navbar text fits cleanly without crowding or text wrapping', async ({ page }) => {
    await page.addInitScript(setupCandidateSession);

    // Test on 1024px (small laptop), 1280px (standard laptop), 1440px (wide desktop)
    for (const width of [1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');

      const header = page.locator('header').first();
      await expect(header).toBeVisible();

      // Navigation links are visible
      await expect(header.locator('text=Việc làm')).toBeVisible();
      await expect(header.locator('text=Cẩm nang')).toBeVisible();

      // Check header bounding box does not overflow viewport width
      const box = await header.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeLessThanOrEqual(width);
    }
  });

  test('14: Admin login via Auth Modal lands on /admin and loads Admin Portal (Isolated Test Fixture)', async ({ page }) => {
    // Intercept login API to use isolated test fixture without hardcoding credentials in repository
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'OK',
          data: {
            accessToken: 'e2e-isolated-admin-jwt',
            refreshToken: 'e2e-isolated-admin-refresh',
            userId: 'usr-admin-e2e-fixture',
            email: 'admin-test@midcv.local',
            role: 'ADMIN'
          }
        })
      });
    });

    await page.goto('/');

    // Ensure session is clean but onboarding is dismissed
    await page.evaluate(() => {
      window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
      window.localStorage.removeItem('auth_user');
      window.localStorage.removeItem('auth_token');
    });
    await page.reload();

    // Click "Đăng nhập"
    const signInBtn = page.locator('button:has-text("Đăng nhập")').first();
    await expect(signInBtn).toBeVisible();
    await signInBtn.click();

    // Fill test credentials
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await emailInput.fill('admin-test@midcv.local');

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('TestAdminSecure123!');

    // Submit
    const submitBtn = page.locator('button[type="submit"]:has-text("Đăng nhập ngay")');
    await submitBtn.click();

    // Should navigate to /admin and render Admin Portal
    await page.waitForURL('**/admin', { timeout: 10000 });
    await expect(page.locator('text=Admin Portal').first()).toBeVisible();
    await expect(page.locator('#admin-navbar-logout-btn')).toBeVisible();
    await expect(page.locator('text=Bảng Điều Khiển Quản Trị Hệ Thống MidCV')).toBeVisible();
  });

});
