import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SessionStore} from './store.mjs';
import {AppearancePreparer} from './appearance-preparation.mjs';
import {createSession} from './teaching.mjs';
import {mockProvider} from './fixtures.mjs';

test('the initial spoken question precedes the introduction in the shared transcript',async()=>{
 const session=await createSession(mockProvider(),{goal:'Explain the first algorithm',mentor:'Ada Lovelace',inputKind:'voice'});
 assert.equal(session.conversation.events[0].speaker,'learner');
 assert.equal(session.conversation.events[0].inputKind,'voice');
 assert.equal(session.conversation.events[1].speaker,'professor');
});

async function setup(t,options){
 const directory=await mkdtemp(join(tmpdir(),'school-avatar-'));const store=new SessionStore(directory);
 const owner='a'.repeat(64);const session={id:'lesson',revision:7,messages:[{text:'Keep teaching'}],mentor:{id:'leonardo',name:'Leonardo',era:'Renaissance'}};
 const worker=new AppearancePreparer({store,...options});
 t.after(async()=>{await worker.idle();await rm(directory,{recursive:true,force:true});});
 const ticket=worker.start(owner,session);
 await store.transaction(owner,data=>{data.sessions.push(session);return {write:true,value:null};});
 worker.publish(ticket);
 return {worker,store,owner,read:()=>store.transaction(owner,data=>({value:data.sessions[0]}),{readOnly:true})};
}

test('reuses an exact saved avatar without a generation request or lesson revision change',async t=>{
 let submitted=false;
 const f=await setup(t,{catalog:async()=>[{catalogId:'saved',automaticSelection:true,teacherMatches:['leonardo'],representation:'approximate'}],
  provider:{generate:async()=>{throw Error('No generation expected');}},submit:async()=>{submitted=true;}});
 await f.worker.idle();const session=await f.read();
 assert.equal(session.appearance.catalogId,'saved');assert.equal(session.appearance.status,'ready');
 assert.equal(session.revision,7);assert.equal(submitted,false);assert.deepEqual(session.messages,[{text:'Keep teaching'}]);
});

test('fresh background matching uses the local upgraded teacher before the bundled cast',async t=>{
 const f=await setup(t,{catalog:async()=>[
  {catalogId:'bundled',automaticSelection:true,teacherMatches:['leonardo'],libraryOwned:true},
  {catalogId:'upgraded',automaticSelection:true,teacherMatches:['leonardo'],libraryOwned:false}],
  provider:{generate(){throw Error('No generation needed');}}});
 await f.worker.idle();assert.equal((await f.read()).appearance.catalogId,'upgraded');
});

test('queues a missing appearance and attaches only its validated catalog result',async t=>{
 let available=false,submits=0;
 const f=await setup(t,{catalog:async()=>available?[{catalogId:'new-avatar',assetSha256:'hash',availability:'ready'}]:[],
  provider:{generate:async()=>({suitable:false,catalogId:'',description:'Older scholar in a robe',reason:'No match'})},
  submit:async()=>{submits++;return {id:'job',status:'running'};},wait:async()=>{},
  status:async()=>{available=true;return {id:'job',status:'ready',catalogId:'new-avatar',sha256:'hash'};}});
 await f.worker.idle();const session=await f.read();
 assert.equal(submits,1);assert.equal(session.appearance.catalogId,'new-avatar');assert.equal(session.appearance.method,'created');
});

test('a manual pin made during creation wins over the late job result',async t=>{
 let release,entered;const ready=new Promise(resolve=>{entered=resolve;});
 const gate=new Promise(resolve=>{release=resolve;});
 const f=await setup(t,{catalog:async()=>[],provider:{generate:async()=>({suitable:false,description:'Scholar'})},
  submit:async()=>{entered();await gate;return {id:'job',status:'failed'};}});
 await ready;
 await f.store.transaction(f.owner,data=>{data.sessions[0].appearance={mode:'manual',catalogId:'my-choice'};return {write:true,value:null};});
 release();await f.worker.idle();assert.equal((await f.read()).appearance.catalogId,'my-choice');
});

test('unavailable avatar services leave the lesson and transcript usable',async t=>{
 const f=await setup(t,{catalog:async()=>{throw Error('offline');},provider:{}});
 await f.worker.idle();const session=await f.read();
 assert.equal(session.appearance.status,'unavailable');assert.equal(session.revision,7);assert.equal(session.messages[0].text,'Keep teaching');
});

test('a different historical figure is never silently reused for a missing mentor',async t=>{
 let submitted=0,candidates;
 const f=await setup(t,{catalog:async()=>[{catalogId:'einstein',automaticSelection:true,teacherMatches:['einstein']}],
  provider:{generate:async(_kind,input)=>{candidates=input.candidates;return {suitable:false,catalogId:'',description:'Leonardo with silver hair and Renaissance clothing'};}},
  submit:async()=>{submitted++;return {id:'new-job',status:'failed',message:'Test authoring failure'};}});
 await f.worker.idle();const session=await f.read();
 assert.deepEqual(candidates,[]);assert.equal(submitted,1);
 assert.notEqual(session.appearance.catalogId,'einstein');assert.equal(session.appearance.status,'failed');
 assert.equal(session.mentor.name,'Leonardo');
});
