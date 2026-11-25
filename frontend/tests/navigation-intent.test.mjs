import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/navigationIntent.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const nav = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const roles = { CANDIDATE: '/candidate', RECRUITER: '/recruiter', ADMIN: '/admin' };
for (const [role, home] of Object.entries(roles)) {
  for (const target of Object.values(roles)) {
    test(`${role} → ${target} resolves only its own portal`, () => {
      assert.equal(nav.destinationForRole(role, `${target}/account?tab=security`), target === home ? `${home}/account?tab=security` : home);
    });
  }
}
test('normalize HR wire role without inventing a role', () => {
  assert.equal(nav.normalizeRole('HR'), 'RECRUITER');
  assert.equal(nav.normalizeRole('RECRUITER'), 'RECRUITER');
  assert.equal(nav.normalizeRole('unknown'), null);
});
test('external, encoded and ambiguous paths fail closed', () => {
  for (const path of ['https://evil.test','//evil.test','/\\evil.test','/%2f%2fevil.test','/candidate/%2e%2e/admin','/candidate/../admin','/candidate//profile','/candidateevil','/admin?next=//evil.test','/oauth/callback?ticket=secret','/login','/candidate\n']) {
    assert.equal(nav.destinationForRole('CANDIDATE', path), '/candidate', path);
  }
  assert.equal(nav.destinationForRole('CANDIDATE', '/jobs/job-a?apply=1'), '/jobs/job-a?apply=1');
  assert.equal(nav.destinationForRole('ADMIN', '/jobs/job-a?apply=1'), '/admin');
});
test('CV library and builder return only to a valid job and explicitly resume selection', () => {
  assert.equal(nav.applyPath('job-a'), '/jobs/job-a?apply=1');
  assert.equal(nav.cvLibraryPath('/jobs/job-a'), '/candidate/cvs?returnTo=%2Fjobs%2Fjob-a');
  assert.equal(nav.resumeAfterCv('/jobs/job-a'), '/jobs/job-a?apply=1');
  for (const bad of ['/jobs','/jobs/job-a/extra','//evil.test/jobs/a','/jobs/%2Fadmin','/admin','/jobs/a?returnTo=//evil.test']) {
    assert.equal(nav.resumeAfterCv(bad), null);
    assert.equal(nav.cvLibraryPath(bad), '/candidate/cvs');
  }
});
test('ranking return context is scoped to the actual JD and allowed filters', () => {
  assert.equal(nav.rankingReturnPath('/recruiter/jobs/j1/ranking?minScore=80&fullRequired=1&next=evil', 'j1'), '/recruiter/jobs/j1/ranking?minScore=80&fullRequired=1');
  assert.equal(nav.rankingReturnPath('/recruiter/jobs/j2/ranking?minScore=80','j1'), null);
  assert.equal(nav.rankingReturnPath('//evil.test/recruiter/jobs/j1/ranking','j1'), null);
  assert.equal(nav.rankingReturnPath('/recruiter/jobs/j1/ranking?minScore=999&fullRequired=bad','j1'), '/recruiter/jobs/j1/ranking');
});
test('profile OAuth marker is user-bound, expiring and removable', () => {
  const store = new Map();
  globalThis.sessionStorage = {getItem: k => store.get(k) ?? null, setItem: (k,v) => store.set(k,v), removeItem: k => store.delete(k)};
  nav.rememberProfileLink('candidate-a', 'github');
  assert.equal(nav.hasProfileLink('candidate-a'), true);
  assert.equal(nav.hasProfileLink('candidate-b'), false);
  for (const [key,value] of store) store.set(key, JSON.stringify({...JSON.parse(value), expires: 0}));
  assert.equal(nav.hasProfileLink('candidate-a'), false);
  nav.clearProfileLink();
  assert.equal(store.size, 0);
});

test('confirmed CV choice is scoped to the account and job and consumed once', () => {
  const store = new Map();
  globalThis.sessionStorage = {getItem: k => store.get(k) ?? null, setItem: (k,v) => store.set(k,v), removeItem: k => store.delete(k)};
  nav.rememberCvChoice('candidate-a', '/jobs/job-a', 'cv-new');
  assert.equal(nav.takeCvChoice('candidate-a', 'job-b'), null);
  assert.equal(nav.takeCvChoice('candidate-a', 'job-a'), 'cv-new');
  assert.equal(nav.takeCvChoice('candidate-a', 'job-a'), null);
  nav.rememberCvChoice('candidate-a', '/jobs/job-a', 'cv-new');
  assert.equal(nav.takeCvChoice('candidate-b', 'job-a'), null);
  assert.equal(nav.takeCvChoice('candidate-a', 'job-a'), null);
});
