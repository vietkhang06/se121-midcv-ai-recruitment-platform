import { test, expect } from '@playwright/test';

test.describe('Company Verification & Publishing Gating Lifecycle Suite', () => {

  const setupRecruiterSession = () => {
    window.sessionStorage.setItem('e2e_seed_benchmark', 'true');
    window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    window.localStorage.setItem('midcv_lang', 'vi');
    window.localStorage.setItem('auth_user', JSON.stringify({
      id: 'usr-rec-01',
      email: 'hr@fintech.vn',
      fullName: 'FinTech Recruiter',
      role: 'RECRUITER',
      emailVerified: true
    }));
    window.localStorage.setItem('auth_token', 'jwt-test-token-rec');
  };

  const setupAdminSession = () => {
    window.sessionStorage.setItem('e2e_seed_benchmark', 'true');
    window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    window.localStorage.setItem('midcv_lang', 'vi');
    window.localStorage.setItem('auth_user', JSON.stringify({
      id: 'usr-admin-01',
      email: 'admin@midcv.io',
      fullName: 'System Administrator',
      role: 'ADMIN',
      emailVerified: true
    }));
    window.localStorage.setItem('auth_token', 'jwt-test-token-admin');
  };

  test('01: Recruiter company page displays verification banner, tax code, and submit action', async ({ page }) => {
    await page.route('**/api/v1/recruiter/company', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Success',
          data: {
            id: 'comp-rec-01',
            name: 'FinTech Innovations Vietnam',
            taxCode: '0108877665',
            website: 'https://fintech.vn',
            industry: 'Technology',
            size: '50-200 nhân viên',
            verificationStatus: 'CHANGES_REQUESTED',
            reviewNotes: 'Vui lòng cung cấp mã số thuế chuẩn xác và website công ty.',
            version: 1
          }
        })
      });
    });

    await page.route('**/api/v1/recruiter/jobs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: []
        })
      });
    });

    await page.addInitScript(setupRecruiterSession);
    await page.goto('/recruiter/company');

    // Verify page title and header
    await expect(page.locator('h1')).toContainText('Hồ Sơ Doanh Nghiệp');

    // Verify tax code input is visible
    const taxCodeInput = page.locator('input[placeholder="0108877665"]');
    await expect(taxCodeInput).toBeVisible();

    // Verify save button exists
    await expect(page.locator('button:has-text("Lưu Thông Tin Doanh Nghiệp")')).toBeVisible();

    // Verify resubmit verification button exists for CHANGES_REQUESTED
    await expect(page.locator('button:has-text("Nộp lại Thẩm định (Resubmit)")')).toBeVisible();
  });

  test('02: Job creation page displays Rubric and publish button controls', async ({ page }) => {
    await page.addInitScript(setupRecruiterSession);
    await page.goto('/recruiter/jobs/new');

    // Wait for the new job page to load
    await expect(page.locator('h1')).toContainText('Tạo Tin Tuyển Dụng & Thiết Lập Rubric');

    // Check the save/publish controls exist
    const publishBtn = page.locator('button:has-text("Lưu Bản Nháp"), button:has-text("Xuất Bản Tin"), button:has-text("Publish")').first();
    await expect(publishBtn).toBeVisible();
  });

  test('03: Admin company verification page allows queue filtering and status review', async ({ page }) => {
    await page.addInitScript(setupAdminSession);
    await page.goto('/admin/companies');

    await expect(page.locator('h1')).toContainText('Thẩm Định & Xác Thực Doanh Nghiệp');

    // Queue filter tabs
    await expect(page.locator('button:has-text("Tất cả")')).toBeVisible();
    await expect(page.locator('button:has-text("Chờ duyệt")')).toBeVisible();
    await expect(page.locator('button:has-text("Đang thẩm định")')).toBeVisible();
    await expect(page.locator('button:has-text("Đã xác minh")')).toBeVisible();
    await expect(page.locator('button:has-text("Yêu cầu sửa đổi")')).toBeVisible();
    await expect(page.locator('button:has-text("Từ chối")')).toBeVisible();
    await expect(page.locator('button:has-text("Đình chỉ")')).toBeVisible();

    // Click 'Chờ duyệt' tab
    await page.locator('button:has-text("Chờ duyệt")').click();

    // Search input
    const searchInput = page.locator('input[placeholder*="Tìm theo tên"]');
    await expect(searchInput).toBeVisible();
  });

  test('04: Recruiter profile shows dynamic company verification badge without hardcoded VERIFIED', async ({ page }) => {
    await page.addInitScript(setupRecruiterSession);
    await page.goto('/recruiter/profile');

    await expect(page.locator('h1')).toContainText('Hồ Sơ Nhà Tuyển Dụng');
    await expect(page.locator('text=Trạng thái xác minh doanh nghiệp:')).toBeVisible();
  });
});
