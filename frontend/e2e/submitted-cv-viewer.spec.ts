import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const rawText = 'Kỹ năng: Java\nKinh nghiệm: PostgreSQL.';
const fixtures = '../test-fixtures/synthetic';

async function applicationFixture(page: Page, format: 'pdf' | 'word' | 'images' | 'missing') {
  const token = `fixture.${Buffer.from(JSON.stringify({ exp: 4_102_444_800 })).toString('base64url')}.fixture`;
  await page.addInitScript(token => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify({
      id: 'recruiter', fullName: 'Recruiter Fixture', email: 'hr@example.test',
      role: 'RECRUITER', emailVerified: true,
    }));
    localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    localStorage.setItem('midcv_lang', 'vi');
  }, token);
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const json = (data: unknown, status = 200) => route.fulfill({ status, json: { success: status === 200, data } });
    const document = async (name: string, filename: string, type: string) => route.fulfill({
      contentType: type, headers: { 'content-disposition': `attachment; filename="${filename}"` },
      body: await readFile(`${fixtures}/${name}`),
    });
    if (path.endsWith('/applications/demo')) return json({
      id: 'demo', jobId: 'backend', jobTitle: 'Lập trình viên', status: 'SUBMITTED',
      appliedCvFullName: 'Nguyễn Minh An', snapshot: { cvTitle: 'CV Java', rawTextSnapshot: rawText },
    });
    if (path.endsWith('/cv-original')) {
      if (format === 'pdf') return document('01_single_column_tech_cv.pdf', 'cv-nop.pdf', 'application/pdf');
      if (format === 'word') return document('05_structured_table_cv.docx', 'cv-nop.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      return json(null, 404);
    }
    if (path.endsWith('/cv-preview')) return document('01_single_column_tech_cv.pdf', 'cv-preview.pdf', 'application/pdf');
    if (path.endsWith('/cv-pages/1')) return document('04_cv_image.png', 'trang-1.png', 'image/png');
    if (path.endsWith('/cv-pages') && format === 'images') return json([
      { page_order: 1, filename: 'trang-1.png' },
      { page_order: 2, filename: 'trang-2.png' },
    ]);
    if (path.endsWith('/cv-pages/2')) return json(null, 404);
    return json([]);
  });
  await page.goto('/recruiter/applications/demo#submitted-cv');
  return page.locator('#submitted-cv');
}

test('submitted PDF previews and downloads at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 850 });
  const panel = await applicationFixture(page, 'pdf');
  await expect(panel.getByTitle('Trình đọc PDF của CV')).toHaveAttribute('src', /^blob:/);
  await expect(panel.getByRole('link', { name: 'Mở PDF ở tab mới' })).toBeVisible();
  for (const [trigger, filename, expected] of [
    [panel.getByRole('link', { name: 'Tải CV gốc' }), 'cv-nop.pdf', await readFile(`${fixtures}/01_single_column_tech_cv.pdf`)],
    [panel.getByRole('button', { name: 'Tải văn bản trích xuất (.txt)' }), 'cv-van-ban-trich-xuat.txt', Buffer.from(rawText)],
  ] as const) {
    const [download] = await Promise.all([page.waitForEvent('download'), trigger.click()]);
    expect(download.suggestedFilename()).toBe(filename);
    expect(await readFile((await download.path())!)).toEqual(expected);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('submitted Word keeps the original when opening a preview', async ({ page }) => {
  const panel = await applicationFixture(page, 'word');
  await panel.getByRole('button', { name: 'Xem bản Word' }).click();
  await expect(panel.getByTitle('Trình đọc PDF của CV')).toHaveAttribute('src', /^blob:/);
  await expect(panel.getByRole('link', { name: 'Tải CV gốc' })).toHaveAttribute('download', 'cv-nop.docx');
});

test('submitted images show available pages when one is missing', async ({ page }) => {
  const panel = await applicationFixture(page, 'images');
  const image = panel.getByRole('img', { name: 'Trang CV 1' });
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  await expect(panel.getByRole('link', { name: 'Tải ảnh gốc' })).toHaveAttribute('download', 'trang-1.png');
  await expect(panel.getByText('Chưa tải được ảnh trang này.')).toBeVisible();
});

test('legacy snapshot keeps extracted text after a missing original', async ({ page }) => {
  const panel = await applicationFixture(page, 'missing');
  await expect(panel.getByText('Hồ sơ này không có tệp CV gốc để xem.')).toBeVisible();
  await panel.getByText('Văn bản trích xuất từ CV', { exact: true }).click();
  await expect(panel.locator('pre')).toHaveText(rawText);
});
