import { test, expect } from '@playwright/test';

test.describe('WP-03: Responsive Navigation & Top Bar UX (NAV-01)', () => {

  const candidateInitScript = () => {
    window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    window.localStorage.setItem('midcv_lang', 'vi');
    window.localStorage.setItem('auth_user', JSON.stringify({
      id: 'usr-cand-01',
      email: 'andrew@devops.sterling.io',
      fullName: 'Andrew Sterling',
      role: 'CANDIDATE',
      emailVerified: true
    }));
    window.localStorage.setItem('auth_token', 'jwt-test-token-cand');
  };

  const recruiterInitScript = () => {
    window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    window.localStorage.setItem('midcv_lang', 'vi');
    window.localStorage.setItem('auth_user', JSON.stringify({
      id: 'usr-rec-01',
      email: 'hr@fpt-software.com',
      fullName: 'Trần Thị Tuyển Dụng',
      role: 'RECRUITER',
      emailVerified: true
    }));
    window.localStorage.setItem('auth_token', 'jwt-test-token-rec');
  };

  test('NAV-01-01: Desktop Viewport (1280px) -> all 5 candidate tabs visible with active indicator, zero overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.addInitScript(candidateInitScript);

    await page.goto('/jobs');

    // Verify candidate top navbar
    const header = page.locator('header').first();
    await expect(header).toBeVisible();

    // Verify height is h-16 (64px) - zero wrapping
    const box = await header.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeLessThanOrEqual(70);

    // Verify mobile hamburger is hidden on desktop
    const mobileBtn = header.locator('#mobile-menu-btn');
    await expect(mobileBtn).toBeHidden();

    // Verify all 5 candidate navigation links are visible on desktop top navbar
    const nav = header.locator('nav').first();
    await expect(nav.getByRole('link', { name: /Tìm Việc Làm|Search Jobs/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /Báo Cáo Phù Hợp|Match Reports/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /Quản Lý CV|CV Management/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /Tổng Quan|Dashboard/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /Hướng Dẫn Sử Dụng|User Guide/i })).toBeVisible();

    // Verify active link state for /jobs
    const jobsLink = nav.locator('a[href="/jobs"]');
    await expect(jobsLink).toHaveClass(/border-b-2/);

    // Verify user profile & logout button are visible
    await expect(header.getByText('Andrew Sterling')).toBeVisible();
    await expect(header.locator('#navbar-logout-btn')).toBeVisible();
  });

  test('NAV-01-02: Narrow Desktop Viewport (1024px) -> compact layout active, zero horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.addInitScript(candidateInitScript);

    await page.goto('/jobs');

    const header = page.locator('header').first();
    await expect(header).toBeVisible();

    // Zero horizontal overflow check on page
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBeFalsy();

    // All links still visible in top nav without hamburger
    const nav = header.locator('nav').first();
    await expect(nav.getByRole('link', { name: /Tìm Việc Làm|Search Jobs/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /Báo Cáo Phù Hợp|Match Reports/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /Quản Lý CV|CV Management/i })).toBeVisible();
  });

  test('NAV-01-03: Tablet Viewport (768px) -> hamburger visible, slide-out drawer opens, navigates correctly', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.addInitScript(candidateInitScript);

    await page.goto('/jobs');

    // Desktop nav should be hidden, hamburger should be visible
    const mobileBtn = page.locator('#mobile-menu-btn');
    await expect(mobileBtn).toBeVisible();

    // Wait for hydration and click hamburger button to open drawer
    await page.waitForTimeout(200);
    await mobileBtn.click();

    const drawer = page.locator('nav.flex-col');
    if (!(await drawer.isVisible())) {
      await page.waitForTimeout(200);
      await mobileBtn.click();
    }
    await expect(drawer).toBeVisible();

    // Verify drawer contents
    await expect(page.getByText('Andrew Sterling').first()).toBeVisible();
    await expect(page.getByText('andrew@devops.sterling.io').first()).toBeVisible();

    // Check that navigation items in drawer are visible
    const drawerJobsLink = drawer.locator('a[href="/jobs"]');
    await expect(drawerJobsLink).toBeVisible();
    await expect(drawerJobsLink).toHaveClass(/bg-emerald-50|dark:bg-\[#14332B\]/);

    const drawerCvsLink = drawer.locator('a[href="/candidate/cvs"]');
    await expect(drawerCvsLink).toBeVisible();

    // Click on CVs link from drawer
    await drawerCvsLink.click();
    await page.waitForURL('**/candidate/cvs');

    // Drawer should automatically close on navigation
    await expect(page.locator('nav.flex-col')).toBeHidden();
  });

  test('NAV-01-04: Mobile Viewport (375px) -> compact header, drawer functional with theme/lang toggles', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.addInitScript(candidateInitScript);

    await page.goto('/jobs');

    // Zero overflow check on mobile
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(overflow).toBeFalsy();

    // Open mobile menu
    const mobileBtn = page.locator('#mobile-menu-btn');
    await expect(mobileBtn).toBeVisible();
    await mobileBtn.click();

    // Mobile drawer should be visible
    await expect(page.locator('nav.flex-col')).toBeVisible();

    // Logout from drawer triggers confirmation modal
    const mobileLogoutBtn = page.getByRole('button', { name: /Đăng xuất|Sign Out/i });
    await expect(mobileLogoutBtn).toBeVisible();
    await mobileLogoutBtn.click();

    // Modal opens
    await expect(page.getByText(/Xác Nhận Đăng Xuất|Confirm Sign Out/i)).toBeVisible();
    await page.getByRole('button', { name: /Hủy|Cancel/i }).click();
  });

  test('NAV-01-05: Recruiter Navigation Desktop (1280px) -> HR Portal tabs and CTA visible, zero duplicate navbar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.addInitScript(recruiterInitScript);

    await page.goto('/recruiter');

    // Verify Recruiter Portal brand
    await expect(page.getByText('HR Portal').first()).toBeVisible();

    // Verify only ONE header exists (no double navbar stacking)
    const headers = page.locator('header');
    await expect(headers).toHaveCount(1);

    const recruiterNav = headers.first().locator('nav').first();

    // Verify Recruiter tabs
    await expect(recruiterNav.getByRole('link', { name: /Tổng Quan Tuyển Dụng|HR Dashboard/i })).toBeVisible();
    await expect(recruiterNav.getByRole('link', { name: /Quản lý Bài đăng|Quản Lý Bài Đăng|Job Postings/i })).toBeVisible();
    await expect(recruiterNav.getByRole('link', { name: /Doanh nghiệp|Company Profile/i })).toBeVisible();

    // Verify Create Job CTA and Candidate Portal link
    await expect(headers.first().getByRole('link', { name: /Tạo Bài tuyển dụng|Tạo Bài Tuyển Dụng|Create Job/i })).toBeVisible();
    await expect(headers.first().getByRole('link', { name: /Về Cổng Ứng viên|Về Cổng Ứng Viên|Candidate Portal/i })).toBeVisible();

    // Navigate to /recruiter/jobs and check header remains single and clean
    await recruiterNav.getByRole('link', { name: /Quản lý Bài đăng|Quản Lý Bài Đăng|Job Postings/i }).first().click();
    await page.waitForURL('**/recruiter/jobs');
    await expect(page.locator('header')).toHaveCount(1);
  });

  test('NAV-01-06: Recruiter Mobile Drawer (375px) -> responsive drawer opens and navigates', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.addInitScript(recruiterInitScript);

    await page.goto('/recruiter');

    // Recruiter mobile hamburger should be visible
    const recruiterMobileBtn = page.locator('#recruiter-mobile-menu-btn');
    await expect(recruiterMobileBtn).toBeVisible();

    // Wait for hydration and click to open recruiter mobile drawer
    await page.waitForTimeout(200);
    await recruiterMobileBtn.click();

    const recruiterDrawer = page.locator('nav.flex-col');
    if (!(await recruiterDrawer.isVisible())) {
      await page.waitForTimeout(200);
      await recruiterMobileBtn.click();
    }
    await expect(recruiterDrawer).toBeVisible();

    // Check drawer items
    await expect(page.getByText('MidCV HR Portal').first()).toBeVisible();
    const recruiterDrawerJobsLink = recruiterDrawer.locator('a[href="/recruiter/jobs"]');
    await expect(recruiterDrawerJobsLink).toBeVisible();

    // Navigate to jobs via drawer
    await recruiterDrawerJobsLink.click();
    await page.waitForURL('**/recruiter/jobs');

    // Header remains single
    await expect(page.locator('header')).toHaveCount(1);
  });

});
