import { expect, test } from '@playwright/test';

test('uploaded CV review has one persistent save action and preserves edits made during a save', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    window.localStorage.setItem('midcv_lang', 'vi');
    window.localStorage.setItem('auth_user', JSON.stringify({
      id: 'candidate-review-test', email: 'candidate@example.com', fullName: 'Candidate Review',
      role: 'CANDIDATE', emailVerified: true,
    }));
    window.localStorage.setItem('auth_token', 'jwt-review-test');
  });

  let persistedName = 'Nguyễn Văn A';
  let submittedName = '';
  let releaseFirstSave!: () => void;
  let markFirstSaveStarted!: () => void;
  const firstSaveStarted = new Promise<void>((resolve) => { markFirstSaveStarted = resolve; });
  const firstSaveGate = new Promise<void>((resolve) => { releaseFirstSave = resolve; });
  let saveCount = 0;
  let failNextSave = false;

  const envelope = (data: unknown) => ({ code: 'SUCCESS', message: 'ok', data });
  await page.route('**/api/v1/candidate/cvs', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({ json: envelope([{
      id: 'cv-uploaded-review', title: 'resume-with-a-very-long-filename-for-review.pdf',
      targetIndustry: 'Technology', targetRole: 'Backend Engineer', creationPath: 'UPLOAD',
      isDefault: false, status: 'DRAFT', createdAt: '2026-10-23T00:00:00Z', rawText: 'CV text',
    }, {
      id: 'cv-confirmed-review', title: 'Confirmed CV', creationPath: 'BUILDER',
      isDefault: false, status: 'CONFIRMED', createdAt: '2026-10-22T00:00:00Z', rawText: 'Confirmed CV text',
    }]) });
  });
  await page.route('**/api/v1/candidate/cvs/quota', (route) => route.fulfill({
    json: envelope({ plan: 'STANDARD', currentCount: 1, maxLimit: 3, remainingSlots: 2, canUpload: true }),
  }));
  await page.route('**/api/v1/candidate/cvs/cv-uploaded-review/review', (route) => route.fulfill({
    json: envelope({
      cvId: 'cv-uploaded-review', title: 'Uploaded CV', fileName: 'resume-with-a-very-long-filename-for-review.pdf',
      fileType: 'application/pdf', fileSize: 1024, status: 'READY', rawText: 'CV text',
      structured: { schema_version: '2.0.0', full_name: 'Nguyễn Văn A', headline: 'Backend Engineer', skills: [] },
      evidences: [], unverifiedFacts: [], warnings: [], pages: [],
    }),
  }));
  await page.route('**/api/v1/candidate/cvs/cv-uploaded-review/draft', async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: envelope({
        cv_id: 'cv-uploaded-review', title: 'Uploaded CV', status: 'DRAFT',
        personal_info: { full_name: persistedName, headline: 'Backend Engineer', email: 'candidate@example.com' },
        summary: { content: 'Experienced engineer' }, skills: [], work_experience: [], projects: [],
        education: [], certifications: [], languages: [],
      }) });
    }

    saveCount += 1;
    const payload = route.request().postDataJSON() as { personal_info: { fullName?: string; full_name?: string } };
    submittedName = payload.personal_info.fullName || payload.personal_info.full_name || '';
    if (saveCount === 1) {
      markFirstSaveStarted();
      await firstSaveGate;
    }
    if (failNextSave) {
      failNextSave = false;
      return route.fulfill({ status: 500, json: { code: 'ERROR', message: 'Save failed' } });
    }
    persistedName = submittedName;
    return route.fulfill({ json: envelope({
      cv_id: 'cv-uploaded-review', title: 'Uploaded CV', status: 'DRAFT',
      personal_info: { full_name: persistedName, headline: 'Backend Engineer', email: 'candidate@example.com' },
      summary: { content: 'Experienced engineer' }, skills: [], work_experience: [], projects: [],
      education: [], certifications: [], languages: [],
    }) });
  });

  await page.goto('/candidate/cvs');
  const draftCard = page.getByTestId('cv-card-cv-uploaded-review');
  const confirmedCard = page.getByTestId('cv-card-cv-confirmed-review');
  await expect(draftCard.getByRole('status')).toHaveText('Bản nháp');
  await expect(draftCard).toHaveClass(/border-amber-200/);
  await expect(draftCard).toHaveClass(/shadow-amber-100/);
  await expect(confirmedCard.getByRole('status')).toHaveText('Đã xác nhận');
  await expect(confirmedCard).toHaveClass(/border-emerald-200/);
  await expect(confirmedCard).toHaveClass(/shadow-emerald-100/);
  await page.locator('button[title="Rà soát và chỉnh sửa CV"]').first().click();
  const modal = page.getByTestId('cv-review-modal');
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Chỉnh sửa hồ sơ' }).click();

  await expect(modal.getByRole('button', { name: 'Lưu bản nháp' })).toHaveCount(1);
  await expect(modal.getByText('Vị trí mục tiêu / Chức danh (Headline)')).toHaveCount(0);
  const nameInput = modal.getByPlaceholder('Nhập họ và tên đầy đủ');
  await nameInput.click();
  await nameInput.press('End');
  await nameInput.pressSequentially('N');
  await expect(nameInput).toBeFocused();
  await expect(nameInput).toHaveValue('Nguyễn Văn A' + 'N');
  await nameInput.fill('Nguyễn Văn B');
  await modal.getByRole('button', { name: 'Lưu bản nháp' }).click();
  await firstSaveStarted;

  await nameInput.fill('Nguyễn Văn C');
  releaseFirstSave();
  await expect(modal.getByText('Chưa lưu thay đổi')).toBeVisible();
  await expect(nameInput).toHaveValue('Nguyễn Văn C');
  await expect(nameInput).toBeFocused();
  await expect(modal).toBeVisible();
  await expect(modal.getByRole('button', { name: 'Lưu bản nháp' })).toBeEnabled();
  expect(submittedName).toBe('Nguyễn Văn B');

  failNextSave = true;
  await modal.getByRole('button', { name: 'Lưu bản nháp' }).click();
  await expect(modal.getByText('Lưu thất bại')).toBeVisible();
  await expect(nameInput).toHaveValue('Nguyễn Văn C');
  await modal.getByRole('button', { name: 'Thử lại' }).click();
  await expect(modal.getByText('Đã lưu')).toBeVisible();
  await expect(nameInput).toHaveValue('Nguyễn Văn C');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(modal.getByRole('button', { name: 'Lưu bản nháp' })).toHaveCount(1);
  await expect(modal).toBeVisible();
});
