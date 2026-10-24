import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {advancePointPractice,publicPractice,matchingPracticePart} from './point-practice.mjs';
import {SessionStore} from './store.mjs';
import {createSchoolApi} from './http.mjs';
import {mockProvider} from './fixtures.mjs';

const scene=()=>({runtimeId:'runtime',roomId:'room',objects:[{objectId:'exhibit',assetId:'asset',partsRevision:'a'.repeat(64),label:'Flying machine',
  parts:[{partId:'shaft',label:'Machine 2 - Shaft',description:'The shaft transfers rotation.',provenance:'authored'},
    {partId:'handle',label:'Machine 1 - Handle',description:'The handle supplies input.',provenance:'authored'},
    {partId:'wing',label:'Machine 3 - Wing',description:'The wing is an illustrative moving surface.',provenance:'authored'}]}]});
const session=()=>({id:'lesson',revision:1,goal:'Explore motion',status:'quiz',quiz:{id:'formal-quiz'},attempts:[],messages:[],createdAt:'now'});
const start=s=>advancePointPractice(s,{revision:s.revision,action:'start',requestId:'start'},scene());
function answer(s,partId,requestId='answer',source=scene()){
  return advancePointPractice(s,{revision:s.revision,action:'answer',requestId,practiceId:s.practice.id,roundId:s.practice.rounds[s.practice.index].id,
    partReference:{objectId:'exhibit',assetId:'asset',partsRevision:'a'.repeat(64),partId}},source);
}
test('teach then point, wrong answer, retry and next round preserve formal assessment and source scene',()=>{
  const original=session(),s=start(original),before=structuredClone(scene());
  assert.equal(s.practice.rounds[0].partId,'handle');assert.match(s.conversation.events.at(-2).text,/handle supplies input/);assert.match(s.conversation.events.at(-1).text,/Find the Handle/);
  const wrong=answer(s,'wing');assert.equal(wrong.practice.found.length,0);assert.equal(wrong.practice.index,0);
  const correct=answer(wrong,'handle','retry');assert.equal(correct.practice.index,1);assert.equal(correct.practice.found.length,1);
  assert.match(correct.conversation.events.at(-2).text,/shaft transfers rotation/);
  const duplicate=advancePointPractice(correct,{requestId:'retry',action:'answer',revision:0},scene());assert.equal(duplicate,correct);
  const done=answer(answer(correct,'shaft','second'),'wing','third');assert.equal(done.practice.status,'complete');
  assert.equal(done.practice.streak,3);assert.equal(done.practice.found.length,3);
  assert.deepEqual(done.quiz,original.quiz);assert.deepEqual(done.attempts,[]);assert.equal(done.status,'quiz');
  assert.deepEqual(scene(),before);assert.equal(original.practice,undefined);
  assert.equal(publicPractice(done.practice).found,3);assert.equal(publicPractice(done.practice).rounds,undefined);
});

