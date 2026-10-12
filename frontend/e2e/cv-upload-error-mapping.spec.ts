import { test, expect } from '@playwright/test';

test.describe('CV Upload Error Mapping & Accurate Messaging', () => {

  test.beforeEach(async ({ page }) => {
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

    // Mock GET CVs list
    await page.route('**/api/v1/candidate/cvs', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 'SUCCESS',
            message: 'OK',
            data: []
          })
        });
      } else {
        await route.continue();
      }
    });

    // Mock GET CV quota
    await page.route('**/api/v1/candidate/cvs/quota', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'SUCCESS',
          message: 'OK',
          data: {
            plan: 'STANDARD',
            currentCount: 1,
            maxLimit: 3,
            remainingSlots: 2,
            canUpload: true
          }
        })
      });
    });
  });

  test('1. FILE_STORAGE_FAILED: Displays accurate storage error, not misleading format error', async ({ page }) => {
    await page.route('**/api/v1/candidate/cvs/upload', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'FILE_STORAGE_FAILED',
          message: 'Không thể lưu tệp CV lên hệ thống lưu trữ. Vui lòng thử lại.',
          requestId: 'req-err-storage-123'
        })
      });
    });

    await page.goto('/candidate/cvs');
    await page.locator('#upload-cv-btn').click();

    const modal = page.locator('#cv-upload-modal');
    await expect(modal).toBeVisible();

    // Set file input
    const fileChooserInput = modal.locator('#cv-file-modal-input');
    await fileChooserInput.setInputFiles({
      name: 'resume.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 Minimal PDF Content')
    });

    // Submit
    await modal.locator('button[type="submit"]').click();

    // Verify accurate error is displayed inside modal
    const failedText = modal.getByText('Hệ thống không thể lưu trữ tệp CV lúc này. Vui lòng thử lại.');
    await expect(failedText).toBeVisible();

    // Verify it contains request ID
    await expect(modal.getByText('req-err-storage-123')).toBeVisible();

    // Verify misleading error is NOT displayed
    await expect(modal.getByText('Định dạng tệp tin hoặc nội dung văn bản không thể nhận diện')).not.toBeVisible();
  });

  test('2. INVALID_FILE_TYPE: Displays accurate unsupported format message', async ({ page }) => {
    await page.route('**/api/v1/candidate/cvs/upload', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'INVALID_FILE_TYPE',
          message: 'Chỉ hỗ trợ PDF, DOCX, DOC, TXT, MD, PNG, JPG và WEBP.',
          requestId: 'req-err-type-456'
        })
      });
    });

    await page.goto('/candidate/cvs');
    await page.locator('#upload-cv-btn').click();

    const modal = page.locator('#cv-upload-modal');
    await expect(modal).toBeVisible();

    const fileChooserInput = modal.locator('#cv-file-modal-input');
    await fileChooserInput.setInputFiles({
      name: 'sample.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('corrupt content')
    });

    await modal.locator('button[type="submit"]').click();

    await expect(modal.getByText('Định dạng tệp không được hỗ trợ')).toBeVisible();
    await expect(modal.getByText('req-err-type-456')).toBeVisible();
  });

  test('3. CV_TEXT_EXTRACTION_FAILED: Displays extraction failed message', async ({ page }) => {
    await page.route('**/api/v1/candidate/cvs/upload', async (route) => {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'CV_TEXT_EXTRACTION_FAILED',
          message: 'Không thể trích xuất nội dung văn bản từ tệp CV đã tải lên.',
          requestId: 'req-err-extract-789'
        })
      });
    });

    await page.goto('/candidate/cvs');
    await page.locator('#upload-cv-btn').click();

    const modal = page.locator('#cv-upload-modal');
    await expect(modal).toBeVisible();

    const fileChooserInput = modal.locator('#cv-file-modal-input');
    await fileChooserInput.setInputFiles({
      name: 'scanned.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 Scanned Content')
    });

    await modal.locator('button[type="submit"]').click();

    await expect(modal.getByText('Không thể trích xuất nội dung văn bản từ tệp CV đã tải lên.')).toBeVisible();
    await expect(modal.getByText('req-err-extract-789')).toBeVisible();
  });

  test('4. Success case: Upload succeeds and modal closes', async ({ page }) => {
    await page.route('**/api/v1/candidate/cvs/upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'SUCCESS',
          message: 'Tải CV lên thành công',
          data: {
            id: 'cv-new-123',
            userId: 'cand-01',
            title: 'My Clean Resume',
            targetIndustry: 'Technology',
            currentVersionNumber: 1,
            isDefault: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            versions: []
          }
        })
      });
    });

    await page.goto('/candidate/cvs');
    await page.locator('#upload-cv-btn').click();

    const modal = page.locator('#cv-upload-modal');
    await expect(modal).toBeVisible();

    const fileChooserInput = modal.locator('#cv-file-modal-input');
    await fileChooserInput.setInputFiles({
      name: 'clean_resume.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 Clean Resume')
    });

    await modal.locator('button[type="submit"]').click();

    // Modal closes upon successful upload completion
    await expect(modal).not.toBeVisible({ timeout: 10000 });
  });

  test('5. CV_QUOTA_EXCEEDED: Displays accurate quota rejection error from server', async ({ page }) => {
    await page.route('**/api/v1/candidate/cvs/upload', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'CV_QUOTA_EXCEEDED',
          message: 'Bạn đã đạt giới hạn tối đa 3 CV của gói STANDARD. Vui lòng nâng cấp gói hoặc xóa bớt CV cũ.',
          requestId: 'req-err-quota-789'
        })
      });
    });

    await page.goto('/candidate/cvs');
    await page.locator('#upload-cv-btn').click();

    const modal = page.locator('#cv-upload-modal');
    await expect(modal).toBeVisible();

    const fileChooserInput = modal.locator('#cv-file-modal-input');
    await fileChooserInput.setInputFiles({
      name: 'resume_exceed.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 Minimal PDF')
    });

    await modal.locator('button[type="submit"]').click();

    // Verify accurate quota rejection message is displayed inside modal
    await expect(modal.getByText('Bạn đã đạt giới hạn tối đa 3 CV của gói STANDARD')).toBeVisible();
    await expect(modal.getByText('req-err-quota-789')).toBeVisible();
  });

  test('6. Quota badge rendering & disabled state when quota is exhausted', async ({ page }) => {
    // Override quota to exhausted (3/3 CV)
    await page.route('**/api/v1/candidate/cvs/quota', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'SUCCESS',
          message: 'OK',
          data: {
            plan: 'STANDARD',
            currentCount: 3,
            maxLimit: 3,
            remainingSlots: 0,
            canUpload: false
          }
        })
      });
    });

    await page.goto('/candidate/cvs');

    // Verify quota badge displays STANDARD | 3/3 CV
    const badge = page.locator('#cv-quota-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('STANDARD');
    await expect(badge).toContainText('3/3 CV');

    // Verify upload button is disabled
    const uploadBtn = page.locator('#upload-cv-btn');
    await expect(uploadBtn).toBeDisabled();
  });

});
