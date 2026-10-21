import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTeacher, reviewMentor } from './mentors.mjs';
import { instructions, teachingPrompt } from './schemas.mjs';
import { plan } from './fixtures.mjs';

const profile = {
  title: 'Historically inspired mentor', bio: 'An AI interpretation based on the figure’s relevant work, not a claim of teaching employment.',
  greeting: 'Welcome to this AI interpretation.', expertise: 'Expertise described by the historical identity review.', passion: 'Exploring ideas carefully',
  systemInstruction: 'Explain concepts through worked examples inspired by the person’s documented work. This teaching method is an imaginative adaptation, not a claim about historical classroom practice. Acknowledge uncertain biographical details and label modern extensions. Offer occasional questions rather than demanding one every response. Do not invent quotations, academic appointments or expertise.',
  suggestedPrompts: ['Explain an example from your field.', 'What assumptions should I check?'],
};
const identity = (name, expertise) => ({ status: 'plausible', name, era: 'Historical period',
  reason: `Identifiable historical ${expertise}; no formal teaching job is established or needed.`,
  caveats: ['AI interpretation; no independent historical verification.'] });

test('identity review explicitly checks a real person, not teaching employment or quest fit', () => {
  const prompt = teachingPrompt('identity', { requestedName: 'Nikola Tesla' });
  assert.match(prompt, /real historical person/);
  assert.match(prompt, /Formal teaching employment.*NOT required/);
  assert.match(prompt, /Nikola Tesla and Leonardo da Vinci must not be rejected/);
  assert.match(prompt, /Do not evaluate topic fit in this step/);
  assert.doesNotMatch(prompt, /real historical teacher/);
  assert.match(instructions.teacher, /Do not invent teaching employment/);
  assert.match(instructions.teacher, /Topic suitability is reviewed separately/);
});

test('inventors, scientists and artists can become reusable mentors without teaching credentials', async () => {
  for (const [name, expertise] of [['Nikola Tesla', 'inventor and electrical engineer'], ['Charles Darwin', 'scientist'], ['Claude Monet', 'artist']]) {
    const calls = [];
    const provider = { async generate(kind, context) {
      calls.push({ kind, context });
      return kind === 'identity' ? identity(name, expertise) : { ...profile, expertise };
    } };
    const teacher = await createTeacher(provider, { name });
    assert.equal(teacher.name, name);
    assert.equal(teacher.identity.status, 'plausible');
    assert.match(teacher.identity.reason, /no formal teaching job/);
    assert.deepEqual(calls.map(call => call.kind), ['identity', 'teacher']);
    assert.deepEqual(calls[0].context, { requestedName: name });
    assert.equal(calls[1].context.identity.name, name);
    assert(!('occupation' in teacher.identity));
  }
  const leonardo = await createTeacher({ generate() { throw new Error('Curated figure should not need a new occupational review.'); } }, { name: 'Leonardo da Vinci' });
  assert.equal(leonardo.id, 'davinci');
});

test('genuinely ambiguous or fictional identities still stop before persona generation', async () => {
  for (const [status, name, reason] of [['uncertain', 'Alexander', 'Several historical people share this name.'], ['not_historical', 'Sherlock Holmes', 'A fictional character, not an identifiable historical person.']]) {
    const calls = [];
    await assert.rejects(createTeacher({ async generate(kind) {
      calls.push(kind); return { ...identity(name, 'figure'), status, reason };
    } }, { name }), error => error.status === 422 && error.message.includes(reason));
    assert.deepEqual(calls, ['identity']);
  }
});

test('accepting a historical identity does not bypass independent topic-fit review', async () => {
  const teacher = await createTeacher({ async generate(kind) { return kind === 'identity' ? identity('Nikola Tesla', 'electrical engineer') : { ...profile, expertise: 'Electrical engineering' }; } }, { name: 'Nikola Tesla' });
  let reviewed;
  const matcher = { async generate(kind, context) {
    assert.equal(kind, 'match'); reviewed = context;
    return { mentorId: teacher.id, suitable: false, reason: 'Historical identity is plausible, but electrical engineering is a poor fit for this poetry quest.', caveats: ['Relevant expertise is limited.'], alternatives: [{ mentorId: 'plato', reason: 'A closer fit for literary and philosophical analysis.' }] };
  } };
  await assert.rejects(reviewMentor(matcher, plan, { goal: 'Analyze ancient poetry', mentor: teacher.name, preferences: {} }, [teacher]), /poor fit for this poetry quest/);
  assert.equal(reviewed.preferredMentor, 'Nikola Tesla');
  assert.equal(reviewed.explicitChoice, true);
});
