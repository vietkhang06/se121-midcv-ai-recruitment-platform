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

test('target JD guidance only lists confirmed CVs, retries errors and never saves the profile', async ({ page }) => {
  await initialize(page);
  let writes = 0, attempts = 0;
  page.on('request', request => { if (request.url().includes('/candidate/cvs') && request.method() !== 'GET') writes++; });
  await page.route('**/api/v1/jobs/synthetic-job', route => route.fulfill({ json: { data: {
    id: 'synthetic-job', title: 'Java Engineer', status: 'PUBLISHED', description: 'Java Docker', requirements: [], companyName: 'Synthetic',
  } } }));
  await page.route('**/api/v1/candidate/cvs', route => route.fulfill({ json: { data: [
    { id: 'confirmed', title: 'Confirmed synthetic CV', status: 'CONFIRMED' },
    { id: 'draft', title: 'Unconfirmed synthetic CV', status: 'DRAFT' },
  ] } }));
  await page.route('**/api/v1/candidate/match/synthetic-job/gap-analysis?cvId=confirmed', route => {
    attempts++;
    if (attempts === 1) return route.fulfill({ status: 503, json: { message: 'Synthetic temporary failure' } });
    return route.fulfill({ json: { data: { job_id: 'synthetic-job', cv_version_id: 'confirmed-version', evidence_assessment: 'NOT_REQUESTED',
      gap_breakdown: [{ skill_name: 'Docker', category: 'MISSING_MANDATORY' }],
      tailored_roadmap: [{ milestone_number: 1, title: 'Docker practice', target_skills: ['Docker'], estimated_weeks: 2, practice_project: 'Containerize the existing API.' }],
    } } });
  });
  await page.goto('/jobs/synthetic-job');
  const section = page.getByRole('region', { name: 'Khoảng cách kỹ năng theo JD' });
  const select = section.getByRole('combobox');
  await expect(select.locator('option')).toHaveCount(2);
  await select.selectOption('confirmed');
  await section.getByRole('button', { name: 'Phân tích / Thử lại' }).click();
  await expect(section.getByRole('alert')).toContainText('Synthetic temporary failure');
  await section.getByRole('button', { name: 'Phân tích / Thử lại' }).click();
  await expect(section.getByText('Docker practice', { exact: true })).toBeVisible();
  await expect(section.getByText('Containerize the existing API.')).toBeVisible();
  await expect(section).toContainText('confirmed-version');
  await select.selectOption('');
  await expect(section.getByText('Docker practice')).toHaveCount(0);
  expect(writes).toBe(0);
});
