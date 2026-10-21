import { randomInt, randomUUID } from 'node:crypto';
import { restoreMentor } from '../src/school/personas.mjs';
import { reviewMentor, teacherRoster } from './mentors.mjs';
import { presentationRecords, checkPresentation } from './presentation.mjs';
import { assessConversation } from './assessment.mjs';

export class SchoolError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function requireValue(condition, status, message) {
  if (!condition) throw new SchoolError(status, message);
}
export const text = (value, max = 4000) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
export const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
export const strings = (values, min, max, length) => Array.isArray(values) && values.length >= min && values.length <= max && values.every(value => text(value, length));

export function validatePlan(plan) {
  requireValue(exact(plan, ['title', 'description', 'durationEstimate', 'mentor', 'alternatives', 'objectives']) && text(plan.title, 120)
    && text(plan.description, 2400) && text(plan.durationEstimate, 300)
    && Array.isArray(plan.alternatives) && plan.alternatives.length >= 1 && plan.alternatives.length <= 3
    && plan.alternatives.every(item => exact(item, ['name', 'reason']) && text(item.name, 160) && text(item.reason, 600))
    && exact(plan.mentor, ['name', 'era', 'expertise', 'rationale'])
    && Object.values(plan.mentor).every(value => text(value, 600))
    && Array.isArray(plan.objectives) && plan.objectives.length === 3
    && plan.objectives.every(objective => exact(objective, ['id', 'label']) && text(objective.id, 40) && /^[a-z][a-z0-9_]{0,39}$/.test(objective.id) && text(objective.label, 300))
    && new Set(plan.objectives.map(objective => objective.id)).size === 3,
  502, 'The provider returned an invalid quest. Nothing was saved; try again.');
  return structuredClone(plan);
}

export function validateTurn(turn) {
  const keys = Object.hasOwn(turn || {}, 'presentationRequests') ? ['text', 'suggestions', 'presentationRequests'] : ['text', 'suggestions'];
  requireValue(exact(turn, keys) && text(turn.text, 8000) && strings(turn.suggestions, 0, 3, 300)
    && (!Object.hasOwn(turn, 'presentationRequests') || (Array.isArray(turn.presentationRequests) && turn.presentationRequests.length <= 2)),
    502, 'The provider returned an invalid teaching turn. Your session is unchanged.');
  return structuredClone(turn);
}

export function validateQuiz(quiz, objectives, previousQuestions = []) {
  const ids = new Set(objectives.map(objective => objective.id));
  requireValue(exact(quiz, ['questions']) && Array.isArray(quiz.questions) && quiz.questions.length >= 3 && quiz.questions.length <= 5
    && quiz.questions.every(question => exact(question, ['objectiveId', 'prompt', 'options', 'answer', 'explanation'])
      && ids.has(question.objectiveId) && text(question.prompt, 1000) && strings(question.options, 3, 4, 500)
      && new Set(question.options.map(option => option.trim().toLowerCase())).size === question.options.length
      && Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.options.length && text(question.explanation, 1500))
    && objectives.every(objective => quiz.questions.some(question => question.objectiveId === objective.id))
    && new Set(quiz.questions.map(question => question.prompt.trim().toLowerCase())).size === quiz.questions.length
    && quiz.questions.every(question => !previousQuestions.some(previous => previous.trim().toLowerCase() === question.prompt.trim().toLowerCase())),
  502, 'The provider returned an invalid or incomplete quiz. No practice fallback awards completion.');
  return quiz.questions.map(question => {
    // The server shuffles choices instead of inheriting a model's answer-position bias.
    const choices = question.options.map((option, index) => ({ option, correct: index === question.answer }));
    for (let index = choices.length - 1; index > 0; index--) {
      const other = randomInt(index + 1);
      [choices[index], choices[other]] = [choices[other], choices[index]];
    }
    return { ...question, id: randomUUID(), options: choices.map(choice => choice.option), answer: choices.findIndex(choice => choice.correct) };
  });
}

export function publicSession(session) {
  const copy = structuredClone(session);
  copy.mentor = restoreMentor(copy.mentor);
  if (copy.quiz) copy.quiz.questions = copy.quiz.questions.map(({ answer, explanation, ...question }) => question);
  return copy;
}

const context = session => ({
  goal: session.goal, title: session.title, description: session.description || '', durationEstimate: session.durationEstimate || '',
  preferences: session.preferences || defaultPreferences, mentor: restoreMentor(session.mentor), objectives: session.objectives,
  messages: session.messages, missedObjectiveIds: session.attempts.at(-1)?.missedObjectiveIds ?? [],
  assessmentFeedback: session.attempts.at(-1)?.feedback ?? [],
  completionGuidance: 'Teach objectives and offer a check when appropriate. Only server scoring can mark this short check complete. Conversation review is independent and cannot establish lasting mastery. Never announce completion before a submitted check.',
});
export const defaultPreferences = { difficulty: 'beginner', style: 'balanced', timeBudget: '' };
function preferences(value = defaultPreferences) {
  requireValue(exact(value, ['difficulty', 'style', 'timeBudget']) && ['beginner', 'intermediate', 'advanced'].includes(value.difficulty)
    && ['balanced', 'explanation', 'dialogue'].includes(value.style) && typeof value.timeBudget === 'string' && value.timeBudget.length <= 120,
  400, 'Choose a valid difficulty, learning style and optional time budget.');
  return structuredClone(value);
}
function applyTurn(session, turn) {
  const records = presentationRecords(turn.presentationRequests || [], session);
  requireValue((session.presentations?.length || 0) + records.length <= 40, 422, 'This quest has reached its presentation request limit. No media was created.');
  session.messages.push({ role: 'assistant', text: turn.text });
  session.suggestions = turn.suggestions;
  session.presentations = [...(session.presentations || []), ...records];
}

