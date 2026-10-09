import { expect, test } from '@playwright/test';

const candidateInitScript = () => {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
  window.localStorage.setItem('midcv_lang', 'vi');
  window.localStorage.setItem('auth_user', JSON.stringify({
    id: 'cand-motion-01',
    email: 'motion@example.com',
    fullName: 'Motion Candidate',
    role: 'CANDIDATE',
    emailVerified: true,
  }));
  window.localStorage.setItem('auth_token', `e30.${payload}.motion-signature`);
  window.sessionStorage.setItem('e2e_seed_benchmark', 'true');
};

test.describe('MidCV motion system', () => {
  test('modal enters, traps focus, exits, and returns focus', async ({ page }) => {
    await page.addInitScript(candidateInitScript);
    await page.goto('/');

    const trigger = page.locator('#navbar-logout-btn');
    await trigger.focus();
    await trigger.click();

    const dialog = page.getByRole('dialog', { name: /Xác Nhận Đăng Xuất/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('data-state', 'open');
    await expect(page.getByRole('button', { name: 'Đóng' })).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    const focusRemainsInside = await dialog.evaluate((node) => node.contains(document.activeElement));
    expect(focusRemainsInside).toBeTruthy();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('reduced motion removes transforms while content remains visible', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(candidateInitScript);
    await page.goto('/');

    const firstReveal = page.locator('.motion-reveal').first();
    await expect(firstReveal).toBeVisible();
    const style = await firstReveal.evaluate((node) => {
      const computed = getComputedStyle(node);
      return { opacity: computed.opacity, transform: computed.transform };
    });
    expect(style.opacity).toBe('1');
    expect(style.transform).toBe('none');

    await page.locator('#navbar-logout-btn').click();
    const dialog = page.getByRole('dialog', { name: /Xác Nhận Đăng Xuất/i });
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((node) => getComputedStyle(node).transform)).toBe('none');
  });

  test('content remains visible when JavaScript is disabled', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Các Nhóm Ngành Định Hướng|Focus Industry Sectors/i })).toBeVisible();
    await expect(page.getByText('Distributed Systems', { exact: true })).toBeVisible();
    await context.close();
  });

  test('FAILED upload status stops processing motion and announces the real error', async ({ page }) => {
    await page.addInitScript(candidateInitScript);
    await page.route('**/api/v1/candidate/cvs', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 'SUCCESS', data: [] }) });
    });
    await page.route('**/api/v1/candidate/cvs/upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'SUCCESS',
          data: {
            id: 'cv-motion-failed',
            userId: 'cand-motion-01',
            title: 'Motion CV',
            targetIndustry: 'Technology',
            status: 'DRAFT',
            currentVersionNumber: 1,
            isDefault: false,
            versions: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    });
    await page.route('**/api/v1/candidate/cvs/cv-motion-failed/processing-status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'SUCCESS',
          data: {
            status: 'FAILED',
            stage: 'EXTRACTION',
            progress: 31,
            message: 'Không thể đọc nội dung CV từ phản hồi xử lý thật.',
            errorCode: 'CV_TEXT_EXTRACTION_FAILED',
            correlationId: 'motion-correlation-01',
          },
        }),
      });
    });

    await page.goto('/candidate/cvs');
    await page.locator('#upload-cv-btn').click();
    const modal = page.getByTestId('cv-upload-modal');
    await modal.locator('#cv-file-modal-input').setInputFiles({
      name: 'motion.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 Motion test'),
    });
    await modal.locator('button[type="submit"]').click();

    await expect(modal.getByRole('alert')).toContainText('Không thể đọc nội dung CV từ phản hồi xử lý thật.', { timeout: 10_000 });
    await expect(modal.locator('.animate-spin')).toHaveCount(0);
    await expect(modal.getByText('motion-correlation-01')).toBeVisible();
  });

  test('confirmation success is gated by the real confirm request', async ({ page }) => {
    let confirmRequestCount = 0;

    await page.addInitScript(candidateInitScript);
    await page.route('**/api/v1/candidate/profile', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'SUCCESS',
          data: {
            id: 'cand-motion-01',
            fullName: 'Motion Candidate',
            phone: '0900000000',
            headline: 'Frontend Engineer',
            bio: 'Motion system verification profile.',
            targetIndustry: 'Technology',
            targetIndustries: ['Technology'],
            skills: ['React'],
            githubUrl: '',
            portfolioUrl: '',
          },
        }),
      });
    });
    await page.route('**/api/v1/candidate/cvs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'SUCCESS',
          data: [{
            id: 'cv-motion-draft',
            title: 'Motion CV',
            targetIndustry: 'Technology',
            creationPath: 'UPLOAD',
            isDefault: true,
            status: 'DRAFT',
            currentVersionNumber: 1,
            updatedAt: new Date().toISOString(),
            versions: [],
          }],
        }),
      });
    });
    await page.route('**/api/v1/candidate/cvs/cv-motion-draft/confirm', async (route) => {
      confirmRequestCount += 1;
      expect(route.request().method()).toBe('POST');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'SUCCESS',
          data: {
            cv_id: 'cv-motion-draft',
            profile_id: 'cand-motion-01',
            status: 'CONFIRMED',
            confirmed_at: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto('/candidate/profile');
    await expect(page.getByText(/TRẠNG THÁI: BẢN THẢO \(DRAFT\)/i)).toBeVisible();
    await expect(page.getByText(/Hồ sơ đã được xác nhận thành công/i)).toHaveCount(0);
    expect(confirmRequestCount).toBe(0);

    await page.getByRole('button', { name: /Xác Nhận Hồ Sơ/i }).click();

    await expect(page.getByText(/TRẠNG THÁI: ĐÃ XÁC NHẬN \(CONFIRMED\)/i)).toBeVisible();
    await expect(page.getByText(/Hồ sơ đã được xác nhận thành công/i)).toBeVisible();
    expect(confirmRequestCount).toBe(1);
  });

  test('landing motion has no hydration errors and keeps CLS within budget', async ({ page }) => {
    const browserErrors: string[] = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });

    await page.addInitScript(() => {
      const motionWindow = window as Window & { __motionCls?: number };
      motionWindow.__motionCls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!shift.hadRecentInput) motionWindow.__motionCls = (motionWindow.__motionCls ?? 0) + (shift.value ?? 0);
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.addInitScript(candidateInitScript);
    await page.goto('/');
    await expect(page.locator('.motion-reveal').first()).toBeVisible();
    await page.waitForTimeout(600);

    const cls = await page.evaluate(() => (window as Window & { __motionCls?: number }).__motionCls ?? 0);
    expect(cls).toBeLessThanOrEqual(0.1);
    expect(browserErrors.filter((message) => /hydration|uncaught|typeerror|referenceerror/i.test(message))).toEqual([]);
  });

  test('captures desktop/mobile and light/dark motion baselines', async ({ page }) => {
    await page.addInitScript(candidateInitScript);
    const variants = [
      { name: 'desktop-light', width: 1280, height: 800, theme: 'light' },
      { name: 'desktop-dark', width: 1280, height: 800, theme: 'dark' },
      { name: 'mobile-light', width: 390, height: 844, theme: 'light' },
      { name: 'mobile-dark', width: 390, height: 844, theme: 'dark' },
    ] as const;

    for (const variant of variants) {
      await page.setViewportSize({ width: variant.width, height: variant.height });
      await page.goto('/');
      await page.evaluate((theme) => window.localStorage.setItem('midcv_theme', theme), variant.theme);
      await page.reload();
      await expect(page.locator('html')).toHaveClass(variant.theme === 'dark' ? /dark/ : /^(?!.*dark)/);
      await page.screenshot({ path: `e2e/screenshots/motion-${variant.name}.png`, fullPage: true });
    }
  });
});
