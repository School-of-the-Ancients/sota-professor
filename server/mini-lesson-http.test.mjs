import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SessionStore } from './store.mjs';
import { createSchoolApi } from './http.mjs';
import { mockProvider } from './fixtures.mjs';

test('HTTP mini-lesson survives reload and spoken retry without duplicate grading or another learner access', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'sota-mini-'));
  const provider = mockProvider(), generate = provider.generate.bind(provider);
  provider.generate = async (kind, data) => kind === 'mini_plan' ? {
    title: 'Order matters', explanation: 'Operations pass results to the next step.',
    activity: 'What happens if you add two and then double?', reflection: 'Where else does order matter?', followUp: 'Try another ordered task.',
  } : kind === 'mini_review' ? { decision: 'demonstrated', feedback: 'You explained the sequence.',
    question: 'How does order change the outcome?', evidenceQuote: data.learnerText, evidenceReason: 'The learner traces both operations and explains their order.' } : generate(kind, data);
  const api = createSchoolApi({ store: new SessionStore(directory), provider });
  const server = createServer((req, res) => void api(req, res));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await api.preparations.idle(); await rm(directory, { recursive: true, force: true }); });
  let cookie;
  const call = async (path, body, own = true) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/school/${path}`, {
      method: body ? 'POST' : 'GET', headers: { ...(cookie && own ? { cookie } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (own) cookie = response.headers.get('set-cookie')?.split(';')[0] || cookie;
    return { status: response.status, value: await response.json() };
  };
  let result = await call('sessions', { goal: 'Trace arithmetic steps.', mentor: 'Ada Lovelace' });
  const base = `sessions/${result.value.id}`;
  const start = { revision: result.value.revision, action: 'start', requestId: 'start-once' };
  result = await call(base + '/mini-lesson', start); assert.equal(result.status, 200);
  const id = result.value.miniLesson.id;
  assert.equal((await call(base + '/mini-lesson', start)).value.miniLesson.id, id);
  assert.equal((await call(base, undefined, false)).status, 404);
  result = await call(base + '/mini-lesson', { revision: result.value.revision, action: 'continue', requestId: 'try-once' });
  await call(base + '/conversation', { event: { id: 'spoken-mini', speaker: 'learner', recipient: 'professor', inputKind: 'voice', text: 'Adding two first changes the value before doubling.', worldId: 'fixture-world' } });
  const answer = { eventId: 'spoken-mini', revision: result.value.revision };
  result = await call(base + '/spoken-message', answer); assert.equal(result.status, 200);
  assert.equal(result.value.miniLesson.phase, 'reflect');
  assert.equal((await call(base + '/spoken-message', answer)).value.miniLesson.evidence.length, 1);
  result = await call(base);
  assert.equal(result.value.miniLesson.id, id); assert.equal(result.value.miniLesson.phase, 'reflect');
  assert.equal(result.value.attempts.length, 0);
});
