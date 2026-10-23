import { expect, test } from '@playwright/test';

test('CV card edit changes only its display title instead of opening the CV builder', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    window.localStorage.setItem('midcv_lang', 'vi');
    window.localStorage.setItem('auth_user', JSON.stringify({
      id: 'candidate-card-metadata', email: 'candidate@example.com', fullName: 'Account Name',
      role: 'CANDIDATE', emailVerified: true,
    }));
    window.localStorage.setItem('auth_token', 'jwt-card-metadata');
  });

  const envelope = (data: unknown) => ({ code: 'SUCCESS', message: 'ok', data });
  await page.route('**/api/v1/candidate/cvs', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({ json: envelope([{
      id: 'cv-card-meta', title: 'Uploaded Backend CV', creationPath: 'UPLOAD',
      isDefault: false, status: 'CONFIRMED', createdAt: '2026-10-23T00:00:00Z', rawText: 'Original CV text',
    }]) });
  });
  await page.route('**/api/v1/candidate/cvs/quota', (route) => route.fulfill({
    json: envelope({ plan: 'STANDARD', currentCount: 1, maxLimit: 3, remainingSlots: 2, canUpload: true }),
  }));

  let submittedBody: unknown;
  await page.route('**/api/v1/candidate/cvs/cv-card-meta/metadata', async (route) => {
    submittedBody = route.request().postDataJSON();
    await route.fulfill({ json: envelope({
      id: 'cv-card-meta', title: 'Backend CV 2026', creationPath: 'UPLOAD',
      isDefault: false, status: 'CONFIRMED', createdAt: '2026-10-23T00:00:00Z', rawText: 'Original CV text',
    }) });
  });

  await page.goto('/candidate/cvs');
  const card = page.getByTestId('cv-card-cv-card-meta');
  await card.getByRole('button', { name: 'Chỉnh Sửa' }).click();
  const modal = page.getByTestId('cv-card-metadata-modal');
  await expect(modal).toBeVisible();
  await expect(modal.getByLabel('Tên hồ sơ')).toHaveValue('Uploaded Backend CV');
  await expect(modal.getByLabel('Họ và tên')).toHaveCount(0);
  await expect(page).not.toHaveURL(/\/candidate\/cvs\/builder/);

  await modal.getByLabel('Tên hồ sơ').fill('Backend CV 2026');
  await modal.getByRole('button', { name: 'Lưu tên hồ sơ' }).click();
  await expect(modal).not.toBeVisible();
  await expect(card.getByRole('heading', { name: 'Backend CV 2026' })).toBeVisible();
  expect(submittedBody).toEqual({ title: 'Backend CV 2026' });
});
