
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Execute the real client module with synthetic HTTP responses; this is not browser E2E.
const source = readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8');
const sseSource = readFileSync(new URL('../src/lib/sse.ts', import.meta.url), 'utf8');

const sseJavascript = ts.transpileModule(sseSource, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;

const sseUrl = `data:text/javascript;base64,${Buffer.from(sseJavascript).toString('base64')}`;

const scoreJavascript = ts.transpileModule(
  readFileSync(
    new URL('../src/lib/matchPresentation.ts', import.meta.url),
    'utf8'
  ),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }
).outputText;

const scoreUrl = `data:text/javascript;base64,${Buffer.from(scoreJavascript).toString('base64')}`;

const workflow = ts.transpileModule(
  readFileSync(
    new URL('../src/lib/applicationWorkflow.ts', import.meta.url),
    'utf8'
  ).replace("'./matchPresentation'", JSON.stringify(scoreUrl)),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }
).outputText;

const workflowUrl = `data:text/javascript;base64,${Buffer.from(workflow).toString('base64')}`;

const javascript = ts.transpileModule(
  source
    .replace("'./sse'", JSON.stringify(sseUrl))
    .replace("'@/lib/applicationWorkflow'", JSON.stringify(workflowUrl)),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }
).outputText;

const api = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
);

const token = `fixture.${Buffer.from(
  JSON.stringify({ exp: Date.now() / 1000 + 3600 })
).toString('base64url')}.fixture`;

const storage = new Map([['auth_token', token]]);

globalThis.window = {
  dispatchEvent() {},
};

globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  removeItem: key => storage.delete(key),
  setItem: (key, value) => storage.set(key, value),
};

function response(data) {
  return new Response(
    JSON.stringify({ success: true, data }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

const { matchPresentation } = await import(scoreUrl);

test('APP-AI-04 preview sends selected CV and JD revision and reads core-only contract', async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url: String(url), body: JSON.parse(options.body) };
    return response({ coreScore: 81, overallScore: 81, githubScore: null, previewScope: 'CORE_ONLY',
      cvVersionId: 'cv-v1', jobRevision: 'jd-v1', status: 'PENDING_VECTOR', scoringPolicyVersion: 1 });
  };
  const result = await api.previewQuickApply('job-a', 'cv-a', 'cv-v1', 'jd-v1');
  assert.ok(request.url.endsWith('/api/v1/candidate/applications/match-preview'));
  assert.deepEqual(request.body, { jobId: 'job-a', cvId: 'cv-a', aiAnalysisConsent: true,
    expectedCvVersionId: 'cv-v1', expectedJobRevision: 'jd-v1' });
  assert.equal(result.previewScope, 'CORE_ONLY');
  assert.equal(result.coreScore, result.overallScore);
  assert.equal(result.githubScore, null);
});

test('APP-AI-05 submission sends authoritative selected revisions, retains real ID and processing state', async () => {
  let body;
  globalThis.fetch = async (_url, options) => {
    body = JSON.parse(options.body);
    return response({ id: 'actual-app', jobId: 'job-a', appliedCvVersionId: 'cv-v1', appliedJdVersionId: 'pinned-jd',
      status: 'SUBMITTED', aiAnalysisConsent: true, aiProcessingStatus: 'AI_WAITING_DISPATCH' });
  };
  const app = await api.realApiClient.submitApplication({ id: '', job: { id: 'job-a' }, appliedCvId: 'cv-a',
    expectedCvVersionId: 'cv-v1', expectedJobRevision: 'jd-v1', aiAnalysisConsent: true });
  assert.deepEqual(body, { jobId: 'job-a', cvId: 'cv-a', aiAnalysisConsent: true,
    expectedCvVersionId: 'cv-v1', expectedJobRevision: 'jd-v1' });
  assert.equal(app.id, 'actual-app');
  assert.equal(app.appliedCvVersionId, 'cv-v1');
  assert.equal(app.appliedJdVersionId, 'pinned-jd');
  assert.equal(app.aiProcessingStatus, 'AI_WAITING_DISPATCH');
  assert.equal(app.status, 'SUBMITTED');
});

test('APP-AI-05 conflict classifier uses nested backend error code, not all 409s', async () => {
  for (const [status, code, expected] of [[409, 'CONCURRENT_MODIFICATION', true],
    [409, 'DUPLICATE_APPLICATION', false], [503, 'CONCURRENT_MODIFICATION', false]]) {
    globalThis.fetch = async () => new Response(JSON.stringify({ success: false, error: { code, message: 'fixture' } }),
      { status, headers: { 'Content-Type': 'application/json' } });
    await assert.rejects(() => api.realApiClient.submitApplication({ id: '', job: { id: 'job-a' }, appliedCvId: 'cv-a' }),
      error => api.isApplicationRevisionConflict(error) === expected);
  }
  assert.equal(api.isApplicationRevisionConflict(null), false);
});

test('APP-AI-05 CV and job mapper preserve real revisions without inventing confirmed version identity', () => {
  const cv = api.mapBackendCVToFrontend({ id: 'cv', status: 'CONFIRMED', confirmedVersionId: 'real-version', confirmedVersionNumber: 7 });
  assert.equal(cv.confirmedVersionId, 'real-version');
  assert.equal(cv.confirmedVersionNumber, 7);
  assert.equal(api.mapBackendCVToFrontend({ id: 'cv', status: 'DRAFT' }).confirmedVersionId, undefined);
  assert.equal(api.mapBackendJobToFrontend({ id: 'job', applicationRevision: 'rev-1' }).applicationRevision, 'rev-1');
});

test('APP-AI-07 unavailable and processing states never fabricate a score', () => {
  for (const status of ['AI_WAITING_DISPATCH', 'AI_QUEUED', 'AI_RUNNING', 'AI_RETRYING', 'STALE_POLICY']) {
    assert.deepEqual(matchPresentation({ matchStatus: status, matchScore: null }), { phase: 'PENDING', score: null });
  }
  for (const status of ['AI_FAILED', 'AI_VECTOR_FAILED', 'PACKAGE_NOT_ELIGIBLE', 'AI_CANCELLED']) {
    assert.deepEqual(matchPresentation({ matchStatus: status, matchScore: 0 }), { phase: 'UNAVAILABLE', score: null });
  }
  assert.deepEqual(matchPresentation({ matchStatus: 'PGVECTOR_READY', matchScore: null }), { phase: 'UNAVAILABLE', score: null });
  assert.deepEqual(matchPresentation({ matchStatus: 'PGVECTOR_READY', matchScore: 0 }), { phase: 'FINAL', score: 0 });
  assert.deepEqual(matchPresentation({ matchStatus: 'PGVECTOR_READY', matchScore: 90, aiAnalysisConsent: false }), { phase: 'DECLINED', score: null });
});
