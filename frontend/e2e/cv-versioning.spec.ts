import { test, expect } from '@playwright/test';

test.describe('WP-05: Immutable CV Version Creation & Save (CVVER-01)', () => {

  test.beforeEach(async ({ page }) => {
    // Authenticate as Candidate and suppress onboarding modal via initScript
    await page.addInitScript(() => {
      window.sessionStorage.setItem('e2e_seed_benchmark', 'true');
      window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
      window.localStorage.setItem('midcv_lang', 'vi');
      window.localStorage.setItem('auth_user', JSON.stringify({
        id: 'cand-01',
        email: 'nguyenvanjava@example.com',
        fullName: 'Nguyễn Văn Java',
        role: 'CANDIDATE',
        age: 24,
        targetIndustry: 'Technology',
        emailVerified: true
      }));
      window.localStorage.setItem('auth_token', 'jwt-test-token-cand');
    });
  });

  test('CVVER-01-01: CV Library displays active version badge (v1.0) and version history button', async ({ page }) => {
    await page.goto('/candidate/cvs');

    // Verify page header
    await expect(page.locator('h1')).toBeVisible();

    // Verify active version badge on primary CV card
    const v1Badge = page.locator('span:has-text("v1.0")').first();
    await expect(v1Badge).toBeVisible();

    // Verify version history button
    const historyBtn = page.locator('.version-history-btn').first();
    await expect(historyBtn).toBeVisible();
    await expect(historyBtn).toContainText('phiên bản');
  });

  test('CVVER-01-02: Version History modal opens and displays immutable snapshot details', async ({ page }) => {
    await page.goto('/candidate/cvs');

    // Open version history modal
    const historyBtn = page.locator('.version-history-btn').first();
    await historyBtn.click();

    // Verify modal container and header
    const modal = page.locator('#version-history-modal');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Lịch Sử Phiên Bản CV')).toBeVisible();
    await expect(modal.getByText('IMMUTABLE AUDIT TRAIL')).toBeVisible();

    // Verify version 1 snapshot is listed inside modal
    await expect(modal.locator('span:has-text("v1.0")').first()).toBeVisible();
    await expect(modal.getByText('Phiên bản hiện tại')).toBeVisible();

    // Close modal
    const closeBtn = page.locator('#close-version-history-modal-btn');
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('CVVER-01-03: CV Builder auto-increments version to v2.0 on save without overwriting v1.0', async ({ page }) => {
    // Navigate to builder in edit mode for cv-01
    await page.goto('/candidate/cvs/builder?edit=cv-01');

    // Verify current version indicator in header
    const versionBadge = page.locator('#cv-version-badge');
    await expect(versionBadge).toBeVisible();
    await expect(versionBadge).toContainText('v1.0');

    // Modify experience bullets
    const textarea = page.locator('textarea').first();
    await textarea.fill('Senior Lead Engineer: Architected distributed event stream engine with Kafka, Redis, and Spring Boot.');

    // Save CV
    const saveBtn = page.locator('#save-cv-btn');
    await saveBtn.click();

    // Verify save success banner with version v2.0
    const banner = page.locator('#save-success-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });
    await expect(banner).toContainText('v2.0');
    await expect(banner).toContainText('Bản lưu bất biến');

    // Verify version badge updated to v2.0
    await expect(versionBadge).toContainText('v2.0');
  });

  test('CVVER-01-04: Returning to CV Library reflects active v2.0 and 2 versions in history', async ({ page }) => {
    // First, perform a save to create v2.0
    await page.goto('/candidate/cvs/builder?edit=cv-01');
    const textarea = page.locator('textarea').first();
    await textarea.fill('Updated scalable infrastructure bullets for v2.0.');
    await page.locator('#save-cv-btn').click();
    await expect(page.locator('#cv-version-badge')).toContainText('v2.0');

    // Return to CV Library
    await page.goto('/candidate/cvs');

    // Verify active badge is now v2.0
    const v2Badge = page.locator('span:has-text("v2.0")').first();
    await expect(v2Badge).toBeVisible();

    // Verify version counter displays 2 versions
    const historyBtn = page.locator('.version-history-btn').first();
    await expect(historyBtn).toContainText('2 phiên bản');

    // Open modal and verify both versions exist immutably
    await historyBtn.click();
    const modal = page.locator('#version-history-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('span:has-text("v2.0")').first()).toBeVisible();
    await expect(modal.locator('span:has-text("v1.0")').first()).toBeVisible();
  });

  test('CVVER-01-05: Page reload maintains immutable version history and active version', async ({ page }) => {
    // Ensure v2.0 is saved
    await page.goto('/candidate/cvs/builder?edit=cv-01');
    const textarea = page.locator('textarea').first();
    await textarea.fill('Persisted high-throughput data pipelines.');
    await page.locator('#save-cv-btn').click();
    await expect(page.locator('#cv-version-badge')).toContainText('v2.0');

    // Reload page
    await page.reload();

    // Verify version badge is still v2.0 after reload
    await expect(page.locator('#cv-version-badge')).toContainText('v2.0');

    // Navigate to CV Library and verify persistence
    await page.goto('/candidate/cvs');
    await expect(page.locator('span:has-text("v2.0")').first()).toBeVisible();
    const historyBtn = page.locator('.version-history-btn').first();
    await expect(historyBtn).toContainText('2 phiên bản');
  });

  test('CVVER-01-06: Loading historical snapshot from modal opens studio with snapshot version', async ({ page }) => {
    // Create v2.0
    await page.goto('/candidate/cvs/builder?edit=cv-01');
    const textarea = page.locator('textarea').first();
    await textarea.fill('v2.0 experimental revision.');
    await page.locator('#save-cv-btn').click();
    await expect(page.locator('#cv-version-badge')).toContainText('v2.0');

    // Open CV library and version history modal
    await page.goto('/candidate/cvs');
    await page.locator('.version-history-btn').first().click();

    // Click "Mở bản này trong Studio" for historical v1.0 inside modal
    const modal = page.locator('#version-history-modal');
    const openV1Link = modal.locator('a:has-text("Mở bản này trong Studio")').last();
    await openV1Link.click();

    // Verify builder loaded with v1.0
    await page.waitForURL(/.*v=1/);
    await expect(page.locator('#cv-version-badge')).toContainText('v1.0');
  });

});
