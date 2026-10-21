import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSchoolApi } from './http.mjs';
import { SessionStore } from './store.mjs';
import { mockProvider } from './fixtures.mjs';
import { createSession } from './teaching.mjs';

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const exhibit = { kind: 'artifact', title: 'Ordered operation cards', description: 'One example using cards to show ordered operations.', objectiveId: 'sequence',
  learningIntent: 'Trace a sequence and see why order matters.', interaction: { requirement: 'required', description: 'Moving cards is a future requirement, not implemented interaction.', capabilities: ['move'] } };

async function harness(t, provider, release = () => {}) {
  const directory = await mkdtemp(join(tmpdir(), 'sota-exhibit-'));
  const store = new SessionStore(directory);
  let api = createSchoolApi({ store, provider });
  const managers = [api.preparations];
  const server = createServer((req, res) => void api(req, res));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const owner = 'c'.repeat(64);
  t.after(async () => {
    release(); await Promise.all(managers.map(manager => manager.idle()));
    await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true });
  });
  return { store, owner,
    manager: () => api.preparations,
    restart() { api = createSchoolApi({ store, provider }); managers.push(api.preparations); },
    async call(path, body, otherOwner = owner) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/school/${path}`, {
        method: body ? 'POST' : 'GET', headers: { cookie: `sota-local-learner=${otherOwner}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: response.status, value: await response.json() };
    },
  };
}
const create = app => app.call('sessions', { goal: 'Understand algorithm order', mentor: 'Ada Lovelace' });

test('mentor plus goal starts one request alongside introduction; response never waits for exhibit completion', { timeout: 5000 }, async t => {
  const provider = mockProvider(), gate = deferred(), intro = deferred(), started = deferred(), speaking = deferred();
  const base = provider.generate.bind(provider);
  provider.generate = (kind, context) => {
    if (kind === 'exhibit') { provider.calls.push({ kind, context }); started.resolve(context); return gate.promise; }
    if (kind === 'teach' && context.messages.length === 0) { speaking.resolve(); return intro.promise; }
    return base(kind, context);
  };
  const app = await harness(t, provider, () => { gate.resolve(exhibit); intro.resolve({ text: 'An opening explanation.', suggestions: [], presentationRequests: [] }); });
  const creating = create(app);
  const context = await started.promise; await speaking.promise;
  assert.equal(context.mentor.name, 'Ada Lovelace'); assert.equal(context.goal, 'Understand algorithm order');
  intro.resolve({ text: 'Your introduction is ready while the request prepares.', suggestions: [], presentationRequests: [exhibit] });
  const { status, value: session } = await creating;
  assert.equal(status, 201); assert.equal(session.messages.length, 1);
  assert.equal(session.presentations.length, 1); // Opening proposals cannot duplicate the dedicated initial request.
  assert.equal(session.presentations[0].preparation.status, 'preparing');
  assert.match(session.presentations[0].prompt, /Ada Lovelace/); assert.match(session.presentations[0].prompt, /Understand algorithm order/);
  for (let index = 0; index < 3; index++) assert.equal((await app.call(`sessions/${session.id}`)).status, 200);
  assert.equal(provider.calls.filter(call => call.kind === 'exhibit').length, 1);
  const duplicate = await app.call(`sessions/${session.id}/exhibit-prepare`, { revision: session.revision });
  assert.equal(duplicate.status, 409);
  gate.resolve(exhibit); await app.manager().idle();
  const prepared = (await app.call(`sessions/${session.id}`)).value;
  assert.equal(prepared.presentations.length, 1); assert.equal(prepared.presentations[0].preparation.status, 'ready');
  assert.equal(prepared.presentations[0].status, 'unavailable'); assert.equal(prepared.revision, session.revision);
  assert.match(prepared.presentations[0].reason, /Matrix is not connected/);
  assert.equal(prepared.presentations[0].interaction.requirement, 'required');
  assert(!('object' in prepared.presentations[0]));
  assert.equal((await app.call(`sessions/${session.id}`, undefined, 'd'.repeat(64))).status, 404);
});

test('edits during preparation win over late output and survive reopen; stale edit versions are rejected', async t => {
  const provider = mockProvider(), gate = deferred(); const base = provider.generate.bind(provider);
  provider.generate = (kind, context) => kind === 'exhibit' ? gate.promise : base(kind, context);
  const app = await harness(t, provider, () => gate.resolve(exhibit));
  const { value: session } = await create(app), request = session.presentations[0];
  const saved = await app.call(`sessions/${session.id}/presentation-edit`, { revision: session.revision, requestId: request.id, requestVersion: 1, prompt: 'My edited exhibit prompt. Keep the original question and let me review before any execution.' });
  assert.equal(saved.status, 200);
  gate.resolve(exhibit); await app.manager().idle(); app.restart();
  const reopened = (await app.call(`sessions/${session.id}`)).value;
  assert.equal(reopened.presentations[0].prompt, saved.value.presentations[0].prompt);
  assert.equal(reopened.presentations[0].promptSource, 'user'); assert.equal(reopened.presentations[0].version, 2);
  assert.equal(reopened.messages.length, 1);
  const stale = await app.call(`sessions/${session.id}/presentation-edit`, { revision: reopened.revision, requestId: request.id, requestVersion: 1, prompt: 'Stale edit must not overwrite the saved prompt.' });
  assert.equal(stale.status, 409);
  assert.equal((await app.call(`sessions/${session.id}/exhibit-prepare`, { revision: reopened.revision })).status, 409);
});

