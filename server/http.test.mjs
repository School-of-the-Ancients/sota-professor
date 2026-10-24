import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { mkdtemp, rm, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SessionStore } from './store.mjs';
import { createSchoolApi } from './http.mjs';
import { mockProvider } from './fixtures.mjs';

test('a one-use device code links an empty browser to the same archive without exposing the owner key', async t => {
  const directory=await mkdtemp(join(tmpdir(),'sota-device-')),api=createSchoolApi({store:new SessionStore(directory),provider:mockProvider()});
  const server=createServer((req,res)=>void api(req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await api.preparations.idle();await rm(directory,{recursive:true,force:true});});
  const call=async(path,body,cookie,origin)=>{
    const response=await fetch(`http://127.0.0.1:${server.address().port}/api/school/${path}`,{
      method:body?'POST':'GET',headers:{...(cookie?{cookie}:{}),...(origin?{origin}:{}),...(body?{'Content-Type':'application/json'}:{})},
      ...(body?{body:JSON.stringify(body)}:{})});
    return {status:response.status,cookie:response.headers.get('set-cookie')?.split(';')[0],value:await response.json()};
  };
  const created=await call('sessions',{goal:'Algorithms',mentor:'Ada Lovelace'});
  const owner=created.cookie;
  const issued=await call('device-link',{},owner);
  assert.equal(issued.status,200);assert.deepEqual(Object.keys(issued.value).sort(),['code','expiresAt']);
  assert(!JSON.stringify(issued.value).includes(owner.split('=')[1]));
  const guest=await call('sessions');
  assert.equal((await call(`sessions/${created.value.id}`,undefined,guest.cookie)).status,404);
  assert.equal((await call('device-link/claim',{code:issued.value.code},guest.cookie,'https://outside.example')).status,403);
  const linked=await call('device-link/claim',{code:issued.value.code},guest.cookie);
  assert.equal(linked.cookie,owner);
  assert.equal((await call('sessions',undefined,linked.cookie)).value[0].id,created.value.id);
  assert.equal((await call('device-link/claim',{code:issued.value.code},guest.cookie)).status,400);
  const another=await call('sessions',{goal:'Proofs',mentor:'Ada Lovelace'});
  const second=await call('device-link',{},owner);
  assert.equal((await call('device-link/claim',{code:second.value.code},another.cookie)).status,409);
});

