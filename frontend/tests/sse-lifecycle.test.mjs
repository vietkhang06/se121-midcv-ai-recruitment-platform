import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const js=ts.transpileModule(readFileSync(new URL('../src/lib/sse.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {subscribeProgress}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const valid=e=>e&&typeof e.eventId==='string'&&typeof e.step==='string'&&typeof e.code==='string';
const event=(id,step='READ_DOCUMENT')=>({eventId:id,step,code:step==='SUCCEEDED'?'JOB_SUCCEEDED':'STEP_STARTED'});
const frame=e=>`id: ${e.eventId}\r\nevent: cv-processing-progress\r\ndata: ${JSON.stringify(e)}\r\n\r\n`;
function response(chunks){return new Response(new ReadableStream({start(controller){for(const chunk of chunks)controller.enqueue(new TextEncoder().encode(chunk));controller.close();}}),{headers:{'content-type':'text/event-stream'}});}
test('CRLF split between reads delivers one complete terminal event',{timeout:3000},async()=>{
  const input=frame(event('1','SUCCEEDED'));const split=input.indexOf('\r')+1;let opens=0;
  const received=await new Promise((resolve,reject)=>subscribeProgress(async()=>{opens++;return response([input.slice(0,split),input.slice(split)]);},valid,resolve,reject));assert.equal(received.eventId,'1');assert.equal(opens,1);
});
test('disconnect reconnects with durable cursor and suppresses replay duplicates',{timeout:6000},async()=>{
  const events=[];const cursors=[];
  await new Promise((resolve,reject)=>subscribeProgress(async last=>{cursors.push(last);return cursors.length===1?response([frame(event('41'))]):response([frame(event('41')),frame(event('42','SUCCEEDED'))]);},valid,e=>{events.push(e.eventId);if(e.step==='SUCCEEDED')resolve();},reject));
  assert.deepEqual(cursors,['','41']);assert.deepEqual(events,['41','42']);
});
test('unsubscribe aborts the active transport',{timeout:3000},async()=>{
  let signal;const stop=subscribeProgress(async(_last,s)=>{signal=s;return new Promise((_resolve,reject)=>s.addEventListener('abort',()=>reject(new Error('aborted'))));},valid,()=>{});stop();assert.equal(signal.aborted,true);
});
test('forbidden stream reports an error without retrying',{timeout:3000},async()=>{
  let calls=0;await new Promise(resolve=>subscribeProgress(async()=>{calls++;return new Response(null,{status:403});},valid,()=>assert.fail(),resolve));await new Promise(resolve=>setTimeout(resolve,25));assert.equal(calls,1);
});
