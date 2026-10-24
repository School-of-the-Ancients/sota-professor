import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptOperatorResult } from './operator.mjs';
import { createSession, advanceSession } from './teaching.mjs';
import { mockProvider } from './fixtures.mjs';
const matrix='a'.repeat(32), action='b'.repeat(64), concept='c'.repeat(32);
async function fixture() {
  const provider=mockProvider(), session=await createSession(provider,{goal:'Explain algorithms',mentor:'Ada Lovelace'},[]);
  const request=session.presentations[0];
  const input={revision:session.revision,requestId:request.id,requestVersion:1,matrixSessionId:matrix,actionId:action};
  const value={adapterId:'matrix-operator-v1',actionId:action,sessionId:matrix,schoolSessionId:session.id,
    requestId:request.id,requestVersion:1,lessonRevision:1,kind:request.kind,prompt:request.prompt.trim(),
    status:'image_ready',conceptId:concept,conceptVersion:1,purpose:'concept',selected:false,
    image:{sha256:'d'.repeat(64),previewUrl:`/api/agent/concepts/${concept}/preview`},build:null,environment:null};
  return {provider,session,request,input,value};
}
const transport=value=>async()=>new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});
test('verifies actual fixed-loopback status, saves image without scene claims, deduplicates and gives teaching its grounded result',async()=>{
  const f=await fixture();let url,options;
  const fetcher=async(u,o)=>{url=u;options=o;return transport(f.value)();};
  assert.equal(await acceptOperatorResult(f.session,f.input,fetcher),true);
  assert.match(url,/^http:\/\/127\.0\.0\.1:8765\/api\/professor\/actions\?/);assert.equal(options.redirect,'error');
  assert.equal(options.headers.Authorization,undefined);assert.equal(f.session.revision,1);
  assert.match(f.request.operator.summary,/no 3D object/);assert.equal(f.request.operator.build,null);
  assert.equal(await acceptOperatorResult(f.session,f.input,fetcher),false);
  await advanceSession(f.provider,f.session,'message',{revision:1,text:'Can we trace the steps?'});
  assert.equal(f.provider.calls.at(-1).context.operatorResults[0].status,'image_ready');
});
test('forged client receipt fields cannot replace a service lookup',async()=>{
  const f=await fixture();let calls=0;
  await assert.rejects(acceptOperatorResult(f.session,{...f.input,status:'object_loaded'},async()=>{calls++;}),/Invalid Operator result/);
  assert.equal(calls,0);assert.equal(f.request.operator,undefined);
});
test('stale prompt versions, changed prompts, wrong lesson and mismatched concept purpose fail without saving',async()=>{
  const f=await fixture();
  for(const patch of [{requestId:'other'},{schoolSessionId:'other'},{requestVersion:2},{prompt:'changed'},{purpose:'panorama'}]){
    await assert.rejects(acceptOperatorResult(f.session,f.input,transport({...f.value,...patch})),/does not match/);
    assert.equal(f.request.operator,undefined);
  }
  await assert.rejects(acceptOperatorResult(f.session,{...f.input,requestVersion:2},transport(f.value)),/prompt version changed/);
});
test('malformed output, unknown outcomes and authentication failures do not award success or mutate archives',async()=>{
  const f=await fixture();
  for(const fetcher of [async()=>new Response('oops',{headers:{'content-type':'application/json'}}),
    async()=>new Response('{}',{status:401,headers:{'content-type':'application/json'}}),
    async()=>{throw Error('private token detail');},transport({...f.value,status:'confirmed'})]){
    await assert.rejects(acceptOperatorResult(f.session,f.input,fetcher));assert.equal(f.request.operator,undefined);
  }
});
test('loaded objects and applied backgrounds require real receipt identities distinct from image generation',async()=>{
  const f=await fixture();
  await assert.rejects(acceptOperatorResult(f.session,f.input,transport({...f.value,status:'object_loaded'})),/observed object receipt/);
  await assert.rejects(acceptOperatorResult(f.session,f.input,transport({...f.value,status:'setting_applied'})),/applied setting receipt/);
  const value={...f.value,status:'object_loaded',build:{buildRequestId:'e'.repeat(32),status:'completed',runtimeId:matrix,roomId:'room',objectIds:['object'],receipts:['receipt']}};
  await acceptOperatorResult(f.session,f.input,transport(value));assert.match(f.request.operator.summary,/No instructional interaction/);
});


test('failed Operator status retains a bounded reason in the lesson and teaching context', async () => {
  const f = await fixture();
  const message = 'Codex returned multiple images for one request; request a new version with one image.';
  await acceptOperatorResult(f.session, f.input, transport({ ...f.value, status: 'failed', image: null, message }));
  assert.ok(f.request.operator.summary.includes(message));
  assert.equal(f.request.operator.image, null);
  await advanceSession(f.provider, f.session, 'message', { revision: 1, text: 'Why did the exhibit fail?' });
  assert.ok(f.provider.calls.at(-1).context.operatorResults[0].summary.includes(message));
  const long = 'x'.repeat(600) + '\nprivate tail';
  await acceptOperatorResult(f.session, f.input, transport({ ...f.value, status: 'failed', image: null, message: long }));
  assert.ok(f.request.operator.summary.includes('x'.repeat(300)));
  assert.ok(!f.request.operator.summary.includes('x'.repeat(301)));
  assert.ok(!f.request.operator.summary.includes('private tail'));
});


test('a 3D build status is distinct from image readiness and does not establish a loaded object', async () => {
  const f = await fixture();
  const build = { buildRequestId: 'e'.repeat(32), status: 'requested', creationMode: 'blender', turnId: 'turn' };
  await acceptOperatorResult(f.session, f.input, transport({ ...f.value, build }));
  assert.match(f.request.operator.summary, /building the 3D exhibit/);
  assert.match(f.request.operator.summary, /not yet confirmed/);
  await acceptOperatorResult(f.session, f.input, transport({ ...f.value, build: { ...build, status: 'failed' } }));
  assert.match(f.request.operator.summary, /image is preserved/);
});
