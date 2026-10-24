import { randomUUID } from 'node:crypto';
import { exact, text, requireValue, applyTurn } from './teaching.mjs';

export const miniActive = session => session.miniLesson?.mode === 'guided' && session.miniLesson.status === 'active';
const finished = mini => ['complete', 'needs_review'].includes(mini?.status);
const publicMini = mini => mini ? structuredClone(mini) : null;
export function miniContext(session) {
  const mini = publicMini(session.miniLesson);
  return mini && { ...mini, guidance: miniActive(session)
    ? 'This is a finite guided mini-lesson, not an open-ended quiz. Follow its saved phase.'
    : 'The guided activity is paused or finished. Answer the learner freely; do not restart or advance it without an explicit control.' };
}
const message = (session, words, requestId) => {
  applyTurn(session, { text: words, suggestions: [] }, `mini:${requestId}`);
  session.miniLesson.replyId = `reply:mini:${requestId}`;
};
const prompt = mini => mini.phase === 'learn' ? `${mini.explanation}\n\nChoose “Try the activity” when ready.`
  : mini.currentPrompt || (mini.phase === 'try' ? mini.activity : mini.reflection);
function conclude(mini, status) {
  mini.status = status; mini.phase = 'recap';
  mini.recap = status === 'complete'
    ? `Mini-lesson finished: ${mini.title}. ${mini.feedback} Your explanation and reflection are saved.`
    : `Mini-lesson ready for review: ${mini.title}. ${mini.feedback || 'Return to the example and try a smaller step.'} Your attempts are saved; you can return to this idea when ready.`;
  mini.nextStep = status === 'complete' ? mini.followUp : `Review: ${mini.objective.label}. Use “Review this idea” for another short attempt, or keep exploring freely.`;
}
async function plan(provider, session, objective) {
  const result = await provider.generate('mini_plan', {
    goal: session.goal, mentor: session.mentor, objective, preferences: session.preferences,
    previousAttempt: session.miniLesson ? { feedback: session.miniLesson.feedback, evidence: session.miniLesson.evidence } : null,
  });
  requireValue(exact(result, ['title', 'explanation', 'activity', 'reflection', 'followUp'])
    && text(result.title, 120) && text(result.explanation, 850) && text(result.activity, 350)
    && text(result.reflection, 350) && text(result.followUp, 350), 502,
  'The professor could not prepare a short mini-lesson. Your saved lesson is unchanged.');
  return { version: 1, id: randomUUID(), mode: 'guided', status: 'active', phase: 'learn',
    objective: structuredClone(objective), ...result, attempts: { try: 0, reflect: 0 },
    evidence: [], feedback: '', recap: '', nextStep: '', replyId: null };
}

