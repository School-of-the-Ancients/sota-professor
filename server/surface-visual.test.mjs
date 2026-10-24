import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkedVisual,validSurface} from './surface-visual.mjs';
import {appendEvent,conversationContext} from './conversation.mjs';
import {avatarCue} from './embodiment.mjs';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSchoolApi} from './http.mjs';
import {SessionStore} from './store.mjs';
import {mockProvider} from './fixtures.mjs';
const surface={selectionId:'12345678-1234-1234-1234-123456789abc',objectId:'object',assetId:'asset',nodeIndex:null,primitiveIndex:null,localPoint:{x:.1,y:.2,z:.3}};
const scene={runtimeId:'runtime',roomId:'room',objects:[{objectId:'object',assetId:'asset'}],selectedSurface:surface};
const jpeg=Buffer.from([255,216,255,192,0,17,8,0,1,0,1,3,1,17,0,2,17,1,3,17,1,255,217]);
const image={selectionId:surface.selectionId,mimeType:'image/jpeg',width:1,height:1,dataBase64:jpeg.toString('base64')};
test('bounded images match the saved surface and current live object',()=>{
  assert(validSurface(surface));assert.equal(checkedVisual(image,surface,scene).bytes.length,jpeg.length);
  assert.throws(()=>checkedVisual({...image,selectionId:'other'},surface,scene));
  assert.throws(()=>checkedVisual(image,surface,{objects:[]}));
  assert.throws(()=>checkedVisual({...image,width:960},surface,scene));
  assert.throws(()=>checkedVisual({...image,dataBase64:'x'.repeat(700001)},surface,scene));
  assert(!validSurface({...surface,localPoint:{x:NaN,y:0,z:0}}));
  assert(!validSurface({...surface,url:'file:///private'}));
});
test('surface history and cues retain exact positions without image bytes or new authority',()=>{
  const session={messages:[],createdAt:new Date().toISOString()};
  const event={id:'answer',speaker:'learner',recipient:'professor',inputKind:'voice',text:'This one.',surfaceReference:surface};
  appendEvent(session,event);assert.deepEqual(conversationContext(session)[0].surfaceReference,surface);
  assert(!JSON.stringify(session).includes('dataBase64'));
  assert.deepEqual(avatarCue({kind:'point',objectId:'object',partId:''},scene).surfaceTarget,surface);
  assert.throws(()=>appendEvent(session,{...event,surfaceReference:{...surface,localPoint:{x:2,y:0,z:0}}}));
});

test('spoken HTTP delivers the matching image once and never stores it in the learner archive',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'school-surface-')),provider=mockProvider();
  const api=createSchoolApi({store:new SessionStore(directory),provider,readScene:async()=>scene});
  const server=createServer((req,res)=>void api(req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await api.preparations.idle();await rm(directory,{recursive:true,force:true});});
  let cookie;const call=async(path,body)=>{
    const r=await fetch(`http://127.0.0.1:${server.address().port}/api/school/${path}`,{method:body?'POST':'GET',headers:{...(cookie?{cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    cookie=r.headers.get('set-cookie')?.split(';')[0]||cookie;return {status:r.status,value:await r.json()};};
  const created=await call('sessions',{goal:'Mechanisms',mentor:'Ada Lovelace'});assert.equal(created.status,201);
  const session=created.value;await api.preparations.idle();
  const base=`sessions/${session.id}`;let images=0;
  provider.generate=async(kind,context,options)=>{assert.equal(context.embodiedScene.selectedSurface.selectionId,surface.selectionId);assert(options.image.bytes.length>12000);images++;
    return {text:'That upright shaft carries the turning motion.',suggestions:[],avatarAction:{kind:'point',objectId:'object',partId:''}};};
  await call(base+'/conversation',{event:{id:'surface-answer',speaker:'learner',recipient:'professor',inputKind:'voice',text:'What is this?',surfaceReference:surface}});
  const largeImage={...image,dataBase64:Buffer.concat([jpeg.subarray(0,-2),Buffer.alloc(16000),Buffer.from([255,217])]).toString('base64')};
  assert.equal((await call(base+'/spoken-message',{eventId:'surface-answer',revision:session.revision,visual:{...largeImage,selectionId:'wrong'}})).status,400);
  const body={eventId:'surface-answer',revision:session.revision,visual:largeImage};
  const response=await call(base+'/spoken-message',body);assert.equal(response.status,200);
  assert.equal(response.value.conversation.events.at(-1).avatarCue.surfaceTarget.selectionId,surface.selectionId);
  assert.equal((await call(base+'/spoken-message',body)).status,200);assert.equal(images,1);
  const saved=JSON.stringify((await call(base)).value);assert(!saved.includes('dataBase64'));assert(!saved.includes(largeImage.dataBase64));
});
