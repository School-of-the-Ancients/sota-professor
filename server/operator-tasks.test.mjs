import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSession,advanceSession} from './teaching.mjs';
import {mockProvider} from './fixtures.mjs';
import {captureOperatorCalls,acceptTaskResult} from './operator-tasks.mjs';
import {teachingPrompt} from './schemas.mjs';

test('teacher emits a durable tool request and keeps teaching while Operator is pending',async()=>{
  const provider=mockProvider();let session=await createSession(provider,{goal:'Algorithms',mentor:'Ada Lovelace'});
  const original=provider.generate.bind(provider);
  provider.generate=async(kind,context)=>kind==='teach'?{text:'Let us trace the steps while Operator prepares the counters.',suggestions:[],toolCalls:[{name:'matrix_operator',arguments:{title:'Counters',instruction:'Create three counters',objectiveId:'sequence'}}]}:original(kind,context);
  session=await advanceSession(provider,session,'message',{revision:session.revision,text:'Show counters'});
  const task=session.operatorTasks[0];assert.equal(task.status,'requested');assert(session.messages.at(-1).text.includes('trace'));
  const fetcher=async()=>new Response(JSON.stringify({taskId:task.id,schoolSessionId:session.id,sessionId:'a'.repeat(32),title:task.title,instruction:task.instruction,objectiveId:task.objectiveId,status:'running',result:'',message:'Working',turnId:'turn-1',updatedAt:1,scope:{roomId:'world'}}),{headers:{'content-type':'application/json'}});
  await acceptTaskResult(session,{taskId:task.id},fetcher);assert.equal(task.status,'running');
  session=await advanceSession(provider,session,'message',{revision:session.revision,text:'Continue teaching'});
  assert.equal(session.messages.at(-1).role,'assistant');assert.equal(session.operatorTasks[0].status,'running');
});
test('invalid tool names and unrelated objective IDs cannot become tasks',()=>{
  const session={objectives:[{id:'sequence'}]};
  assert.throws(()=>captureOperatorCalls(session,{toolCalls:[{name:'shell',arguments:{}}]},'reply'));
  assert.throws(()=>captureOperatorCalls(session,{toolCalls:[{name:'matrix_operator',arguments:{title:'x',instruction:'x',objectiveId:'unknown'}}]},'reply'));
  assert.equal(session.operatorTasks,undefined);
});
test('mismatched external task cannot update a lesson',async()=>{
  const session={id:'lesson',objectives:[{id:'sequence'}]};captureOperatorCalls(session,{toolCalls:[{name:'matrix_operator',arguments:{title:'x',instruction:'x',objectiveId:'sequence'}}]},'reply');
  await assert.rejects(acceptTaskResult(session,{taskId:session.operatorTasks[0].id},async()=>new Response(JSON.stringify({taskId:'other'}),{headers:{'content-type':'application/json'}})));
  assert.equal(session.operatorTasks[0].status,'requested');
});

test('current direct-build policy accompanies old preview failures without rewriting history',async()=>{
  const provider=mockProvider();let session=await createSession(provider,{goal:'Mechanisms',mentor:'Ada Lovelace'});
  session.operatorTasks=[{id:'old',title:'Other inventions',status:'unconfirmed',execution:{turnId:null,message:'Select a ready concept version before building it'}}];
  session.messages.push({role:'assistant',text:'A preview must be selected first.'});
  session=await advanceSession(provider,session,'message',{revision:session.revision,text:'Please retry creating the other inventions.'});
  const context=provider.calls.at(-1).context;
  assert.equal(context.operatorTool.creationPolicy.previewRequiredForDirectBuild,false);
  assert.equal(context.operatorTool.creationPolicy.directBlenderSupported,true);
  assert.equal(context.operatorTasks[0].hasStarted,false);
  assert.equal(context.operatorTasks[0].message,'Select a ready concept version before building it');
  assert.match(teachingPrompt('teach',context),/do not substitute a preview-only task/);
  assert.match(teachingPrompt('teach',context),/historical evidence, not a current prerequisite/);
});
