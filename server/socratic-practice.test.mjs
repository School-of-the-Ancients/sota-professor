import test from 'node:test';
import assert from 'node:assert/strict';
import {advancePractice,publicSocraticPractice} from './socratic-practice.mjs';
import {mockProvider} from './fixtures.mjs';
import {publicSession} from './teaching.mjs';
import {appendEvent} from './conversation.mjs';
import {advancePointPractice} from './point-practice.mjs';
const scene=()=>({runtimeId:'runtime',roomId:'room',objects:[{objectId:'machine',assetId:'asset',partsRevision:'a'.repeat(64),label:'Flying machine',parts:[
  {partId:'pedal',label:'Pedal',description:'The pilot pushes this pedal to supply motion.',provenance:'authored'},
  {partId:'wing',label:'Wing',description:'The wing moves with the cable.',provenance:'authored'}]}]});
const ref=partId=>({objectId:'machine',assetId:'asset',partsRevision:'a'.repeat(64),partId});
const initial=()=>({id:'lesson',revision:1,goal:'Trace effort',mentor:{name:'Leonardo'},status:'quiz',quiz:{id:'quiz',questions:[]},attempts:[],messages:[],objectives:[]});
let sequence=0;
const act=(provider,s,action,extra={},world=scene())=>advancePractice(provider,s,{revision:s.revision,requestId:`r${++sequence}`,action,
  ...(action==='start'?{}:{practiceId:s.practice.id,roundId:s.practice.roundId}),...extra},world);

test('an explicit practice request can start after the ordinary conversation limit without extending old chat',async()=>{
  const original=initial();original.messages=Array.from({length:81},(_,i)=>({role:i%2?'assistant':'user',text:'Earlier lesson turn.'}));
  const started=await act(mockProvider(),original,'start');
  assert.equal(started.practice.mode,'socratic');assert.equal(started.practice.stage,'observe');
  assert.deepEqual(started.messages,original.messages);assert.deepEqual(started.quiz,original.quiz);
});

test('new dialogue preserves legacy practice, and transfer can reference another current exhibit',async()=>{
  const provider=mockProvider(),world=scene();
  let s=advancePointPractice(initial(),{action:'start',revision:1,requestId:'legacy'},world);
  const oldId=s.practice.id;
  s=await act(provider,s,'start');assert.notEqual(s.practice.id,oldId);assert.equal(s.practiceHistory[0].id,oldId);
  s=await act(provider,s,'answer',{partReference:ref('pedal')});
  s=await act(provider,s,'respond',{text:'Pushing the pedal supplies motion into the mechanism.'});
  s=await act(provider,s,'respond',{text:'Removing a connection prevents effort reaching the wing.'});
  world.objects.push({...world.objects[0],objectId:'second',label:'Other machine'});
  s=await act(provider,s,'answer',{partReference:{...ref('pedal'),objectId:'second'}},world);
  assert.equal(s.practice.selection.objectId,'second');assert.equal(s.practice.stage,'transfer');
  assert.equal(s.practice.milestones.length,3);
});

test('pointing is an observation, substantive explanations unlock distinct stages, formal quiz is untouched',async()=>{
  const provider=mockProvider(),original=initial();let s=await act(provider,original,'start');
  assert.equal(s.practice.stage,'observe');assert.equal(publicSocraticPractice(s.practice).hideLabels,true);
  s=await act(provider,s,'answer',{partReference:ref('pedal')});
  assert.equal(s.practice.stage,'explain');assert.equal(s.practice.milestones.length,1);
  assert.equal(provider.calls.length,1);assert.equal(publicSocraticPractice(s.practice).hideLabels,false);
  s=await act(provider,s,'respond',{text:'Pushing the pedal supplies motion through the cable.'});assert.equal(s.practice.stage,'predict');
  s=await act(provider,s,'respond',{text:'A loose cable would stop carrying motion to the wing.'});assert.equal(s.practice.stage,'transfer');
  s=await act(provider,s,'respond',{text:'A bicycle pedal also transfers leg effort through a connection.'});
  assert.equal(s.practice.status,'complete');assert.deepEqual(s.practice.milestones.map(m=>m.label),['Noticed','Explained','Predicted','Connected']);
  assert.deepEqual(s.quiz,original.quiz);assert.deepEqual(s.attempts,[]);assert.equal(s.status,'quiz');
  assert.equal(publicSession(s).practice.turns,undefined);assert.equal(publicSession(s).practice.selection,undefined);
  assert.equal(original.practice,undefined);
});

