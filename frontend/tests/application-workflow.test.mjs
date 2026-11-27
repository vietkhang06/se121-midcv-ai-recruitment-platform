import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const loadSource = (name, imports = {}) => {
  const source = readFileSync(
    new URL(`../src/lib/${name}.ts`, import.meta.url),
    'utf8'
  );

  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }).outputText;

  const resolved = Object.entries(imports).reduce(
    (code, [path, url]) => code.replace(`'${path}'`, `'${url}'`),
    compiled
  );

  return `data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`;
};

const matchSource = loadSource('matchPresentation');
const match = await import(matchSource);

const workflow = await import(
  loadSource('applicationWorkflow', {
    './matchPresentation': matchSource,
  })
);

const scores = (...values) =>
  workflow.summarizeMatchScores(
    values.map(matchScore => ({
      matchScore,
      matchStatus: 'PGVECTOR_READY',
    }))
  );

test('provisional and missing scores are separate from completed zero scores', () => {
  const fallback = {
    matchScore: 98,
    matchStatus: 'FALLBACK_USED',
  };

  const zero = {
    matchScore: 0,
    matchStatus: 'PGVECTOR_READY',
  };

  const pending = {
    matchScore: null,
    matchStatus: 'PENDING_VECTOR',
  };

  const declined = {
    aiAnalysisConsent: false,
    matchScore: 87,
    matchStatus: 'PGVECTOR_READY',
  };

  assert.deepEqual(
    [fallback, pending, declined, zero].sort(match.compareMatchScores),
    [zero, fallback, pending, declined]
  );

  assert.equal(
    match.matchPresentation(declined).phase,
    'DECLINED'
  );

  assert.deepEqual(
    workflow.summarizeMatchScores([
      fallback,
      pending,
      declined,
      zero,
    ]),
    {
      count: 1,
      average: 0,
      highCount: 0,
    }
  );
});

test('only anchored evidence can be presented as a verbatim excerpt', async () => {
  const { evidencePresentation } = await import(
    loadSource('evidencePresentation')
  );

  const legacy = {
    sourceType: 'CV',
    snippet: 'Java',
  };

  const anchored = {
    ...legacy,
    provenance: 'CANDIDATE_REVIEWED_CV',
    sourceVersionId: 'v1',
    contentSha256: 'f'.repeat(64),
    quoteStartOffset: 0,
    quoteEndOffset: 4,
  };

  assert.equal(
    evidencePresentation(legacy, 'vi').verbatim,
    false
  );

  assert.deepEqual(
    evidencePresentation(anchored, 'vi'),
    {
      source: 'Bản ứng viên đã chỉnh',
      verbatim: true,
    }
  );

  assert.equal(
    evidencePresentation(
      {
        ...anchored,
        quoteEndOffset: 0,
      },
      'vi'
    ).verbatim,
    false
  );
});

test('zero is a real score and unknown scores stay out of the average', () => {
  assert.deepEqual(
    scores(null, undefined, 0, 80),
    {
      average: 40,
      count: 2,
      highCount: 1,
    }
  );

  assert.equal(
    scores(null, undefined).average,
    null
  );
});

test('both views use the same inclusive high-match threshold', () => {
  assert.deepEqual(
    [74, 75, 79, 80].map(score => scores(score).highCount),
    [0, 1, 1, 1]
  );
});

test('one failed JD prevents totals and identifies the affected job', async () => {
  const jobs = [
    { id: '1', title: 'HR' },
    { id: '2', title: 'Marketing' },
    { id: '3', title: 'IT' },
  ];

  await assert.rejects(
    workflow.loadApplicationsForJobs(jobs, async id => {
      if (id === '2') {
        throw new Error('503');
      }

      return [{ id }];
    }),
    /Marketing/
  );

  assert.equal(
    (
      await workflow.loadApplicationsForJobs(
        jobs,
        async id => [{ id }]
      )
    ).length,
    3
  );
});

test('final score requires a finite number in the supported range', () => {
  for (const invalid of [null, undefined, NaN, Infinity, -1, 101]) {
    assert.deepEqual(match.matchPresentation({
      matchScore: invalid,
      matchStatus: 'PGVECTOR_READY',
    }), { phase: 'UNAVAILABLE', score: null });
  }
  for (const valid of [0, 100]) {
    assert.deepEqual(match.matchPresentation({
      matchScore: valid,
      matchStatus: 'PGVECTOR_READY',
    }), { phase: 'FINAL', score: valid });
  }
});
