import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HISTORICAL_TEACHERS, restoreMentor } from '../src/school/personas.mjs';
import { createSession, advanceSession, publicSession } from './teaching.mjs';
import { teachingPrompt } from './schemas.mjs';
import { createTeacher } from './mentors.mjs';
import { mockProvider, plan } from './fixtures.mjs';
import { createSchoolApi } from './http.mjs';
import { SessionStore } from './store.mjs';

const begin = provider => createSession(provider, { goal: 'Trace algorithms', mentor: 'Ada Lovelace', preferences: { difficulty: 'intermediate', style: 'explanation', timeBudget: '15 minutes, flexible' } });
const action = (provider, session, kind, fields = {}) => advanceSession(provider, session, kind, { revision: session.revision, ...fields });
const identity = { status: 'plausible', name: 'Hypatia of Alexandria', era: 'Late antiquity', reason: 'Plausibly identifies the historical mathematician.', caveats: ['Surviving biographical accounts are limited.'] };
const profile = { title: 'Mathematical teacher', bio: 'A historically inspired interpretation of a late antique teacher.', greeting: 'Welcome to an AI interpretation of Hypatia.', expertise: 'Mathematics and philosophy', passion: 'Clear mathematical reasoning', systemInstruction: 'Teach as a historically inspired Hypatia. Explain geometry through explicit assumptions, diagrams described in words and carefully justified steps. Compare interpretations and admit the limits of surviving sources. Distinguish modern mathematical extensions. Respect learner preferences with explanations and occasional questions. No invented quotations, tools or historical verification.', suggestedPrompts: ['Explain a geometric proof.', 'How do we check our assumptions?'] };
const customProvider = () => ({ calls: [], async generate(kind) { this.calls.push(kind); return structuredClone(kind === 'identity' ? identity : profile); } });

test('all eleven distinct original personas reach actual assembled teaching prompts and retain bounded authority', async () => {
  assert.equal(HISTORICAL_TEACHERS.length, 11);
  assert.equal(new Set(HISTORICAL_TEACHERS.map(item => item.systemInstruction)).size, 11);
  for (const teacher of HISTORICAL_TEACHERS) {
    const provider = mockProvider();
    const generate = provider.generate.bind(provider);
    provider.generate = async (kind, context) => kind === 'match' ? { mentorId: teacher.id, suitable: true, reason: 'Fits this teaching method; modern examples are labeled.', caveats: [], alternatives: [{ mentorId: teacher.id === 'ada_lovelace' ? 'aristotle' : 'ada_lovelace', reason: 'Another method.' }] } : generate(kind, context);
    const session = await createSession(provider, { goal: 'Compare ways of reasoning', mentor: teacher.name });
    const teaching = provider.calls.find(call => call.kind === 'teach').context;
    assert.equal(teaching.mentor.systemInstruction, teacher.systemInstruction);
    const prompt = teachingPrompt('teach', teaching);
    assert(prompt.includes(teacher.systemInstruction));
    assert(prompt.includes('Do not use tools, inspect files, run commands'));
    assert(!/MUST proactively|authentic.*accent|always check their understanding/i.test(teacher.systemInstruction));
    assert.equal(session.mentor.id, teacher.id);
  }
});

test('rich architecture and separate matcher receive preferences, then full quest and transcript reach teaching', async () => {
  const provider = mockProvider();
  let session = await begin(provider);
  assert.deepEqual(provider.calls.map(call => call.kind), ['plan', 'match', 'teach']);
  assert.equal(provider.calls[0].context.preferences.style, 'explanation');
  assert.equal(provider.calls[1].context.quest.description, plan.description);
  assert.equal(provider.calls[1].context.explicitChoice, true);
  session = await action(provider, session, 'message', { text: 'A sequence runs in order; changing order may change the result.' });
  const context = provider.calls.at(-1).context;
  assert.equal(context.messages[1].text, session.messages[1].text);
  assert.equal(context.description, plan.description);
  assert.match(context.completionGuidance, /Only server scoring/);
  assert.equal(session.mentorReview.alternatives[0].name, 'Aristotle');
  assert.match(context.mentor.systemInstruction, /poetical science/);
});