// All controls share the existing revisioned session transaction and journal.
// Only the most recent exact request is replayable; other stale requests fail.
export async function advanceMiniLesson(provider, existing, input) {
  requireValue(input && Object.keys(input).sort().join() === 'action,requestId,revision'
    && ['start', 'continue', 'pause', 'resume', 'finish', 'explore', 'next', 'review'].includes(input.action)
    && typeof input.requestId === 'string' && /^[a-zA-Z0-9:._-]{1,160}$/.test(input.requestId), 400, 'Invalid mini-lesson control.');
  const fingerprint = JSON.stringify([input.action, input.revision]);
  if (existing.miniLesson?.lastRequest?.id === input.requestId) {
    requireValue(existing.miniLesson.lastRequest.fingerprint === fingerprint, 409, 'This request already belongs to another mini-lesson action.');
    return existing;
  }
  requireValue(input.revision === existing.revision, 409, 'This session changed. Refresh before continuing.');
  const session = structuredClone(existing); let mini = session.miniLesson;
  const action = input.action;
  if (['start', 'next', 'review'].includes(action)) {
    requireValue(!session.quiz && session.practice?.status !== 'active', 409, 'Finish or pause the current quiz/practice before starting a mini-lesson.');
    requireValue(!miniActive(session) && mini?.status !== 'paused', 409, 'Resume or finish your saved mini-lesson first.');
    requireValue(action === 'start' ? !mini : finished(mini), 409, 'This mini-lesson is not ready for that action.');
    if (action === 'next') requireValue(mini.status === 'complete', 409, 'Review this idea before starting the next mini-lesson.');
    const covered = new Set([...(session.miniLessonHistory || []), mini].filter(m => m?.status === 'complete').map(m => m.objective.id));
    const objective = action === 'review' ? mini.objective : session.objectives.find(o => !covered.has(o.id));
    requireValue(objective, 409, 'These mini-lessons are finished. Explore freely or choose a new learning goal.');
    const next = await plan(provider, session, objective);
    if (mini) session.miniLessonHistory = [...(session.miniLessonHistory || []), mini];
    mini = session.miniLesson = next;
    message(session, prompt(mini), input.requestId);
  } else {
    requireValue(mini, 409, 'Start a mini-lesson first.');
    if (action === 'continue') {
      requireValue(miniActive(session) && mini.phase === 'learn', 409, 'This step is no longer waiting to begin.');
      mini.phase = 'try'; mini.currentPrompt = mini.activity; message(session, prompt(mini), input.requestId);
    } else if (action === 'pause' || action === 'explore') {
      if (mini.status === 'active') mini.status = 'paused';
      mini.mode = 'free'; message(session, 'Free conversation is available. Your mini-lesson and answers are saved.', input.requestId);
    } else if (action === 'resume') {
      requireValue(mini.status === 'paused' && !session.quiz && session.practice?.status !== 'active', 409, 'Pause other activities before resuming this mini-lesson.');
      mini.mode = 'guided'; mini.status = 'active'; message(session, prompt(mini), input.requestId);
    } else if (action === 'finish') {
      requireValue(['active', 'paused'].includes(mini.status), 409, 'This mini-lesson already ended.');
      conclude(mini, 'needs_review'); message(session, `${mini.recap}\n\n${mini.nextStep}`, input.requestId);
    }
  }
  mini.lastRequest = { id: input.requestId, fingerprint };
  session.revision++; session.updatedAt = new Date().toISOString(); return session;
}

// The existing text/voice message route calls this only after an explicit start.
export async function respondMiniLesson(provider, session, learnerText, eventId, scene) {
  const mini = session.miniLesson;
  const result = await provider.generate('mini_review', {
    mentor: session.mentor, objective: mini.objective, explanation: mini.explanation,
    phase: mini.phase, question: prompt(mini), learnerText,
    attempts: mini.attempts[mini.phase] || 0,
    // Selected exhibit metadata is context, never a claim of physical observation.
    embodiedScene: scene, previousFeedback: mini.feedback,
  });
  requireValue(exact(result, ['decision', 'feedback', 'question', 'evidenceQuote', 'evidenceReason'])
    && ['demonstrated', 'retry'].includes(result.decision) && text(result.feedback, 600)
    && text(result.question, 350) && typeof result.evidenceQuote === 'string' && result.evidenceQuote.length <= 1000
    && typeof result.evidenceReason === 'string' && result.evidenceReason.length <= 700, 502,
  'The professor could not review this activity. Your saved progress is unchanged.');
  if (result.decision === 'demonstrated') requireValue(learnerText.trim().split(/\s+/).length >= 4
    && result.evidenceQuote.trim().length >= 8 && learnerText.includes(result.evidenceQuote)
    && result.evidenceReason.trim().length >= 12, 502, 'The review was not grounded in your answer. Your progress is unchanged.');
  mini.feedback = result.feedback;
  if (mini.phase === 'learn') return { text: `${result.feedback}\n\nChoose “Try the activity” when ready.`, suggestions: [] };
  mini.attempts[mini.phase]++;
  if (result.decision === 'demonstrated') {
    mini.evidence.push({ phase: mini.phase, eventId, quote: result.evidenceQuote, reason: result.evidenceReason });
    if (mini.phase === 'try') { mini.phase = 'reflect'; mini.currentPrompt = mini.reflection; return { text: `${result.feedback}\n\n${mini.reflection}`, suggestions: [] }; }
    conclude(mini, 'complete');
  } else if (mini.attempts[mini.phase] >= 2) conclude(mini, 'needs_review');
  else { mini.currentPrompt = result.question; return { text: `${result.feedback}\n\n${result.question}`, suggestions: [] }; }
  return { text: `${mini.recap}\n\nNext step: ${mini.nextStep}`, suggestions: [] };
}
