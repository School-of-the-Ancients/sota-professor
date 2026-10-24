import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSession,advanceSession} from './teaching.mjs';
import {mockProvider} from './fixtures.mjs';
import {captureOperatorCalls,acceptTaskResult} from './operator-tasks.mjs';

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
