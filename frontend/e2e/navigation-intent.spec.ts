import { test, expect, type Page } from '@playwright/test';

// Synthetic API fixtures only. Run live RBAC, OAuth and DB idempotency separately.
const token = `fixture.${Buffer.from(JSON.stringify({ exp: 4_102_444_800 })).toString('base64url')}.fixture`;
const portals = { CANDIDATE: '/candidate', RECRUITER: '/recruiter', ADMIN: '/admin' } as const;
type Role = keyof typeof portals;
const job = { id: 'nav-job', title: 'Java Navigation Fixture', status: 'PUBLISHED', industry: 'Technology', companyName: 'Fixture Company' };
const app = { id: 'nav-app-server', jobId: job.id, job, appliedCvId: 'cv-confirmed', appliedCvVersionNumber: 2, status: 'SUBMITTED', aiAnalysisConsent: false, candidateName: 'Navigation Candidate', appliedCvFullName: 'Navigation Candidate', appliedAt: '2026-11-23T12:00:00Z' };
const confirmed = { id: 'cv-confirmed', title: 'Confirmed fixture CV', status: 'CONFIRMED', isDefault: true };
const draft = { id: 'cv-draft', title: 'Draft fixture CV', status: 'DRAFT' };

async function seed(page: Page, role: Role | null, locale: 'vi' | 'en' = 'vi') {
  await page.addInitScript(({ role, locale, token }) => {
    // Do not overwrite credentials installed by the OAuth/password login on navigation.
    if (sessionStorage.getItem('nav-fixture-initialized')) return;
    sessionStorage.setItem('nav-fixture-initialized', '1');
    localStorage.setItem('midcv_lang', locale);
    localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    if (role) {
      localStorage.setItem('auth_user', JSON.stringify({ id: 'nav-user', email: 'fixture@example.test', fullName: 'Navigation Fixture', role, emailVerified: true }));
      localStorage.setItem('auth_token', token);
    }
  }, { role, locale, token });
}

async function fixture(page: Page, options: { lostResponse?: boolean; closed?: boolean; noCv?: boolean; oauthRole?: string; oauthFail?: boolean } = {}) {
  const state = { posts: 0, cvRequests: 0, exchanges: 0, submitted: false, inspectionFail: true };
  await page.route('**/api/v1/**', async route => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const send = (data: unknown, status = 200) => route.fulfill({ status, json: { data, success: status < 400 } });
    if (path.endsWith('/auth/login')) return send({ userId: 'nav-user', email: 'fixture@example.test', role: 'CANDIDATE', accessToken: token });
    if (path.endsWith('/auth/oauth/exchange')) {
      state.exchanges++;
      return options.oauthFail ? send(null, 400) : send({ userId: 'nav-user', email: 'fixture@example.test', role: options.oauthRole ?? 'CANDIDATE', accessToken: token });
    }
    if (path.endsWith(`/jobs/${job.id}`)) return send(options.closed ? { ...job, status: 'CLOSED' } : job);
    if (path.endsWith('/candidate/cvs')) {
      state.cvRequests++;
      return send(options.noCv ? [draft] : [draft, confirmed]);
    }
    if (path.endsWith('/candidate/cvs/quota')) return send({ plan: 'STANDARD', currentCount: 1, maxLimit: 3, remainingSlots: 2, canUpload: true });
    if (path.endsWith('/candidate/applications')) {
      if (req.method() === 'POST') {
        state.posts++;
        state.submitted = true;
        return options.lostResponse ? send(null, 503) : send(app);
      }
      return send({ content: state.submitted ? [app] : [], totalPages: 1 });
    }
    if (path.endsWith(`/jobs/${job.id}/rankings`)) return send([{ applicationId: app.id, candidateId: 'nav-user', candidateName: app.candidateName, applicationStatus: 'SUBMITTED', calculationStatus: 'PGVECTOR_READY', overallScore: 85, coreScore: 85, requiredSkillsMatched: 1, requiredSkillsTotal: 1 }]);
    if (path.endsWith(`/jobs/${job.id}/applications`)) return send([{ ...app, matchScore: 85, matchStatus: 'PGVECTOR_READY' }]);
    if (path.endsWith(`/recruiter/applications/${app.id}`)) return send(app);
    if (path.endsWith(`/applications/${app.id}/inspection`)) return send(null, state.inspectionFail ? 503 : 404);
    if (path.endsWith('/candidate/profile')) return send({ id: 'nav-user', fullName: 'Navigation Fixture', targetIndustry: 'Technology' });
    if (path.endsWith('/auth/oauth/github/connection')) return send({ connected: false, ownershipVerified: false, scanScope: 'PUBLIC_PROFILE_ONLY' });
    if (path.endsWith('/account/avatar')) return send({ fullName: 'Navigation Fixture', emailVerified: true });
    return send([]);
  });
  return state;
}

