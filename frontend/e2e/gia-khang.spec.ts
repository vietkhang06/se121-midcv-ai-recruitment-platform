import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// Browser + real PDF rendering with synthetic HTTP contracts. This is not live-backend acceptance.
test('builder preserves canonical fields/template, survives failed save, reloads and exports a real PDF', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    localStorage.setItem('midcv_lang', 'en');
    localStorage.setItem('auth_user', JSON.stringify({ id: 'synthetic-candidate', email: 'synthetic@example.com', fullName: 'Synthetic Candidate', role: 'CANDIDATE', emailVerified: true }));
    localStorage.setItem('auth_token', 'jwt-test-token-builder');
  });
  const envelope = (data: unknown) => ({ success: true, data });
  let revision = 1, failSave = false;
  let draft: Record<string, unknown> = {
    cv_id: 'synthetic-builder', version_id: 'synthetic-version', revision: 'r1', title: 'Synthetic CV', status: 'DRAFT',
    presentation: { template: 'editorial' },
    personal_info: { full_name: 'Alex Synthetic', email: 'alex@example.com', headline: 'Engineer', hidden_field: 'retain-me' },
    summary: { content: 'Built a tested API.' }, skills: [{ name: 'Java' }],
    work_experience: [{ id: 'work-stable', position: 'Engineer', start_date: '2021-02', end_date: '2024-03', company: 'Example Lab', technologies: ['Java'], description: 'Implemented an API.' }],
    projects: [{ id: 'project-stable', name: 'Example API', tech_stack: ['Java', 'Docker'], description: 'Synthetic project.' }],
    education: [{ id: 'education-stable', institution: 'Example Institute', degree: 'Bachelor', field_of_study: 'Software', gpa: 3.6, gpa_scale: 4 }],
    certifications: [], languages: [], links: {},
  };
  await page.route('**/api/v1/**', route => route.fulfill({ json: envelope([]) }));
  await page.route('**/api/v1/candidate/cvs', route => route.fulfill({ json: envelope([{ id: 'synthetic-builder', title: 'Synthetic CV', status: 'DRAFT', creationPath: 'BUILDER' }]) }));
  await page.route('**/api/v1/candidate/cvs/quota', route => route.fulfill({ json: envelope({ plan: 'STANDARD', currentCount: 1, maxLimit: 3, remainingSlots: 2, canUpload: true }) }));
  await page.route('**/api/v1/candidate/cvs/synthetic-builder/draft', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: envelope(draft) });
    const payload = route.request().postDataJSON();
    expect(payload.expected_revision).toBe(`r${revision}`);
    expect(payload.work_experience[0].id).toBe('work-stable');
    expect(payload.work_experience[0].start_date).toBe('2021-02');
    expect(payload.projects[0].tech_stack).toEqual(['Java', 'Docker']);
    expect(payload.education[0].gpa).toBe(3.6);
    expect(payload.personal_info.hidden_field).toBe('retain-me');
    if (failSave) { failSave = false; return route.fulfill({ status: 500, json: { message: 'Synthetic save failure' } }); }
    revision++; draft = { ...draft, ...payload, revision: `r${revision}` };
    return route.fulfill({ json: envelope(draft) });
  });
  await page.goto('/candidate/cvs/builder?edit=synthetic-builder');
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Alex Synthetic');
  await expect(page.getByLabel('CV template', { exact: true })).toHaveValue('editorial');
  await page.getByLabel('Full name', { exact: true }).fill('Alex Reviewed');
  await page.getByLabel('CV template', { exact: true }).selectOption('simple');
  failSave = true;
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('region', { name: 'CV editor' }).getByRole('alert')).toContainText('Synthetic save failure');
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Alex Reviewed');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Draft saved.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Alex Reviewed');
  await expect(page.getByLabel('CV template', { exact: true })).toHaveValue('simple');
  const preview = page.locator('#printable-cv');
  await expect(preview).toContainText('Example Institute');
  await expect(preview).toContainText('Java, Docker');
  mkdirSync('../docs/tasks/evidence', { recursive: true });
  await page.screenshot({ path: '../docs/tasks/evidence/builder-desktop.png', fullPage: true });
  await page.pdf({ path: '../docs/tasks/evidence/builder-export.pdf', format: 'A4', printBackground: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Alex Reviewed');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '../docs/tasks/evidence/builder-mobile.png', fullPage: true });
});
