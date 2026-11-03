import { test, expect, Page } from '@playwright/test';

async function initialize(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    localStorage.setItem('midcv_lang', 'vi');
    localStorage.setItem('auth_token', 'jwt-test-token-guidance');
    localStorage.setItem('auth_user', JSON.stringify({ id: 'synthetic', role: 'CANDIDATE', emailVerified: true, email: 'test@example.com', fullName: 'Synthetic' }));
  });
  await page.route('**/api/v1/**', route => route.fulfill({ json: { data: [] } }));
}

test('OCR proposals require selected edits and explicit confirmation; reject never applies', async ({ page }) => {
  await initialize(page);
  let revision = 'r1', applies = 0;
  const draft = () => ({ cv_id: 'ocr-cv', version_id: 'v1', revision, title: 'OCR CV', status: 'DRAFT',
    personal_info: { full_name: 'Synthetic' }, summary: { content: 'Software deveIoper' },
    skills: [], work_experience: [], projects: [], education: [], certifications: [], languages: [] });
  await page.route('**/api/v1/candidate/cvs', route => route.fulfill({ json: { data: [{ id: 'ocr-cv', title: 'OCR CV', status: 'DRAFT', creationPath: 'UPLOAD' }] } }));
  await page.route('**/api/v1/candidate/cvs/ocr-cv/draft', route => route.fulfill({ json: { data: draft() } }));
  await page.route('**/api/v1/candidate/cvs/ocr-cv/review', route => route.fulfill({ json: { data: {
    cvId: 'ocr-cv', title: 'OCR CV', status: 'READY', rawText: 'Software deveIoper', fileName: 'synthetic.png',
    structured: {}, evidences: [], unverifiedFacts: [], warnings: [], pages: [],
  } } }));
  await page.route('**/api/v1/candidate/cvs/ocr-cv/ocr-review', route => {
    expect(route.request().postDataJSON().expected_revision).toBe(revision);
    revision = revision === 'r1' ? 'r2' : 'r3';
    return route.fulfill({ json: { data: { revision, proposal: { source_sha256: 'synthetic-source-hash', provider: 'mock', model: 'mock-contract',
      edits: [{ start: 9, end: 18, before: 'deveIoper', after: 'developer' }],
    } } } });
  });
  await page.route('**/api/v1/candidate/cvs/ocr-cv/ocr-review/apply', route => {
    applies++;
    expect(route.request().postDataJSON()).toMatchObject({ expected_revision: revision, accepted_indices: [0], confirmed: true });
    return route.fulfill({ json: { data: draft() } });
  });
  await page.goto('/candidate/cvs');
  await page.locator('button[title="Rà soát và chỉnh sửa CV"]').click();
  const modal = page.getByTestId('cv-review-modal');
  await modal.getByText('Tùy chọn khác', { exact: true }).click();
  await modal.getByRole('button', { name: /Văn bản thô/ }).click();
  const section = modal.getByRole('region', { name: 'Rà soát lỗi OCR' });
  await section.getByRole('button', { name: 'Đề xuất sửa lỗi OCR' }).click();
  await expect(section.getByRole('button', { name: 'Xác nhận và dùng các sửa đã chọn' })).toBeDisabled();
  await section.getByRole('button', { name: 'Bỏ qua đề xuất' }).click();
  expect(applies).toBe(0);
  await section.getByRole('button', { name: 'Đề xuất sửa lỗi OCR' }).click();
  await section.getByRole('checkbox').check();
  page.once('dialog', dialog => dialog.dismiss());
  await section.getByRole('button', { name: 'Xác nhận và dùng các sửa đã chọn' }).click();
  expect(applies).toBe(0);
  page.once('dialog', dialog => dialog.accept());
  await section.getByRole('button', { name: 'Xác nhận và dùng các sửa đã chọn' }).click();
  await expect.poll(() => applies).toBe(1);
  await expect(modal).toContainText('Software deveIoper');
});
