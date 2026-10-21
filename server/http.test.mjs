import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { mkdtemp, rm, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SessionStore } from './store.mjs';
import { createSchoolApi } from './http.mjs';
import { mockProvider } from './fixtures.mjs';

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
