// The journal is lesson history, never a command queue or assessment evidence.
import {validSurface} from './surface-visual.mjs';
import {recentContext} from './context-window.mjs';
export function journal(session) {
  if (!session.conversation) session.conversation = { version: 1, events: (session.messages || []).map((message, index) => ({
    id: `legacy:${session.id}:${index}`, speaker: message.role === 'user' ? 'learner' : 'professor',
    recipient: message.role === 'user' ? 'professor' : 'learner', inputKind: 'text', text: message.text,
    createdAt: session.createdAt, delivery: 'text', worldId: '' })) };
  return session.conversation;
}
const fail = message => { const error = new Error(message); error.status = 400; throw error; };
export function appendEvent(session, value, trusted = false) {
  const allowed = ['id','speaker','recipient','inputKind','text','worldId','operatorSessionId','operatorTurnId','partReference','surfaceReference'];
  if(value&&Object.hasOwn(value,'surfaceReference')&&!validSurface(value.surfaceReference))fail('Invalid selected surface reference.');
  if(value&&Object.hasOwn(value,'partReference')){const part=value.partReference;
    if(!part||typeof part!=='object'||Object.keys(part).sort().join(',')!=='assetId,objectId,partId,partsRevision'||
       !['assetId','objectId','partId'].every(key=>typeof part[key]==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(part[key]))||
       !/^[a-f0-9]{64}$/.test(part.partsRevision))fail('Invalid selected part reference.');
  }
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
    if (Object.keys(value).some(key => key==='surfaceReference'?
      ['selectionId','objectId','assetId','nodeIndex','primitiveIndex'].some(field=>value[key][field]!==existing[key]?.[field])||['x','y','z'].some(axis=>value[key].localPoint[axis]!==existing[key]?.localPoint?.[axis]):
      key==='partReference'?Object.keys(value[key]).some(field=>existing[key]?.[field]!==value[key][field]):existing[key]!==value[key])) fail('Conversation event identity changed.');
    return existing;
  }
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
  return recentContext(journal(session).events.slice(-60).map(({ id, speaker, recipient, text, delivery, worldId,partReference,surfaceReference }) =>
    ({ id, speaker, recipient, text, delivery, worldId,...(partReference?{partReference}:{}),...(surfaceReference?{surfaceReference}:{}) })),{maxItems:60});
}
