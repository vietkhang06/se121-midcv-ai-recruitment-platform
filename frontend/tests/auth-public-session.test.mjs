import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Contract/unit tests: synthetic HTTP only, no live backend/browser.
const compile = input => ts.transpileModule(input, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const dataUrl = input => `data:text/javascript;base64,${Buffer.from(input).toString('base64')}`;
const sseUrl = dataUrl(compile(readFileSync(new URL('../src/lib/sse.ts', import.meta.url), 'utf8')));
const api = await import(dataUrl(compile(readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8').replace("'./sse'", JSON.stringify(sseUrl)))));
const store = new Map();
globalThis.window = { dispatchEvent() {} };
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) };
const jwt = seconds => `hdr.${Buffer.from(JSON.stringify({ exp: Date.now() / 1000 + seconds })).toString('base64url')}.signature`;
const expired = jwt(-3600);
const live = jwt(3600);
const seed = () => { store.clear(); store.set('auth_token', expired); store.set('auth_refresh_token', 'refresh-old'); };
const reply = (data, status = 200) => new Response(JSON.stringify({ success: status === 200, data }), { status, headers: { 'Content-Type': 'application/json' } });

test('public catalog skips refresh and ignores a stale Bearer token', async () => {
  seed(); let count = 0;
  globalThis.fetch = async (url, opts = {}) => {
    count++;
    assert.match(String(url), /\/api\/v1\/jobs\?/);
    assert.equal(new Headers(opts.headers).get('Authorization'), null);
    return reply({content:[{id:'job-a',title:'Java',status:'PUBLISHED'}],totalPages:1});
  };
  assert.equal((await api.realApiClient.fetchJobCatalog()).length, 1);
  assert.equal(count, 1); assert.equal(store.get('auth_refresh_token'), 'refresh-old');
});

test('public job detail does not depend on refresh token', async () => {
  seed(); let calls = 0;
  globalThis.fetch = async (url, opts = {}) => {
    calls++;
    assert.match(String(url), /\/api\/v1\/jobs\/job-a$/);
    assert.equal(new Headers(opts.headers).get('Authorization'), null);
    return reply({id:'job-a',title:'Java',status:'PUBLISHED'});
  };
  assert.equal((await api.realApiClient.fetchJobById('job-a')).id, 'job-a');
  assert.equal(calls, 1);
});

test('two private calls share a single refresh and both use rotated token', async () => {
  seed(); const calls = [];
  globalThis.fetch = async (url, opts = {}) => {
    calls.push({url:String(url),auth:new Headers(opts.headers).get('Authorization')});
    if (String(url).endsWith('/auth/refresh')) return reply({accessToken:live,refreshToken:'refresh-new'});
    return reply({accepted:true});
  };
  await Promise.all([api.apiRequest('/api/v1/candidate/profile'), api.apiRequest('/api/v1/candidate/cvs/quota')]);
  assert.equal(calls.filter(x=>x.url.endsWith('/auth/refresh')).length, 1);
  assert.equal(calls.filter(x=>x.auth===`Bearer ${live}`).length, 2);
});

test('revoked refresh rejects with HTTP 401 and clears old session', async () => {
  seed(); let protectedCalls = 0;
  globalThis.fetch = async url => {
    if (String(url).endsWith('/auth/refresh')) return reply(null,401);
    protectedCalls++; return reply(null,401);
  };
  await assert.rejects(() => api.apiRequest('/api/v1/candidate/profile'), e => e.status===401 && e.statusText==='AUTH_REFRESH_REJECTED');
  assert.equal(protectedCalls,0);
  assert.equal(store.size,0);
});

test('refresh HTTP 503 preserves stored credentials', async () => {
  seed(); globalThis.fetch = async () => reply(null,503);
  // Suppress expected rejected request stack trace from production logging.
  const prior=console.error; console.error=()=>{};
  try { await assert.rejects(() => api.apiRequest('/api/v1/candidate/profile'), e => e.status===0 && /HTTP 503/.test(e.message)); }
  finally { console.error=prior; }
  assert.equal(store.get('auth_refresh_token'),'refresh-old');
});

test('late rejected refresh from old session cannot log out a newer login', async () => {
  seed(); let release;
  globalThis.fetch=()=>new Promise(resolve=>{release=resolve;});
  const pending=api.ensureAuthToken();
  for(let n=0;n<15 && !release;n++) await Promise.resolve();
  assert.equal(typeof release,'function');
  api.saveAuthTokens({accessToken:live,refreshToken:'fresh-login'});
  release(reply(null,401));
  assert.equal(await pending,live);
  assert.equal(store.get('auth_refresh_token'),'fresh-login');
});

test('public GET returning 401 does not clear unrelated stored auth', async () => {
  seed(); store.set('auth_token',live);
  globalThis.fetch=async()=>reply(null,401);
  const prior=console.error; console.error=()=>{};
  try { await assert.rejects(()=>api.apiRequest('/api/v1/jobs?page=0'),e=>e.status===401); }
  finally {console.error=prior;}
  assert.equal(store.get('auth_token'),live);
});