test('a mismatched or unsuitable mentor cannot silently replace the explicit choice', async () => {
  for (const suitable of [false, true]) {
    const provider = mockProvider();
    const original = provider.generate.bind(provider);
    provider.generate = (kind, context) => kind === 'match' ? { mentorId: suitable ? 'aristotle' : 'ada_lovelace', suitable, reason: 'Fit needs reconsideration.', caveats: [], alternatives: [{ mentorId: 'newton', reason: 'Try this method.' }] } : original(kind, context);
    await assert.rejects(begin(provider), /explicit choice|reconsideration/);
    assert(!provider.calls.some(call => call.kind === 'teach'));
  }
});

test('bounded presentation prompts are pending then honestly unavailable, never executed or confirmed', async () => {
  const provider = mockProvider();
  let session = await begin(provider);
  provider.generate = async () => ({ text: 'I have requested an illustrative artifact; it has not been created.', suggestions: [], presentationRequests: [{ kind: 'artifact', title: 'Analytical Engine sequence cards', description: 'Cards illustrating three ordered operations.', objectiveId: 'sequence' }] });
  session = await action(provider, session, 'message', { text: 'Please request an illustration.' });
  assert.equal(session.presentations[0].status, 'pending');
  assert.match(session.presentations[0].prompt, /Museum-style academic object study/);
  assert.match(session.presentations[0].prompt, /not verified historical evidence/);
  session = await action(provider, session, 'presentation', { requestId: session.presentations[0].id });
  assert.equal(session.presentations[0].status, 'unavailable');
  assert(!('runtimeId' in session.presentations[0]));
  for (const malformed of [{ ...session.presentations[0], status: 'confirmed', runtimeId: 'fake' }, { kind: 'lab', title: 'Lab', description: 'A proposed lab.', objectiveId: 'invented' }]) {
    provider.generate = async () => ({ text: 'Request only.', suggestions: [], presentationRequests: [malformed] });
    await assert.rejects(action(provider, session, 'message', { text: 'Another request.' }), /invalid presentation/);
  }
  const original = session.presentations[0];
  assert.equal(original.status, 'unavailable');
});

test('independent conversation assessment validates real learner quotes, stays uncertain without evidence and never changes quiz completion', async () => {
  const provider = mockProvider();
  let session = await begin(provider);
  const calls = provider.calls.length;
  session = await action(provider, session, 'assess');
  assert.equal(provider.calls.length, calls);
  assert.equal(session.assessments[0].overall, 'uncertain');
  session = await action(provider, session, 'message', { text: 'Starting at 1, add 2 then multiply by 3 gives 9.' });
  const assessment = { summary: 'One explained example; other objectives remain uncertain.', objectives: session.objectives.map((objective, index) => ({ objectiveId: objective.id, status: index === 0 ? 'demonstrated' : 'insufficient_evidence', evidence: index === 0 ? [{ messageIndex: 1, quote: session.messages[1].text, explanation: 'Traces the sequence in order.' }] : [], gaps: index === 0 ? [] : ['No independent explanation.'], nextSteps: ['Try a new example.'] })), limitations: ['A model interpretation of a short conversation.'] };
  let captured;
  provider.generate = async (kind, context) => { captured = context; assert.equal(kind, 'assess'); return structuredClone(assessment); };
  session = await action(provider, session, 'assess');
  assert(!('messages' in captured));
  assert(!('mentor' in captured));
  assert(!('attempts' in captured));
  assert.equal(captured.learnerContributions.length, 1);
  assert.equal(session.status, 'learning');
  assert.equal(session.attempts.length, 0);
  assert.equal(session.assessments.at(-1).overall, 'uncertain');
  const before = JSON.stringify(session);
  for (const evidence of [{ messageIndex: 0, quote: session.messages[0].text, explanation: 'Tutor text is not learner evidence.' }, { messageIndex: 1, quote: 'Fabricated learner explanation', explanation: 'Not a real quote.' }]) {
    assessment.objectives[0].evidence = [evidence];
    await assert.rejects(action(provider, session, 'assess'), /not grounded/);
  }
  assert.equal(JSON.stringify(session), before);
});

