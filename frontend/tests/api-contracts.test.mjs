import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Execute the real client module with synthetic HTTP responses; this is not browser E2E.
const source = readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const api = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);
const token = `fixture.${Buffer.from(JSON.stringify({ exp: Date.now() / 1000 + 3600 })).toString('base64url')}.fixture`;
const storage = new Map([['auth_token', token]]);
globalThis.window = { dispatchEvent() {} };
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  removeItem: key => storage.delete(key),
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
