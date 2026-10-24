import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, advanceSession, publicSession } from './teaching.mjs';
import { advancePractice } from './socratic-practice.mjs';
import { mockProvider } from './fixtures.mjs';

export function miniProvider() {
  const base = mockProvider(), generate = base.generate.bind(base);
  base.generate = async (kind, context) => {
    if (!kind.startsWith('mini_')) return generate(kind, context);
    base.calls.push({ kind, context });
    if (base.fail) throw Error('provider failed');
    if (kind === 'mini_plan') return { title: 'Ordered operations', explanation: 'Changing the order of operations can change the result. For example, adding then multiplying differs from multiplying then adding.',
      activity: 'Starting at two, add three then double. What happens, and why?',
      reflection: 'Describe an everyday task where swapping two steps changes the outcome.', followUp: 'Try tracing a different ordered procedure.' };
    return { decision: context.learnerText.includes('unsure') ? 'retry' : 'demonstrated', feedback: 'Consider what each step changes before the next one begins.',
      question: 'What value does the first operation pass to the second?',
      evidenceQuote: context.learnerText.includes('unsure') ? '' : context.learnerText,
      evidenceReason: context.learnerText.includes('unsure') ? '' : 'The answer explains the effect of order on the result.' };
  };
  return base;
}
const begin = p => createSession(p, { goal: 'Understand algorithms', mentor: 'Ada Lovelace' });
const control = (p, s, action, requestId = `${action}-${s.revision}`) => advanceSession(p, s, 'mini-lesson', { action, requestId, revision: s.revision });
const say = (p, s, words) => advanceSession(p, s, 'message', { revision: s.revision, text: words });

test('a guided lesson ends with evidence, recap and next step without passing the formal quiz', async () => {
  const p = miniProvider(); let s = await begin(p);
  const original = structuredClone(s);
  s = await control(p, s, 'start'); assert.equal(s.miniLesson.phase, 'learn');
  assert.deepEqual(original.miniLesson, undefined);
  s = await control(p, s, 'continue');
  s = await say(p, s, 'Adding three gives five, and doubling five gives ten.');
  assert.equal(s.miniLesson.phase, 'reflect');
  s = await say(p, s, 'Put socks on before shoes, because shoes cover the foot.');
  assert.equal(s.miniLesson.status, 'complete'); assert.match(s.miniLesson.recap, /Mini-lesson finished/);
  assert(s.miniLesson.nextStep); assert.equal(s.miniLesson.evidence.length, 2);
  assert.equal(s.status, 'learning'); assert.equal(s.attempts.length, 0);
  const first = s.miniLesson.id;
  s = await control(p, s, 'next');
  assert.notEqual(s.miniLesson.id, first); assert.equal(s.miniLesson.objective.id, 'branch');
  assert.equal(s.miniLessonHistory[0].evidence.length, 2);
});

test('two unsuccessful attempts end in constructive review, and a reviewed retry is a new saved activity', async () => {
  const p = miniProvider(); let s = await control(p, await begin(p), 'start');
  s = await control(p, s, 'continue'); s = await say(p, s, 'I am unsure about the order.');
  assert.equal(s.miniLesson.status, 'active'); assert.equal(s.miniLesson.currentPrompt, 'What value does the first operation pass to the second?');
  s = await say(p, s, 'I am still unsure about the steps.');
  assert.equal(s.miniLesson.status, 'needs_review'); assert.equal(s.miniLesson.phase, 'recap');
  assert.match(s.miniLesson.nextStep, /Review/); assert.equal(s.miniLesson.evidence.length, 0);
  await assert.rejects(control(p, s, 'next'), /Review this idea/);
  const id = s.miniLesson.id;
  s = await control(p, s, 'review'); assert.equal(s.miniLesson.objective.id, 'sequence');
  assert.notEqual(s.miniLesson.id, id); assert.equal(s.miniLessonHistory[0].status, 'needs_review');
});

test('pause preserves the exact question and lets unlimited ordinary conversation continue before resuming', async () => {
  const p = miniProvider(); let s = await control(p, await begin(p), 'start');
  s = await control(p, s, 'continue'); s = await say(p, s, 'I am unsure what to do.');
  const saved = structuredClone(s.miniLesson);
  s = await control(p, s, 'pause'); s = await say(p, s, 'Tell me about another topic.');
  assert.equal(p.calls.at(-1).kind, 'teach'); assert.equal(s.miniLesson.currentPrompt, saved.currentPrompt);
  s = await control(p, s, 'resume'); assert.equal(s.miniLesson.phase, saved.phase);
  assert.deepEqual(s.miniLesson.attempts, saved.attempts);
  s = await control(p, s, 'finish'); assert.equal(s.miniLesson.status, 'needs_review');
  s = await control(p, s, 'explore'); s = await say(p, s, 'Continue freely after the recap.');
  assert.equal(p.calls.at(-1).kind, 'teach'); assert.equal(s.miniLesson.status, 'needs_review');
});

test('duplicate controls do not create duplicate plans, and stale/forged transitions fail', async () => {
  const p = miniProvider(), original = await begin(p);
  const body = { action: 'start', requestId: 'same-request', revision: original.revision };
  const s = await advanceSession(p, original, 'mini-lesson', body);
  assert.equal(await advanceSession(p, s, 'mini-lesson', body), s);
  assert.equal(p.calls.filter(c => c.kind === 'mini_plan').length, 1);
  await assert.rejects(advanceSession(p, s, 'mini-lesson', { ...body, action: 'finish' }), /already belongs/);
  await assert.rejects(advanceSession(p, s, 'mini-lesson', { ...body, requestId: 'stale' }), /session changed/i);
  await assert.rejects(control(p, s, 'next'), /Resume or finish/);
  await assert.rejects(advanceSession(p, s, 'quiz', { revision: s.revision }), /Pause or finish/);
  await assert.rejects(advancePractice(p, s, { action: 'start' }, null), /Pause the mini/);
});

test('invalid evidence and provider failure are transactional and cannot advance or erase progress', async () => {
  const p = miniProvider(); let s = await control(p, await begin(p), 'start'); s = await control(p, s, 'continue');
  const before = JSON.stringify(s), generate = p.generate;
  p.generate = async () => ({ decision: 'demonstrated', feedback: 'Interesting.', question: 'Why?', evidenceQuote: 'invented quote', evidenceReason: 'This would be a reason.' });
  await assert.rejects(say(p, s, 'Adding then doubling changes the result.'), /not grounded/);
  assert.equal(JSON.stringify(s), before);
  p.generate = generate; p.fail = true;
  await assert.rejects(say(p, s, 'Adding then doubling changes the result.'), /provider failed/);
  assert.equal(JSON.stringify(s), before);
});

test('mini progress survives serialization, while formal checks continue beyond ten saved attempts', async () => {
  const p = miniProvider(); let s = await control(p, await begin(p), 'start'); s = await control(p, s, 'continue');
  s = await say(p, s, 'I am unsure about the first operation.');
  const restored = JSON.parse(JSON.stringify(s));
  assert.deepEqual(publicSession(restored).miniLesson, s.miniLesson);
  s = await control(p, restored, 'pause');
  s.attempts = Array.from({ length: 11 }, () => ({ feedback: [], missedObjectiveIds: [] }));
  s = await advanceSession(p, s, 'quiz', { revision: s.revision });
  assert.equal(s.status, 'quiz'); assert.equal(s.attempts.length, 11);
  assert.equal(s.miniLesson.status, 'paused');
});