test('spoken journal is durable, idempotent and isolated, and speech failures retain the input',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'sota-voice-')),provider=mockProvider();
  const api=createSchoolApi({store:new SessionStore(directory),provider});
  const server=createServer((req,res)=>void api(req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await api.preparations.idle();await rm(directory,{recursive:true,force:true});});
  let cookie;const call=async(path,body,otherCookie)=>{const response=await fetch(`http://127.0.0.1:${server.address().port}/api/school/${path}`,{
    method:body?'POST':'GET',headers:{...(cookie?{cookie:otherCookie||cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    cookie=response.headers.get('set-cookie')?.split(';')[0]||cookie;return {status:response.status,value:await response.json()};};
  const {value:session}=await call('sessions',{goal:'Algorithms',mentor:'Ada Lovelace'}),base=`sessions/${session.id}`;
  const event={id:'voice-turn-one',speaker:'learner',recipient:'professor',inputKind:'voice',text:'Please explain nine.',worldId:'test-world'};
  assert.equal((await call(base+'/conversation',{event})).status,200);
  const body={eventId:event.id,revision:session.revision};const reply=await call(base+'/spoken-message',body);
  assert.equal(reply.status,200);assert.equal((await call(base+'/spoken-message',body)).value.messages.length,reply.value.messages.length);
  assert.equal(reply.value.conversation.events.filter(item=>item.id===event.id).length,1);
  await call(base+'/speech-delivery',{eventId:'reply:'+event.id,delivery:'interrupted'});
  assert.equal((await call(base)).value.conversation.events.at(-1).delivery,'interrupted');
  assert.equal((await call(base,undefined,'sota-local-learner='+'f'.repeat(64))).status,404);
  const next={...event,id:'failed-voice',text:'Try this next.'};await call(base+'/conversation',{event:next});provider.fail=true;
  assert.equal((await call(base+'/spoken-message',{eventId:next.id,revision:reply.value.revision})).status,500);
  assert((await call(base)).value.conversation.events.some(item=>item.id===next.id));
});

test('local HTTP lifecycle: isolation, durable reload, hidden answers, stale writes and safe failure', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'sota-test-'));
  const provider = mockProvider();
  let api = createSchoolApi({ store: new SessionStore(directory), provider });
  const server = createServer((req, res) => void api(req, res, () => { res.writeHead(404); res.end(); }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie;
  const call = async (path, body, headers = {}) => {
    const response = await fetch(`${base}/api/school/${path}`, { method: body === undefined ? 'GET' : 'POST',
      headers: { ...(cookie ? { cookie } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    return { response, value: await response.json() };
  };
  const listed = await call('sessions');
  assert.equal(listed.response.status, 200);
  assert.match(listed.response.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
  assert.equal(listed.response.headers.get('cache-control'), 'no-store');
  let { value: session } = await call('sessions', { goal: 'Learn algorithms', mentor: 'Ada Lovelace' });
  assert.equal(session.messages.length, 1);
  ({ value: session } = await call(`sessions/${session.id}/message`, { revision: session.revision, text: 'I predict 9. Can you explain why?' }));
  // Reconstruct API and store: this must read disk, not an in-memory transcript.
  api = createSchoolApi({ store: new SessionStore(directory), provider });
  const restored = await call(`sessions/${session.id}`);
  assert.deepEqual(restored.value, session);
  const stranger = await call(`sessions/${session.id}`, undefined, { cookie: 'sota-local-learner=' + 'b'.repeat(64) });
  assert.equal(stranger.response.status, 404);
  const crossSite = await call('sessions', { goal: 'Learn algorithms', mentor: '' }, { origin: 'https://evil.example' });
  assert.equal(crossSite.response.status, 403);
  const rebinding = await new Promise((resolve, reject) => {
    const request = httpRequest(`${base}/api/school/sessions`, { headers: { host: 'evil.example' } }, response => { response.resume(); resolve(response.statusCode); });
    request.on('error', reject); request.end();
  });
  assert.equal(rebinding, 403);
  const forbidden = await call('sessions', { goal: 'Learn algorithms', mentor: '' }, { 'sec-fetch-site': 'cross-site' });
  assert.equal(forbidden.response.status, 403);
  const stale = await call(`sessions/${session.id}/message`, { revision: 0, text: 'stale' });
  assert.equal(stale.response.status, 409);
  provider.fail = true;
  const failure = await call(`sessions/${session.id}/message`, { revision: session.revision, text: 'Please explain' });
  assert.equal(failure.response.status, 500);
  assert(!JSON.stringify(failure.value).includes('private upstream'));
  assert.deepEqual((await call(`sessions/${session.id}`)).value, session);
  provider.fail = false;
  ({ value: session } = await call(`sessions/${session.id}/quiz`, { revision: session.revision }));
  assert(session.quiz.questions.every(question => !('answer' in question) && !('explanation' in question)));
  const files = await readdir(directory);
  assert.equal(files.length, 1);
  const persisted = JSON.parse(await readFile(join(directory, files[0]), 'utf8')).sessions[0];
  const answers = Object.fromEntries(persisted.quiz.questions.map(question => [question.id, question.answer]));
  ({ value: session } = await call(`sessions/${session.id}/answers`, { revision: session.revision, quizId: session.quiz.id, answers }));
  assert.equal(session.status, 'complete');
  assert.equal(session.attempts.length, 1);
  assert.equal((await call('sessions')).value[0].status, 'complete');
  assert.equal(provider.calls.filter(call => call.kind === 'teach')[1].context.messages[1].text, 'I predict 9. Can you explain why?');
  api = createSchoolApi({ store: new SessionStore(directory), provider });
  for (let index = 0; index < 12; index++) assert.equal((await call('sessions', {})).response.status, 400);
  assert.equal((await call('sessions', {})).response.status, 429);
});

test('concurrent writes, traversal and a corrupted archive cannot overwrite saved data', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sota-store-test-'));
  try {
    const store = new SessionStore(directory);
    const owner = 'a'.repeat(64);
    let release;
    const first = store.transaction(owner, async () => { await new Promise(resolve => { release = resolve; }); return { value: 'first' }; });
    while (!release) await new Promise(resolve => setImmediate(resolve));
    const snapshots = await Promise.all([
      store.transaction(owner, data => ({ value: data.sessions }), { readOnly: true }),
      store.transaction(owner, data => ({ value: data.sessions }), { readOnly: true }),
    ]);
    assert.deepEqual(snapshots, [[], []]);
    await assert.rejects(store.transaction(owner, () => ({ write: true }), { readOnly: true }), /read-only archive/);
    await assert.rejects(store.transaction(owner, async () => ({ value: 'second' })), /Another request/);
    release();
    assert.equal(await first, 'first');
    await store.transaction(owner, data => { data.sessions.push({ preserved: true }); return { write: true, value: true }; });
    await assert.rejects(store.transaction('../traversal', () => ({})), /Invalid local learner/);
    await writeFile(join(directory, `${owner}.json`), 'corrupt archive');
    await assert.rejects(store.transaction(owner, () => ({ write: true })), /unreadable/);
    assert.equal(await readFile(join(directory, `${owner}.json`), 'utf8'), 'corrupt archive');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
