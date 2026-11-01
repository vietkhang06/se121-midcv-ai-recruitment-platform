import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const compile = text => ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const dataUrl = text => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`;
const sseUrl = dataUrl(compile(readFileSync(new URL('../src/lib/sse.ts', import.meta.url), 'utf8')));
const api = await import(dataUrl(compile(readFileSync(new URL('../src/lib/api.ts', import.meta.url),'utf8').replace("'./sse'", JSON.stringify(sseUrl)))));
const store = new Map();
globalThis.window = { dispatchEvent() {} };
globalThis.localStorage = {getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
const jwt = seconds => `x.${Buffer.from(JSON.stringify({exp:Date.now()/1000+seconds})).toString('base64url')}.x`;
function seed() {store.clear();store.set('auth_user','{"id":"fixture-user"}');store.set('auth_token',jwt(-100));store.set('auth_refresh_token','old-refresh');}
const json = (data,status=200) => new Response(JSON.stringify({data}),{status,headers:{'content-type':'application/json'}});
test('ten concurrent calls rotate a refresh token once', async()=>{
  seed(); let calls=0; const renewed=jwt(600);
  globalThis.fetch=async()=>{calls++; await Promise.resolve(); return json({accessToken:renewed,refreshToken:'rotated-refresh'});};
  assert.deepEqual(await Promise.all(Array.from({length:10},()=>api.ensureAuthToken())),Array(10).fill(renewed));
  assert.equal(calls,1);assert.equal(store.get('auth_refresh_token'),'rotated-refresh');
});
test('a rejected refresh clears access, refresh and user together',async()=>{
  seed();globalThis.fetch=async()=>json(null,401);await assert.rejects(api.ensureAuthToken());assert.equal(store.size,0);
});
test('transient refresh failure preserves credentials for retry',async()=>{
  seed();globalThis.fetch=async()=>json(null,503);await assert.rejects(api.ensureAuthToken());assert.equal(store.get('auth_refresh_token'),'old-refresh');
});
test('an in-flight refresh cannot restore a logged-out session',async()=>{
  seed();let release;globalThis.fetch=()=>new Promise(resolve=>{release=resolve;});
  const pending=api.ensureAuthToken();await Promise.resolve();api.clearAuthSession();
  release(json({accessToken:jwt(600),refreshToken:'late-token'}));await pending;assert.equal(store.size,0);
});
for (const endpoint of ['/api/v1/auth/login', '/api/v1/auth/verify-email', '/api/v1/auth/resend-verification', '/api/v1/auth/check-email?email=fixture', '/api/v1/auth/forgot-password']) test(`${endpoint} remains available when an old session cannot refresh`,async()=>{
  seed();let paths=[];globalThis.fetch=async(url)=>{paths.push(new URL(url).pathname);return json({accessToken:jwt(600)});};
  await api.apiRequest(endpoint,{method:'POST',body:JSON.stringify({email:'fixture@example.invalid',password:'fixture'})});assert.deepEqual(paths,[endpoint.split('?')[0]]);
});
test('an authenticated request renews after 401 and retries once',async()=>{
  seed();store.set('auth_token',jwt(600));const renewed=jwt(900);let attempts=0;
  globalThis.fetch=async(url,options)=>{
    if(url.endsWith('/auth/refresh'))return json({accessToken:renewed,refreshToken:'rotated'});
    attempts++;if(attempts===1)return json(null,401);
    assert.equal(new Headers(options.headers).get('Authorization'),`Bearer ${renewed}`);return json({ok:true});
  };
  assert.deepEqual(await api.apiRequest('/api/v1/auth/sessions'),{data:{ok:true}});assert.equal(attempts,2);
});
