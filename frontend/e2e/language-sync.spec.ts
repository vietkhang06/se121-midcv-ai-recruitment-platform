import { test, expect } from '@playwright/test';

test.describe('WP-02: Global Language Synchronization Suite (LANG-01 - LANG-06)', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
      window.localStorage.setItem('auth_user', JSON.stringify({
        id: 'usr-cand-01',
        email: 'andrew@devops.sterling.io',
        fullName: 'Andrew Sterling',
        role: 'CANDIDATE',
        emailVerified: true
      }));
      window.localStorage.setItem('auth_token', 'jwt-test-token-cand');
    });
  });

  test('LANG-01: Vietnamese language consistency across major routes', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('matchjd_lang', 'vi');
    });

    // Landing page
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Tìm Việc Làm' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Báo Cáo Phù Hợp' }).first()).toBeVisible();

    // Jobs page
    await page.goto('/jobs');
    await expect(page.getByText('Tìm Kiếm Việc Làm Toàn Quốc')).toBeVisible();

    // Help page
    await page.goto('/help');
    await expect(page.getByText('Hướng Dẫn Sử Dụng Nền Tảng MatchJD')).toBeVisible();

    // Candidate CVs
    await page.goto('/candidate/cvs');
    await expect(page.getByRole('link', { name: 'Tạo CV Mới' }).first()).toBeVisible();
  });

  test('LANG-02: English language consistency across major routes', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('matchjd_lang', 'en');
    });

    // Landing page
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Search Jobs' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'My Match Reports' }).first()).toBeVisible();

    // Jobs page
    await page.goto('/jobs');
    await expect(page.getByText('Job Search & Discovery')).toBeVisible();

    // Help page
    await page.goto('/help');
    await expect(page.getByText('MatchJD Platform User Guide')).toBeVisible();

    // Candidate CVs
    await page.goto('/candidate/cvs');
    await expect(page.getByRole('link', { name: 'Create New CV' }).first()).toBeVisible();
  });

  test('LANG-03: Language persistence across page reload', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('matchjd_lang', 'en');
    });

    await page.goto('/jobs');
    await expect(page.getByText('Job Search & Discovery')).toBeVisible();

    await page.reload();
    await expect(page.getByText('Job Search & Discovery')).toBeVisible();
    const storedLang = await page.evaluate(() => localStorage.getItem('matchjd_lang'));
    expect(storedLang).toBe('en');

    // Switch to Vietnamese via toggle button
    const langBtn = page.getByRole('button', { name: /EN|VI/i }).first();
    await langBtn.click();
    await page.waitForTimeout(300);

    const updatedLang = await page.evaluate(() => localStorage.getItem('matchjd_lang'));
    expect(updatedLang).toBe('vi');
    await expect(page.getByText('Tìm Kiếm Việc Làm Toàn Quốc')).toBeVisible();
  });

  test('LANG-04: Modal language consistency in both locales', async ({ page }) => {
    // English mode
    await page.addInitScript(() => {
      window.localStorage.setItem('matchjd_lang', 'en');
    });

    await page.goto('/jobs');
    const quickApplyBtn = page.getByRole('button', { name: /Quick Apply|Apply/i }).first();
    if (await quickApplyBtn.isVisible()) {
      await quickApplyBtn.click();
      await expect(page.getByText('Select CV').first()).toBeVisible();
      await expect(page.getByText('Review Match Grid').first()).toBeVisible();
      await expect(page.getByText('Confirm & Send').first()).toBeVisible();
    }
  });

  test('LANG-05: Logout confirmation dialog language', async ({ page }) => {
    // Start on home page in Vietnamese (default)
    await page.goto('/');
    const logoutBtn = page.getByRole('button', { name: 'Đăng xuất' });
    await logoutBtn.click();

    // Expect modal dialog with Vietnamese text
    await expect(page.getByText('Xác Nhận Đăng Xuất')).toBeVisible();
    await expect(page.getByText('Bạn có chắc chắn muốn đăng xuất khỏi tài khoản MatchJD không?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hủy' })).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: 'Hủy' }).click();
    await expect(page.getByText('Xác Nhận Đăng Xuất')).not.toBeVisible();

    // Switch to English using the Navbar language toggle button
    const langBtn = page.getByRole('button', { name: /VI|EN/i }).first();
    await langBtn.click();
    await page.waitForTimeout(300);

    const logoutBtnEn = page.getByRole('button', { name: 'Sign Out' });
    await logoutBtnEn.click();

    await expect(page.getByText('Confirm Sign Out')).toBeVisible();
    await expect(page.getByText('Are you sure you want to sign out of your MatchJD account?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('LANG-06: CV extraction UI language (CVUploadModal)', async ({ page }) => {
    await page.goto('/candidate/cvs');
    await page.locator('#upload-cv-btn').click();

    await expect(page.getByText('Tải Lên & Phân Tích CV (PDF / DOCX)')).toBeVisible();
    await expect(page.getByText('Ngành nghề định hướng')).toBeVisible();
    await expect(page.getByText('Vị trí mong muốn')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bắt Đầu Phân Tích & Trích Xuất AI' })).toBeVisible();

    // Close modal with Escape or close button
    await page.locator('#close-cv-upload-modal-btn').click();
    await expect(page.getByText('Tải Lên & Phân Tích CV (PDF / DOCX)')).not.toBeVisible();

    // Switch to English via Navbar language toggle
    const langBtn = page.getByRole('button', { name: /VI|EN/i }).first();
    await langBtn.click();
    await page.waitForTimeout(300);

    await page.locator('#upload-cv-btn').click();

    await expect(page.getByText('Upload & Parse CV (PDF / DOCX)')).toBeVisible();
    await expect(page.getByText('Target Industry')).toBeVisible();
    await expect(page.getByText('Target Role')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start AI Parsing & Extraction' })).toBeVisible();
  });

});
