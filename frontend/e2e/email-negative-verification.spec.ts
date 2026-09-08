import { test, expect } from '@playwright/test';

test.describe('Negative Email Verification & User Data Isolation Suite', () => {

  test('01: Fake/non-existent email address remains unverified and is blocked from login', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    });

    await page.goto('/');
    await page.getByRole('button', { name: /đăng ký/i }).click();

    // Fill registration with fake/non-receivable email
    const fakeEmail = 'fake-address-that-will-not-receive-mail@invalid-domain-example.test';
    await page.getByPlaceholder('Nguyễn Văn A').fill('Fake Candidate');
    await page.locator('input[type="email"]').fill(fakeEmail);

    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('Password123!');
    await passwordInputs.nth(1).fill('Password123!');

    // Submit registration
    await page.getByRole('button', { name: /tạo tài khoản & nhận link xác thực/i }).click();

    // Must show verification pending screen
    await expect(page.getByRole('heading', { name: /kiểm tra hộp thư email của bạn/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(fakeEmail).first()).toBeVisible();

    // Close auth modal
    await page.getByLabel('Close').click();

    // Attempt to log in with this unverified account
    await page.getByRole('button', { name: /đăng nhập/i }).click();
    await page.getByPlaceholder('name@example.com').fill(fakeEmail);
    await page.getByPlaceholder('Nhập mật khẩu...').fill('Password123!');
    await page.locator('form').getByRole('button', { name: /đăng nhập ngay/i }).click();

    // Must be blocked with clear unverified notice
    await expect(page.getByText('Email của bạn chưa được xác thực. Vui lòng xác thực tài khoản để đăng nhập.')).toBeVisible({ timeout: 4000 });

    // User is NOT authenticated
    await expect(page.getByRole('button', { name: /đăng xuất/i })).not.toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/negative-01-fake-email-blocked.png' });
  });

  test('02: Forged / corrupted verification token fails verification', async ({ page }) => {
    await page.goto('/verify-email?token=completely-forged-token-999999');
    await expect(page.getByRole('heading', { name: /xác thực không thành công/i })).toBeVisible();
    await expect(page.getByText('Mã xác thực không hợp lệ')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/negative-02-forged-token-rejected.png' });
  });

  test('03: Resend verification cooldown prevents rapid spamming', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    });

    await page.goto('/');
    await page.getByRole('button', { name: /đăng ký/i }).click();

    const email = `cooldown-${Date.now()}@example.com`;
    await page.getByPlaceholder('Nguyễn Văn A').fill('Cooldown User');
    await page.locator('input[type="email"]').fill(email);

    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('Password123!');
    await passwordInputs.nth(1).fill('Password123!');
    await page.getByRole('button', { name: /tạo tài khoản & nhận link xác thực/i }).click();

    // Verify screen has resend button disabled with cooldown timer
    await expect(page.getByRole('button', { name: /gửi lại sau \d+s/i })).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/negative-03-resend-cooldown.png' });
  });

  test('04: Multi-User Data Isolation — User B cannot view User A private data', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    });

    // 1. Register & verify User A
    const userAEmail = `usera-${Date.now()}@example.com`;
    await page.goto('/');
    await page.getByRole('button', { name: /đăng ký/i }).click();
    await page.getByPlaceholder('Nguyễn Văn A').fill('User A Confidential');
    await page.locator('input[type="email"]').fill(userAEmail);
    const pwdA = page.locator('input[type="password"]');
    await pwdA.nth(0).fill('Password123!');
    await pwdA.nth(1).fill('Password123!');
    await page.getByRole('button', { name: /tạo tài khoản & nhận link xác thực/i }).click();

    // Verify User A via dev token
    const devVerifyLink = page.getByRole('link', { name: /xác thực ngay \(mở liên kết\)/i });
    await devVerifyLink.click();
    await expect(page.getByRole('heading', { name: /xác thực email thành công/i })).toBeVisible();

    // Log in as User A
    await page.getByRole('button', { name: /đăng nhập ngay/i }).last().click();
    await page.getByPlaceholder('name@example.com').fill(userAEmail);
    await page.getByPlaceholder('Nhập mật khẩu...').fill('Password123!');
    await page.locator('form').getByRole('button', { name: /đăng nhập ngay/i }).click();

    // User A is logged in
    await expect(page.getByText('User A Confidential')).toBeVisible();

    // User A logs out
    await page.getByRole('button', { name: /đăng xuất/i }).click();
    const confirmLogout = page.locator('#confirm-logout-btn');
    if (await confirmLogout.isVisible()) {
      await confirmLogout.click();
    }
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();

    // 2. Register & verify User B
    const userBEmail = `userb-${Date.now()}@example.com`;
    await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
    await page.getByPlaceholder('Nguyễn Văn A').fill('User B Distinct');
    await page.locator('input[type="email"]').fill(userBEmail);
    const pwdB = page.locator('input[type="password"]');
    await pwdB.nth(0).fill('Password123!');
    await pwdB.nth(1).fill('Password123!');
    await page.getByRole('button', { name: /tạo tài khoản & nhận link xác thực/i }).click();

    // Verify User B
    const devVerifyLinkB = page.getByRole('link', { name: /xác thực ngay \(mở liên kết\)/i });
    await devVerifyLinkB.click();
    await expect(page.getByRole('heading', { name: /xác thực email thành công/i })).toBeVisible();

    // Log in as User B
    await page.getByRole('button', { name: /đăng nhập ngay/i }).last().click();
    await page.getByPlaceholder('name@example.com').fill(userBEmail);
    await page.getByPlaceholder('Nhập mật khẩu...').fill('Password123!');
    await page.locator('form').getByRole('button', { name: /đăng nhập ngay/i }).click();

    // User B is logged in
    await expect(page.getByText('User B Distinct')).toBeVisible();
    // User B must NOT see User A's name in the header
    await expect(page.getByText('User A Confidential')).not.toBeVisible();

    // Go to CV Management
    await page.goto('/candidate/cvs');
    // User B must not see any CVs belonging to User A
    await expect(page.getByText('User A Confidential')).not.toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/negative-04-user-isolation-success.png' });
  });

});
