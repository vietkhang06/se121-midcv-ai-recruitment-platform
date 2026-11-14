import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

const token = `header.${Buffer.from(JSON.stringify({ exp: 4_102_444_800 })).toString('base64url')}.signature`;

async function assertPaperSurface(page: import('@playwright/test').Page) {
  await expect(page.locator('body')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toBeVisible();
  expect(await focused.evaluate((element) => ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName))).toBe(true);
}

test.describe('U02 Paper Studio acceptance', () => {
  for (const viewport of viewports) {
    for (const locale of ['vi', 'en'] as const) {
      for (const theme of ['light', 'dark'] as const) {
        test(`${viewport.name} ${locale} ${theme}: public surface is responsive and keyboard reachable`, async ({ page }) => {
          await page.setViewportSize(viewport);
          await page.addInitScript(({ localeValue, themeValue }) => {
            localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
            localStorage.setItem('midcv_lang', localeValue);
            localStorage.setItem('midcv_theme', themeValue);
          }, { localeValue: locale, themeValue: theme });

          await page.goto('/help');
          await expect(page.locator('html')).toHaveAttribute('lang', locale);
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
          await assertPaperSurface(page);
        });
      }
    }
  }

  for (const roleCase of [
    { role: 'CANDIDATE', route: '/candidate/account', width: 375, height: 812 },
    { role: 'RECRUITER', route: '/recruiter/account', width: 768, height: 1024 },
    { role: 'ADMIN', route: '/admin/account', width: 1440, height: 900 },
  ] as const) {
    test(`${roleCase.role}: role shell preserves Paper Studio behavior`, async ({ page }) => {
      await page.setViewportSize(roleCase);
      await page.addInitScript(({ role, authToken }) => {
        localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
        localStorage.setItem('midcv_lang', 'en');
        localStorage.setItem('midcv_theme', 'dark');
        localStorage.setItem('auth_token', authToken);
        localStorage.setItem('auth_user', JSON.stringify({
          id: `u-${role.toLowerCase()}`,
          email: `${role.toLowerCase()}@example.test`,
          fullName: `${role} Tester`,
          role,
          emailVerified: true,
        }));
      }, { role: roleCase.role, authToken: token });

      await page.goto(roleCase.route);
      await expect(page).toHaveURL(new RegExp(roleCase.route.replaceAll('/', '\\/')));
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await assertPaperSurface(page);
    });
  }
});
