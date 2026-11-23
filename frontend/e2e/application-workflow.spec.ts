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
].map(row => ({ ...row, jobId: 'marketing', jobTitle: jobs[0].title, matchStatus: row.matchScore !== null ? 'PGVECTOR_READY' : null, appliedAt: '2026-11-22T10:00:00Z' }));

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
    await expect(page.getByText(/Chưa tải được hồ sơ.*Engineering/)).toBeVisible();
    fixture.failJob = false;
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Thử lại', exact: true })).toHaveCount(0);
    if (path.endsWith('/analytics')) {
      await expect(page.getByText('Phân bố hồ sơ hiện tại', { exact: true })).toBeVisible();
      await expect(page.getByText('40,0%', { exact: true })).toBeVisible();
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
  const trigger = card.getByRole('button', { name: 'Thao tác' });
  await expect(card.getByRole('button', { name: 'Đưa vào danh sách chọn' })).toBeHidden();
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(card.getByRole('button', { name: 'Từ chối hồ sơ' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(card.getByRole('button', { name: 'Đưa vào danh sách chọn' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await card.getByRole('button', { name: 'Đưa vào danh sách chọn' }).click();
  await expect(card.getByRole('alert')).toContainText('Hồ sơ đã được cập nhật ở nơi khác');
  await expect(trigger).toBeDisabled();
  await expect(card).toBeVisible();
  expect(fixture.updates).toBe(1);
});

test('a pipeline card opens its application and moves to the selected stage', async ({ page }) => {
  const fixture = await useRecruiterFixture(page);
  await page.goto('/recruiter/pipeline');
  const card = page.getByRole('article', { name: 'Reviewed Person' });
  await expect(card.getByRole('link', { name: 'Xem hồ sơ' })).toHaveAttribute('href', '/recruiter/applications/r1');
  await expect(card).toContainText('Đã chấm · 0,0%');
  await card.getByRole('button', { name: 'Thao tác' }).click();
  await card.getByRole('button', { name: 'Đưa vào danh sách chọn' }).click();
  const shortlist = page.locator('.kanban-col').filter({ has: page.getByRole('heading', { name: 'Đã vào danh sách chọn', exact: true }) });
  await expect(shortlist.getByRole('article', { name: 'Reviewed Person' })).toHaveCount(1);
  await expect(card.getByRole('button', { name: 'Chuyển sang phỏng vấn' })).toBeHidden();
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

test('pipeline columns keep their width and scroll within the board on larger screens', async ({ page }) => {
  await useRecruiterFixture(page);
  await page.goto('/recruiter/pipeline');
  const columns = page.locator('.kanban-col');
  await expect(columns).toHaveCount(8);
  const board = columns.first().locator('..');

  for (const width of [768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await columns.evaluateAll(items => items.map(item => item.getBoundingClientRect().toJSON()));
    expect(dimensions.every(column => column.width >= 245), `column widths at ${width}px: ${dimensions.map(column => column.width)}`).toBe(true);
    expect(new Set(dimensions.map(column => column.top)).size).toBe(1);
    expect(await board.evaluate(element => element.scrollWidth)).toBeGreaterThan(await board.evaluate(element => element.clientWidth));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }

  await board.evaluate(element => { element.scrollLeft = element.scrollWidth; });
  const lastHeading = columns.last().getByRole('heading', { level: 2 });
  await expect(lastHeading).toBeInViewport();

  await page.setViewportSize({ width: 375, height: 812 });
  const mobile = await columns.evaluateAll(items => items.slice(0, 2).map(item => item.getBoundingClientRect().toJSON()));
  expect(mobile[0].width).toBeGreaterThan(245);
  expect(mobile[0].width).toBe(mobile[1].width);
  expect(mobile[1].top).toBeGreaterThan(mobile[0].bottom);
  expect(await board.evaluate(element => element.scrollWidth)).toBe(await board.evaluate(element => element.clientWidth));
});
