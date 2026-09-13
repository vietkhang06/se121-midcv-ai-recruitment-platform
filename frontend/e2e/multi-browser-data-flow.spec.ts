import { test, expect } from '@playwright/test';

test.describe('E2E Real Database Data Flow: Browser A & Browser B', () => {

  test('Cross-Browser Real Backend Verification: Browser B sees data created by Browser A in PostgreSQL', async ({ browser }) => {
    // 1. Browser Context A (Simulating Browser A)
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    // Generate unique user credentials
    const timestamp = Date.now();
    const candidateEmail = `playwright_cand_${timestamp}@midcv.vn`;
    const password = 'SecurePassword123!';

    // Register candidate via real backend API
    const regRes = await pageA.request.post('http://localhost:8080/api/v1/auth/register/candidate', {
      data: {
        email: candidateEmail,
        password: password,
        fullName: `Candidate E2E ${timestamp}`,
        age: 26,
        targetIndustry: 'Technology',
        targetIndustries: ['Technology']
      }
    });
    expect(regRes.status()).toBe(201);
    const regJson = await regRes.json();
    const verificationToken = regJson.data.devVerificationToken;

    // Verify email
    const verifyRes = await pageA.request.post('http://localhost:8080/api/v1/auth/verify-email', {
      data: { token: verificationToken }
    });
    expect(verifyRes.status()).toBe(200);

    // Login on real backend
    const loginRes = await pageA.request.post('http://localhost:8080/api/v1/auth/login', {
      data: { email: candidateEmail, password: password }
    });
    expect(loginRes.status()).toBe(200);
    const loginData = await loginRes.json();
    const token = loginData.data.accessToken;
    const user = loginData.data.user;

    // In Browser A: Initialize local session and create CV
    await pageA.addInitScript(({ token, user }) => {
      window.localStorage.setItem('auth_token', token);
      window.localStorage.setItem('auth_user', JSON.stringify(user));
      window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
      window.localStorage.setItem('midcv_lang', 'vi');
    }, { token, user });

    // Create CV via real API
    const cvRes = await pageA.request.post('http://localhost:8080/api/v1/candidate/cvs', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: `Playwright CV Real DB ${timestamp}`,
        creationPath: 'BUILDER',
        targetIndustry: 'Technology',
        rawText: 'Java 17, Spring Boot, PostgreSQL, Docker, Microservices, Kafka.',
        isDefault: true
      }
    });
    expect(cvRes.status()).toBe(201);
    const cvJson = await cvRes.json();
    const createdCvId = cvJson.data.id;

    // Navigate Browser A to Candidate CVs page
    await pageA.goto('/candidate/cvs');
    await expect(pageA.getByText(`Playwright CV Real DB ${timestamp}`)).toBeVisible();

    // 2. Browser Context B (Simulating completely separate Browser B / incognito window)
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    // Browser B logs in using the exact same account credentials
    await pageB.addInitScript(({ token, user }) => {
      window.localStorage.setItem('auth_token', token);
      window.localStorage.setItem('auth_user', JSON.stringify(user));
      window.localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
      window.localStorage.setItem('midcv_lang', 'vi');
    }, { token, user });

    // Navigate Browser B to Candidate CVs page
    await pageB.goto('/candidate/cvs');

    // Browser B MUST see the exact CV created in Browser A, loaded from PostgreSQL!
    await expect(pageB.getByText(`Playwright CV Real DB ${timestamp}`)).toBeVisible();

    await contextA.close();
    await contextB.close();
  });

});
