import { expect, test, type Page } from '@playwright/test';

const token = `fixture.${Buffer.from(JSON.stringify({ exp: 4_102_444_800 })).toString('base64url')}.fixture`;
const id = 'f48b73c4-3fc7-4586-b641-fec7b5385e72';
const initialJob = {
  id, title: 'Thực tập sinh Digital Marketing bán thời gian',
  companyName: 'MidCV Demo', industry: 'Marketing', seniority: 'Intern',
  employmentType: 'PART_TIME', status: 'DRAFT', vacancyCount: 2, applicationDeadline: '2099-12-31',
  description: 'Viết nội dung hằng tuần.', descriptionHtml: '<p><strong>Viết nội dung hằng tuần.</strong></p>',
};

async function mockRecruiter(page: Page) {
  let job = { ...initialJob };
  let publications = 0;
  const submissions: Record<string, unknown>[] = [];
  await page.addInitScript(({ accessToken }) => {
    localStorage.setItem('auth_token', accessToken);
    localStorage.setItem('auth_user', JSON.stringify({
      id: 'hr', fullName: 'Recruiter Fixture', email: 'hr@example.test', role: 'RECRUITER', emailVerified: true,
    }));
    localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    if (!localStorage.getItem('midcv_lang')) localStorage.setItem('midcv_lang', 'vi');
  }, { accessToken: token });
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    const method = route.request().method();
    const send = (data: unknown) => route.fulfill({ json: { success: true, data } });
    if (path === '/recruiter/company') return send({ name: 'Demo', verificationStatus: 'VERIFIED' });
    if (path === `/recruiter/jobs/${id}`) return send(job);
    if (path === '/recruiter/jobs') return send([job]);
    if (path === '/jobs/draft' || (path === `/jobs/${id}` && method === 'PUT')) {
      const data = route.request().postDataJSON();
      submissions.push(data);
      job = { ...job, ...data, status: 'DRAFT' };
      return send(job);
    }
    if (path === `/jobs/${id}/publish`) {
      publications++;
      job = { ...job, status: 'PUBLISHED' };
      return send(job);
    }
    if (path === `/jobs/${id}/close`) {
      job = { ...job, status: 'CLOSED' };
      return send(job);
    }
    return send([]);
  });
  return { submissions, publications: () => publications };
}

test('editor sends a fixed salary, openings, deadline, formatted text and selected skills', async ({ page }) => {
  const fixture = await mockRecruiter(page);
  await page.goto('/recruiter/jobs/new');
  await page.getByRole('textbox', { name: 'Tiêu đề vị trí tuyển dụng' }).fill(initialJob.title);
  await page.getByLabel('Số lượng tuyển').fill('2');
  await page.getByLabel('Hạn nộp hồ sơ').fill('2099-12-31');
  await page.getByLabel('Cách công bố').selectOption('FIXED');
  await page.getByLabel('Số tiền').fill('4000000');
  const editor = page.getByRole('textbox', { name: 'Mô tả công việc' });
  await editor.fill('Viết nội dung hằng tuần.');
  await editor.press('ControlOrMeta+a');
  await page.getByRole('toolbar').first().getByRole('button', { name: 'In đậm', exact: true }).click();
  const skill = page.getByPlaceholder('Tìm hoặc nhập tên kỹ năng');
  await skill.fill('Canva');
  await skill.press('Enter');
  await page.getByLabel('Loại yêu cầu · Canva').selectOption('PREFERRED');
  await page.getByRole('button', { name: 'Đăng tin', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(fixture.submissions).toHaveLength(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect.poll(fixture.publications).toBe(1);
  expect(fixture.submissions[0]).toMatchObject({
    vacancyCount: 2, applicationDeadline: '2099-12-31', minSalary: 4000000, maxSalary: 4000000,
    description: 'Viết nội dung hằng tuần.',
    requirements: [{ skillName: 'Canva', type: 'PREFERRED', minYearsExp: 0 }],
  });
  expect(fixture.submissions[0].descriptionHtml).toMatch(/<(b|strong)>/);
});

test('draft keeps buttons below its long title and confirms publish and close', async ({ page }) => {
  const fixture = await mockRecruiter(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/recruiter/jobs/${id}`);
  const title = page.getByRole('heading', { name: initialJob.title });
  const publish = page.getByRole('button', { name: 'Đăng tin ngay' });
  await expect(publish).toBeVisible();
  const titleBox = await title.boundingBox();
  const buttonBox = await publish.boundingBox();
  expect(buttonBox!.y).toBeGreaterThan(titleBox!.y + titleBox!.height);
  await expect(page.getByText('Bản nháp', { exact: true })).toBeVisible();
  await publish.click();
  await page.getByRole('dialog').getByRole('button', { name: 'Quay lại', exact: true }).click();
  expect(fixture.publications()).toBe(0);
  await publish.click();
  await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.getByText('Đang đăng', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đóng tin', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.getByText('Đã đóng', { exact: true })).toBeVisible();
  await page.evaluate(() => {
    localStorage.setItem('midcv_lang', 'en');
    window.dispatchEvent(new Event('midcv:locale-change'));
  });
  await expect(page.getByText('Closed', { exact: true })).toBeVisible();
});

test('public job detail shows an expired deadline and no apply action', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    localStorage.setItem('midcv_lang', 'vi');
  });
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: { success: true, data: path === `/api/v1/jobs/${id}`
      ? { ...initialJob, status: 'PUBLISHED', applicationDeadline: '2000-01-01' }
      : [] } });
  });
  await page.goto(`/jobs/${id}`);
  await expect(page.getByRole('heading', { name: initialJob.title })).toBeVisible();
  await expect(page.getByText('Hết hạn', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ứng tuyển', exact: true })).toHaveCount(0);
  await expect(page.getByText('01/01/2000', { exact: true })).toBeVisible();
});
