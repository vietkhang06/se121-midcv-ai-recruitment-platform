import { test, expect } from '@playwright/test';

test.describe('HR/Recruiter Horizontal Overflow & Responsive Viewport Verification', () => {
  const recruiterInitScript = () => {
    window.sessionStorage.setItem('e2e_seed_benchmark', 'true');
    window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    window.localStorage.setItem('midcv_lang', 'vi');
    window.localStorage.setItem('auth_user', JSON.stringify({
      id: 'usr-rec-01',
      email: 'hr@fpt-software.com',
      fullName: 'Trần Thị Tuyển Dụng',
      role: 'RECRUITER',
      emailVerified: true
    }));
    window.localStorage.setItem('auth_token', 'jwt-test-token-rec');
  };

  const viewports = [
    { width: 1920, height: 1080, name: '1920x1080 Full HD' },
    { width: 1440, height: 900, name: '1440x900 Large Laptop' },
    { width: 1280, height: 800, name: '1280x800 Standard Laptop' },
    { width: 1024, height: 768, name: '1024x768 Small Laptop / Landscape Tablet' },
    { width: 768, height: 1024, name: '768x1024 Portrait Tablet' },
    { width: 390, height: 844, name: '390x844 Mobile' },
  ];

  for (const vp of viewports) {
    test(`Zero Horizontal Overflow on Recruiter Dashboard @ ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.addInitScript(recruiterInitScript);

      await page.goto('/recruiter');
      await page.waitForLoadState('networkidle');

      // Verify header is visible
      const header = page.locator('header').first();
      await expect(header).toBeVisible();

      // Check document horizontal overflow: scrollWidth must equal clientWidth
      const overflow = await page.evaluate(() => {
        const clientWidth = document.documentElement.clientWidth;
        const all = Array.from(document.querySelectorAll('*'));
        const bad = all
          .filter((el) => {
            const rect = el.getBoundingClientRect();
            return rect.right > clientWidth + 1;
          })
          .map((el) => ({
            tag: el.tagName,
            id: el.id,
            className: typeof el.className === 'string' ? el.className.slice(0, 80) : '',
            right: Math.round(el.getBoundingClientRect().right),
            width: Math.round(el.getBoundingClientRect().width),
          }));

        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          badCount: bad.length,
          bad: bad.slice(0, 5),
        };
      });

      console.log(`[Viewport ${vp.name}] Overflow Debug:`, JSON.stringify(overflow, null, 2));

      expect(overflow.hasOverflow).toBeFalsy();

      // Verify no UI element is clipping outside the viewport
      if (vp.width >= 768) {
        // Desktop / Tablet bottom nav should be visible and scrollable
        const nav = header.locator('nav').first();
        await expect(nav).toBeVisible();
      } else {
        // Mobile hamburger should be visible
        const mobileBtn = page.locator('#recruiter-mobile-menu-btn');
        await expect(mobileBtn).toBeVisible();
      }

      // Verify single "Tạo bài tuyển dụng" button exists in header on desktop/tablet
      if (vp.width >= 640) {
        const createJobLinks = page.locator('header a[href="/recruiter/jobs/new"]');
        await expect(createJobLinks).toHaveCount(1);
      }
    });

    test(`Zero Horizontal Overflow on Recruiter Jobs Page @ ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.addInitScript(recruiterInitScript);

      await page.goto('/recruiter/jobs');
      await page.waitForLoadState('networkidle');

      const overflow = await page.evaluate(() => {
        const clientWidth = document.documentElement.clientWidth;
        const all = Array.from(document.querySelectorAll('*'));
        const bad = all
          .filter((el) => el.getBoundingClientRect().right > clientWidth + 1)
          .map((el) => ({
            tag: el.tagName,
            id: el.id,
            className: typeof el.className === 'string' ? el.className.slice(0, 80) : '',
            right: Math.round(el.getBoundingClientRect().right),
            width: Math.round(el.getBoundingClientRect().width),
          }));

        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          bad,
        };
      });

      if (overflow.hasOverflow) {
        console.log(`[Viewport ${vp.name}] Jobs Page Overflow:`, JSON.stringify(overflow, null, 2));
      }

      expect(overflow.hasOverflow).toBeFalsy();
    });

    test(`Zero Horizontal Overflow on Recruiter Pipeline Page @ ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.addInitScript(recruiterInitScript);

      await page.goto('/recruiter/pipeline');
      await page.waitForLoadState('networkidle');

      const overflow = await page.evaluate(() => {
        const clientWidth = document.documentElement.clientWidth;
        const all = Array.from(document.querySelectorAll('*'));
        const bad = all
          .filter((el) => el.getBoundingClientRect().right > clientWidth + 1)
          .map((el) => ({
            tag: el.tagName,
            id: el.id,
            className: typeof el.className === 'string' ? el.className.slice(0, 80) : '',
            right: Math.round(el.getBoundingClientRect().right),
            width: Math.round(el.getBoundingClientRect().width),
          }));

        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          bad,
        };
      });

      if (overflow.hasOverflow) {
        console.log(`[Viewport ${vp.name}] Pipeline Page Overflow:`, JSON.stringify(overflow, null, 2));
      }

      expect(overflow.hasOverflow).toBeFalsy();
    });
  }

  test('Dropdown Account Menu and Direct Logout Functionality', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.addInitScript(recruiterInitScript);

    await page.goto('/recruiter');

    // Desktop direct logout is visible
    const directLogoutBtn = page.locator('#recruiter-navbar-logout-btn');
    await expect(directLogoutBtn).toBeVisible();

    // Account menu dropdown opens and closes
    const accountTrigger = page.locator('button[aria-haspopup="true"]');
    await expect(accountTrigger).toBeVisible();
    await accountTrigger.click();

    // Dropdown contains profile, company and logout options
    const dropdown = page.locator('#recruiter-account-dropdown');
    await expect(dropdown).toBeVisible();
    await expect(dropdown.locator('a[href="/recruiter/profile"]')).toBeVisible();
    await expect(dropdown.locator('a[href="/recruiter/company"]')).toBeVisible();

    // Close dropdown on Escape
    await page.keyboard.press('Escape');
    await expect(dropdown).toBeHidden();
  });
});
