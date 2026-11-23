import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

async function fixture(page: Page, role: 'CANDIDATE' | 'RECRUITER') {
  const token = `fixture.${Buffer.from(JSON.stringify({ exp: 4_102_444_800 })).toString('base64url')}.fixture`;
  const jpg = await readFile('public/images/auth/candidate-auth-hero.jpg');
  let avatarId: string | null = null;
  let fullName = role === 'CANDIDATE' ? 'Ứng viên Kiểm thử' : 'Tuyển dụng Kiểm thử';
  let industries = ['Technology'];
  await page.addInitScript(({ token, role }) => {
    localStorage.setItem('midcv_lang', 'vi');
    localStorage.setItem('midcv_theme', role === 'RECRUITER' ? 'dark' : 'light');
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify({ id: 'fixture', fullName: 'session', email: 'demo@example.test', role }));
  }, { token, role });
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    const json = (data: unknown) => route.fulfill({ json: { success: true, data } });
    if (path === '/api/v1/account/avatar') {
      if (method === 'PUT') {
        expect(route.request().headers()['content-type']).toContain('multipart/form-data');
        avatarId = 'fixture-photo';
      }
      if (method === 'DELETE') avatarId = null;
      return json({ avatarId, fullName, emailVerified: true });
    }
    if (path.endsWith('/avatar/fixture-photo')) {
      return route.fulfill({ contentType: 'image/jpeg', body: jpg });
    }
    if (path.endsWith('/candidate/profile')) {
      if (method === 'PUT') {
        const draft = route.request().postDataJSON();
        fullName = draft.fullName;
        industries = draft.targetIndustries;
      }
      return json({ id: 'candidate', fullName, targetIndustry: industries[0], targetIndustries: industries });
    }
    if (path.endsWith('/recruiter/company')) return json({ id: 'company', name: 'MidCV Demo', verificationStatus: 'VERIFIED' });
    if (path.endsWith('/unread')) return json({ notifications: 0, messages: 0 });
    return json([]);
  });
  return jpg;
}

test('candidate saves profile and avatar propagates to the menu and survives reload', async ({ page }, info) => {
  const jpg = await fixture(page, 'CANDIDATE');
  await page.setViewportSize({ width: 1360, height: 900 });
  await page.goto('/candidate/profile');
  const card = page.getByRole('region', { name: 'Tài khoản', exact: true });
  const menu = page.getByRole('button', { name: 'Menu tài khoản' });
  await card.locator('input[type=file]').setInputFiles({ name: 'anh.jpg', mimeType: 'image/jpeg', buffer: jpg });
  const photo = card.locator('img[data-account-avatar]');
  await expect(page.getByText('Đã cập nhật ảnh.')).toBeVisible();
  await expect(photo).toBeVisible();
  await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(menu.locator('img[data-account-avatar]')).toBeVisible();
  await page.getByLabel('Họ và tên', { exact: false }).fill('Nguyễn Minh An');
  await page.getByRole('button', { name: 'Marketing', exact: true }).click();
  await page.getByRole('button', { name: 'Lưu thông tin' }).click();
  await expect(card.getByRole('heading', { name: 'Nguyễn Minh An' })).toBeVisible();
  await page.reload();
  await expect(card.getByRole('heading', { name: 'Nguyễn Minh An' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Marketing', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(menu.locator('img[data-account-avatar]')).toBeVisible();
  await page.screenshot({ path: info.outputPath('ho-so-ung-vien.png'), fullPage: true });
  await card.getByRole('button', { name: 'Xóa ảnh' }).click();
  await expect(page.getByText('Đã xóa ảnh.')).toBeVisible();
  await expect(menu.locator('img[data-account-avatar]')).toHaveCount(0);
});

test('recruiter updates avatar and sees company information on a dark mobile layout', async ({ page }, info) => {
  const jpg = await fixture(page, 'RECRUITER');
  await page.setViewportSize({ width: 375, height: 850 });
  await page.goto('/recruiter/profile');
  const card = page.getByRole('region', { name: 'Tài khoản', exact: true });
  await expect(card.getByRole('heading', { name: 'Tuyển dụng Kiểm thử' })).toBeVisible();
  await expect(page.getByText('MidCV Demo', { exact: true })).toBeVisible();
  await card.locator('input[type=file]').setInputFiles({ name: 'anh.jpg', mimeType: 'image/jpeg', buffer: jpg });
  await expect(card.locator('img[data-account-avatar]')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.screenshot({ path: info.outputPath('ho-so-hr-di-dong.png'), fullPage: true });
});
