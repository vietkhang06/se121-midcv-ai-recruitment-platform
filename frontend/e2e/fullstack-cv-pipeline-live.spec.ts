import { test, expect, type APIRequestContext } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

type Credentials = { email: string; password: string };
type Session = { accessToken: string; refreshToken: string };

const apiBase = (process.env.MIDCV_E2E_API_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const candidate: Credentials | null = process.env.MIDCV_E2E_CANDIDATE_EMAIL && process.env.MIDCV_E2E_CANDIDATE_PASSWORD
  ? { email: process.env.MIDCV_E2E_CANDIDATE_EMAIL.trim(), password: process.env.MIDCV_E2E_CANDIDATE_PASSWORD }
  : null;
const hr: Credentials | null = process.env.MIDCV_E2E_HR_A_EMAIL && process.env.MIDCV_E2E_HR_A_PASSWORD
  ? { email: process.env.MIDCV_E2E_HR_A_EMAIL.trim(), password: process.env.MIDCV_E2E_HR_A_PASSWORD }
  : null;
const jobId = process.env.MIDCV_E2E_CV_PIPELINE_JOB_ID?.trim();
const liveEnabled = process.env.MIDCV_E2E_CV_PIPELINE === '1' && Boolean(candidate && hr && jobId);

async function login(request: APIRequestContext, credentials: Credentials): Promise<Session> {
  const response = await request.post(`${apiBase}/api/v1/auth/login`, {
    data: credentials,
    timeout: 20_000,
  });
  expect(response.status(), `Login failed for ${credentials.email}`).toBe(200);
  const data = (await response.json())?.data;
  expect(data?.accessToken).toBeTruthy();
  expect(data?.refreshToken).toBeTruthy();
  return { accessToken: data.accessToken, refreshToken: data.refreshToken };
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function bodyData(response: Awaited<ReturnType<APIRequestContext['get']>>) {
  const payload = await response.json();
  return payload?.data;
}

test.describe('W4-QA-01 — real CV processing to HR ranking (no API mocks)', () => {
  test.skip(!liveEnabled,
    'Set MIDCV_E2E_CV_PIPELINE=1, candidate/HR credentials and a fresh published MIDCV_E2E_CV_PIPELINE_JOB_ID. This test creates a real CV and application.');

  test('uploads a real PDF, waits for AI Worker, confirms CV and verifies HR ranking', async ({ request }) => {
    test.setTimeout(8 * 60 * 1000);
    const candidateSession = await login(request, candidate!);
    const hrSession = await login(request, hr!);
    const jobResponse = await request.get(`${apiBase}/api/v1/jobs/${jobId}`, { timeout: 20_000 });
    expect(jobResponse.status(), 'Configured target job must exist and be publicly readable').toBe(200);

    // The target job is intentionally one-use per candidate. Avoid hiding a duplicate-application failure.
    const priorApplications = await request.get(`${apiBase}/api/v1/candidate/applications?page=0&size=100`, {
      headers: auth(candidateSession.accessToken), timeout: 20_000,
    });
    expect(priorApplications.status()).toBe(200);
    const priorPage = await bodyData(priorApplications);
    const priorItems = Array.isArray(priorPage?.content) ? priorPage.content : [];
    expect(priorItems.some((item: any) => String(item.jobId) === jobId),
      'Use a fresh published test job; candidate already has an application for this job').toBe(false);

    const fixturePath = fileURLToPath(new URL('../../test-fixtures/synthetic/01_single_column_tech_cv.pdf', import.meta.url));
    const fixture = await readFile(fixturePath);
    const upload = await request.post(`${apiBase}/api/v1/candidate/cvs/upload`, {
      headers: auth(candidateSession.accessToken),
      multipart: {
        file: { name: 'midcv-live-acceptance.pdf', mimeType: 'application/pdf', buffer: fixture },
        title: `Live CV acceptance ${new Date().toISOString()}`,
        targetIndustry: 'Technology',
        isDefault: 'true',
      },
      timeout: 60_000,
    });
    expect(upload.status(), `Real CV upload failed: ${await upload.text()}`).toBe(202);
    const uploaded = (await upload.json())?.data;
    const cvId = String(uploaded?.cvId || uploaded?.id || '');
    expect(cvId, 'Upload response must contain cvId').toMatch(/^[0-9a-f-]{36}$/i);

    let processing: any;
    let ready = false;
    for (let attempt = 0; attempt < 90; attempt += 1) {
      const response = await request.get(`${apiBase}/api/v1/candidate/cvs/${cvId}/processing-status`, {
        headers: auth(candidateSession.accessToken), timeout: 20_000,
      });
      expect(response.status(), 'Candidate must be able to read their own CV processing status').toBe(200);
      processing = await bodyData(response);
      if (processing?.status === 'COMPLETED' || processing?.status === 'CONFIRMED') { ready = true; break; }
      if (processing?.status === 'FAILED') {
        throw new Error(`AI Worker pipeline failed (${processing.errorCode || 'unknown'}): ${processing.message || 'no message'}; correlation=${processing.correlationId || 'n/a'}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 4_000));
    }
    expect(ready, `CV extraction did not reach review-ready state. Last status: ${JSON.stringify(processing)}`).toBe(true);

    const review = await request.get(`${apiBase}/api/v1/candidate/cvs/${cvId}/review`, {
      headers: auth(candidateSession.accessToken), timeout: 20_000,
    });
    expect(review.status(), `CV review endpoint failed: ${await review.text()}`).toBe(200);
    const reviewData = await bodyData(review);
    expect(String(reviewData?.rawText || '').trim().length, 'OCR/native extraction must produce non-empty raw text').toBeGreaterThan(30);
    expect(reviewData?.structured, 'LLM structuring must return structured CV fields').toBeTruthy();

    const draft = await request.get(`${apiBase}/api/v1/candidate/cvs/${cvId}/draft`, {
      headers: auth(candidateSession.accessToken), timeout: 20_000,
    });
    expect(draft.status()).toBe(200);
    const draftData = await bodyData(draft);
    expect(draftData?.version_id).toBeTruthy();
    const saveDraft = await request.put(`${apiBase}/api/v1/candidate/cvs/${cvId}/draft`, {
      headers: auth(candidateSession.accessToken),
      data: { title: draftData.title || 'Live acceptance CV' },
      timeout: 20_000,
    });
    expect(saveDraft.status(), `Saving extracted CV draft failed: ${await saveDraft.text()}`).toBe(200);

    const confirm = await request.post(`${apiBase}/api/v1/candidate/cvs/${cvId}/confirm`, {
      headers: auth(candidateSession.accessToken), timeout: 20_000,
    });
    expect(confirm.status(), `CV confirmation failed: ${await confirm.text()}`).toBe(200);

    const application = await request.post(`${apiBase}/api/v1/candidate/applications`, {
      headers: auth(candidateSession.accessToken),
      data: { jobId, cvId }, timeout: 60_000,
    });
    expect(application.status(), `Application submission or matching persistence failed: ${await application.text()}`).toBe(201);
    const applicationData = await bodyData(application);
    const applicationId = String(applicationData?.id || '');
    expect(applicationId).toMatch(/^[0-9a-f-]{36}$/i);

    const ranking = await request.get(`${apiBase}/api/v1/matching/jobs/${jobId}/rankings?page=0&size=100`, {
      headers: auth(hrSession.accessToken), timeout: 30_000,
    });
    expect(ranking.status(), `HR ranking endpoint failed: ${await ranking.text()}`).toBe(200);
    const rankingData = await bodyData(ranking);
    const candidates = Array.isArray(rankingData?.content) ? rankingData.content : [];
    const ranked = candidates.find((item: any) => String(item.applicationId) === applicationId);
    expect(ranked, 'The newly submitted candidate must appear in the job ranking').toBeTruthy();
    expect(Number(ranked.overallScore)).toBeGreaterThanOrEqual(0);
    expect(Number(ranked.overallScore)).toBeLessThanOrEqual(100);
    expect(ranked.status).toBe('COMPLETED');

    const inspection = await request.get(`${apiBase}/api/v1/matching/applications/${applicationId}/inspection`, {
      headers: auth(hrSession.accessToken), timeout: 30_000,
    });
    expect(inspection.status(), `HR match inspection failed: ${await inspection.text()}`).toBe(200);
    const inspectionData = await bodyData(inspection);
    expect(inspectionData).toBeTruthy();
  });
});

const ocrLiveEnabled = process.env.MIDCV_E2E_OCR_CORRECTION === '1' && Boolean(candidate);

test.describe('W3-AI-01 — live Vietnamese OCR correction persistence (no API mocks)', () => {
  test.skip(!ocrLiveEnabled,
    'Set MIDCV_E2E_OCR_CORRECTION=1 and candidate credentials. This test uploads one real Vietnamese image CV and creates a CV record.');

  test('runs Vietnamese image OCR and exposes correction review metadata', async ({ request }) => {
    test.setTimeout(8 * 60 * 1000);
    const candidateSession = await login(request, candidate!);
    const fixturePath = fileURLToPath(new URL('../../test-fixtures/ocr/cv_vietnamese.png', import.meta.url));
    const fixture = await readFile(fixturePath);
    const upload = await request.post(`${apiBase}/api/v1/candidate/cvs/upload`, {
      headers: auth(candidateSession.accessToken),
      multipart: {
        file: { name: 'midcv-vietnamese-ocr-acceptance.png', mimeType: 'image/png', buffer: fixture },
        title: `Vietnamese OCR acceptance ${new Date().toISOString()}`,
        targetIndustry: 'Technology',
        isDefault: 'false',
      },
      timeout: 60_000,
    });
    expect(upload.status(), `Vietnamese OCR upload failed: ${await upload.text()}`).toBe(202);
    const uploaded = (await upload.json())?.data;
    const cvId = String(uploaded?.cvId || uploaded?.id || '');
    expect(cvId).toMatch(/^[0-9a-f-]{36}$/i);

    let processing: any;
    let ready = false;
    for (let attempt = 0; attempt < 90; attempt += 1) {
      const response = await request.get(`${apiBase}/api/v1/candidate/cvs/${cvId}/processing-status`, {
        headers: auth(candidateSession.accessToken), timeout: 20_000,
      });
      expect(response.status()).toBe(200);
      processing = await bodyData(response);
      if (processing?.status === 'COMPLETED' || processing?.status === 'CONFIRMED') { ready = true; break; }
      if (processing?.status === 'FAILED') {
        throw new Error(`Vietnamese OCR pipeline failed (${processing.errorCode || 'unknown'}): ${processing.message || 'no message'}; correlation=${processing.correlationId || 'n/a'}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 4_000));
    }
    expect(ready, `Vietnamese OCR did not finish: ${JSON.stringify(processing)}`).toBe(true);

    const reviewResponse = await request.get(`${apiBase}/api/v1/candidate/cvs/${cvId}/review`, {
      headers: auth(candidateSession.accessToken), timeout: 20_000,
    });
    expect(reviewResponse.status(), `OCR review endpoint failed: ${await reviewResponse.text()}`).toBe(200);
    const review = await bodyData(reviewResponse);
    expect(String(review?.extractionMethod || '')).toMatch(/ocr/i);
    expect(String(review?.rawText || '').trim().length).toBeGreaterThan(30);
    expect(typeof review?.ocrCorrectionStatus, 'OCR correction result must survive worker persistence and review projection').toBe('string');
    expect(Array.isArray(review?.ocrCorrections), 'Candidate review must expose human-checkable OCR suggestions').toBe(true);
  });
});
