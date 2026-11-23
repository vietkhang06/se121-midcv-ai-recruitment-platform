import { expect, test, type Page } from '@playwright/test';

const token = `fixture.${Buffer.from(JSON.stringify({ exp: 4_102_444_800 })).toString('base64url')}.fixture`;
const jobs = [
  { id: 'marketing', title: 'Marketing part-time', industry: 'Marketing', employmentType: 'PART_TIME', status: 'CLOSED' },
  { id: 'engineering', title: 'Engineering', status: 'PUBLISHED' },
  { id: 'design', title: 'Design', status: 'PUBLISHED' },
];
const submitted = [
  { id: 'r1', candidateName: 'Reviewed Person', appliedCvFullName: 'Reviewed Person', status: 'REVIEWED', matchScore: 0 },
  { id: 'm1', candidateName: 'Matched Person', status: 'MATCHED', matchScore: 80 },
  { id: 'u1', candidateName: 'Unknown Person', status: 'UNDER_REVIEW', matchScore: null },
].map(row => ({ ...row, jobId: 'marketing', jobTitle: jobs[0].title, appliedAt: '2026-11-22T10:00:00Z' }));

async function useRecruiterFixture(page: Page) {
  const fixture = { failJob: false, failAudit: false, stale: false, updates: 0 };
  await page.addInitScript(({ accessToken }) => {
    localStorage.setItem('auth_token', accessToken);
    localStorage.setItem('auth_user', JSON.stringify({
      id: 'hr', fullName: 'Recruiter Fixture', email: 'hr@example.test', role: 'RECRUITER', emailVerified: true,
    }));
    localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    localStorage.setItem('midcv_lang', 'vi');
  }, { accessToken: token });
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    const send = (data: unknown, status = 200, message?: string) =>
      route.fulfill({ status, json: { success: status === 200, data, message } });
    if (path === '/recruiter/company') return send({ id: 'company', name: 'Fixture Company', verificationStatus: 'VERIFIED' });
    if (path === '/recruiter/jobs') return send(jobs);
    if (path === '/recruiter/jobs/marketing/applications') return send(submitted);
    if (path === '/recruiter/jobs/engineering/applications' && fixture.failJob) return send(null, 503, 'Unavailable');
    if (path.endsWith('/applications')) return send([]);
    if (path === '/recruiter/applications/r1') return send(submitted[0]);
    if (path.endsWith('/audit-logs')) return fixture.failAudit ? send(null, 503, 'Unavailable') : send([]);
    if (path.endsWith('/r1/status')) {
      fixture.updates++;
      expect(route.request().postDataJSON()).toMatchObject({ status: 'SHORTLISTED', expectedStatus: 'REVIEWED' });
      return fixture.stale ? send(null, 409, 'Trạng thái đơn đã thay đổi; hãy tải lại trước khi ra quyết định.') : send({ ...submitted[0], status: 'SHORTLISTED' });
    }
    if (path.endsWith('/inspection')) return send(null, 404);
    return send([]);
  });
  return fixture;
}

for (const path of ['/recruiter', '/recruiter/analytics', '/recruiter/pipeline']) {
  test(`${path} identifies a failed JD and reloads data after recovery`, async ({ page }) => {
    const fixture = await useRecruiterFixture(page);
    fixture.failJob = true;
    await page.goto(path);
    await expect(page.getByText('Engineering', { exact: true })).toBeVisible();
    fixture.failJob = false;
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Thử lại', exact: true })).toHaveCount(0);
    if (path.endsWith('/analytics')) {
      await expect(page.getByText('Phân bố hồ sơ hiện tại', { exact: true })).toBeVisible();
      await expect(page.getByText('40.0%', { exact: true })).toBeVisible();
    }
    if (path.endsWith('/pipeline')) {
      for (const app of submitted) await expect(page.getByText(app.candidateName, { exact: true })).toHaveCount(1);
    }
  });
}

test('pipeline preserves the old card after an optimistic concurrency rejection', async ({ page }) => {
  const fixture = await useRecruiterFixture(page);
  fixture.stale = true;
  await page.goto('/recruiter/pipeline');
  const card = page.locator('.kanban-card').filter({ hasText: 'Reviewed Person' });
  await card.getByRole('button', { name: 'Duyệt →' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Trạng thái đơn đã thay đổi' })).toBeVisible();
  await expect(card).toBeVisible();
  expect(fixture.updates).toBe(1);
});

test('decision history can fail and be retried while the application remains visible', async ({ page }) => {
  const fixture = await useRecruiterFixture(page);
  fixture.failAudit = true;
  await page.goto('/recruiter/applications/r1');
  await expect(page.getByText('Reviewed Person', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Chưa tải được lịch sử.')).toBeVisible();
  fixture.failAudit = false;
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.getByText('Chưa có lượt chuyển trạng thái nào được ghi nhận.')).toBeVisible();
});
