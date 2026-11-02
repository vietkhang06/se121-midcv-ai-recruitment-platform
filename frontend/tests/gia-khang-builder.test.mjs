import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
async function module(name) {
  const source = readFileSync(new URL(`../src/lib/${name}.ts`, import.meta.url), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText).toString('base64')}`);
}
const { builderItems, mergeBuilderItems } = await module('builderData');

test('builder round trip preserves hidden metadata, UUIDs, GPA and technology arrays', () => {
  const old = [{ id: 'stable', institution: 'Example School', degree: 'Bachelor', field_of_study: 'Software', gpa: 3.6, gpa_scale: 4, end_year: 2024, evidence: { status: 'UNVERIFIED' } }];
  const displayed = builderItems(old, 'education'); displayed[0].school = 'Updated School';
  const [saved] = mergeBuilderItems(displayed, old, 'education');
  assert.equal(saved.institution, 'Updated School'); assert.equal(saved.id, 'stable'); assert.equal(saved.gpa, 3.6);
  assert.equal(saved.end_year, 2024); assert.deepEqual(saved.evidence, old[0].evidence); assert.ok(!('school' in saved));
  const projects = [{ id: 'project', name: 'API', tech_stack: ['Java', 'Docker'] }];
  assert.deepEqual(mergeBuilderItems(builderItems(projects, 'projects'), projects, 'projects')[0].tech_stack, ['Java', 'Docker']);
});
test('builder maps canonical work dates and position without clearing unseen technologies', () => {
  const old = [{ id: 'work', position: 'Engineer', start_date: '2021-02', end_date: '2024-03', technologies: ['Java'], is_current: false }];
  const [saved] = mergeBuilderItems(builderItems(old, 'experience'), old, 'experience');
  assert.equal(saved.position, 'Engineer'); assert.equal(saved.start_date, '2021-02');
  assert.deepEqual(saved.technologies, ['Java']); assert.equal(saved.is_current, false);
});
