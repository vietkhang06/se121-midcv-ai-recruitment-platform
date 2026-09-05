import { test, expect } from '@playwright/test';

test.describe('Authentication, Email Verification & Runtime Stability Suite', () => {

  test('01: Clean anonymous start — default state is strictly ANONYMOUS', async ({ page }) => {
    // Start with fresh clean storage
    await page.goto('/');
    
    // Check that header displays anonymous actions
    await expect(page.getByRole('button', { name: /đăng nhập/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /đăng ký/i })).toBeVisible();
    
    // Ensure no demo user name or logout button is visible
    await expect(page.getByRole('button', { name: /đăng xuất/i })).not.toBeVisible();
    await expect(page.getByText('Nguyễn Văn Java')).not.toBeVisible();
    
    await page.screenshot({ path: 'e2e/screenshots/auth-01-anonymous-default.png' });
  });

  test('02: First visit onboarding does NOT auto-login user', async ({ page }) => {
    await page.goto('/');

    // If first visit modal appears, select candidate
    const candidateChoiceBtn = page.getByRole('button', { name: /tôi là ứng viên/i });
    if (await candidateChoiceBtn.isVisible()) {
      await candidateChoiceBtn.click();
      const startBtn = page.getByRole('button', { name: /bắt đầu ngay/i });
      await startBtn.click();

      // AuthModal opens in Register mode
      await expect(page.getByRole('heading', { name: /đăng ký tài khoản mới/i })).toBeVisible();

      // Close modal
      const closeBtn = page.getByLabel('Close');
      await closeBtn.click();
    }

    // User must still be anonymous
    await expect(page.getByRole('button', { name: /đăng nhập/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /đăng xuất/i })).not.toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/auth-02-onboarding-no-autologin.png' });
  });

  test('03: Zero React controlled/uncontrolled warnings in browser console', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('uncontrolled') || text.includes('controlled') || text.includes('Warning: A component is changing')) {
        consoleErrors.push(text);
      }
    });

    await page.addInitScript(() => {
      window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    });

    await page.goto('/');
    await page.getByRole('button', { name: /đăng nhập/i }).click();

    // Fill login fields
    await page.getByPlaceholder('name@example.com').fill('test@test.com');
    await page.getByPlaceholder('Nhập mật khẩu...').fill('Secret123!');

    // Switch to register tab
    await page.getByRole('button', { name: /đăng ký tài khoản/i }).click();
    await page.getByPlaceholder('Nguyễn Văn A').fill('Test Candidate');
    await page.locator('input[type="email"]').fill('newcand@test.com');

    // Verify no React warnings were emitted
    expect(consoleErrors).toEqual([]);
    await page.screenshot({ path: 'e2e/screenshots/auth-03-zero-react-warnings.png' });
  });

  test('04: Real-time debounced email existence check UX', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    });

    await page.goto('/');
    await page.getByRole('button', { name: /đăng ký/i }).click();

    const emailInput = page.locator('input[type="email"]');

    // 1. Enter already registered email
    await emailInput.fill('nguyenvanjava@example.com');
    await expect(page.getByText('Email này đã được sử dụng. Hãy đăng nhập hoặc sử dụng email khác.')).toBeVisible({ timeout: 4000 });

    // 2. Enter fresh available email
    await emailInput.fill('totally.new.candidate.2026@test.org');
    await expect(page.getByText('Email có thể sử dụng.')).toBeVisible({ timeout: 4000 });

    await page.screenshot({ path: 'e2e/screenshots/auth-04-email-check-ux.png' });
  });

  test('05: Registration creates unverified account and displays verification screen', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    });

    await page.goto('/');
    await page.getByRole('button', { name: /đăng ký/i }).click();

    const uniqueEmail = `cand-${Date.now()}@example.com`;
    await page.getByPlaceholder('Nguyễn Văn A').fill('Nguyen Thi Verification');
    await page.locator('input[type="email"]').fill(uniqueEmail);

    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('Password123!');
    await passwordInputs.nth(1).fill('Password123!');

    // Submit registration
    await page.getByRole('button', { name: /tạo tài khoản & nhận link xác thực/i }).click();

    // Verify verification pending screen appears
    await expect(page.getByRole('heading', { name: /kiểm tra hộp thư email của bạn/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(uniqueEmail).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /gửi lại/i })).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/auth-05-verification-pending-screen.png' });
  });

  test('06: Unverified login attempt is blocked with Vietnamese notice', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    });

    await page.goto('/');
    await page.getByRole('button', { name: /đăng nhập/i }).click();

    // Use seeded unverified user
    await page.getByPlaceholder('name@example.com').fill('unverified@example.com');
    await page.getByPlaceholder('Nhập mật khẩu...').fill('Password123!');
    await page.getByRole('button', { name: /đăng nhập ngay/i }).click();

    // Expect unverified error message
    await expect(page.getByText('Email của bạn chưa được xác thực. Vui lòng xác thực tài khoản để đăng nhập.')).toBeVisible();
    await expect(page.getByRole('button', { name: /gửi lại email xác thực/i })).toBeVisible();

    // User is NOT logged in
    await expect(page.getByRole('button', { name: /đăng xuất/i })).not.toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/auth-06-unverified-login-blocked.png' });
  });

  test('07: Dedicated /verify-email route verifies account with valid token', async ({ page }) => {
    // 1. Invalid token shows error
    await page.goto('/verify-email?token=invalid-fake-token-123');
    await expect(page.getByRole('heading', { name: /xác thực không thành công/i })).toBeVisible();
    await expect(page.getByText('Mã xác thực không hợp lệ')).toBeVisible();

    // 2. Register user & get dev token to verify
    await page.addInitScript(() => {
      window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    });
    await page.goto('/');
    await page.getByRole('button', { name: /đăng ký/i }).click();

    const email = `verifytest-${Date.now()}@example.com`;
    await page.getByPlaceholder('Nguyễn Văn A').fill('Auto Verified User');
    await page.locator('input[type="email"]').fill(email);
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('Password123!');
    await passwordInputs.nth(1).fill('Password123!');
    await page.getByRole('button', { name: /tạo tài khoản & nhận link xác thực/i }).click();

    // Click dev mode verification link
    const devVerifyLink = page.getByRole('link', { name: /xác thực ngay \(mở liên kết\)/i });
    await expect(devVerifyLink).toBeVisible();
    await devVerifyLink.click();

    // Verify success page is rendered
    await expect(page.getByRole('heading', { name: /xác thực email thành công/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /đăng nhập ngay/i })).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/auth-07-verify-email-success.png' });
  });

  test('08: Verified login succeeds and sets authenticated user session', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    });

    await page.goto('/');
    await page.getByRole('button', { name: /đăng nhập/i }).click();

    // Enter verified candidate credentials
    await page.getByPlaceholder('name@example.com').fill('nguyenvanjava@example.com');
    await page.getByPlaceholder('Nhập mật khẩu...').fill('Password123!');
    await page.getByRole('button', { name: /đăng nhập ngay/i }).click();

    // Verify header now shows user info and logout button
    await expect(page.getByText('Nguyễn Văn Java')).toBeVisible();
    await expect(page.getByText('CANDIDATE', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /đăng xuất/i })).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/auth-08-verified-login-success.png' });
  });

  test('09: Session persistence across page reload', async ({ page }) => {
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
      window.localStorage.setItem('auth_token', 'jwt-test-session');
    });

    await page.goto('/');
    await expect(page.getByText('Nguyễn Văn Java')).toBeVisible();

    // Reload page
    await page.reload();
    await expect(page.getByText('Nguyễn Văn Java')).toBeVisible();
    await expect(page.getByRole('button', { name: /đăng xuất/i })).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/auth-09-session-persisted.png' });
  });

  test('10: Logout clears session and returns strictly to anonymous state', async ({ page }) => {
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
      window.localStorage.setItem('auth_token', 'jwt-test-session');
    });

    await page.goto('/');
    await expect(page.getByText('Nguyễn Văn Java')).toBeVisible();

    // Click logout
    await page.getByRole('button', { name: /đăng xuất/i }).click();

    // Header immediately switches to anonymous state
    await expect(page.getByRole('button', { name: /đăng nhập/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /đăng ký/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /đăng xuất/i })).not.toBeVisible();

    // Reload page to verify logout persists
    await page.reload();
    await expect(page.getByRole('button', { name: /đăng nhập/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /đăng xuất/i })).not.toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/auth-10-logout-cleared.png' });
  });

  test('11: Auth Gate intercepts protected actions for anonymous users', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    });

    // Visit job detail as anonymous user
    await page.goto('/jobs/job-tech-01');
    const applyBtn = page.getByRole('button', { name: /nộp đơn/i }).first();
    await applyBtn.click();

    // Auth gate should be displayed
    await expect(page.getByRole('heading', { name: /yêu cầu đăng nhập để ứng tuyển/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /đăng nhập ngay/i })).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/auth-11-auth-gate-interception.png' });
  });

});
