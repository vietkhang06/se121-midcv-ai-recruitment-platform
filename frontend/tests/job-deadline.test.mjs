import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const { outputText } = ts.transpileModule(
  readFileSync(new URL('../src/lib/jobDeadline.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
);
const { isJobExpired, recruitmentDate, displayJobStatus } = await import(
  'data:text/javascript;base64,' + Buffer.from(outputText).toString('base64')
);

test('deadline includes the entire calendar day in Vietnam', () => {
  const beforeMidnight = new Date('2026-11-22T16:59:59.999Z');
  const midnight = new Date('2026-11-22T17:00:00.000Z');
  assert.equal(recruitmentDate(beforeMidnight), '2026-11-22');
  assert.equal(recruitmentDate(midnight), '2026-11-23');
  assert.equal(isJobExpired('2026-11-22', beforeMidnight), false);
  assert.equal(isJobExpired('2026-11-22', midnight), true);
  assert.equal(isJobExpired(null, midnight), false);
});

test('expiry affects only published display state', () => {
  for (const status of ['DRAFT', 'CLOSED', 'SUSPENDED']) {
    assert.equal(displayJobStatus({ status, applicationDeadline: '2000-01-01' }), status);
  }
  assert.equal(displayJobStatus({ status: 'PUBLISHED', applicationDeadline: '2000-01-01' }), 'EXPIRED');
  assert.equal(displayJobStatus({ status: 'PUBLISHED' }), 'PUBLISHED');
});
