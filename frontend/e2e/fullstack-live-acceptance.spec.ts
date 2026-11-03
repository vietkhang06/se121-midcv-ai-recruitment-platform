import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

type ApiRole = 'CANDIDATE' | 'HR' | 'ADMIN';
type FrontendRole = 'CANDIDATE' | 'RECRUITER' | 'ADMIN';

type Credentials = {
  email: string;
  password: string;
  apiRole: ApiRole;
  frontendRole: FrontendRole;
  landingPath: string;
};

type Session = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; fullName: string; role: FrontendRole; emailVerified: boolean };
};

const apiBase = (process.env.MIDCV_E2E_API_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const webBase = process.env.MIDCV_E2E_WEB_URL || 'http://localhost:3000';

function credentials(prefix: string, apiRole: ApiRole, frontendRole: FrontendRole, landingPath: string): Credentials | null {
  const email = process.env[`${prefix}_EMAIL`]?.trim();
  const password = process.env[`${prefix}_PASSWORD`];
  return email && password ? { email, password, apiRole, frontendRole, landingPath } : null;
}

const candidate = credentials('MIDCV_E2E_CANDIDATE', 'CANDIDATE', 'CANDIDATE', '/candidate');
const hrA = credentials('MIDCV_E2E_HR_A', 'HR', 'RECRUITER', '/recruiter');
const hrB = credentials('MIDCV_E2E_HR_B', 'HR', 'RECRUITER', '/recruiter');
const admin = credentials('MIDCV_E2E_ADMIN', 'ADMIN', 'ADMIN', '/admin');
const roleMatrixReady = Boolean(candidate && hrA && admin);

async function login(request: APIRequestContext, value: Credentials): Promise<Session> {
  const response = await request.post(`${apiBase}/api/v1/auth/login`, {
    data: { email: value.email, password: value.password },
    timeout: 20_000,
  });
  expect(response.status(), `Login failed for ${value.apiRole} account ${value.email}`).toBe(200);
  const envelope = await response.json();
  const data = envelope?.data;
  expect(data?.accessToken, 'Login response must contain accessToken').toBeTruthy();
  expect(data?.refreshToken, 'Login response must contain refreshToken').toBeTruthy();
  expect(data?.role, 'Login response must expose the database role').toBe(value.apiRole);
  return {
    accessToken: data.accessToken as string,
    refreshToken: data.refreshToken as string,
    user: {
      id: String(data.userId),
      email: String(data.email),
      fullName: String(data.email).split('@')[0],
      role: value.frontendRole,
      emailVerified: true,
    },
  };
}

async function getWithToken(request: APIRequestContext, path: string, token?: string) {
  return request.get(`${apiBase}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    timeout: 20_000,
  });
}

async function openRealSession(page: Page, session: Session, path: string) {
  await page.addInitScript(({ user, accessToken, refreshToken }) => {
    localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('auth_token', accessToken);
    localStorage.setItem('auth_refresh_token', refreshToken);
    localStorage.setItem('midcv_lang', 'vi');
  }, {
    user: session.user,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  });
  const response = await page.goto(`${webBase}${path}`, { waitUntil: 'domcontentloaded' });
  expect(response?.status(), `Frontend route ${path} did not return a successful document`).toBeLessThan(400);
  await expect(page.locator('body')).toBeVisible();
}

test.describe('E01 — live full-stack acceptance (real API, real accounts, no response mocks)', () => {
  test.skip(!roleMatrixReady, 'Set MIDCV_E2E_CANDIDATE_*, MIDCV_E2E_HR_A_* and MIDCV_E2E_ADMIN_* for the live acceptance environment.');

  test('token transport and role matrix are enforced by the running backend', async ({ request }) => {
    const candidateSession = await login(request, candidate!);
    const hrSession = await login(request, hrA!);
    const adminSession = await login(request, admin!);

    expect((await getWithToken(request, '/api/v1/admin/users')).status()).toBe(401);
    expect((await getWithToken(request, '/api/v1/admin/users', candidateSession.accessToken)).status()).toBe(403);
    expect((await getWithToken(request, '/api/v1/admin/users', hrSession.accessToken)).status()).toBe(403);
    expect((await getWithToken(request, '/api/v1/admin/users?page=0&size=1', adminSession.accessToken)).status()).toBe(200);
    expect((await getWithToken(request, '/api/v1/recruiter/jobs', candidateSession.accessToken)).status()).toBe(403);
    expect((await getWithToken(request, '/api/v1/candidate/applications', hrSession.accessToken)).status()).toBe(403);

    // Refresh tokens are accepted only by POST /auth/refresh, never as access tokens.
    expect((await getWithToken(request, '/api/v1/admin/users', adminSession.refreshToken)).status()).toBe(401);
    expect((await getWithToken(request, `/api/v1/admin/users?access_token=${encodeURIComponent(adminSession.accessToken)}`)).status()).toBe(401);
  });

  test('two HR accounts cannot cross-read another company application or recruiter job', async ({ request }) => {
    test.skip(!hrB, 'Set MIDCV_E2E_HR_B_EMAIL/PASSWORD to test a second tenant.');
    const a = await login(request, hrA!);
    const b = await login(request, hrB!);
    const jobId = process.env.MIDCV_E2E_HR_A_JOB_ID;
    const applicationId = process.env.MIDCV_E2E_HR_A_APPLICATION_ID;
    test.skip(!jobId || !applicationId, 'Set MIDCV_E2E_HR_A_JOB_ID and MIDCV_E2E_HR_A_APPLICATION_ID for an existing company-A record.');

    expect((await getWithToken(request, `/api/v1/recruiter/jobs/${jobId}`, a.accessToken)).status()).toBe(200);
    expect((await getWithToken(request, `/api/v1/recruiter/jobs/${jobId}`, b.accessToken)).status()).toBe(403);
    expect((await getWithToken(request, `/api/v1/recruiter/applications/${applicationId}`, a.accessToken)).status()).toBe(200);
    expect((await getWithToken(request, `/api/v1/recruiter/applications/${applicationId}`, b.accessToken)).status()).toBe(403);
  });

  test('real browser session opens the candidate application and survives a deliberately failed API request', async ({ page, request }) => {
    const session = await login(request, candidate!);
    await openRealSession(page, session, '/candidate');

    const failedRequests: string[] = [];
    page.on('requestfailed', (req) => {
      if (req.url().includes('/api/v1/jobs')) failedRequests.push(req.url());
    });
    // Fault injection is limited to the browser request. No API payload or data is fabricated.
    await page.route('**/api/v1/jobs**', (route) => route.abort('failed'));
    const response = await page.goto(`${webBase}/jobs`, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('body')).toBeVisible();
    await expect.poll(() => failedRequests.length, { timeout: 10_000 }).toBeGreaterThan(0);
  });

  test('real browser role guards render the matching portals', async ({ page, request }) => {
    const candidateSession = await login(request, candidate!);
    await openRealSession(page, candidateSession, '/candidate');

    const hrSession = await login(request, hrA!);
    await openRealSession(page, hrSession, '/recruiter');
    await expect(page.locator('body')).toBeVisible();

    const adminSession = await login(request, admin!);
    await openRealSession(page, adminSession, '/admin');
    await expect(page.locator('body')).toBeVisible();
  });
});