for (const role of Object.keys(portals) as Role[]) {
  for (const [targetRole, target] of Object.entries(portals)) {
    test(`NAV-01 ${role} → ${target}`, async ({ page }) => {
      await seed(page, role);
      await fixture(page);
      await page.goto(target);
      if (role !== targetRole) await expect(page.locator('#role-guard-forbidden')).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`${portals[role]}$`));
      await expect(page.locator('#role-guard-forbidden')).toHaveCount(0);
      await expect(page.locator('#role-guard-loading')).toHaveCount(0);
    });
  }
}

for (const [role, next, expected] of [
  ['CANDIDATE', '/admin/users', '/candidate'],
  ['HR', '/recruiter/jobs', '/recruiter/jobs'],
  ['ADMIN', '//evil.test', '/admin'],
  ['CANDIDATE', '/jobs/nav-job?apply=1', '/jobs/nav-job'],
] as const) {
  test(`NAV-02 OAuth ${role} with next ${next}`, async ({ page }) => {
    await seed(page, null);
    const state = await fixture(page, { oauthRole: role });
    await page.goto(`/oauth/callback?ticket=nav-test-ticket&next=${encodeURIComponent(next)}`);
    await expect(page).toHaveURL(new RegExp(`${expected.replaceAll('/', '\\/')}(?:\\?apply=1)?$`));
    expect(state.exchanges).toBe(1);
    expect(page.url()).not.toContain('ticket=');
    if (next.includes('apply=1')) await expect(page.getByRole('dialog', { name: 'Ứng tuyển' })).toBeVisible();
  });
}

test('NAV-02 expired ticket is removed and cannot create a session', async ({ page }) => {
  await seed(page, null);
  const state = await fixture(page, { oauthFail: true });
  await page.goto('/oauth/callback?ticket=expired&next=%2Fadmin');
  await expect(page.getByRole('status')).toContainText('Đăng nhập đã hết hạn');
  await expect(page).toHaveURL(/\/oauth\/callback$/);
  expect(await page.evaluate(() => localStorage.getItem('auth_user'))).toBeNull();
  await page.reload();
  await expect(page.getByRole('status')).toContainText('không hợp lệ');
  expect(state.exchanges).toBe(1);
});

test('NAV-03 password login resumes the correct JD and never submits automatically', async ({ page }) => {
  await seed(page, null);
  const state = await fixture(page);
  await page.goto(`/jobs/${job.id}`);
  await page.getByRole('button', { name: 'Ứng tuyển', exact: true }).click();
  await page.getByRole('dialog', { name: 'Yêu cầu đăng nhập' }).getByRole('button', { name: 'Đăng nhập ngay' }).click();
  expect(state.cvRequests).toBe(0);
  await page.locator('#auth-login-email').fill('fixture@example.test');
  await page.locator('#auth-login-password').fill('fixture-password');
  await page.locator('#auth-login-submit').click();
  const dialog = page.getByRole('dialog', { name: 'Ứng tuyển' });
  await expect(dialog.getByRole('combobox')).toHaveValue('cv-confirmed');
  await expect(dialog.getByRole('option', { name: /Draft fixture CV/ })).toHaveCount(0);
  expect(state.posts).toBe(0);
  await expect(page).toHaveURL(/\/jobs\/nav-job$/);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Ứng tuyển', exact: true })).toBeVisible();
  await expect(dialog).toHaveCount(0);
});

test('NAV-04 no confirmed CV retains JD in library and builder links', async ({ page }) => {
  await seed(page, 'CANDIDATE');
  await fixture(page, { noCv: true });
  await page.goto(`/jobs/${job.id}?apply=1`);
  const dialog = page.getByRole('dialog', { name: 'Ứng tuyển' });
  await expect(dialog.getByRole('combobox')).toHaveCount(0);
  await dialog.getByRole('link', { name: 'Tải lên, tạo hoặc xác nhận CV' }).click();
  await expect(page).toHaveURL(/\/candidate\/cvs\?returnTo=%2Fjobs%2Fnav-job$/i);
  await expect(page.locator('a[href="/candidate/cvs/builder?returnTo=%2Fjobs%2Fnav-job"]').first()).toBeVisible();
});

