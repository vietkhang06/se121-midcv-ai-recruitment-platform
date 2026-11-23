import { expect, test, type Page } from '@playwright/test';

async function applicationFixture(page: Page, status: 'SUBMITTED' | 'REJECTED', pro = false) {
  const calls: unknown[] = [];
  const fixture = { conflict: false, calls };
  const accessToken = `fixture.${Buffer.from(JSON.stringify({ exp: 4_102_444_800 })).toString('base64url')}.fixture`;
  await page.addInitScript(({ accessToken, dark }) => {
    localStorage.setItem('auth_token', accessToken);
    localStorage.setItem('auth_user', JSON.stringify({
      id: 'recruiter', fullName: 'Recruiter Fixture', email: 'hr@example.test',
      role: 'RECRUITER', emailVerified: true,
    }));
    localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    localStorage.setItem('midcv_lang', 'vi');
    if (dark) localStorage.setItem('midcv_theme', 'dark');
  }, { accessToken, dark: pro });
  const application = {
    id: 'demo', jobId: 'backend', jobTitle: 'Lập trình viên Backend Java Junior',
    appliedCvFullName: 'Nguyễn Minh An', appliedCvEmail: 'ung-vien@example.test',
    status, proDetailAvailable: pro,
    snapshot: { cvTitle: 'CV Java Backend', rawTextSnapshot: 'Java, PostgreSQL.' },
  };
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const send = (data: unknown, status = 200) => route.fulfill({ status, json: { success: status === 200, data } });
    if (path.endsWith('/applications/demo')) return send(application);
    if (path.endsWith('/inspection')) return send(pro ? {
      applicationId: 'demo', detailAccess: true, overallScore: 0, calculationStatus: 'PGVECTOR_READY',
      humanReadableExplanation: 'Hệ thống đã đối chiếu các kỹ năng.',
      requiredSkillsStatus: [], preferredSkillsStatus: [], matchFactors: [],
    } : { applicationId: 'demo', detailAccess: false, matchClassification: 'CHUA_KHA_DUNG' });
    if (path.endsWith('/demo/status')) {
      const request = route.request().postDataJSON();
      calls.push(request);
      if (fixture.conflict) return send(null, 409);
      return send({ ...application, status: request.status });
    }
    return send([]);
  });
  return fixture;
}

test('submitted application shows only valid next actions and keeps CV after saving', async ({ page }, info) => {
  const fixture = await applicationFixture(page, 'SUBMITTED');
  await page.goto('/recruiter/applications/demo');
  await expect(page.getByRole('heading', { name: 'Nguyễn Minh An' })).toBeVisible();
  await expect(page.getByText('Chưa khả dụng', { exact: true })).toBeVisible();
  await expect(page.getByRole('meter')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Chuyển sang phỏng vấn' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Đánh dấu đã tuyển' })).toHaveCount(0);

  for (const width of [1440, 768, 375]) {
    await page.setViewportSize({ width, height: 900 });
    const trigger = page.getByRole('button', { name: 'Đưa vào danh sách chọn' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Đưa vào danh sách chọn' });
    const note = dialog.getByRole('textbox');
    await expect(note).toBeFocused();
    const box = await dialog.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(300);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (width === 375) await page.screenshot({ path: info.outputPath('xac-nhan-tren-dien-thoai.png'), animations: 'disabled' });
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  }

  await page.getByRole('button', { name: 'Đưa vào danh sách chọn' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox').fill('  Cần đánh giá thêm Java.  ');
  await dialog.getByRole('button', { name: 'Xác nhận' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Chuyển sang phỏng vấn' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nguyễn Minh An' })).toBeVisible();
  expect(fixture.calls).toEqual([{ status: 'SHORTLISTED', expectedStatus: 'SUBMITTED', decisionNote: 'Cần đánh giá thêm Java.' }]);
});

test('reopening requires a reason and a stale status prompts a reload', async ({ page }) => {
  const fixture = await applicationFixture(page, 'REJECTED');
  fixture.conflict = true;
  await page.goto('/recruiter/applications/demo');
  const trigger = page.getByRole('button', { name: 'Mở lại hồ sơ' });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  const confirm = dialog.getByRole('button', { name: 'Xác nhận' });
  await expect(confirm).toBeDisabled();
  await dialog.getByRole('textbox', { name: 'Lý do mở lại hồ sơ' }).fill('Ứng viên đã bổ sung CV.');
  await confirm.click();
  await expect(dialog.getByRole('alert')).toContainText('Trạng thái đã thay đổi ở nơi khác');
  await expect(confirm).toBeDisabled();
  await dialog.getByRole('button', { name: 'Hủy' }).click();
  await expect(trigger).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Tải lại hồ sơ để tiếp tục' })).toBeVisible();
});

test('detailed score can be zero and renders once in the overview', async ({ page }, info) => {
  await applicationFixture(page, 'SUBMITTED', true);
  await page.goto('/recruiter/applications/demo');
  await expect(page.getByRole('meter', { name: 'Điểm đối sánh' })).toHaveAttribute('value', '0');
  await expect(page.getByRole('heading', { name: 'Giải thích kết quả đối sánh' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Đối sánh với vị trí' })).toHaveCount(1);
  await page.screenshot({ path: info.outputPath('ho-so-giao-dien-toi.png'), animations: 'disabled' });
});
