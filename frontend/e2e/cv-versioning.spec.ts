import { expect, test } from '@playwright/test';

const envelope = (data: unknown) => ({ code: 'SUCCESS', message: 'ok', data });
const cv = {
  id: 'cv-01', title: 'Backend CV', status: 'CONFIRMED', creationPath: 'BUILDER',
  current_version_number: 2, is_default: true, created_at: '2026-11-20T00:00:00Z', updated_at: '2026-11-26T00:00:00Z',
  versions: [
    { id: 'ver-2', version_number: 2, created_at: '2026-11-26T00:00:00Z', summary_text: 'Current profile', sections: ['summary'] },
    { id: 'ver-1', version_number: 1, created_at: '2026-11-20T00:00:00Z', summary_text: 'Original profile', sections: ['summary'] },
  ],
};

test.describe('M06 CV version history and builder persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
      localStorage.setItem('midcv_lang', 'vi');
      localStorage.setItem('auth_user', JSON.stringify({ id: 'cand-01', email: 'candidate@test.local', fullName: 'Nguyễn Văn A', role: 'CANDIDATE', emailVerified: true }));
      localStorage.setItem('auth_token', 'eyJhbGciOiJub25lIn0.eyJleHAiOjQxMDI0NDQ4MDB9.');
    });
    await page.route('**/api/v1/account/avatar', route => route.fulfill({ json: envelope({ fullName: 'Nguyễn Văn A', emailVerified: true }) }));
    await page.route('**/api/v1/candidate/cvs', route => route.request().method() === 'GET'
      ? route.fulfill({ json: envelope([cv]) }) : route.fallback());
    await page.route('**/api/v1/candidate/cvs/cv-01/versions', route => route.fulfill({ json: envelope(cv.versions) }));
    await page.route('**/api/v1/candidate/cvs/quota', route => route.fulfill({ json: envelope({ plan: 'STANDARD', currentCount: 1, maxLimit: 3, remainingSlots: 2, canUpload: true }) }));
  });

  test('library exposes the active immutable version and complete history', async ({ page }) => {
    await page.goto('/candidate/cvs');
    const card = page.getByTestId('cv-card-cv-01');
    await expect(card.getByText('v2.0')).toBeVisible();
    await card.locator('.version-history-btn').click();
    const modal = page.locator('#version-history-modal');
    await expect(modal).toContainText('IMMUTABLE AUDIT TRAIL');
    await expect(modal.getByText('v2.0')).toBeVisible();
    await expect(modal.getByText('v1.0')).toBeVisible();
    await expect(modal.getByText('Phiên bản hiện tại')).toBeVisible();
    await modal.locator('#close-version-history-modal-btn').click();
    await expect(modal).toBeHidden();
  });

  test('builder save persists edits and reload reads the saved draft', async ({ page }) => {
    let savedName = 'Nguyễn Văn A';
    await page.route('**/api/v1/candidate/cvs/cv-01/draft', async route => {
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON() as { personal_info?: { full_name?: string; fullName?: string } };
        savedName = body.personal_info?.full_name || body.personal_info?.fullName || savedName;
      }
      await route.fulfill({ json: envelope({
        cv_id: 'cv-01', title: 'Backend CV', status: 'DRAFT', presentation: { template: 'editorial' },
        personal_info: { full_name: savedName, email: 'candidate@test.local', headline: 'Engineer' },
        summary: { content: 'Reliable systems' }, skills: ['Java'], work_experience: [], projects: [], education: [], certifications: [], languages: [],
      }) });
    });

    await page.goto('/candidate/cvs/builder?edit=cv-01');
    const name = page.getByLabel('Họ và tên');
    await expect(name).toHaveValue('Nguyễn Văn A');
    await name.fill('Nguyễn Văn B');
    await page.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Bản nháp đã được lưu');
    await page.reload();
    await expect(name).toHaveValue('Nguyễn Văn B');
    await expect(page.locator('#cv-template')).toHaveValue('editorial');
  });
});
