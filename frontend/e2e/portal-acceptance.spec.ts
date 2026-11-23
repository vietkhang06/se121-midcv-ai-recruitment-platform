import { expect, test, type Page, type TestInfo } from '@playwright/test';

const token = `fixture.${Buffer.from(JSON.stringify({ exp: 4_102_444_800 })).toString('base64url')}.fixture`;
const timestamp = '2026-11-21T08:20:00Z';
const job = { id: 'job', title: 'Marketing bán thời gian', industry: 'Marketing', employmentType: 'PART_TIME', status: 'PUBLISHED' };
const app = { id: 'app', appliedAt: timestamp, jobId: job.id, job, status: 'REVIEWED', appliedCvVersionNumber: 2, candidateName: 'Ứng viên đã chấm', matchScore: 0, matchStatus: 'PGVECTOR_READY' };
const apps = [
  app,
  { ...app, id: 'pending', candidateName: 'Ứng viên đang chờ', matchScore: null, matchStatus: 'PENDING_VECTOR' },
  { ...app, id: 'fallback', candidateName: 'Ứng viên dùng dự phòng', matchScore: 90, matchStatus: 'FALLBACK_USED' },
  { ...app, id: 'declined', candidateName: 'Ứng viên từ chối AI', matchScore: null, matchStatus: null, aiAnalysisConsent: false },
];

async function seed(page: Page, role: string, theme: 'light' | 'dark') {
  await page.addInitScript(({ accessToken, role, theme }) => {
    localStorage.setItem('auth_token', accessToken);
    localStorage.setItem('auth_user', JSON.stringify({
      id: 'fixture', fullName: 'Tài khoản nghiệm thu', email: 'fixture@example.test', role, emailVerified: true,
    }));
    localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    localStorage.setItem('midcv_lang', 'vi');
    localStorage.setItem('midcv_theme', theme);
  }, { accessToken: token, role, theme });
}

function screenshot(page: Page, testInfo: TestInfo, name: string) {
  return page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true, animations: 'disabled' });
}

async function assertFits(page: Page, path: string) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  expect(new URL(page.url()).pathname).toBe(path);
}

test('candidate can reopen the pinned submission and retry history and roadmap separately', async ({ page }, info) => {
  await seed(page, 'CANDIDATE', 'light');
  await page.setViewportSize({ width: 375, height: 812 });
  let historyUp = false;
  let workerUp = false;
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    const send = (data: unknown, status = 200) => route.fulfill({ status, json: { data } });
    if (path.endsWith('/candidate/applications')) return send([app]);
    if (path.endsWith('/candidate/applications/app')) return send({
      ...app, aiConsent: true, matchStatus: 'PGVECTOR_READY',
      cv: { title: 'CV Marketing đã nộp', version: 2, rawText: 'Văn bản gốc', reviewedText: 'Kỹ năng được ứng viên duyệt', declaredSkills: ['Content Writing'], skillListAvailable: true },
      pinnedJd: { id: 'jd-1', version: 1, title: 'JD gốc' }, skillGapAvailable: true,
    });
    if (path.endsWith('/app/history')) return historyUp ? send({ items: [{ from: 'SUBMITTED', to: 'REVIEWED', at: timestamp }], page: 0, hasNext: false }) : send(null, 503);
    if (path.endsWith('/app/skill-gap')) return workerUp ? send({
      gap_breakdown: [{ skill_name: 'Google Analytics', category: 'MISSING_MANDATORY' }],
      tailored_roadmap: [{ milestone_number: 1, title: 'Thực hành đo lường', target_skills: ['Google Analytics'], estimated_weeks: 2, learning_objectives: ['Tạo báo cáo'], practice_project: 'Đo lường chiến dịch' }],
    }) : send(null, 503);
    return send([]);
  });
  await page.goto('/candidate/applications');
  await page.getByRole('link', { name: 'Chi tiết đơn' }).click();
  await expect(page.getByText('CV Marketing đã nộp · v2')).toBeVisible();
  await page.reload();
  await expect(page.getByText('CV Marketing đã nộp · v2')).toBeVisible();
  await expect(page.getByText('Chưa tải được lịch sử.')).toBeVisible();
  historyUp = true;
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.getByText(/Đã nộp → Đã xem/)).toBeVisible();
  await page.getByRole('button', { name: 'Xem chênh lệch kỹ năng và lộ trình' }).click();
  await expect(page.getByText('Chưa tải được lộ trình. Bạn có thể thử lại.')).toBeVisible();
  workerUp = true;
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.getByText('Thiếu kỹ năng bắt buộc')).toBeVisible();
  await assertFits(page, '/candidate/applications/app');
  await screenshot(page, info, 'candidate-application');
});