test('a generic pilot-pedal prompt accepts either explicit counterpart and never another part or side-specific target',()=>{
  const target={partId:'left-pedal',label:'Pilot pedal (input)'};
  assert.equal(matchingPracticePart(target,{partId:'right-pedal'}),true);
  assert.equal(matchingPracticePart(target,{partId:'left-pedal'}),true);
  assert.equal(matchingPracticePart(target,{partId:'right-crank'}),false);
  assert.equal(matchingPracticePart({...target,label:'Left pilot pedal'},{partId:'right-pedal'}),false);
  const source=scene();source.objects[0].parts=[
    {...source.objects[0].parts[0],partId:'left-pedal',label:'Machine 1 - Pilot pedal (input)',description:'MACHINE, illustrative transmission path, step 1 of 3: pedal -> linkage. The pilot pushes this foot pedal. Illustrative only.'},
    {...source.objects[0].parts[0],partId:'right-pedal',label:'Right pilot pedal'},
    {...source.objects[0].parts[2]}];
  const initial=advancePointPractice(session(),{action:'start',requestId:'pedals',revision:1},source);
  assert.match(publicPractice(initial.practice).question,/Find the Pilot pedal\./);
  assert.doesNotMatch(initial.conversation.events.at(-2).text,/transmission path|step 1/);
  const result=advancePointPractice(initial,{action:'answer',requestId:'right-pedal-answer',revision:initial.revision,practiceId:initial.practice.id,
    roundId:initial.practice.rounds[0].id,partReference:{objectId:'exhibit',assetId:'asset',partsRevision:'a'.repeat(64),partId:'right-pedal'}},source);
  assert.equal(result.practice.found.length,1);assert.equal(result.practice.index,1);
  const replay=advancePointPractice(result,{action:'answer',requestId:'right-pedal-answer',revision:initial.revision},source);
  assert.equal(replay.practice.found.length,1);
});
test('changed objects, stale rounds, missing parts and unavailable worlds cannot earn points',()=>{
  const s=start(session());
  assert.throws(()=>advancePointPractice(session(),{action:'start',requestId:'new',revision:1},null),/Connect/);
  const changed=scene();changed.objects[0].partsRevision='b'.repeat(64);
  assert.throws(()=>answer(s,'handle','changed',changed),/changed/);
  assert.throws(()=>answer(s,'missing'),/no longer available/);
  assert.throws(()=>advancePointPractice(s,{action:'answer',requestId:'old',revision:s.revision,practiceId:s.practice.id,roundId:'old'},scene()),/question changed/);
  assert.equal(s.practice.found.length,0);
});
test('hints, stop, reload and replay keep progress durable without changing points',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'point-practice-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  const owner='f'.repeat(64),s=start(session());let current=answer(s,'handle');
  current=advancePointPractice(current,{action:'hint',requestId:'hint',revision:current.revision,practiceId:current.practice.id,roundId:current.practice.rounds[1].id},scene());
  const store=new SessionStore(directory);await store.transaction(owner,async data=>{data.sessions.push(current);return {write:true,value:null};});
  const reloaded=await new SessionStore(directory).transaction(owner,data=>({value:data.sessions[0]}),{readOnly:true});
  assert.equal(reloaded.practice.found.length,1);assert.equal(reloaded.practice.hints,1);
  const rebound=scene();rebound.runtimeId='new-browser';current=answer(reloaded,'shaft','resumed',rebound);assert.equal(current.practice.found.length,2);
  const stopped=advancePointPractice(current,{action:'stop',requestId:'stop',revision:current.revision,practiceId:current.practice.id},null);
  assert.equal(stopped.practice.status,'stopped');assert.equal(stopped.practice.found.length,2);
  const resumed=advancePointPractice(stopped,{action:'start',requestId:'resume',revision:stopped.revision},scene());
  assert.equal(resumed.practice.id,stopped.practice.id);assert.equal(resumed.practice.found.length,2);assert.equal(resumed.practice.status,'active');
});
test('HTTP practice uses the existing learner archive and hides answer IDs',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'point-http-'));const api=createSchoolApi({store:new SessionStore(directory),provider:mockProvider(),readScene:async()=>scene()});
  const server=createServer((req,res)=>void api(req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await api.preparations.idle();await rm(directory,{recursive:true,force:true});});
  let cookie;const call=async(path,body,owner=cookie)=>{const r=await fetch(`http://127.0.0.1:${server.address().port}/api/school/${path}`,{
    method:body?'POST':'GET',headers:{...(owner?{cookie:owner}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    cookie||=r.headers.get('set-cookie')?.split(';')[0];return {status:r.status,value:await r.json()};};
  let result=await call('sessions',{goal:'Understand a flying machine',mentor:''});assert.equal(result.status,201,JSON.stringify(result.value));const id=result.value.id;
  result=await call(`sessions/${id}/practice`,{action:'start',requestId:'start',revision:result.value.revision});
  assert.equal(result.status,200);assert.equal(result.value.practice.rounds,undefined);
  const p=result.value.practice;
  result=await call(`sessions/${id}/practice`,{action:'answer',requestId:'answer',revision:result.value.revision,practiceId:p.id,roundId:p.roundId,
    partReference:{objectId:'exhibit',assetId:'asset',partId:'handle',partsRevision:'a'.repeat(64)}});
  assert.equal(result.status,200);assert.equal(result.value.practice.found,1);
  assert.equal((await call(`sessions/${id}`,undefined,'sota-local-learner='+'b'.repeat(64))).status,404);
  assert.equal((await call(`sessions/${id}`)).value.practice.found,1);
});
