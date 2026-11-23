import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/applicationWorkflow.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022}}).outputText;
const workflow = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const scores = (...values) => workflow.summarizeMatchScores(values.map(matchScore => ({matchScore})));

test('zero is a real score and unknown scores stay out of the average', () => {
  assert.deepEqual(scores(null, undefined, 0, 80), {average: 40, count: 2, highCount: 1});
  assert.equal(scores(null, undefined).average, null);
});

test('both views use the same inclusive high-match threshold', () => {
  assert.deepEqual([74, 75, 79, 80].map(score => scores(score).highCount), [0, 1, 1, 1]);
});

test('one failed JD prevents totals and identifies the affected job', async () => {
  const jobs = [{id: '1', title: 'HR'}, {id: '2', title: 'Marketing'}, {id: '3', title: 'IT'}];
  await assert.rejects(workflow.loadApplicationsForJobs(jobs, async id => {
    if (id === '2') throw new Error('503');
    return [{id}];
  }), /Marketing/);
  assert.equal((await workflow.loadApplicationsForJobs(jobs, async id => [{id}])).length, 3);
});
