// The journal is lesson history, never a command queue or assessment evidence.
export function journal(session) {
  if (!session.conversation) session.conversation = { version: 1, events: (session.messages || []).map((message, index) => ({
    id: `legacy:${session.id}:${index}`, speaker: message.role === 'user' ? 'learner' : 'professor',
    recipient: message.role === 'user' ? 'professor' : 'learner', inputKind: 'text', text: message.text,
    createdAt: session.createdAt, delivery: 'text', worldId: '' })) };
  return session.conversation;
}
const fail = message => { const error = new Error(message); error.status = 400; throw error; };
export function appendEvent(session, value, trusted = false) {
  const allowed = ['id','speaker','recipient','inputKind','text','worldId','operatorSessionId','operatorTurnId'];
  if (!value || Object.keys(value).some(key => !allowed.includes(key)) ||
      !/^[a-zA-Z0-9:._-]{1,220}$/.test(value.id || '') ||
      !['learner','professor','operator'].includes(value.speaker) ||
      !['learner','professor','operator'].includes(value.recipient) ||
      !['text','voice'].includes(value.inputKind) || typeof value.text !== 'string' ||
      !value.text.trim() || value.text.length > 10000 ||
      ['worldId','operatorSessionId','operatorTurnId'].some(key => value[key] !== undefined &&
        (typeof value[key] !== 'string' || value[key].length > 200))) fail('Invalid conversation event.');
  if (!trusted && (value.speaker === 'professor' ||
      value.speaker === 'operator' && value.recipient !== 'learner')) fail('Invalid conversation speaker.');
  const events = journal(session).events, existing = events.find(event => event.id === value.id);
  if (existing) {
    if (Object.keys(value).some(key => existing[key] !== value[key])) fail('Conversation event identity changed.');
    return existing;
  }
  if (events.length >= 5000) { const error = new Error('This conversation archive is full. Export it before starting a new lesson.'); error.status = 422; throw error; }
  const event = { ...value, createdAt: new Date().toISOString(), delivery: 'text' };
  events.push(event); return event;
}
export function markDelivery(session, value) {
  if (!value || Object.keys(value).sort().join(',') !== 'delivery,eventId' ||
      !['speaking','spoken','interrupted','failed'].includes(value.delivery)) fail('Invalid speech delivery.');
  const event = journal(session).events.find(item => item.id === value.eventId && item.speaker === 'professor' && item.recipient === 'learner');
  if (!event) fail('Professor reply is not in this lesson.');
  // A late playback-start callback cannot overwrite its terminal outcome.
  if (value.delivery === 'speaking' && ['spoken','interrupted','failed'].includes(event.delivery)) return;
  event.delivery = value.delivery;
}
export function conversationContext(session) {
  return journal(session).events.slice(-60).map(({ id, speaker, recipient, text, delivery, worldId }) =>
    ({ id, speaker, recipient, text, delivery, worldId }));
}
