import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chooseAppearance,avatarCatalog} from './appearance.mjs';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSchoolApi} from './http.mjs';
import {SessionStore} from './store.mjs';
import {mockProvider} from './fixtures.mjs';
const avatars=[
 {catalogId:'generic-professor',displayName:'Generic',availability:'ready',automaticSelection:true},
 {catalogId:'renaissance',displayName:'Renaissance scholar',availability:'ready',automaticSelection:true,visualTags:['human','beard'],teacherMatches:['leonardo-da-vinci']},
 {catalogId:'victorian',displayName:'Victorian scholar',availability:'ready',automaticSelection:true,teacherMatches:['ada-lovelace']},
 {catalogId:'riko',displayName:'Riko',availability:'ready',automaticSelection:false,visualTags:['fantasy']}];
const session={id:'lesson',revision:1,mentor:{name:'Leonardo da Vinci',id:'leonardo',era:'Renaissance'},messages:[{text:'Preserve me'}]};
test('curated historical matches and manual pins preserve the lesson and exclude fantasy by default',async()=>{
 const provider={generate:async()=>{throw Error('Curated matches need no model request');}};
 const leo=await chooseAppearance(provider,session,{revision:1,mode:'auto'},avatars);
 assert.equal(leo.appearance.catalogId,'renaissance');assert.deepEqual(leo.messages,session.messages);
 const ada=await chooseAppearance(provider,{...session,mentor:{name:'Ada Lovelace'}},{revision:1,mode:'auto'},avatars);
 assert.equal(ada.appearance.catalogId,'victorian');
 const pinned=await chooseAppearance(provider,leo,{revision:2,mode:'manual',catalogId:'riko'},avatars);
 assert.equal(pinned.appearance.mode,'manual');assert.equal(pinned.appearance.catalogId,'riko');
 await assert.rejects(chooseAppearance(provider,leo,{revision:1,mode:'auto'},avatars),/changed/);
 await assert.rejects(chooseAppearance(provider,leo,{revision:2,mode:'manual',catalogId:'file:unknown'},avatars),/no longer/);
});
test('other figures use bounded model choice and unknown or fantasy output falls back safely',async()=>{
 const other={...session,mentor:{name:'Unknown scholar',era:'Uncertain'}};
 let calls=0;
 const provider={generate:async(kind,context)=>{calls++;assert.equal(kind,'appearance');assert(!context.candidates.some(item=>item.catalogId==='riko'));return {catalogId:'victorian',reason:'Suitable period clothing.'};}};
 assert.equal((await chooseAppearance(provider,other,{revision:1,mode:'auto'},avatars)).appearance.method,'model');assert.equal(calls,1);
 for(const id of ['riko','invented']){
  const result=await chooseAppearance({generate:async()=>({catalogId:id,reason:'test'})},other,{revision:1,mode:'auto'},avatars);
  assert.equal(result.appearance.catalogId,'generic-professor');assert.equal(result.appearance.method,'fallback');
 }
});
test('catalog fetch is fixed to Matrix loopback and drops unavailable entries',async()=>{
 const result=await avatarCatalog(async(url,options)=>{assert.equal(url,'http://127.0.0.1:8765/api/professor/avatars');assert.equal(options.redirect,'error');return new Response(JSON.stringify({avatars:[...avatars,{catalogId:'missing',availability:'missing'}]}));});
 assert.equal(result.length,4);
 await assert.rejects(avatarCatalog(async()=>{throw Error('offline');}),/Connect Matrix/);
});

test('HTTP appearance selection persists the pin while preserving transcript and requiring the current revision',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'school-appearance-'));
 const api=createSchoolApi({store:new SessionStore(directory),provider:mockProvider(),readAvatarCatalog:async()=>avatars});
 const server=createServer((req,res)=>void api(req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));await api.preparations.idle();await rm(directory,{recursive:true,force:true});});
 let cookie;const call=async(path,body)=>{
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/school/${path}`,{method:body?'POST':'GET',headers:{...(cookie?{cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  cookie=response.headers.get('set-cookie')?.split(';')[0]||cookie;return {status:response.status,data:await response.json()};
 };
 const created=(await call('sessions',{goal:'Algorithms',mentor:'Ada Lovelace'})).data;await api.preparations.idle();
 const path=`sessions/${created.id}`;
 const selected=await call(path+'/appearance',{revision:created.revision,mode:'manual',catalogId:'riko'});
 assert.equal(selected.status,200);assert.equal(selected.data.appearance.mode,'manual');
 assert.deepEqual(selected.data.messages,created.messages);
 assert.equal((await call(path)).data.appearance.catalogId,'riko');
 assert.equal((await call(path+'/appearance',{revision:created.revision,mode:'auto'})).status,409);
});
