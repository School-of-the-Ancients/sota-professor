import { randomUUID } from 'node:crypto';
import { exact, text, requireValue } from './teaching.mjs';
export const INTERACTION_CAPABILITIES = ['move', 'rotate', 'select', 'measure', 'simulate'];
const capabilityList = value => Array.isArray(value) && value.length <= 5 && new Set(value).size === value.length && value.every(item => INTERACTION_CAPABILITIES.includes(item));
const unspecifiedInteraction = () => ({ requirement: 'unspecified', description: 'Interaction requirements have not been specified; a static asset cannot establish that they are fulfilled.', capabilities: [] });
function validInteraction(value) {
  return exact(value, ['requirement', 'description', 'capabilities']) && ['none', 'required', 'unspecified'].includes(value.requirement)
    && text(value.description, 1200) && capabilityList(value.capabilities)
    && (value.requirement === 'required' ? value.capabilities.length > 0 : value.capabilities.length === 0);
}

export function buildPresentationPrompt(request, session) {
  const context = `Teaching illustration for ${session.mentor.name}, ${session.mentor.era}. Learning objective: ${session.objectives.find(item => item.id === request.objectiveId)?.label}.`;
  const style = request.kind === 'artifact'
    ? 'Museum-style academic object study: isolate the named artifact, show relevant construction details and materials, neutral background and clear lighting.'
    : `Atmospheric wide-angle ${request.kind === 'lab' ? 'teaching laboratory or workshop' : 'historical location'}: coherent layout, period-appropriate materials, contextual authenticity, cinematic natural lighting, no people or embedded text.`;
  return `${context}\n${style}\nSubject: ${request.title}. ${request.description}\nAn illustrative reconstruction, not verified historical evidence, a measured model or an interactive scientific simulation. Label uncertain or modern adaptations in accompanying text. No claim of generation or scene execution.`;
}
export function presentationRecords(requests, session) {
  requireValue(Array.isArray(requests) && requests.length <= 2 && requests.every(request => (exact(request, ['kind', 'title', 'description', 'objectiveId'])
    || (exact(request, ['kind', 'title', 'description', 'objectiveId', 'learningIntent', 'interaction']) && text(request.learningIntent, 1200) && validInteraction(request.interaction)))
    && ['location', 'lab', 'artifact'].includes(request.kind) && text(request.title, 160) && text(request.description, 1600)
    && session.objectives.some(objective => objective.id === request.objectiveId)), 502, 'The teaching provider returned an invalid presentation request. Session unchanged.');
  return requests.map(request => ({ ...request, learningIntent: request.learningIntent || request.description, interaction: request.interaction || unspecifiedInteraction(), id: randomUUID(), status: 'pending', createdAt: new Date().toISOString(),
    prompt: buildPresentationPrompt(request, session), reason: 'Request recorded; no media has been created. Presentation execution is not connected.' }));
}
export function checkPresentation(session, requestId) {
  const request = session.presentations?.find(item => item.id === requestId);
  requireValue(request, 404, 'Presentation request not found.');
  request.status = 'unavailable';
  request.reason = 'Unavailable: image, scene and artifact execution are deferred. Matrix/Blender is phase two; no image or 3D object was created.';
  request.receipt = { requestId, adapterId: 'not-connected', status: 'unavailable', reason: request.reason };
}

export function presentationHandoff(session, request) {
  const objective = session.objectives.find(item => item.id === request.objectiveId);
  requireValue(objective && text(request.prompt, 6000), 400, 'An objective and visual prompt are required for handoff.');
  const interaction = request.interaction || unspecifiedInteraction();
  requireValue(validInteraction(interaction), 400, 'Invalid requested interaction.');
  return { version: 1, requestId: request.id, sessionId: session.id, kind: request.kind, title: request.title,
    learningIntent: request.learningIntent || request.description, learningObjective: structuredClone(objective),
    requestedInteraction: structuredClone(interaction), visualPrompt: request.prompt };
}

// Shape validation is not proof of execution. A future trusted adapter must
// obtain these identities/evidence from Matrix, never from teacher assertions.
export function validateReceiptShape(receipt, handoff, selected = null) {
  const base = ['requestId', 'adapterId', 'status'];
  requireValue(receipt && receipt.requestId === handoff.requestId && text(receipt.adapterId, 160), 502, 'Receipt identity does not match the request.');
  if (['pending', 'failed', 'unavailable'].includes(receipt.status)) {
    requireValue(exact(receipt, [...base, 'reason']) && text(receipt.reason, 1600), 502, 'Invalid presentation status receipt.');
  } else {
    const stages = ['mockup_generated', 'asset_generated', 'object_loaded', 'interaction_verified'];
    const loaded = ['object_loaded', 'interaction_verified'].includes(receipt.status);
    const keys = [...base, 'concept', 'asset', ...(loaded ? ['object'] : []), ...(receipt.status === 'interaction_verified' ? ['interaction'] : [])];
    requireValue(stages.includes(receipt.status) && exact(receipt, keys)
      && exact(receipt.concept, ['id', 'version']) && text(receipt.concept.id, 256) && Number.isSafeInteger(receipt.concept.version) && receipt.concept.version > 0
      && exact(receipt.asset, ['id', 'format', 'validation']) && text(receipt.asset.id, 256)
      && ['image', 'glb'].includes(receipt.asset.format) && ['generated', 'validated_glb'].includes(receipt.asset.validation)
      && (receipt.asset.format !== 'image' || receipt.asset.validation === 'generated')
      && (receipt.status !== 'mockup_generated' || receipt.asset.format === 'image')
      && (receipt.status !== 'asset_generated' || receipt.asset.format === 'glb')
      && (!loaded || (receipt.asset.format === 'glb' && receipt.asset.validation === 'validated_glb'
        && exact(receipt.object, ['runtimeId', 'objectId']) && text(receipt.object.runtimeId, 256) && text(receipt.object.objectId, 256)))
      && (receipt.status !== 'interaction_verified' || (exact(receipt.interaction, ['capabilities', 'evidence'])
        && capabilityList(receipt.interaction.capabilities) && receipt.interaction.capabilities.length > 0
        && exact(receipt.interaction.evidence, ['kind', 'reference']) && ['automated', 'desktop', 'headset_wearer'].includes(receipt.interaction.evidence.kind) && text(receipt.interaction.evidence.reference, 1000))),
    502, 'Invalid asset, object or interaction receipt. No execution is established.');
    requireValue(!selected || (receipt.concept.id === selected.id && receipt.concept.version === selected.version), 502, 'Receipt does not match the selected concept version.');
  }
  return structuredClone(receipt);
}

export function presentationProgress(handoff, receipt, selected = null) {
  validateReceiptShape(receipt, handoff, selected);
  const mockupGenerated = ['mockup_generated', 'asset_generated', 'object_loaded', 'interaction_verified'].includes(receipt.status);
  const assetGenerated = ['asset_generated', 'object_loaded', 'interaction_verified'].includes(receipt.status);
  const objectLoaded = ['object_loaded', 'interaction_verified'].includes(receipt.status);
  const wanted = handoff.requestedInteraction;
  const interactionVerified = receipt.status === 'interaction_verified' && wanted.requirement === 'required'
    && wanted.capabilities.every(capability => receipt.interaction.capabilities.includes(capability));
  return { mockupGenerated, assetGenerated, objectLoaded, interactionVerified,
    fulfilled: objectLoaded && (wanted.requirement === 'none' || interactionVerified),
    evidenceKind: receipt.status === 'interaction_verified' ? receipt.interaction.evidence.kind : null };
}
