import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, advanceSession, publicSession, validatePlan, validateQuiz } from './teaching.mjs';
import { mockProvider, quiz, plan } from './fixtures.mjs';
import {teachingPrompt} from './schemas.mjs';

const begin = provider => createSession(provider, { goal: 'Help me understand algorithms.', mentor: '' });
const message = (provider, session, text = 'I think the answer is 9. Why?') => advanceSession(provider, session, 'message', { revision: session.revision, text });
const check = (provider, session) => advanceSession(provider, session, 'quiz', { revision: session.revision });

test('long lessons continue beyond the old turn cap with bounded model input and the full history preserved',async()=>{
  const provider=mockProvider();let session=await begin(provider);
  const history=Array.from({length:300},(_,i)=>({role:i%2?'assistant':'user',text:`Saved turn ${i}: `+'🙂'.repeat(1700)}));
  session.messages=structuredClone(history);
  session.conversation.events=history.map((m,i)=>({id:`old-${i}`,speaker:m.role==='user'?'learner':'professor',recipient:m.role==='user'?'professor':'learner',text:m.text,inputKind:'text',delivery:'text',worldId:''}));
  session=await message(provider,session,'Continue this same lesson with a new example.');
  const input=provider.calls.at(-1).context;
  assert.equal(session.messages.length,302);assert.deepEqual(session.messages.slice(0,300),history);
  assert.equal(input.messages.at(-1).text,'Continue this same lesson with a new example.');
  assert.equal(input.historyWindow.totalMessages,301);
  assert(Buffer.byteLength(teachingPrompt('teach',input))<160000);
  assert.deepEqual(publicSession(session).messages.slice(0,300),history);
});
const answers = (provider, session, miss = false) => advanceSession(provider, session, 'answers', {
  revision: session.revision, quizId: session.quiz.id,
  answers: Object.fromEntries(session.quiz.questions.map((question, index) => [question.id, miss && index === 1 ? (question.answer + 1) % question.options.length : question.answer])),
});

test('complete teaching → failed check → targeted review → new check → completion, with full context replay', async () => {
  const provider = mockProvider();
  let session = await begin(provider);
  assert.equal(session.status, 'learning');
  await assert.rejects(check(provider, session), /Discuss your goal/);
  session = await message(provider, session);
  session = await check(provider, session);
  const firstQuizId = session.quiz.id;
  const publicQuiz = publicSession(session).quiz;
  assert(publicQuiz.questions.every(question => !('answer' in question) && !('explanation' in question)));
  // Shuffling preserves the correct answer and explanation associations.
  session.quiz.questions.forEach((question, index) => assert.equal(question.options[question.answer], quiz.questions[index].options[quiz.questions[index].answer]));
  const attemptedQuiz = structuredClone(session);
  session = await answers(provider, session, true);
  assert.equal(session.status, 'needs_review');
  assert.deepEqual(session.attempts[0].missedObjectiveIds, ['branch']);
  await assert.rejects(check(provider, session), /Review the missed concepts/);
  await assert.rejects(advanceSession(provider, session, 'answers', { revision: session.revision, quizId: firstQuizId, answers: {} }), /no longer active/);
  await assert.rejects(advanceSession(provider, session, 'answers', { revision: attemptedQuiz.revision, quizId: firstQuizId, answers: {} }), /session changed/);
  session = await message(provider, session, 'Please help with the branch I missed.');
  const review = provider.calls.at(-1).context;
  assert.deepEqual(review.missedObjectiveIds, ['branch']);
  assert.equal(review.messages.length, 4);
  assert(review.assessmentFeedback.some(item => item.objectiveId === 'branch' && !item.correct));
  session = await check(provider, session);
  assert.notEqual(session.quiz.id, firstQuizId);
  assert.equal(provider.calls.at(-1).context.previousQuestions.length, 3);
  session = await answers(provider, session);
  assert.equal(session.status, 'complete');
  assert.equal(session.attempts.length, 2);
  assert(session.attempts[1].passed);
  session = await message(provider, session, 'How could I apply this next?');
  assert.equal(session.status, 'complete');
  assert.equal(provider.calls.at(-1).context.messages.at(-1).text, 'How could I apply this next?');
});

test('invalid output and provider failure leave the existing session unchanged', async () => {
  const provider = mockProvider();
  const session = await message(provider, await begin(provider));
  const before = JSON.stringify(session);
  provider.fail = true;
  await assert.rejects(message(provider, session), /upstream/);
  assert.equal(JSON.stringify(session), before);
  provider.fail = false;
  provider.generate = async () => ({ questions: quiz.questions.slice(0, 2) });
  await assert.rejects(check(provider, session), /incomplete quiz/);
  assert.equal(JSON.stringify(session), before);
  assert.equal(session.attempts.length, 0);
});

test('rejects forged revision, empty messages, invalid quiz answers and out-of-order actions', async () => {
  const provider = mockProvider();
  let session = await message(provider, await begin(provider));
  await assert.rejects(advanceSession(provider, session, 'message', { revision: 0, text: 'hello' }), /session changed/);
  await assert.rejects(message(provider, session, ' '), /Enter a message/);
  session = await check(provider, session);
  await assert.rejects(message(provider, session), /Submit the current quiz/);
  for (const answer of [-1, 999, '0', 1.5]) {
    await assert.rejects(advanceSession(provider, session, 'answers', { revision: session.revision, quizId: session.quiz.id,
      answers: Object.fromEntries(session.quiz.questions.map(question => [question.id, answer])) }), /Answer every question/);
  }
  assert.equal(session.status, 'quiz');
});

test('quiz and quest validation reject incomplete coverage, duplicate choices and invalid identifiers', () => {
  const broken = structuredClone(quiz);
  broken.questions[2].objectiveId = 'branch';
  assert.throws(() => validateQuiz(broken, plan.objectives), /incomplete quiz/);
  assert.throws(() => validateQuiz(quiz, plan.objectives, [quiz.questions[0].prompt]), /incomplete quiz/);
  broken.questions[2] = { ...quiz.questions[2], options: ['same', ' Same ', 'other'] };
  assert.throws(() => validateQuiz(broken, plan.objectives), /incomplete quiz/);
  const invalid = structuredClone(plan);
  delete invalid.objectives[0].id;
  assert.throws(() => validatePlan(invalid), /invalid quest/);
});