test('misconceptions prompt followups, scaffold/hints preserve progress, revisions are recognized',async()=>{
  const provider=mockProvider();let s=await act(provider,initial(),'start');s=await act(provider,s,'answer',{partReference:ref('wing')});
  const normal=provider.generate.bind(provider);
  provider.generate=async(kind,ctx)=>ctx.task==='review'?{decision:'probe',feedback:'Movement can be an effect.',question:'What supplies that movement?',evidenceQuote:'',evidenceReason:''}:normal(kind,ctx);
  s=await act(provider,s,'respond',{text:'The wing moves so it supplies all the power.'});assert.equal(s.practice.stage,'explain');assert.equal(s.practice.milestones.length,1);
  assert.equal(provider.calls[0].context.task,'opening');
  s=await act(provider,s,'hint');assert.equal(s.practice.hints,1);assert.equal(s.practice.milestones.length,1);assert.ok(s.practice.lectureReplyId);
  s=await act(provider,s,'answer',{partReference:ref('pedal')});assert.equal(s.practice.revisions,1);
  provider.generate=normal;s=await act(provider,s,'respond',{text:'I revised my idea because the pilot pushes the pedal first.'});
  assert.equal(s.practice.stage,'predict');assert.equal(s.practice.revisions,2);
});

test('invented evidence, empty agreement and malformed model output cannot award a milestone',async()=>{
  const provider=mockProvider();let s=await act(provider,initial(),'start');s=await act(provider,s,'answer',{partReference:ref('pedal')});
  const before=structuredClone(s);
  await assert.rejects(act(provider,s,'respond',{text:'yes'}),/ground/);
  provider.generate=async()=>({decision:'advance',feedback:'Yes.',question:'Why?',evidenceQuote:'invented quote',evidenceReason:'A reason long enough.'});
  await assert.rejects(act(provider,s,'respond',{text:'Pushing the pedal supplies motion through the cable.'}),/ground/);
  provider.generate=async()=>({decision:'advance',feedback:'One?',question:'Two?',evidenceQuote:'',evidenceReason:''});
  await assert.rejects(act(provider,s,'respond',{text:'Some words of learner reasoning.'}),/focused/);
  assert.deepEqual(s,before);
});

test('retry, stale questions, changed exhibit, stop/resume, and saved voice events are guarded',async()=>{
  const provider=mockProvider();let s=await act(provider,initial(),'start');s=await act(provider,s,'answer',{partReference:ref('pedal')});
  const text='Pushing this pedal supplies motion to the mechanism.';
  appendEvent(s,{id:'voice-1',speaker:'learner',recipient:'professor',inputKind:'voice',text,worldId:'room',partReference:ref('pedal')});
  const input={revision:s.revision,requestId:'voice-review',action:'respond',practiceId:s.practice.id,roundId:s.practice.roundId,text,inputKind:'voice',eventId:'voice-1'};
  s=await advancePractice(provider,s,input,scene());assert.equal(s.conversation.events.filter(e=>e.text===text).length,1);
  const calls=provider.calls.length;assert.equal(await advancePractice(provider,s,input,scene()),s);assert.equal(provider.calls.length,calls);
  await assert.rejects(act(provider,s,'respond',{text,roundId:'stale'}),/question changed/);
  const changed=scene();changed.objects[0].partsRevision='b'.repeat(64);await assert.rejects(act(provider,s,'hint',{},changed),/parts changed/);
  const stopped=await act(provider,s,'stop',{},null);const resumed=await act(provider,stopped,'start');assert.equal(resumed.practice.id,s.practice.id);assert.equal(resumed.practice.stage,'predict');
});
