import { test, expect } from '@playwright/test';

test.describe('Figma Pixel-Perfect Authentication Screens & UX Verification', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    // Reset to Vietnamese default for predictable test baseline
    await page.addInitScript(() => {
      localStorage.setItem('midcv_lang', 'vi');
      localStorage.setItem('matchjd_theme', 'dark');
    });
  });

  test('01: Candidate Login - Split Screen, Social Logins (Google, GitHub, LinkedIn), Password Toggle & VI-EN translation', async ({ page }) => {
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
    const emailInput = page.locator('#login-email-input');
    const passwordInput = page.locator('#login-password-input');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // 3. Test Password Visibility Toggle in Login
    const loginToggleBtn = passwordInput.locator('xpath=following-sibling::button');
    await expect(loginToggleBtn).toBeVisible();
    await expect(loginToggleBtn).toHaveAttribute('type', 'button');

    // Click toggle to reveal password
    await loginToggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click toggle again to hide password
    await loginToggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Verify Checkbox & Forgot Password Link
    await expect(page.getByText('Ghi nhớ đăng nhập')).toBeVisible();
    await expect(page.getByText('Quên mật khẩu?')).toBeVisible();

    // Verify Language Switcher & Dark/Light Theme Switch
    await expect(page.locator('#login-lang-switch-btn')).toBeVisible();
    await expect(page.getByRole('switch')).toBeVisible();

    // Verify Submit CTA text in VI
    await expect(page.locator('#login-submit-btn')).toHaveText(/đăng nhập với tư cách ứng viên/i);

    // Verify Social Logins (Google, GitHub, LinkedIn) under divider
    await expect(page.getByText('- Hoặc tiếp tục với -')).toBeVisible();
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /github/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /linkedin/i })).toBeVisible();

    // Test OAuth simulated interaction
    await page.getByRole('button', { name: /google/i }).click();
    await expect(page.getByText(/đang kết nối xác thực/i)).toBeVisible();

    // 4. Test Full Page English Translation when clicking Language Switcher
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
    await expect(page.getByText('- Or continue with -')).toBeVisible();
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

  test('03: Candidate Register - Password Visibility Toggle, Password Strength Bar & Password Match Indicator', async ({ page }) => {
    await page.goto('/register?role=candidate');
    await page.waitForLoadState('domcontentloaded');

    // 1. Verify Left Column (Candidate Hero in VI)
    const hero = page.locator('[data-testid="auth-hero-banner"]');
    await expect(hero).toBeVisible();
    await expect(hero.getByRole('heading', { name: /bắt đầu hành trình/i })).toBeVisible();

    // 2. Verify Right Column (in VI)
    await expect(page.getByText('Đã có tài khoản?').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tạo tài khoản ứng viên' })).toBeVisible();
    await expect(page.getByText('Bắt đầu hành trình tìm kiếm công việc thông minh cùng midCV.')).toBeVisible();

    // Verify Language Switcher & Dark/Light Theme Switch are present
    await expect(page.locator('#register-lang-switch-btn')).toBeVisible();
    await expect(page.getByRole('switch')).toBeVisible();

    // Verify Role Switcher
    await expect(page.locator('#register-role-candidate-btn')).toBeVisible();
    await expect(page.locator('#register-role-recruiter-btn')).toBeVisible();

    // Verify Email or Phone input
    const emailInput = page.locator('#register-email-input');
    await expect(emailInput).toBeVisible();

    // Verify Password Inputs
    const passwordInput = page.locator('#register-password-input');
    const confirmPasswordInput = page.locator('#register-confirm-password-input');
    await expect(passwordInput).toBeVisible();
    await expect(confirmPasswordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(confirmPasswordInput).toHaveAttribute('type', 'password');

    // 3. Test Password Visibility Toggles for BOTH Password and Confirm Password
    const passwordToggleBtn = passwordInput.locator('xpath=following-sibling::button');
    const confirmPasswordToggleBtn = confirmPasswordInput.locator('xpath=following-sibling::button');

    await expect(passwordToggleBtn).toHaveAttribute('type', 'button');
    await expect(confirmPasswordToggleBtn).toHaveAttribute('type', 'button');

    // Toggle Password Visibility
    await passwordToggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await passwordToggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Toggle Confirm Password Visibility
    await confirmPasswordToggleBtn.click();
    await expect(confirmPasswordInput).toHaveAttribute('type', 'text');
    await confirmPasswordToggleBtn.click();
    await expect(confirmPasswordInput).toHaveAttribute('type', 'password');

    // 4. Test Password Strength Bar UX
    await passwordInput.fill('weak');
    const strengthContainer = page.locator('[data-testid="password-strength-container"]');
    await expect(strengthContainer).toBeVisible();
    await expect(page.locator('[data-testid="password-strength-label"]')).toHaveText(/yếu/i);

    // Type strong password
    await passwordInput.fill('MidCV@2026Secure!');
    await expect(page.locator('[data-testid="password-strength-label"]')).toHaveText(/mạnh/i);

    // 5. Test Password Match Visual Notification
    // First, mismatched password
    await confirmPasswordInput.fill('MismatchPass');
    await expect(page.getByText('Mật khẩu chưa khớp')).toBeVisible();

    // Then, matching password
    await confirmPasswordInput.fill('MidCV@2026Secure!');
    await expect(page.getByText('Mật khẩu trùng khớp')).toBeVisible();

    // 6. Verify Terms & Privacy Agreement Checkbox
    await expect(page.getByText('Tôi đồng ý với')).toBeVisible();
    await expect(page.getByText('Điều khoản dịch vụ')).toBeVisible();
    await expect(page.getByText('Chính sách bảo mật')).toBeVisible();

    // 7. Verify Submit CTA in VI
    await expect(page.locator('#register-submit-btn')).toHaveText(/tạo tài khoản & nhận link xác thực/i);

    // 8. Verify Social Logins (Google, GitHub, LinkedIn)
    await expect(page.getByText('- Hoặc tiếp tục với -')).toBeVisible();
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /github/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /linkedin/i })).toBeVisible();

    // 9. Test Full Page English Translation on Register
    await page.locator('#register-lang-switch-btn').click();
    await expect(page.locator('#register-lang-switch-btn')).toHaveText(/EN/i);

    // Verify entire left hero translated to English
    await expect(hero.getByRole('heading', { name: /start your career/i })).toBeVisible();

    // Verify entire right form translated to English
    await expect(page.getByText('Already have an account?').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Create Candidate Account' })).toBeVisible();
    await expect(page.locator('#register-role-candidate-btn')).toHaveText(/candidate/i);
    await expect(page.locator('#register-role-recruiter-btn')).toHaveText(/recruiter/i);
    await expect(page.getByText('Email or Phone number')).toBeVisible();
    await expect(page.getByText('Password *', { exact: true })).toBeVisible();
    await expect(page.getByText('Confirm Password *')).toBeVisible();
    await expect(page.getByText('Passwords match')).toBeVisible();
    await expect(page.locator('#register-submit-btn')).toHaveText(/create account & get verification link/i);

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/figma/03-candidate-register.png', fullPage: true });
  });

  test('04: HR Register - matches Recruiter Split Screen and Role Sync', async ({ page }) => {
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

    // Verify Credentials & Security Inputs
    await expect(page.locator('#register-email-input')).toBeVisible();
    await expect(page.locator('#register-password-input')).toBeVisible();
    await expect(page.locator('#register-confirm-password-input')).toBeVisible();

    // Verify Social Logins
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /github/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /linkedin/i })).toBeVisible();

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
