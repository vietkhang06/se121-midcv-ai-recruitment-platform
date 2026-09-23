import { test, expect } from '@playwright/test';

test.describe('Logout Confirmation Modal Positioning & UX Suite', () => {

  const candidateInitScript = () => {
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

  test('01: Desktop Viewport (1280x800) -> Modal is precisely centered in viewport', async ({ page }) => {
    const vpWidth = 1280;
    const vpHeight = 800;
    await page.setViewportSize({ width: vpWidth, height: vpHeight });
    await page.addInitScript(candidateInitScript);

    await page.goto('/');

    const logoutBtn = page.locator('#navbar-logout-btn');
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Verify modal overlay and dialog
    const modalDialog = page.locator('div[role="dialog"] > div').first();
    await expect(modalDialog).toBeVisible();

    const box = await modalDialog.boundingBox();
    expect(box).not.toBeNull();

    // Verify centered horizontally within 5px tolerance
    const modalCenterX = box!.x + box!.width / 2;
    const expectedCenterX = vpWidth / 2;
    expect(Math.abs(modalCenterX - expectedCenterX)).toBeLessThanOrEqual(5);

    // Verify centered vertically within 5px tolerance
    const modalCenterY = box!.y + box!.height / 2;
    const expectedCenterY = vpHeight / 2;
    expect(Math.abs(modalCenterY - expectedCenterY)).toBeLessThanOrEqual(5);

    // Must not be cut off at top or bottom
    expect(box!.y).toBeGreaterThan(0);
    expect(box!.y + box!.height).toBeLessThan(vpHeight);

    // Verify overlay covers the entire viewport
    const overlay = page.locator('div[role="dialog"]').first();
    const overlayBox = await overlay.boundingBox();
    expect(overlayBox).not.toBeNull();
    expect(overlayBox!.x).toBe(0);
    expect(overlayBox!.y).toBe(0);
    expect(overlayBox!.width).toBe(vpWidth);
    expect(overlayBox!.height).toBe(vpHeight);

    await page.screenshot({ path: 'e2e/screenshots/logout-modal-desktop.png' });

    // Click Hủy closes modal
    const cancelBtn = page.getByRole('button', { name: /hủy/i });
    await cancelBtn.click();
    await expect(modalDialog).toBeHidden();
  });

  test('02: Scrolled Page State -> Modal remains centered in viewport independent of scroll position', async ({ page }) => {
    const vpWidth = 1280;
    const vpHeight = 800;
    await page.setViewportSize({ width: vpWidth, height: vpHeight });
    await page.addInitScript(candidateInitScript);

    await page.goto('/help');

    // Scroll down significantly
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(100);

    const logoutBtn = page.locator('#navbar-logout-btn');
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    const modalDialog = page.locator('div[role="dialog"] > div').first();
    await expect(modalDialog).toBeVisible();

    const box = await modalDialog.boundingBox();
    expect(box).not.toBeNull();

    // Still centered vertically in the visible viewport
    const modalCenterY = box!.y + box!.height / 2;
    const expectedCenterY = vpHeight / 2;
    expect(Math.abs(modalCenterY - expectedCenterY)).toBeLessThanOrEqual(5);

    expect(box!.y).toBeGreaterThan(0);
    expect(box!.y + box!.height).toBeLessThan(vpHeight);

    await page.screenshot({ path: 'e2e/screenshots/logout-modal-scrolled.png' });

    // Press Escape closes modal
    await page.keyboard.press('Escape');
    await expect(modalDialog).toBeHidden();
  });

  test('03: Tablet Viewport (768x1024) -> Modal is centered with horizontal margin safety', async ({ page }) => {
    const vpWidth = 768;
    const vpHeight = 1024;
    await page.setViewportSize({ width: vpWidth, height: vpHeight });
    await page.addInitScript(candidateInitScript);

    await page.goto('/');

    // In tablet mode, open mobile menu or click logout
    const mobileBtn = page.locator('#mobile-menu-btn');
    if (await mobileBtn.isVisible()) {
      await mobileBtn.click();
      const drawerLogoutBtn = page.locator('button:has-text("Đăng xuất"), button:has-text("Sign Out")').last();
      await drawerLogoutBtn.click();
    } else {
      await page.locator('#navbar-logout-btn').click();
    }

    const modalDialog = page.locator('div[role="dialog"] > div').first();
    await expect(modalDialog).toBeVisible();

    const box = await modalDialog.boundingBox();
    expect(box).not.toBeNull();

    // Centered horizontally & vertically
    const modalCenterX = box!.x + box!.width / 2;
    expect(Math.abs(modalCenterX - vpWidth / 2)).toBeLessThanOrEqual(5);

    const modalCenterY = box!.y + box!.height / 2;
    expect(Math.abs(modalCenterY - vpHeight / 2)).toBeLessThanOrEqual(5);

    // Margins to edges
    expect(box!.x).toBeGreaterThanOrEqual(16);
    expect(box!.x + box!.width).toBeLessThanOrEqual(vpWidth - 16);

    await page.screenshot({ path: 'e2e/screenshots/logout-modal-tablet.png' });
  });

  test('04: Mobile Viewport (375x667) -> Modal fits screen and is centered vertically without clipping', async ({ page }) => {
    const vpWidth = 375;
    const vpHeight = 667;
    await page.setViewportSize({ width: vpWidth, height: vpHeight });
    await page.addInitScript(candidateInitScript);

    await page.goto('/');

    const mobileBtn = page.locator('#mobile-menu-btn');
    await expect(mobileBtn).toBeVisible();
    await mobileBtn.click();

    const drawerLogoutBtn = page.locator('#mobile-drawer-logout-btn');
    await expect(drawerLogoutBtn).toBeVisible();
    await drawerLogoutBtn.click();

    const modalDialog = page.locator('div[role="dialog"] > div').first();
    await expect(modalDialog).toBeVisible();

    const box = await modalDialog.boundingBox();
    expect(box).not.toBeNull();

    // Centered in viewport
    const modalCenterX = box!.x + box!.width / 2;
    expect(Math.abs(modalCenterX - vpWidth / 2)).toBeLessThanOrEqual(5);

    const modalCenterY = box!.y + box!.height / 2;
    expect(Math.abs(modalCenterY - vpHeight / 2)).toBeLessThanOrEqual(5);

    // Completely inside viewport
    expect(box!.x).toBeGreaterThanOrEqual(8);
    expect(box!.x + box!.width).toBeLessThanOrEqual(vpWidth - 8);
    expect(box!.y).toBeGreaterThan(0);
    expect(box!.y + box!.height).toBeLessThan(vpHeight);

    await page.screenshot({ path: 'e2e/screenshots/logout-modal-mobile.png' });

    // Confirm logout
    const confirmLogout = page.locator('#confirm-logout-btn');
    await expect(confirmLogout).toBeVisible();
    await confirmLogout.click();

    // Modal is gone, user is logged out (token cleared from localStorage)
    await expect(modalDialog).toBeHidden();
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeNull();
  });
});