test('custom teachers use distinct identity and full persona generation; ambiguity and invalid profiles fail without saving', async () => {
  const provider = customProvider();
  const teacher = await createTeacher(provider, { name: 'Hypatia of Alexandria' });
  assert.deepEqual(provider.calls, ['identity', 'teacher']);
  assert.match(teacher.id, /^custom_/);
  assert.equal(teacher.systemInstruction, profile.systemInstruction);
  assert.match(teacher.identity.caveats.at(-1), /no independent/);
  for (const status of ['uncertain', 'not_historical']) {
    const calls = [];
    await assert.rejects(createTeacher({ async generate(kind) { calls.push(kind); return { ...identity, status }; } }, { name: 'Ambiguous person' }), /no teacher was saved/);
    assert.deepEqual(calls, ['identity']);
  }
  await assert.rejects(createTeacher({ async generate(kind) { return kind === 'identity' ? identity : { ...profile, systemInstruction: 'Be generic.' }; } }, { name: 'Hypatia' }), /incomplete teacher/);
});

test('legacy Ada sessions hydrate persona on read without rewriting archive, messages, quiz or revision', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sota-legacy-'));
  try {
    const session = await begin(mockProvider());
    const legacy = structuredClone(session);
    legacy.mentor = plan.mentor;
    for (const key of ['description', 'durationEstimate', 'preferences', 'mentorReview', 'presentations', 'assessments']) delete legacy[key];
    const owner = 'd'.repeat(64);
    const file = join(directory, `${owner}.json`);
    const before = JSON.stringify({ version: 1, sessions: [legacy] });
    await writeFile(file, before);
    const restored = await new SessionStore(directory).transaction(owner, data => ({ value: publicSession(data.sessions[0]) }), { readOnly: true });
    assert.match(restored.mentor.systemInstruction, /poetical science/);
    assert.equal(restored.revision, legacy.revision);
    assert.deepEqual(restored.messages, legacy.messages);
    assert.equal(restored.quiz, legacy.quiz);
    assert.equal(await readFile(file, 'utf8'), before);
    assert.equal(restoreMentor({ name: 'Unknown older mentor' }).name, 'Unknown older mentor');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('HTTP custom teacher library persists, reuses profiles in actual quests and isolates archives', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'sota-custom-http-'));
  const provider = mockProvider();
  const original = provider.generate.bind(provider);
  provider.generate = (kind, context) => kind === 'identity' ? structuredClone(identity) : kind === 'teacher' ? structuredClone(profile) : kind === 'match' && context.preferredMentor === identity.name ? { mentorId: context.availableTeachers.find(item => item.name === identity.name).id, suitable: true, reason: 'Mathematical reasoning with modern extensions labeled.', caveats: ['Interpretation only.'], alternatives: [{ mentorId: 'ada_lovelace', reason: 'Symbolic computation.' }] } : original(kind, context);
  let api = createSchoolApi({ store: new SessionStore(directory), provider });
  const server = createServer((req, res) => void api(req, res));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}/api/school/`;
  const cookie = 'sota-local-learner=' + 'e'.repeat(64);
  const call = async (path, body, owner = cookie) => {
    const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { cookie: owner, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    assert(response.ok, await response.clone().text()); return response.json();
  };
  const teacher = await call('teachers', { name: identity.name });
  api = createSchoolApi({ store: new SessionStore(directory), provider });
  assert.equal((await call('teachers')).length, 12);
  assert.equal((await call('teachers', undefined, 'sota-local-learner=' + 'f'.repeat(64))).length, 11);
  assert.equal((await call('teachers', { name: identity.name })).id, teacher.id);
  const session = await call('sessions', { goal: 'Trace algorithms', mentor: identity.name });
  assert.equal(session.mentor.id, teacher.id);
  assert.equal(provider.calls.findLast(call => call.kind === 'teach').context.mentor.systemInstruction, profile.systemInstruction);
  assert.equal((await readdir(directory)).length, 1);
});
