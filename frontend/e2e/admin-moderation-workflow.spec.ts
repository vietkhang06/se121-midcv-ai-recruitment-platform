import { test, expect } from '@playwright/test';

test.describe('Admin Moderation & Verification Real Workflow Suite', () => {

  const setupAdminSession = () => {
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
      id: 'usr-rec-01',
      email: 'hr@techcorp.vn',
      fullName: 'Nguyễn Thị Recruiter',
      role: 'RECRUITER',
      emailVerified: true
    }));
    window.localStorage.setItem('auth_token', 'jwt-test-token-rec');
  };

  test('01: Candidate cannot access Admin routes (403 RoleGuard)', async ({ page }) => {
    await page.addInitScript(setupCandidateSession);
    await page.goto('/admin');
    await expect(page.locator('#role-guard-forbidden')).toBeVisible();
    await expect(page.locator('#role-guard-forbidden')).toContainText('CANDIDATE');

    await page.goto('/admin/companies');
    await expect(page.locator('#role-guard-forbidden')).toBeVisible();

    await page.goto('/admin/users');
    await expect(page.locator('#role-guard-forbidden')).toBeVisible();

    await page.goto('/admin/moderation');
    await expect(page.locator('#role-guard-forbidden')).toBeVisible();
  });

  test('02: Recruiter cannot access Admin routes (403 RoleGuard)', async ({ page }) => {
    await page.addInitScript(setupRecruiterSession);
    await page.goto('/admin');
    await expect(page.locator('#role-guard-forbidden')).toBeVisible();
    await expect(page.locator('#role-guard-forbidden')).toContainText('RECRUITER');

    await page.goto('/admin/companies');
    await expect(page.locator('#role-guard-forbidden')).toBeVisible();

    await page.goto('/admin/users');
    await expect(page.locator('#role-guard-forbidden')).toBeVisible();
  });

  test('03: Admin navigation bar contains all required moderation modules', async ({ page }) => {
    await page.addInitScript(setupAdminSession);
    await page.goto('/admin');

    await expect(page.locator('a[href="/admin"]').first()).toBeVisible();
    await expect(page.locator('a[href="/admin/companies"]').first()).toBeVisible();
    await expect(page.locator('a[href="/admin/users"]').first()).toBeVisible();
    await expect(page.locator('a[href="/admin/moderation"]').first()).toBeVisible();
    await expect(page.locator('a[href="/admin/taxonomy"]').first()).toBeVisible();
    await expect(page.locator('a[href="/admin/ai-settings"]').first()).toBeVisible();
    await expect(page.locator('a[href="/admin/audit-logs"]').first()).toBeVisible();
  });

  test('04: Company Verification page renders queue and filter tabs', async ({ page }) => {
    await page.addInitScript(setupAdminSession);
    await page.goto('/admin/companies');

    await expect(page.locator('h1:has-text("Thẩm Định & Xác Thực Doanh Nghiệp")')).toBeVisible();
    await expect(page.locator('button:has-text("Tất cả")')).toBeVisible();
    await expect(page.locator('button:has-text("Chờ duyệt")')).toBeVisible();
    await expect(page.locator('button:has-text("Đang thẩm định")')).toBeVisible();
    await expect(page.locator('button:has-text("Đã xác minh")')).toBeVisible();
  });

  test('05: User Moderation page displays role and status filters', async ({ page }) => {
    await page.addInitScript(setupAdminSession);
    await page.goto('/admin/users');

    await expect(page.locator('h1:has-text("Quản Trị Tài Khoản Người Dùng")')).toBeVisible();
    await expect(page.locator('button:has-text("Tất cả Vai trò")')).toBeVisible();
    await expect(page.locator('button:has-text("Ứng viên")')).toBeVisible();
    await expect(page.locator('button:has-text("Tuyển dụng")')).toBeVisible();
    await expect(page.locator('button:has-text("Hoạt động")')).toBeVisible();
    await expect(page.locator('button:has-text("Đã đình chỉ")')).toBeVisible();
  });

  test('06: Moderation page allows switching between Jobs and Reports tabs', async ({ page }) => {
    await page.addInitScript(setupAdminSession);
    await page.goto('/admin/moderation');

    await expect(page.locator('h1:has-text("Kiểm Duyệt & Xử Lý Vi Phạm")')).toBeVisible();
    await expect(page.locator('button:has-text("Kiểm Duyệt Tin Tuyển Dụng")')).toBeVisible();
    await expect(page.locator('button:has-text("Báo Cáo Vi Phạm Từ Người Dùng")')).toBeVisible();

    // Click Reports tab
    await page.locator('button:has-text("Báo Cáo Vi Phạm Từ Người Dùng")').click();
    await expect(page.locator('text=Đối tượng:').first()).toBeVisible();
  });

  test('07: Taxonomy page renders skill list and modal trigger', async ({ page }) => {
    await page.addInitScript(setupAdminSession);
    await page.goto('/admin/taxonomy');

    await expect(page.locator('h1:has-text("Quản Trị Danh Mục & Taxonomy")')).toBeVisible();
    await expect(page.locator('button:has-text("Thêm Kỹ Năng Mới")')).toBeVisible();
  });

  test('08: Audit Logs page renders immutable logs interface', async ({ page }) => {
    await page.addInitScript(setupAdminSession);
    await page.goto('/admin/audit-logs');

    await expect(page.locator('h1:has-text("Nhật Ký Quản Trị Hệ Thống")')).toBeVisible();
    await expect(page.locator('text=Bất biến & Chỉ đọc')).toBeVisible();
  });

});