test('failure retains a real editable draft; explicit retry reuses its identity without fallback media', async t => {
  const provider = mockProvider(); const base = provider.generate.bind(provider); let fail = true, generations = 0;
  provider.generate = (kind, context) => {
    if (kind === 'exhibit') { generations++; return fail ? Promise.reject(new Error('private upstream secret')) : Promise.resolve(exhibit); }
    return base(kind, context);
  };
  const app = await harness(t, provider);
  const { value: session } = await create(app); await app.manager().idle();
  const failed = (await app.call(`sessions/${session.id}`)).value, request = failed.presentations[0];
  assert.equal(request.preparation.status, 'error'); assert(request.prompt.length > 200);
  assert(!JSON.stringify(failed).includes('private upstream secret'));
  fail = false;
  const retry = await app.call(`sessions/${session.id}/exhibit-prepare`, { revision: failed.revision });
  assert.equal(retry.status, 200); await app.manager().idle();
  const ready = (await app.call(`sessions/${session.id}`)).value;
  assert.equal(ready.presentations.length, 1); assert.equal(ready.presentations[0].id, request.id);
  assert.equal(ready.presentations[0].preparation.status, 'ready'); assert.equal(generations, 2);
});

test('restart never replays a subscription call; old mentor/topic output is discarded', async t => {
  const provider = mockProvider(), gate = deferred(); const base = provider.generate.bind(provider); let generations = 0;
  provider.generate = (kind, context) => { if (kind === 'exhibit') { generations++; return gate.promise; } return base(kind, context); };
  const app = await harness(t, provider, () => gate.resolve(exhibit));
  const { value: session } = await create(app), originalManager = app.manager();
  app.restart();
  const interrupted = (await app.call(`sessions/${session.id}`)).value;
  assert.equal(interrupted.presentations[0].preparation.status, 'error'); assert.match(interrupted.presentations[0].reason, /interrupted/);
  assert.equal(generations, 1);
  await app.store.transaction(app.owner, data => { data.sessions[0].goal = 'A different topic'; data.sessions[0].mentor.name = 'A different mentor'; return { write: true }; });
  gate.resolve(exhibit); await originalManager.idle();
  const changed = (await app.call(`sessions/${session.id}`)).value;
  assert.notEqual(changed.presentations[0].title, exhibit.title); assert.equal(changed.presentations[0].promptSource, 'draft');
  assert.match(changed.presentations[0].reason, /mentor or lesson changed/);
});

test('older sessions remain untouched on reads and can explicitly prepare one request', async t => {
  const provider = mockProvider();
  const app = await harness(t, provider);
  const legacy = await createSession(provider, { goal: 'An older saved question', mentor: '' });
  legacy.presentations = []; delete legacy.presentationRevision;
  await app.store.transaction(app.owner, data => { data.sessions.push(legacy); return { write: true }; });
  provider.calls.length = 0;
  const read = await app.call(`sessions/${legacy.id}`);
  assert.equal(read.value.presentations.length, 0); assert.equal(provider.calls.length, 0);
  assert.equal((await app.call(`sessions/${legacy.id}/exhibit-prepare`, { revision: legacy.revision })).status, 200);
  await app.manager().idle();
  assert.equal((await app.call(`sessions/${legacy.id}`)).value.presentations.length, 1);
});

test('a background result waits for an active learner turn and preserves its new transcript', async t => {
  const provider = mockProvider(), exhibitGate = deferred(), lessonGate = deferred(), lessonStarted = deferred();
  const base = provider.generate.bind(provider);
  provider.generate = (kind, context) => {
    if (kind === 'exhibit') return exhibitGate.promise;
    if (kind === 'teach' && context.messages.some(message => message.role === 'user')) { lessonStarted.resolve(); return lessonGate.promise; }
    return base(kind, context);
  };
  const app = await harness(t, provider, () => { exhibitGate.resolve(exhibit); lessonGate.resolve({ text: 'A fresh explanation.', suggestions: [] }); });
  const { value: session } = await create(app);
  const message = app.call(`sessions/${session.id}/message`, { revision: session.revision, text: 'Here is my new learner contribution.' });
  await lessonStarted.promise; exhibitGate.resolve(exhibit);
  lessonGate.resolve({ text: 'A fresh explanation.', suggestions: [] });
  assert.equal((await message).status, 200); await app.manager().idle();
  const saved = (await app.call(`sessions/${session.id}`)).value;
  assert.equal(saved.messages.length, 3); assert.equal(saved.messages[1].text, 'Here is my new learner contribution.');
  assert.equal(saved.revision, 2); assert.equal(saved.presentations[0].preparation.status, 'ready');
});

test('a failed introduction abandons the background result without saving an orphan quest', async t => {
  const provider = mockProvider(), gate = deferred(); const base = provider.generate.bind(provider);
  provider.generate = (kind, context) => kind === 'exhibit' ? gate.promise : kind === 'teach' ? Promise.reject(new Error('Introduction failed.')) : base(kind, context);
  const app = await harness(t, provider, () => gate.resolve(exhibit));
  const failed = await create(app); assert.equal(failed.status, 500);
  gate.resolve(exhibit); await app.manager().idle();
  assert.deepEqual((await app.call('sessions')).value, []);
});
