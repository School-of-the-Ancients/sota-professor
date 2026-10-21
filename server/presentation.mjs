import { randomUUID } from 'node:crypto';
import { exact, text, requireValue } from './teaching.mjs';

export function buildPresentationPrompt(request, session) {
  const context = `Teaching illustration for ${session.mentor.name}, ${session.mentor.era}. Learning objective: ${session.objectives.find(item => item.id === request.objectiveId)?.label}.`;
  const style = request.kind === 'artifact'
    ? 'Museum-style academic object study: isolate the named artifact, show relevant construction details and materials, neutral background and clear lighting.'
    : `Atmospheric wide-angle ${request.kind === 'lab' ? 'teaching laboratory or workshop' : 'historical location'}: coherent layout, period-appropriate materials, contextual authenticity, cinematic natural lighting, no people or embedded text.`;
  return `${context}\n${style}\nSubject: ${request.title}. ${request.description}\nAn illustrative reconstruction, not verified historical evidence, a measured model or an interactive scientific simulation. Label uncertain or modern adaptations in accompanying text. No claim of generation or scene execution.`;
}
export function presentationRecords(requests, session) {
  requireValue(Array.isArray(requests) && requests.length <= 2 && requests.every(request => exact(request, ['kind', 'title', 'description', 'objectiveId'])
    && ['location', 'lab', 'artifact'].includes(request.kind) && text(request.title, 160) && text(request.description, 1600)
    && session.objectives.some(objective => objective.id === request.objectiveId)), 502, 'The teaching provider returned an invalid presentation request. Session unchanged.');
  return requests.map(request => ({ ...request, id: randomUUID(), status: 'pending', createdAt: new Date().toISOString(),
    prompt: buildPresentationPrompt(request, session), reason: 'Request recorded; no media has been created. Presentation execution is not connected.' }));
}
export function checkPresentation(session, requestId) {
  const request = session.presentations?.find(item => item.id === requestId);
  requireValue(request, 404, 'Presentation request not found.');
  request.status = 'unavailable';
  request.reason = 'Unavailable: image, scene and artifact execution are deferred. Matrix/Blender is phase two; no image or 3D object was created.';
}
