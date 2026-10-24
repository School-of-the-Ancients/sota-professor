import {test} from 'node:test';
import assert from 'node:assert/strict';
import {embodiedScene,readEmbodiedScene,avatarCue} from './embodiment.mjs';
import {createSession,advanceSession} from './teaching.mjs';
import {mockProvider} from './fixtures.mjs';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSchoolApi} from './http.mjs';
import {SessionStore} from './store.mjs';
import {appendEvent,conversationContext} from './conversation.mjs';
const state={online:true,clientId:'runtime-1',snapshot:{scene:{roomId:'room-1',objects:[
  {objectId:'teacher',assetId:'vrm',professor:{schoolSessionId:'lesson'}},
  {objectId:'exhibit',assetId:'vitruvian'}]},assets:[{assetId:'vitruvian',displayName:'Vitruvian Man'}]}};

test('scene context is bounded to an online world containing this lesson avatar',()=>{
  const scene=embodiedScene(state,'lesson');
  assert.deepEqual(scene.objects,[{objectId:'exhibit',assetId:'vitruvian',label:'Vitruvian Man'}]);
  assert.equal(embodiedScene(state,'other-lesson'),null);
  assert.equal(embodiedScene({...state,online:false},'lesson'),null);
  assert.equal(avatarCue({kind:'point',objectId:'missing'},scene),null);
  assert.equal(avatarCue({kind:'point',objectId:'teacher'},scene),null);
  assert.equal(avatarCue({kind:'point',objectId:'exhibit'},scene).runtimeId,'runtime-1');
  const many=structuredClone(state);many.snapshot.scene.objects.push(...Array.from({length:100},(_,i)=>({objectId:`item-${i}`,assetId:'block'})));
  assert.equal(embodiedScene(many,'lesson').objects.length,64);
});

test('part cues use exact catalog identity and selected parts reach teaching context',()=>{
  const input=structuredClone(state);
  const part={partId:'canvas',label:'Canvas sail',description:'Intended to press against air; no lift simulation.',provenance:'authored'};
  input.snapshot.assets[0].parts=[part];input.snapshot.assets[0].partsRevision='a'.repeat(64);
  input.snapshot.selectedPart={objectId:'exhibit',assetId:'vitruvian',partId:'canvas',partsRevision:'a'.repeat(64)};
  const scene=embodiedScene(input,'lesson');
  assert.equal(scene.selectedPart.partId,'canvas');assert.equal(scene.objects[0].parts[0].description,part.description);
  const cue=avatarCue({kind:'point',objectId:'exhibit',partId:'canvas'},scene);
  assert.equal(cue.partsRevision,'a'.repeat(64));assert.equal(cue.partId,'canvas');
  assert.equal(avatarCue({kind:'point',objectId:'exhibit',partId:'imaginary'},scene),null);
  input.snapshot.selectedPart.partsRevision='old';assert.equal(embodiedScene(input,'lesson').selectedPart,undefined);
});

test('a learner part answer is journaled without changing their words and safely retries',()=>{
  const session={conversation:{version:1,events:[]}};
  const event={id:'answer-1',speaker:'learner',recipient:'professor',inputKind:'voice',text:'This is the shaft.',
    partReference:{objectId:'exhibit',assetId:'model',partId:'shaft',partsRevision:'a'.repeat(64)}};
  appendEvent(session,event);appendEvent(session,structuredClone(event));
  assert.equal(session.conversation.events.length,1);
  assert.equal(conversationContext(session)[0].partReference.partId,'shaft');
  assert.equal(conversationContext(session)[0].text,'This is the shaft.');
  assert.throws(()=>appendEvent(session,{...event,id:'invalid',partReference:{...event.partReference,url:'https://example.org'}}),/part reference/);
});

test('unavailable Matrix cannot block a teaching turn or create false context',async()=>{
  assert.equal(await readEmbodiedScene('lesson',async()=>{throw Error('offline');}),null);
  assert.equal(await readEmbodiedScene('lesson',async()=>new Response('denied',{status:401})),null);
  assert.deepEqual(await readEmbodiedScene('lesson',async()=>new Response(JSON.stringify(state))),embodiedScene(state,'lesson'));
});

test('grounded avatar cue stays with its reply through short-turn repair, not spoken text',async()=>{
  const provider=mockProvider();let session=await createSession(provider,{goal:'Algorithms',mentor:'Ada Lovelace'});
  const scene=embodiedScene(state,'lesson');let count=0;
  provider.generate=async(kind,context)=>{
    assert.deepEqual(context.embodiedScene,scene);count++;
    return count===1?{text:'word '.repeat(120),suggestions:[],avatarAction:{kind:'point',objectId:'exhibit'}}:
      {text:'Look at the figure. What do you notice?',suggestions:[],avatarAction:{kind:'point',objectId:'invented'}};
  };
  session=await advanceSession(provider,session,'message',{revision:session.revision,text:'Show me the proportions.'},null,scene);
  const event=session.conversation.events.at(-1);
  assert.equal(count,2);assert.equal(event.avatarCue.objectId,'exhibit');
  assert.equal(event.worldId,'room-1');assert(!event.text.includes('avatarAction'));
  provider.generate=async()=>({text:'What would you compare?',suggestions:[],avatarAction:{kind:'point',objectId:'invented'}});
  session=await advanceSession(provider,session,'message',{revision:session.revision,text:'Continue'},null,scene);
  assert.equal(session.conversation.events.at(-1).avatarCue,undefined);
});

test('typed and spoken HTTP turns persist cues with the correct reply and replay idempotently',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'school-attention-')),provider=mockProvider();
  const scene=embodiedScene(state,'lesson');let reads=0;
  const api=createSchoolApi({store:new SessionStore(directory),provider,readScene:async()=>{reads++;return scene;}});
  const server=createServer((req,res)=>void api(req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await api.preparations.idle();await rm(directory,{recursive:true,force:true});});
  let cookie;const call=async(path,body)=>{
    const response=await fetch(`http://127.0.0.1:${server.address().port}/api/school/${path}`,{method:body?'POST':'GET',headers:{...(cookie?{cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    cookie=response.headers.get('set-cookie')?.split(';')[0]||cookie;
    assert(response.ok,`HTTP ${response.status}`);return response.json();
  };
  const session=await call('sessions',{goal:'Algorithms',mentor:'Ada Lovelace'}),base=`sessions/${session.id}`;
  await api.preparations.idle();
  provider.generate=async()=>({text:'Look at the figure. What do you notice?',suggestions:[],avatarAction:{kind:'point',objectId:'exhibit'}});
  const typed=await call(base+'/message',{revision:session.revision,text:'Show the figure.'});
  assert.equal(typed.conversation.events.at(-1).avatarCue.objectId,'exhibit');
  await call(base+'/conversation',{event:{id:'voice-attention',speaker:'learner',recipient:'professor',inputKind:'voice',text:'Point again.',worldId:'room-1'}});
  const body={eventId:'voice-attention',revision:typed.revision};
  const spoken=await call(base+'/spoken-message',body);
  const replay=await call(base+'/spoken-message',body);
  assert.equal(reads,2);assert.equal(replay.messages.length,spoken.messages.length);
  const saved=await call(base);
  assert.equal(saved.conversation.events.find(event=>event.id==='reply:voice-attention').avatarCue.objectId,'exhibit');
});
