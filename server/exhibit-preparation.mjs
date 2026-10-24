import { createHash, randomUUID } from 'node:crypto';
import { publicSession, requireValue, text, exact } from './teaching.mjs';
import { presentationRecords } from './presentation.mjs';

export const exhibitFingerprint = session => createHash('sha256').update(JSON.stringify({
  goal: session.goal, mentor: { id: session.mentor.id, name: session.mentor.name, era: session.mentor.era }, objectives: session.objectives,
})).digest('hex');
const disconnected = 'Matrix is not connected. No image, Blender asset or scene has been created.';

export function initialExhibit(session) {
  let request = session.presentations?.find(item => item.origin === 'initial');
  requireValue(!request?.promptEdited, 409, 'Your edited prompt is preserved. It will not be regenerated automatically.');
  requireValue(request || (session.presentations?.length || 0) < 40, 422, 'This quest has reached its presentation request limit.');
  const objective = session.objectives[0];
  const [draft] = presentationRecords([{ kind: 'artifact', title: `A focused exhibit with ${session.mentor.name}`.slice(0, 160),
    description: `One focused teaching exhibit for this learner question: ${session.goal.slice(0, 800)}. Focus on: ${objective.label}. Use the mentor as historical context, with modern extensions labeled.`,
    objectiveId: objective.id, learningIntent: `Help the learner understand: ${objective.label}`,
    interaction: { requirement: 'unspecified', description: 'Interaction has not been specified. A visual prompt is not a playable exercise.', capabilities: [] },
  }], session);
  const fingerprint = exhibitFingerprint(session);
  if (request) Object.assign(request, draft, { id: request.id, createdAt: request.createdAt, version: (request.version || 1) + 1 });
  else {
    request = { ...draft, version: 1 };
    session.presentations = [...(session.presentations || []), request];
  }
  Object.assign(request, { origin: 'initial', promptEdited: false, promptSource: 'draft', status: 'pending',
    reason: `Preparing one educational request alongside the introduction. ${disconnected}`,
    preparation: { status: 'preparing', token: randomUUID(), fingerprint } });
  session.presentationRevision = (session.presentationRevision || 0) + 1;
  return request;
}

export function editPresentation(session, input) {
  requireValue(exact(input, ['revision', 'requestId', 'requestVersion', 'prompt']) && text(input.prompt, 6000), 400, 'Enter the full presentation prompt, up to 6,000 characters.');
  const request = session.presentations?.find(item => item.id === input.requestId);
  requireValue(request && input.requestVersion === (request.version || 1), 409, 'This exhibit draft changed. Reopen it before saving.');
  request.prompt = input.prompt.trim(); request.version = (request.version || 1) + 1;
  request.promptEdited = true; request.promptSource = 'user'; request.status = 'unavailable';
  request.reason = `Your edited prompt is saved. ${disconnected}`;
  if (request.preparation) request.preparation = { ...request.preparation, status: 'ready' };
  delete request.receipt;
  session.presentationRevision = (session.presentationRevision || 0) + 1;
}

/** Local text preparation only; no image/Matrix adapter is imported or invoked. */
export class ExhibitPreparer {
  constructor({ store, provider, concurrency = 2, limit = 8 }) {
    this.store = store; this.provider = provider; this.concurrency = concurrency; this.limit = limit;
    this.jobs = new Map(); this.queue = []; this.running = 0;
  }
  start(owner, session) {
    const request = session.presentations.find(item => item.origin === 'initial');
    if (this.jobs.size >= this.limit) {
      request.preparation.status = 'error'; request.reason = `Request preparation is busy. Your draft is saved; retry when ready. ${disconnected}`;
      return null;
    }
    const key = `${owner}:${request.preparation.token}`;
    if (this.jobs.has(key)) return this.jobs.get(key);
    let publish, complete;
    const ticket = { key, owner, session: structuredClone(session), request: structuredClone(request),
      published: new Promise(resolve => { publish = resolve; }), publish,
      done: new Promise(resolve => { complete = resolve; }), complete };
    this.jobs.set(key, ticket); this.queue.push(ticket); this.pump();
    return ticket;
  }
  publish(ticket) { ticket?.publish(true); }
  abandon(ticket) { if (ticket) { ticket.cancelled = true; ticket.publish(false); } }
  pump() {
    while (this.running < this.concurrency && this.queue.length) {
      const ticket = this.queue.shift(); this.running++;
      void this.run(ticket).finally(() => { this.running--; this.jobs.delete(ticket.key); ticket.complete(); this.pump(); });
    }
  }
  async run(ticket) {
    if (ticket.cancelled) return;
    let generated, error;
    try {
      const value = await this.provider.generate('exhibit', { goal: ticket.session.goal, mentor: ticket.session.mentor,
        quest: { title: ticket.session.title, description: ticket.session.description, objectives: ticket.session.objectives },
        preferences: ticket.session.preferences, draft: { title: ticket.request.title, prompt: ticket.request.prompt } });
      [generated] = presentationRecords([value], ticket.session);
    } catch { error = 'Educational request preparation failed or returned invalid output. The editable draft is preserved.'; }
    if (!await ticket.published) return;
    try {
      await this.store.transaction(ticket.owner, data => {
        const session = data.sessions.find(item => item.id === ticket.session.id);
        const request = session?.presentations?.find(item => item.id === ticket.request.id);
        if (!request || request.promptEdited || request.version !== ticket.request.version
          || request.preparation?.token !== ticket.request.preparation.token
          || exhibitFingerprint(session) !== ticket.request.preparation.fingerprint) return { value: null };
        if (generated) {
          const { id, createdAt, ...fields } = generated;
          Object.assign(request, fields, { status: 'unavailable', promptSource: 'codex', reason: `Educational request prepared and saved. ${disconnected}` });
        } else request.reason = `${error} ${disconnected}`;
        request.preparation = { ...request.preparation, status: error ? 'error' : 'ready' };
        session.presentationRevision = (session.presentationRevision || 0) + 1;
        // Background work changes only the presentation revision, not lesson/quiz authority.
        return { write: true, value: null };
      }, { waitForLock: true, background: true });
    } catch { /* A failed save remains interrupted/uncertain on the next snapshot; never claim success. */ }
  }
  snapshot(session, owner) {
    const copy = publicSession(session);
    for (const request of copy.presentations || []) {
      if (request.preparation?.status !== 'preparing') continue;
      if (request.preparation.fingerprint !== exhibitFingerprint(session)) {
        request.preparation.status = 'error'; request.reason = `The mentor or lesson changed; this draft needs explicit preparation again. ${disconnected}`;
      } else if (!this.jobs.has(`${owner}:${request.preparation.token}`)) {
        request.preparation.status = 'error'; request.reason = `Preparation was interrupted or could not be saved. Your draft is retained; retry explicitly. ${disconnected}`;
      }
    }
    return copy;
  }
  async idle() { await Promise.all([...this.jobs.values()].map(ticket => ticket.done)); }
}
