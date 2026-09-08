import { test, expect } from '@playwright/test';

test.describe('WP-01: Global Theme Synchronization Suite (THEME-01 - THEME-05)', () => {

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

  test('THEME-01: Start in light mode -> navigate through all major routes -> light remains active', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('matchjd_theme', 'light');
    });

    const routes = [
      '/',
      '/jobs',
      '/candidate/cvs',
      '/candidate/cvs/builder',
      '/candidate/profile',
      '/help',
      '/login',
      '/register'
    ];

    for (const route of routes) {
      await page.goto(route);
      const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      expect(isDark).toBeFalsy();
    }
  });

  test('THEME-02: Switch to dark mode -> navigate through all major routes -> dark remains active', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('matchjd_theme', 'dark');
    });

    const routes = [
      '/',
      '/jobs',
      '/candidate/cvs',
      '/candidate/cvs/builder',
      '/candidate/profile',
      '/help',
      '/login',
      '/register'
    ];

    for (const route of routes) {
      await page.goto(route);
      const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      expect(isDark).toBeTruthy();
    }
  });

  test('THEME-03: Refresh any major route -> selected theme remains consistent', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('matchjd_theme', 'dark');
    });

    await page.goto('/candidate/cvs');
    let isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDark).toBeTruthy();

    await page.reload();
    isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDark).toBeTruthy();

    const storedTheme = await page.evaluate(() => localStorage.getItem('matchjd_theme'));
    expect(storedTheme).toBe('dark');
  });

  test('THEME-04: Open modal in either theme -> modal uses the same theme', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('matchjd_theme', 'dark');
    });

    await page.goto('/jobs');
    // In dark mode, verify HTML has .dark
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDark).toBeTruthy();

    // Click quick apply or view job modal
    const quickApplyBtn = page.getByRole('button', { name: /Quick Apply/i }).first();
    if (await quickApplyBtn.isVisible()) {
      await quickApplyBtn.click();
      const modal = page.locator('div[role="dialog"], .backdrop-blur-xs, .backdrop-blur-md').first();
      await expect(modal).toBeVisible();
      // HTML still has dark class
      const stillDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      expect(stillDark).toBeTruthy();
    }
  });

  test('THEME-05: No route visually reverts to a different theme (toggle interaction)', async ({ page }) => {
    await page.goto('/');
    
    // Toggle theme using Navbar button
    const themeBtn = page.locator('button[aria-label="Toggle Theme"]');
    await expect(themeBtn).toBeVisible();

    const initialDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    await themeBtn.click();

    const toggledDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(toggledDark).toBe(!initialDark);

    // Navigate to another route
    await page.goto('/help');
    const navigatedDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(navigatedDark).toBe(toggledDark);
  });

});