export async function createSession(provider, input, customTeachers = []) {
  const keys = Object.hasOwn(input || {}, 'preferences') ? ['goal', 'mentor', 'preferences'] : ['goal', 'mentor'];
  requireValue(exact(input, keys) && text(input.goal, 2000) && typeof input.mentor === 'string' && input.mentor.length <= 160,
    400, 'Enter a learning goal (up to 2,000 characters) and an optional historical mentor.');
  const selectedPreferences = preferences(input.preferences);
  const plan = validatePlan(await provider.generate('plan', { goal: input.goal.trim(), preferredMentor: input.mentor.trim(), preferences: selectedPreferences,
    availableTeachers: teacherRoster(customTeachers).map(({ id, name, era, expertise }) => ({ id, name, era, expertise })) }));
  const matched = await reviewMentor(provider, plan, { ...input, preferences: selectedPreferences }, customTeachers);
  const now = new Date().toISOString();
  const session = {
    id: randomUUID(), revision: 1, createdAt: now, updatedAt: now, goal: input.goal.trim(), ...plan, ...matched, preferences: selectedPreferences,
    messages: [], suggestions: [], status: 'learning', reviewCompleted: false, quiz: null, attempts: [],
    assessments: [], presentations: [],
  };
  const opening = validateTurn(await provider.generate('teach', { ...context(session), task: 'Introduce the quest with a useful explanation and concrete example suited to learner preferences. A brief diagnostic question is optional. No mastery has yet been demonstrated.' }));
  applyTurn(session, opening);
  return session;
}

export async function advanceSession(provider, existing, action, input) {
  requireValue(input && Number.isInteger(input.revision) && input.revision === existing.revision, 409, 'This session changed. Reopen it before trying again.');
  const session = structuredClone(existing);
  session.mentor = restoreMentor(session.mentor);
  if (action === 'message') {
    requireValue(exact(input, ['revision', 'text']) && text(input.text, 4000), 400, 'Enter a message up to 4,000 characters.');
    requireValue(session.status !== 'quiz', 409, 'Submit the current quiz before continuing the conversation.');
    requireValue(session.messages.length < 81, 422, 'This quest has reached its conversation limit. Start a new quest; the full session remains saved.');
    session.messages.push({ role: 'user', text: input.text.trim() });
    const turn = validateTurn(await provider.generate('teach', { ...context(session), task: session.status === 'needs_review'
      ? 'Respond to the learner and reteach the missed objectives using the assessment feedback. Give a different example and a transfer question. Do not award completion.'
      : 'Respond conversationally with explanation and concrete examples suited to preferences. Questions are optional; do not award completion.' }));
    applyTurn(session, turn);
    if (session.status === 'needs_review') session.reviewCompleted = true;
  } else if (action === 'assess') {
    requireValue(exact(input, ['revision']), 400, 'Invalid conversation assessment request.');
    requireValue((session.assessments?.length || 0) < 10, 422, 'This quest has reached its conversation review limit.');
    session.assessments = [...(session.assessments || []), await assessConversation(provider, session)];
  } else if (action === 'presentation') {
    requireValue(exact(input, ['revision', 'requestId']) && text(input.requestId, 80), 400, 'Invalid presentation availability request.');
    checkPresentation(session, input.requestId);
  } else if (action === 'quiz') {
    requireValue(exact(input, ['revision']), 400, 'Invalid quiz request.');
    requireValue(session.status === 'learning' || (session.status === 'needs_review' && session.reviewCompleted), 409, 'Review the missed concepts with your mentor before requesting another quiz.');
    requireValue(session.messages.some(message => message.role === 'user'), 409, 'Discuss your goal with your mentor before taking the quiz.');
    requireValue(session.attempts.length < 10, 422, 'This quest has reached its assessment limit. Start a new quest to continue.');
    const previousQuestions = session.attempts.flatMap(attempt => attempt.feedback.map(item => item.prompt));
    const questions = validateQuiz(await provider.generate('quiz', { ...context(session), previousQuestions }), session.objectives, previousQuestions);
    session.quiz = { id: randomUUID(), questions };
    session.status = 'quiz';
    session.suggestions = [];
  } else if (action === 'answers') {
    requireValue(exact(input, ['revision', 'quizId', 'answers']) && session.status === 'quiz' && session.quiz?.id === input.quizId,
      409, 'This quiz is no longer active. Reopen the session.');
    const questions = session.quiz.questions;
    requireValue(input.answers && typeof input.answers === 'object' && !Array.isArray(input.answers)
      && Object.keys(input.answers).length === questions.length && questions.every(question => Number.isInteger(input.answers[question.id])
        && input.answers[question.id] >= 0 && input.answers[question.id] < question.options.length), 400, 'Answer every question before submitting.');
    const feedback = questions.map(question => ({ objectiveId: question.objectiveId, prompt: question.prompt,
      correct: input.answers[question.id] === question.answer, explanation: question.explanation }));
    const missedObjectiveIds = [...new Set(feedback.filter(item => !item.correct).map(item => item.objectiveId))];
    const passed = missedObjectiveIds.length === 0;
    session.attempts.push({ id: session.quiz.id, correct: feedback.filter(item => item.correct).length, total: questions.length, passed, missedObjectiveIds, feedback });
    session.status = passed ? 'complete' : 'needs_review';
    session.reviewCompleted = false;
    session.quiz = null;
  } else throw new SchoolError(404, 'Unknown session action.');
  session.revision++;
  session.updatedAt = new Date().toISOString();
  return session;
}
