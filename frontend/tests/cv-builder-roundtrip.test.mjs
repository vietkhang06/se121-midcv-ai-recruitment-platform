import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/cvBuilderDraft.ts', import.meta.url), 'utf8');
const cvBuilderModule = await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText).toString('base64')}`);
const { buildCVBuilderPayload, mapCVBuilderDraft, readCVBuilderTemplate } = cvBuilderModule;

test('builder round-trip preserves ids, attachments, provenance and nested metadata', () => {
  const attachment = { attachment_id: 'att-1', file_name: 'certificate.pdf', file_size: 1234 };
  const raw = {
    personal_info: { full_name: { value: 'Gia Khang', origin: 'CV_EXTRACTED' } },
    certifications: [{ id: '7ac15b49-b682-411a-bd8a-b8cb79344161', name: 'AWS', origin: 'CV_EXTRACTED', attachment }],
    education: [{ id: 'e2a0cfbf-1cb7-47b2-be22-dfb8df2eead5', institution: 'UIT', gpa: 8.5, gpa_scale: 10, metadata: { source_page: 2 } }],
    presentation: { template: 'editorial' }
  };
  const draft = mapCVBuilderDraft(raw);
  draft.certifications[0].name = 'AWS SAA';
  const payload = buildCVBuilderPayload(draft, 'Backend CV', readCVBuilderTemplate(raw));

  assert.deepEqual(payload.certifications[0].attachment, attachment);
  assert.equal(payload.certifications[0].id, raw.certifications[0].id);
  assert.equal(payload.certifications[0].origin, 'CV_EXTRACTED');
  assert.deepEqual(payload.education[0].metadata, { source_page: 2 });
  assert.equal(payload.education[0].gpa, 8.5);
  assert.equal(payload.structured_json.presentation.template, 'editorial');
});
