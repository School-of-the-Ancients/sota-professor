import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession} from './teaching.mjs';
import {mockProvider,plan} from './fixtures.mjs';
import {instructions} from './schemas.mjs';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SessionStore} from './store.mjs';
import {createSchoolApi} from './http.mjs';

const profile={title:'Inventor and engineer',bio:'A historically inspired interpretation.',greeting:'Let us examine a circuit.',
  expertise:'Electrical engineering',passion:'Understanding electricity',
  systemInstruction:'Teach through clear electrical examples and grounded explanations. Distinguish historical proposals from demonstrated results, and label modern extensions. Never invent quotations or memories. This is an AI interpretation, not the historical person.',
  suggestedPrompts:['Explain resonance.','How could wireless signals travel?']};
function providerFor(name,{requested='',matchName=name}={}) {
  const base=mockProvider();
  return {calls:[],async generate(kind,context){
    this.calls.push({kind,context:structuredClone(context)});
    if(kind==='plan')return {...structuredClone(plan),requestedMentor:requested,mentor:{...plan.mentor,name}};
    if(kind==='match')return {mentorId:'',mentorName:matchName,suitable:true,reason:'Expertise fits this question.',caveats:[],
      alternatives:[{mentorId:'einstein',mentorName:'Albert Einstein',reason:'Related physics.'}]};
    if(kind==='identity')return {status:'plausible',name,era:'1856–1943',reason:'Identifiable historical inventor.',caveats:['AI interpretation only.']};
    if(kind==='teacher')return {...profile};
    return base.generate(kind,context);
  }};
}

test('a fresh voice request creates the requested mentor outside the roster and preserves the first utterance',async()=>{
  const provider=providerFor('Nikola Tesla',{requested:'Nikola Tesla'}),teachers=[];
  const goal='Uh, Niccolo Tesla, how does warding cliff tower work?';
  const session=await createSession(provider,{goal,mentor:'',inputKind:'voice'},teachers);
  assert.equal(session.mentor.name,'Nikola Tesla');assert.equal(teachers.length,1);
  assert.equal(session.conversation.events[0].text,goal);
  assert.equal(provider.calls.find(c=>c.kind==='match').context.explicitChoice,true);
  assert.equal(provider.calls.find(c=>c.kind==='teach').context.mentor.name,'Nikola Tesla');
});

test('automatic topic matching can choose and create someone absent from the suggested roster',async()=>{
  const provider=providerFor('Michael Faraday'),teachers=[];
  const session=await createSession(provider,{goal:'How does electromagnetic induction work?',mentor:''},teachers);
  assert.equal(session.mentor.name,'Michael Faraday');assert.equal(teachers[0].name,'Michael Faraday');
  assert.equal(provider.calls.find(c=>c.kind==='match').context.explicitChoice,false);
});

test('a saved dynamically created person is reused across new lessons without recreating the persona',async()=>{
  const provider=providerFor('Nikola Tesla'),teachers=[];
  const a=await createSession(provider,{goal:'Explain resonance',mentor:''},teachers);
  const b=await createSession(provider,{goal:'Explain transformers',mentor:''},teachers);
  assert.equal(a.mentor.id,b.mentor.id);assert.notEqual(a.id,b.id);
  assert.equal(provider.calls.filter(c=>c.kind==='identity').length,1);
  assert.equal(provider.calls.filter(c=>c.kind==='teacher').length,1);
});

test('a typed custom mentor no longer requires manually creating a library entry first',async()=>{
  const provider=providerFor('Nikola Tesla'),teachers=[];
  const session=await createSession(provider,{goal:'Explain resonance',mentor:'Nikola Tesla'},teachers);
  assert.equal(session.mentor.name,'Nikola Tesla');assert.equal(teachers.length,1);
});

test('fit review cannot replace an explicitly requested missing mentor with Einstein',async()=>{
  const provider=providerFor('Nikola Tesla',{requested:'Nikola Tesla',matchName:'Albert Einstein'});
  await assert.rejects(createSession(provider,{goal:'Tesla, explain resonance',mentor:''},[]),/alternatives must be distinct|explicit choice/);
  assert.equal(provider.calls.filter(c=>c.kind==='teach').length,0);
});

test('uncertain identity stops instead of silently falling back to a roster teacher',async()=>{
  const provider=providerFor('Uncertain Person'),generate=provider.generate;
  provider.generate=async function(kind,context){
    if(kind==='identity')return {status:'uncertain',name:'Uncertain Person',era:'Unknown',reason:'Identity is ambiguous.',caveats:['Clarify the name.']};
    return generate.call(this,kind,context);
  };
  const teachers=[];
  await assert.rejects(createSession(provider,{goal:'Explain a topic',mentor:''},teachers),/uncertain/);
  assert.equal(teachers.length,0);
});

test('planner and matcher treat the roster as reuse options, not the universe of eligible mentors',()=>{
  assert.match(instructions.plan,/not only availableTeachers/);
  assert.match(instructions.match,/even when absent from availableTeachers/);
});

test('new-conversation HTTP flow saves the created persona and reuses it without sharing learner records',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'dynamic-school-'));
 const provider=providerFor('Nikola Tesla'),api=createSchoolApi({store:new SessionStore(directory),provider});
 const server=createServer((req,res)=>void api(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>server.close(r));await api.preparations.idle();await rm(directory,{recursive:true,force:true});});
 const base=`http://127.0.0.1:${server.address().port}`,cookie='sota-local-learner='+'a'.repeat(64);
 const call=async(path,body,identity=cookie)=>{
  const response=await fetch(base+'/api/school/'+path,{method:body?'POST':'GET',headers:{cookie:identity,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  assert(response.ok,await response.clone().text());return response.json();
 };
 const a=await call('sessions',{goal:'Explain resonance',mentor:''});
 const b=await call('sessions',{goal:'Explain transformers',mentor:''});
 const roster=await call('teachers'),saved=await call('sessions');
 assert.equal(roster.filter(t=>t.name==='Nikola Tesla').length,1);assert.equal(a.mentor.id,b.mentor.id);
 assert.equal(saved.length,2);assert.equal(provider.calls.filter(c=>c.kind==='teacher').length,1);
 const other=await call('sessions',null,'sota-local-learner='+'b'.repeat(64));assert.deepEqual(other,[]);
});