test('NAV-05 closed and reopened modal ignores an older CV response', async ({ page }) => {
  await seed(page, 'CANDIDATE');
  await fixture(page);
  let release: () => void = () => {};
  const delayed = new Promise<void>(resolve => { release = resolve; });
  let calls = 0;
  await page.route('**/api/v1/candidate/cvs', async route => {
    calls++;
    if (calls === 1) { await delayed; return route.fulfill({ json: { data: [{ ...confirmed, id: 'stale', title: 'Stale CV' }] } }).catch(() => {}); }
    return route.fulfill({ json: { data: [confirmed] } });
  });
  await page.goto(`/jobs/${job.id}?apply=1`);
  const dialog = page.getByRole('dialog', { name: 'Ứng tuyển' });
  await expect.poll(() => calls).toBe(1);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Ứng tuyển', exact: true }).click();
  await expect(dialog.getByRole('combobox')).toHaveValue('cv-confirmed');
  release();
  await expect(dialog.getByRole('option', { name: 'Stale CV' })).toHaveCount(0);
  await expect(dialog.getByRole('combobox')).toHaveValue('cv-confirmed');
});

test('NAV-06 HTTP failure after commit recovers the actual ID without another POST', async ({ page }) => {
  await seed(page, 'CANDIDATE');
  const state = await fixture(page, { lostResponse: true });
  await page.goto(`/jobs/${job.id}?apply=1`);
  const dialog = page.getByRole('dialog', { name: 'Ứng tuyển' });
  await expect(dialog.getByRole('combobox')).toHaveValue('cv-confirmed');
  await dialog.getByRole('button', { name: /Nộp đơn ứng tuyển/i }).click();
  await expect(dialog.getByRole('link', { name: 'Xem đơn và báo cáo' })).toHaveAttribute('href', '/candidate/applications/nav-app-server');
  expect(state.posts).toBe(1);
  await page.reload();
  await expect(page.getByRole('link', { name: /Bạn đã ứng tuyển/ })).toHaveAttribute('href', '/candidate/applications/nav-app-server');
  expect(state.posts).toBe(1);
});

test('NAV-07 cancelled linking returns to profile and preserves the signed-in account', async ({ page }) => {
  await seed(page, 'CANDIDATE');
  await fixture(page);
  await page.addInitScript(() => {
    if (sessionStorage.getItem('link-marker-seeded')) return;
    sessionStorage.setItem('link-marker-seeded', '1');
    sessionStorage.setItem('midcv:pending-profile-link', JSON.stringify({ userId: 'nav-user', provider: 'github', expires: Date.now() + 60_000 }));
  });
  await page.goto('/login?oauth_error=cancelled');
  await expect(page).toHaveURL(/\/candidate\/profile$/);
  await expect(page.getByText(/Liên kết đã bị hủy hoặc không hoàn tất/)).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('auth_user') ?? '{}').id)).toBe('nav-user');
  expect(await page.evaluate(() => sessionStorage.getItem('midcv:pending-profile-link'))).toBeNull();
});

for (const width of [375, 768, 1440]) {
  test(`NAV-08 ranking context and inspection failure at ${width}px`, async ({ page }) => {
    await seed(page, 'RECRUITER', width === 768 ? 'en' : 'vi');
    const state = await fixture(page);
    await page.setViewportSize({ width, height: 900 });
    const ranking = `/recruiter/jobs/${job.id}/ranking?minScore=80&fullRequired=1`;
    await page.goto(ranking);
    await expect(page.getByRole('combobox', { name: /Điểm Overall tối thiểu|Minimum Overall Score/ })).toHaveValue('80');
    await page.locator(`a[href*="/recruiter/applications/${app.id}?returnTo="]`).first().click();
    await expect(page.getByRole('alert').filter({ hasText: /Không tải được báo cáo AI|Could not load the AI report/ })).toBeVisible();
    state.inspectionFail = false;
    await page.getByRole('alert').filter({ hasText: /Không tải được báo cáo AI|Could not load the AI report/ }).getByRole('button').click();
    await expect(page.getByRole('alert').filter({ hasText: /Không tải được báo cáo AI|Could not load the AI report/ })).toHaveCount(0);
    await page.getByRole('link', { name: /Quay lại bảng xếp hạng|Back to ranking/ }).click();
    await expect(page.getByRole('combobox', { name: /Điểm Overall tối thiểu|Minimum Overall Score/ })).toHaveValue('80');
    await expect(page.getByRole('checkbox', { name: /Chỉ hiển thị ứng viên|Only show candidates/ })).toBeChecked();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}

for (const [role, closed] of [['CANDIDATE', true], ['RECRUITER', false], ['ADMIN', false]] as const) {
  test(`NAV-03 resume is discarded for ${role}, closed=${closed}`, async ({ page }) => {
    await seed(page, role);
    const state = await fixture(page, { closed });
    await page.goto(`/jobs/${job.id}?apply=1`);
    await expect(page).toHaveURL(/\/jobs\/nav-job$/);
    await expect(page.getByRole('dialog', { name: 'Ứng tuyển' })).toHaveCount(0);
    expect(state.posts).toBe(0);
    expect(state.cvRequests).toBe(0);
  });
}
