import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
async function module(name) {
  const source = readFileSync(new URL(`../src/lib/${name}.ts`, import.meta.url), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText).toString('base64')}`);
}
const { waitForProcessing, abortableDelay } = await module('processingWait');

test('processing survives more than 60 polls and a disconnected SSE stream', async () => {
  let polls = 0, cleanups = 0, updates = 0;
  const result = await waitForProcessing({ signal: new AbortController().signal, intervalMs: 0,
    poll: async () => (++polls < 65 ? { status: 'RUNNING', progress: 20 } : { status: 'SUCCEEDED', progress: 100 }),
    subscribe: () => () => cleanups++, onProgress: () => updates++ });
  assert.equal(result.status, 'SUCCEEDED'); assert.equal(polls, 65); assert.equal(updates, 65); assert.equal(cleanups, 1);
});
test('closing the UI aborts in-flight polling and stops stream updates', async () => {
  const controller = new AbortController(); let receive, closed = 0, updates = 0;
  const wait = waitForProcessing({ signal: controller.signal,
    poll: signal => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason))),
    subscribe: callback => { receive = callback; return () => closed++; }, onProgress: () => updates++ });
  controller.abort();
  await assert.rejects(wait, { name: 'AbortError' }); receive({ status: 'SUCCEEDED' });
  assert.equal(updates, 0); assert.ok(closed >= 1);
});
test('server failure remains failure and auth errors stop waiting', async () => {
  const options = { signal: new AbortController().signal, subscribe: () => () => {}, onProgress() {} };
  assert.equal((await waitForProcessing({ ...options, poll: async () => ({ status: 'FAILED' }) })).status, 'FAILED');
  assert.equal((await waitForProcessing({ ...options, poll: async () => ({ status: 'CANCELLED' }) })).status, 'CANCELLED');
  await assert.rejects(waitForProcessing({ ...options, poll: async () => { throw Object.assign(new Error('Forbidden'), { status: 403 }); } }));
});
test('abortable delay releases a waiting UI immediately', async () => {
  const controller = new AbortController(); const wait = abortableDelay(120000, controller.signal);
  controller.abort(); await assert.rejects(wait, { name: 'AbortError' });
});

test('polling completes when SSE setup or cleanup throws', async () => {
  for (const subscribe of [() => { throw new Error('SSE unavailable'); }, () => () => { throw new Error('closed transport'); }]) {
    const result = await waitForProcessing({ signal: new AbortController().signal,
      poll: async () => ({ status: 'SUCCEEDED' }), subscribe, onProgress() {} });
    assert.equal(result.status, 'SUCCEEDED');
  }
});
