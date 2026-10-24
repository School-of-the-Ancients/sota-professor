import { exact, text, requireValue } from './teaching.mjs';
const ID = /^[a-f0-9]{32}$/;
const SHA = /^[a-f0-9]{64}$/;
const statuses = ['queued', 'generating', 'failed', 'cancelled', 'image_ready', 'object_loaded', 'setting_applied'];
export function operatorSummary(value) {
  if (value.status === 'image_ready' && value.build?.status === 'requested')
    return `Operator is building the 3D exhibit${value.build.creationMode === 'blender' ? ' in Blender' : ''}. The image is ready; the 3D object is not yet confirmed in Matrix.`;
  if (value.status === 'image_ready' && value.build?.status === 'failed')
    return 'The 3D build ended without a verified loaded object. Your image is preserved. Open Operator to inspect the result before trying again.';
  if (value.status === 'image_ready' && value.build?.status === 'completed')
    return 'The earlier 3D build has a receipt, but its object is not confirmed in the current Matrix world. Open Operator to review it.';
  if (value.status === 'image_ready') return value.kind === 'artifact'
    ? 'Operator confirms the exhibit image is ready. It is an illustration; no 3D object or interaction is established.'
    : 'Operator confirms the setting image is ready. Preview and explicitly apply it in Matrix; the scene has not changed.';
  if (value.status === 'object_loaded') return 'Operator confirms observed Matrix object identity and a completed build receipt. No instructional interaction or simulation is verified.';
  if (value.status === 'setting_applied') return 'Operator confirms the selected background is applied with a matching runtime receipt.';
  if (value.status === 'failed' || value.status === 'cancelled') {
    const reason = typeof value.message === 'string' ? value.message.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 300) : '';
    return `Operator reports ${value.status}.${reason ? ` ${reason}` : ''} No new image, scene or object success is established.`;
  }
  return `Operator image job is ${value.status}. No image or scene completion is confirmed.`;
}

export async function acceptOperatorResult(session, input, fetcher = fetch) {
  requireValue(exact(input, ['revision', 'requestId', 'requestVersion', 'matrixSessionId', 'actionId'])
    && Number.isSafeInteger(input.revision) && input.revision > 0 && input.revision <= session.revision
    && ID.test(input.matrixSessionId) && SHA.test(input.actionId), 400, 'Invalid Operator result identity.');
  const request = session.presentations?.find(item => item.id === input.requestId);
  requireValue(request && (request.version || 1) === input.requestVersion, 409, 'This prompt version changed. The older Matrix result cannot replace it.');
  let response;
  try {
    response = await fetcher(`http://127.0.0.1:8765/api/professor/actions?sessionId=${input.matrixSessionId}&actionId=${input.actionId}`,
      { redirect: 'error', signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' } });
  } catch { requireValue(false, 503, 'Could not verify the Operator result on the existing loopback service. No success was saved.'); }
  requireValue(response.ok && response.headers.get('content-type')?.includes('application/json'), 503,
    'Operator status is unavailable or requires its existing authentication. No credentials were transferred and no success was saved.');
  const raw = await response.text(); requireValue(raw.length <= 32000, 502, 'Operator result is too large.');
  let value; try { value = JSON.parse(raw); } catch { requireValue(false, 502, 'Operator returned malformed status.'); }
  requireValue(value?.adapterId === 'matrix-operator-v1' && value.actionId === input.actionId && value.sessionId === input.matrixSessionId
    && value.schoolSessionId === session.id && value.requestId === request.id && value.requestVersion === input.requestVersion
    && Number.isSafeInteger(value.lessonRevision) && value.lessonRevision <= session.revision
    && value.kind === request.kind && value.prompt === request.prompt.trim() && statuses.includes(value.status)
    && ID.test(value.conceptId) && Number.isSafeInteger(value.conceptVersion) && value.conceptVersion > 0
    && value.purpose === (request.kind === 'artifact' ? 'concept' : 'panorama') && typeof value.selected === 'boolean',
  502, 'Operator receipt does not match this saved lesson/request/prompt version.');
  requireValue(value.build == null || (ID.test(value.build.buildRequestId) && ['requested', 'failed', 'completed'].includes(value.build.status)),
    502, 'Invalid Operator build identity or status.');
  const ready = ['image_ready', 'object_loaded', 'setting_applied'].includes(value.status);
  requireValue(!ready || (SHA.test(value.image?.sha256) && value.image.previewUrl === `/api/agent/concepts/${value.conceptId}/preview`),
    502, 'Operator image identity is not confirmed.');
  requireValue(value.status !== 'object_loaded' || (value.kind === 'artifact' && value.build?.status === 'completed' && text(value.build.runtimeId, 256)
    && text(value.build.roomId, 256) && Array.isArray(value.build.objectIds) && value.build.objectIds.length > 0
    && value.build.objectIds.length <= 32 && value.build.objectIds.every(id => text(id, 256))
    && Array.isArray(value.build.receipts) && value.build.receipts.length > 0 && value.build.receipts.length <= 32
    && value.build.receipts.every(id => text(id, 256))), 502, 'No observed object receipt is available.');
  requireValue(value.status !== 'setting_applied' || (value.kind !== 'artifact' && ID.test(value.environment?.requestId) && text(value.environment.roomId, 256)
    && text(value.environment.assetId, 256) && value.environment.sha256 === value.image.sha256), 502, 'No applied setting receipt is available.');
  const saved = { adapterId: value.adapterId, actionId: value.actionId, matrixSessionId: value.sessionId,
    requestVersion: value.requestVersion, lessonRevision: value.lessonRevision, status: value.status, kind: value.kind,
    conceptId: value.conceptId, conceptVersion: value.conceptVersion, selected: value.selected,
    image: value.image, build: value.build, environment: value.environment, summary: operatorSummary(value) };
  const { observedAt, ...previous } = request.operator || {};
  if (JSON.stringify(previous) === JSON.stringify(saved)) return false;
  request.operator = { ...saved, observedAt: new Date().toISOString() };
  session.presentationRevision = (session.presentationRevision || 0) + 1;
  return true;
}