test('public catalog shows Vietnamese error and recovers on retry', async ({ page }) => {
  let available = false;
  await page.route('**/api/v1/jobs?**', route => route.fulfill({
    status: available ? 200 : 503, json: { data: available ? { content: [job], totalPages: 1 } : null },
  }));
  await page.goto('/jobs');
  await expect(page.getByText('Không thể tải danh sách việc làm', { exact: true })).toBeVisible();
  await expect(page.getByText(/Đã xảy ra lỗi khi kết nối với máy chủ dữ liệu/)).toBeVisible();
  available = true;
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.getByText(job.title, { exact: true }).first()).toBeVisible();
});

for (const theme of ['light', 'dark'] as const) {
  test(`recruiter layouts and score phases at 375px · ${theme}`, async ({ page }, info) => {
    await seed(page, 'RECRUITER', theme);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.route('**/api/v1/**', route => {
      const path = new URL(route.request().url()).pathname;
      const send = (data: unknown) => route.fulfill({ json: { data } });
      if (path.endsWith('/recruiter/jobs')) return send([job]);
      if (path.endsWith('/recruiter/jobs/job') || path.endsWith('/jobs/job')) return send(job);
      if (path.endsWith('/jobs/job/applications')) return send(apps);
      if (path.endsWith('/jobs/job/rankings')) return send([
        { applicationId: 'app', candidateName: app.candidateName, applicationStatus: 'REVIEWED', calculationStatus: 'PGVECTOR_READY', overallScore: 0, coreScore: 0, requiredSkillsMatched: 0, requiredSkillsTotal: 2 },
        { applicationId: 'fallback', candidateName: apps[2].candidateName, applicationStatus: 'REVIEWED', calculationStatus: 'FALLBACK_USED', overallScore: 90 },
      ]);
      return send([]);
    });
    const ranking = '/recruiter/jobs/job/ranking';
    await page.goto(ranking);
    await expect(page.getByText('Hồ sơ ngoài bảng xếp hạng')).toBeVisible();
    for (const text of ['Đang chờ chấm', 'Điểm tạm · 90,0%', 'Ứng viên không chọn phân tích AI'])
      await expect(page.getByText(text, { exact: true })).toBeVisible();
    await assertFits(page, ranking);
    await screenshot(page, info, `ranking-${theme}`);
    await page.goto('/recruiter/pipeline');
    const card = page.getByRole('article', { name: app.candidateName });
    await expect(card.getByRole('link', { name: 'Xem hồ sơ' })).toBeVisible();
    const actions = card.getByRole('button', { name: 'Thao tác' });
    await actions.click();
    await expect(card.getByRole('button', { name: 'Đưa vào danh sách chọn' })).toBeVisible();
    await assertFits(page, '/recruiter/pipeline');
    await actions.click();
    await assertFits(page, '/recruiter/pipeline');
    await screenshot(page, info, `pipeline-${theme}`);
    await page.goto('/recruiter/analytics');
    await expect(page.getByText('Phân bố hồ sơ hiện tại', { exact: true })).toBeVisible();
    await expect(page.getByText('0,0%', { exact: true })).toBeVisible();
    await assertFits(page, '/recruiter/analytics');
    await screenshot(page, info, `analytics-${theme}`);
  });

  test(`CV builder at 375px · ${theme}`, async ({ page }, info) => {
    await seed(page, 'CANDIDATE', theme);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.route('**/api/v1/**', route => {
      const path = new URL(route.request().url()).pathname;
      const data = path.endsWith('/quota') ? { plan: 'STANDARD', currentCount: 0, maxLimit: 3, remainingSlots: 3, canUpload: true }
        : path.endsWith('/profile') ? { fullName: 'Ứng viên thử giao diện' } : [];
      return route.fulfill({ json: { data } });
    });
    const path = '/candidate/cvs/builder';
    await page.goto(path);
    await expect(page.getByRole('textbox').first()).toBeVisible();
    await assertFits(page, path);
    await screenshot(page, info, `cv-builder-${theme}`);
  });

  test(`admin decision form and focus at 375px · ${theme}`, async ({ page }, info) => {
    await seed(page, 'ADMIN', theme);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.route('**/api/v1/**', route => {
      const data = { content: [{ id: 'company', name: 'Doanh nghiệp thử nghiệm', verificationStatus: 'PENDING', operationalStatus: 'ACTIVE', createdAt: timestamp }], totalPages: 1, totalElements: 1 };
      return route.fulfill({ json: { data } });
    });
    await page.goto('/admin/companies');
    await expect(page.getByText('Doanh nghiệp thử nghiệm', { exact: true })).toBeVisible();
    await assertFits(page, '/admin/companies');
    await screenshot(page, info, `admin-companies-${theme}`);
    await page.getByRole('button', { name: 'Yêu cầu sửa', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Yêu cầu bổ sung' });
    await expect(dialog.getByRole('textbox')).toBeFocused();
    await dialog.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog).toHaveAttribute('data-state', 'open');
    await page.screenshot({ path: info.outputPath(`admin-modal-${theme}.png`), animations: 'disabled' });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Yêu cầu sửa', exact: true })).toBeFocused();
  });
}
