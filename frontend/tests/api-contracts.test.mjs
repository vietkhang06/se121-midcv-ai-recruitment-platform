import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Execute the real client module with synthetic HTTP responses; this is not browser E2E.
const source = readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8');
const sseSource = readFileSync(new URL('../src/lib/sse.ts', import.meta.url), 'utf8');
const sseJavascript = ts.transpileModule(sseSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const sseUrl = `data:text/javascript;base64,${Buffer.from(sseJavascript).toString('base64')}`;
const javascript = ts.transpileModule(source.replace(/(['"])\.\/sse\1/g, JSON.stringify(sseUrl)), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const api = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);
const token = `fixture.${Buffer.from(JSON.stringify({ exp: Date.now() / 1000 + 3600 })).toString('base64url')}.fixture`;
const storage = new Map([['auth_token', token]]);
globalThis.window = { dispatchEvent() {} };
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  removeItem: key => storage.delete(key),
  setItem: (key,value) => storage.set(key,value),
};
function response(data) {
  return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
for (const count of [0, 2]) {
  test(`recalculation accepts numeric count ${count}`, async () => {
    globalThis.fetch = async () => response(count);
    assert.deepEqual(await api.recalculateJobMatching('synthetic-job'), { recalculatedCount: count });
  });
}
for (const invalid of [null, -1, 1.5, '2', {}]) {
  test(`recalculation rejects invalid count ${JSON.stringify(invalid)}`, async () => {
    globalThis.fetch = async () => response(invalid);
    await assert.rejects(() => api.recalculateJobMatching('synthetic-job'));
  });
}
for (const version of [1, 2, 3, null]) {
  test(`application mapper preserves actual or unknown version ${version}`, async () => {
    globalThis.fetch = async () => response({ content: [{
      id: 'synthetic-application', jobId: 'synthetic-job', appliedCvId: 'cv-b',
      appliedCvVersionNumber: version, appliedCvVersionId: version == null ? null : 'version-b',
    }] });
    const [app] = await api.realApiClient.fetchCandidateApplications();
    assert.equal(app.appliedCvVersion, version);
    assert.equal(app.appliedCvVersionId, version == null ? undefined : 'version-b');
  });
}

test('catalog filters receive every page rather than only the first twenty jobs', async () => {
  const requests = [];
  globalThis.fetch = async url => {
    const page = Number(new URL(url).searchParams.get('page'));
    requests.push(page);
    return response({content:Array.from({length:page===0?100:1},(_,i)=>({id:String(page*100+i),title:'Fixture job',status:'PUBLISHED'})),totalPages:2,totalElements:101});
  };
  const jobs = await api.realApiClient.fetchJobCatalog();
  assert.equal(jobs.length,101);
  assert.deepEqual(requests,[0,1]);
});

test('job mapper preserves moderation state and stored responsibilities', () => {
  const job = api.mapBackendJobToFrontend({ id: 'job-fixture', title: 'Java', status: 'SUSPENDED', responsibilities: ['Maintain REST APIs'] });
  assert.equal(job.status, 'SUSPENDED');
  assert.deepEqual(job.responsibilities, ['Maintain REST APIs']);
});

test('editing an existing job uses PUT and retains its published status', async () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), method: options.method, body: JSON.parse(options.body) });
    return response({ id, title: 'Updated JD', status: 'PUBLISHED', responsibilities: ['Review changes'] });
  };
  await api.realApiClient.saveJob({ id, title: 'Updated JD', industry: 'OTHER', industryOther: 'Research', seniority: 'Senior', employmentType: 'FULL_TIME', responsibilities: ['Review changes'], requirements: [], status: 'PUBLISHED' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'PUT');
  assert.ok(calls[0].url.endsWith(`/api/v1/jobs/${id}`));
  assert.deepEqual(calls[0].body.responsibilities, ['Review changes']);
  assert.equal(calls[0].body.industryOther, 'Research');
});

test('recruiter job list reads every advertised page', async () => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    const page = Number(new URL(url).searchParams.get('page'));
    return response({ content: [{ id: `page-${page}`, title: 'Job', status: 'DRAFT' }], totalPages: 2 });
  };
  const jobs = await api.realApiClient.fetchRecruiterJobs();
  assert.equal(calls.length, 2);
  assert.deepEqual(jobs.map(j => j.id), ['page-0', 'page-1']);
});

test('admin users use one server page and preserve deactivated status', async () => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return response({ content: [{ id: 'hr-fixture', role: 'HR', isActive: false, accountStatus: 'DEACTIVATED' }], totalElements: 1, totalPages: 1 });
  };
  const result = await api.adminApi.getUsers({ role: 'RECRUITER', status: 'DEACTIVATED', page: 2, size: 10 });
  assert.equal(calls.length, 1);
  const url = new URL(calls[0]);
  assert.ok(url.pathname.endsWith('/admin/users'));
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.get('role'), 'HR');
  assert.equal(url.searchParams.get('accountStatus'), 'DEACTIVATED');
  assert.equal(result.content[0].accountStatus, 'DEACTIVATED');
  assert.equal(result.content[0].role, 'RECRUITER');
});

test('candidate application edit sends consent and concurrency guard to the real endpoint', async () => {
  const calls = [];
  const app = {
    id: 'app-edit-1',
    job: { id: 'job-edit-1', title: 'Backend Engineer' },
    appliedCvId: 'cv-edit-1',
    appliedCvTitle: 'CV Backend',
    appliedCvVersion: 2,
    status: 'SUBMITTED',
    appliedDate: '2026-11-05',
  };
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), method: options.method, body: JSON.parse(options.body) });
    return response({
      id: app.id,
      jobId: app.job.id,
      status: 'SUBMITTED',
      aiAnalysisConsent: true,
      aiScoringAvailable: true,
      aiScoringReasonCode: 'AVAILABLE',
      aiScoringReason: 'Đủ điều kiện chấm điểm AI.',
      coverLetter: 'Nội dung đã sửa',
    });
  };
  const updated = await api.realApiClient.updateCandidateApplication(app, {
    aiAnalysisConsent: true,
    coverLetter: 'Nội dung đã sửa',
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'PUT');
  assert.ok(calls[0].url.endsWith('/api/v1/candidate/applications/app-edit-1'));
  assert.deepEqual(calls[0].body, {
    aiAnalysisConsent: true,
    coverLetter: 'Nội dung đã sửa',
    expectedStatus: 'SUBMITTED',
  });
  assert.equal(updated.aiScoringAvailable, true);
  assert.equal(updated.coverLetter, 'Nội dung đã sửa');
});

test('validation response exposes human constraints without API debug prefix', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({
    success: false,
    message: 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra các ràng buộc hiển thị trên màn hình.',
    error: { code: 'VALIDATION_ERROR', details: {
      title: 'Vui lòng nhập tiêu đề vị trí tuyển dụng.',
      description: 'Vui lòng nhập mô tả công việc.',
    } },
  }), { status: 400, statusText: 'Bad Request', headers: { 'Content-Type': 'application/json' } });
  const prior = console.error;
  console.error = () => {};
  try {
    await assert.rejects(
      () => api.apiRequest('/api/v1/jobs/draft', { method: 'POST', body: '{}' }),
      error => {
        assert.equal(error.message.includes('[API ERROR]'), false);
        assert.deepEqual(api.getApiValidationMessages(error), [
          'Vui lòng nhập tiêu đề vị trí tuyển dụng.',
          'Vui lòng nhập mô tả công việc.',
        ]);
        return true;
      },
    );
  } finally {
    console.error = prior;
  }
});
