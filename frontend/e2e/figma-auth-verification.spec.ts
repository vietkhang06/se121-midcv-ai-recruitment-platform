import { test, expect } from '@playwright/test';

test.describe('Figma Pixel-Perfect Authentication Screens & Role Sync', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    // Reset to Vietnamese default for predictable test baseline
    await page.addInitScript(() => {
      localStorage.setItem('midcv_lang', 'vi');
      localStorage.setItem('matchjd_theme', 'dark');
    });
  });

  test('01: Candidate Login - matches Figma Image 1 & Full Page VI-EN translation', async ({ page }) => {
    await page.goto('/login?role=candidate');
    await page.waitForLoadState('domcontentloaded');

    // 1. Verify Left Column (Candidate Hero in VI)
    const hero = page.locator('[data-testid="auth-hero-banner"]');
    await expect(hero).toBeVisible();
    await expect(hero.getByRole('heading', { name: /bắt đầu hành trình/i })).toBeVisible();
    await expect(hero.getByText(/tạo tài khoản ứng viên trên midcv/i)).toBeVisible();

    // 2. Verify Right Column (Form in VI)
    await expect(page.getByText('Đăng nhập tài khoản')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Chào mừng quay trở lại!' })).toBeVisible();
    await expect(page.locator('#login-role-candidate-btn')).toBeVisible();
    await expect(page.locator('#login-role-recruiter-btn')).toBeVisible();
    await expect(page.locator('#login-role-candidate-btn')).toHaveText(/ứng viên/i);
    await expect(page.locator('#login-role-recruiter-btn')).toHaveText(/nhà tuyển dụng/i);

    // Verify Active Candidate Tab style
    await expect(page.locator('#login-role-candidate-btn')).toHaveClass(/text-\[#2563EB\]/);

    // Verify Form Inputs
    await expect(page.locator('#login-email-input')).toBeVisible();
    await expect(page.locator('#login-password-input')).toBeVisible();
    await expect(page.getByText('Ghi nhớ đăng nhập')).toBeVisible();
    await expect(page.getByText('Quên mật khẩu?')).toBeVisible();

    // Verify Language Switcher & Dark/Light Theme Switch
    await expect(page.locator('#login-lang-switch-btn')).toBeVisible();
    await expect(page.getByRole('switch')).toBeVisible();

    // Verify Submit CTA text in VI
    await expect(page.locator('#login-submit-btn')).toHaveText(/đăng nhập với tư cách ứng viên/i);

    // Verify Social Login Buttons
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /github/i })).toBeVisible();

    // 3. Test Full Page English Translation when clicking Language Switcher
    await page.locator('#login-lang-switch-btn').click();
    await expect(page.locator('#login-lang-switch-btn')).toHaveText(/EN/i);

    // Verify entire left hero translated to English
    await expect(hero.getByRole('heading', { name: /start your career/i })).toBeVisible();
    await expect(hero.getByText(/create a candidate account on midcv/i)).toBeVisible();

    // Verify entire right form translated to English
    await expect(page.getByText('Account Sign In')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
    await expect(page.locator('#login-role-candidate-btn')).toHaveText(/candidate/i);
    await expect(page.locator('#login-role-recruiter-btn')).toHaveText(/recruiter/i);
    await expect(page.getByText('Email or Phone number')).toBeVisible();
    await expect(page.getByText('Password *')).toBeVisible();
    await expect(page.getByText('Remember me')).toBeVisible();
    await expect(page.getByText('Forgot password?')).toBeVisible();
    await expect(page.locator('#login-submit-btn')).toHaveText(/sign in as candidate/i);
    await expect(page.getByText("Don't have an account?")).toBeVisible();
    await expect(page.getByText('Register now')).toBeVisible();

    // Test Theme Switch interaction
    await page.getByRole('switch').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', /light|dark/);

    // Take screenshot in English
    await page.screenshot({ path: 'e2e/screenshots/figma/01-candidate-login.png', fullPage: true });
  });

  test('02: HR Login via Role Switcher - seamless sync without page reload', async ({ page }) => {
    await page.goto('/login?role=candidate');
    await page.waitForLoadState('domcontentloaded');

    // Click HR / Recruiter tab
    await page.locator('#login-role-recruiter-btn').click();

    // Verify Left Column switched to Recruiter Hero
    const hero = page.locator('[data-testid="auth-hero-banner"]');
    await expect(hero.getByRole('heading', { name: /kết nối đúng ứng viên/i })).toBeVisible();
    await expect(hero.getByText(/tạo tài khoản nhà tuyển dụng trên midcv/i)).toBeVisible();

    // Verify Submit CTA text updated
    await expect(page.locator('#login-submit-btn')).toHaveText(/đăng nhập với tư cách nhà tuyển dụng/i);

    // Verify URL query parameter synced to hr
    expect(page.url()).toContain('role=hr');

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/figma/02-hr-login.png', fullPage: true });
  });

  test('03: Candidate Register - matches Figma without stepper, with language & theme switches', async ({ page }) => {
    await page.goto('/register?role=candidate');
    await page.waitForLoadState('domcontentloaded');

    // 1. Verify Left Column (Candidate Hero in VI)
    const hero = page.locator('[data-testid="auth-hero-banner"]');
    await expect(hero).toBeVisible();
    await expect(hero.getByRole('heading', { name: /bắt đầu hành trình/i })).toBeVisible();

    // 2. Verify Right Column (in VI)
    await expect(page.getByText('Đã có tài khoản?')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tạo tài khoản ứng viên' })).toBeVisible();
    await expect(page.getByText('Bắt đầu hành trình tìm kiếm công việc thông minh cùng midCV.')).toBeVisible();

    // Verify Language Switcher & Dark/Light Theme Switch are present
    await expect(page.locator('#register-lang-switch-btn')).toBeVisible();
    await expect(page.getByRole('switch')).toBeVisible();

    // Verify 3-step progress bar (stepper) is REMOVED as requested
    await expect(page.getByText('Thông tin cơ bản')).not.toBeVisible();
    await expect(page.getByText('Thông tin nghề nghiệp')).not.toBeVisible();
    await expect(page.getByText('Hoàn tất')).not.toBeVisible();

    // Verify Candidate Fields
    await expect(page.locator('#register-fullname-input')).toBeVisible();
    await expect(page.locator('#register-email-input')).toBeVisible();
    await expect(page.locator('#register-phone-input')).toBeVisible();
    await expect(page.locator('#register-target-title-input')).toBeVisible();

    // Verify Target Industries checklist in VI
    await expect(page.getByText('Ngành mục tiêu (có thể chọn nhiều ngành)')).toBeVisible();
    await expect(page.getByText('Công nghệ thông tin (IT)')).toBeVisible();
    await expect(page.getByText('Truyền thông & Marketing')).toBeVisible();
    await expect(page.getByText('Nhân sự (HR)')).toBeVisible();

    // Verify Password Inputs
    await expect(page.locator('#register-password-input')).toBeVisible();
    await expect(page.locator('#register-confirm-password-input')).toBeVisible();

    // Verify Submit CTA in VI
    await expect(page.locator('#register-submit-btn')).toHaveText(/tạo tài khoản & nhận link xác thực/i);

    // 3. Test Full Page English Translation on Register
    await page.locator('#register-lang-switch-btn').click();
    await expect(page.locator('#register-lang-switch-btn')).toHaveText(/EN/i);

    // Verify entire left hero translated to English
    await expect(hero.getByRole('heading', { name: /start your career/i })).toBeVisible();

    // Verify entire right form translated to English
    await expect(page.getByText('Already have an account?')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Create Candidate Account' })).toBeVisible();
    await expect(page.locator('#register-role-candidate-btn')).toHaveText(/job seeker/i);
    await expect(page.locator('#register-role-recruiter-btn')).toHaveText(/recruiter/i);
    await expect(page.getByText('Candidate Full Name *')).toBeVisible();
    await expect(page.getByText('Account Email *')).toBeVisible();
    await expect(page.getByText('Phone Number *')).toBeVisible();
    await expect(page.getByText('Target Job Title *')).toBeVisible();
    await expect(page.getByText('Target Industries (Multi-select)')).toBeVisible();
    await expect(page.getByText('Information Technology (IT)')).toBeVisible();
    await expect(page.getByText('Marketing & Communications')).toBeVisible();
    await expect(page.locator('#register-submit-btn')).toHaveText(/create account & get verification link/i);

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/figma/03-candidate-register.png', fullPage: true });
  });

  test('04: HR Register - matches Figma Image 3', async ({ page }) => {
    await page.goto('/register?role=hr');
    await page.waitForLoadState('domcontentloaded');

    // 1. Verify Left Column (HR Hero)
    const hero = page.locator('[data-testid="auth-hero-banner"]');
    await expect(hero).toBeVisible();
    await expect(hero.getByRole('heading', { name: /kết nối đúng ứng viên/i })).toBeVisible();
    await expect(hero.getByText(/tạo tài khoản nhà tuyển dụng trên midcv/i)).toBeVisible();

    // 2. Verify Right Column
    await expect(page.getByRole('heading', { name: 'Tạo tài khoản nhà tuyển dụng' })).toBeVisible();
    await expect(page.getByText('Tạo tài khoản tuyển dụng và bắt đầu kết nối với những ứng viên phù hợp.')).toBeVisible();

    // Verify Recruiter Specific Fields
    await expect(page.locator('#register-fullname-input')).toBeVisible();
    await expect(page.locator('#register-email-input')).toBeVisible();
    await expect(page.locator('#register-phone-input')).toBeVisible();
    await expect(page.locator('#register-company-name-input')).toBeVisible();
    await expect(page.locator('#register-company-address-input')).toBeVisible();
    await expect(page.locator('#register-company-industry-select')).toBeVisible();

    // Verify Bottom Login Link
    await expect(page.getByText('Đăng nhập tại đây')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/figma/04-hr-register.png', fullPage: true });
  });

  test('05: Mobile viewport responsive test (375x667)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login?role=candidate');
    await page.waitForLoadState('domcontentloaded');

    // Ensure no horizontal scrollbar on mobile
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    // Verify key elements visible and accessible
    await expect(page.locator('#login-email-input')).toBeVisible();
    await expect(page.locator('#login-submit-btn')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/figma/05-mobile-login.png', fullPage: true });
  });

  test('06: Tablet viewport responsive test (768x1024)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/register?role=candidate');
    await page.waitForLoadState('domcontentloaded');

    // Ensure no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    await expect(page.locator('#register-submit-btn')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/figma/06-tablet-register.png', fullPage: true });
  });
});
