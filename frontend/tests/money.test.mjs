import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/money.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const money = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);

test('localized whole VND inputs parse without scaling', () => {
  assert.equal(money.parseVndAmount('15.000.000', 'vi'), 15000000);
  assert.equal(money.parseVndAmount('15,000,000', 'en'), 15000000);
  assert.equal(money.parseVndAmount('0', 'vi'), 0);
  assert.equal(money.parseVndAmount('15', 'vi'), 15);
});
test('empty, malformed, negative, fractional and unsafe values stay invalid', () => {
  for (const value of ['', '  ', '-1', '1.5', '1,5', '10 triệu', '12.00', '9007199254740992']) assert.equal(money.parseVndAmount(value, 'vi'), null, value);
});
test('formatting preserves zero and treats empty as unknown', () => {
  assert.match(money.formatVndAmount(0, 'vi'), /0/);
  assert.equal(money.formatVndAmount(null, 'vi'), '');
  assert.equal(money.formatVndAmount('', 'vi'), '');
});
