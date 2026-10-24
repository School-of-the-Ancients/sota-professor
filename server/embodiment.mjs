// Read-only presentation context. Never grants world execution or visual perception.
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(value);
export function embodiedScene(state, sessionId) {
  const scene = state?.snapshot?.scene;
  if (!state?.online || !id(state.clientId) || !id(scene?.roomId) || !Array.isArray(scene.objects)
      || !scene.objects.some(item => item.professor?.schoolSessionId === sessionId)) return null;
  const assets = new Map((state.snapshot.assets || []).map(asset => [asset.assetId, asset]));
  return { runtimeId: state.clientId, roomId: scene.roomId,
    objects: scene.objects.filter(item => !item.professor && id(item.objectId) && id(item.assetId)).slice(0,64)
      .map(item => ({ objectId: item.objectId, assetId: item.assetId,
        label: String(item.name || assets.get(item.assetId)?.displayName || item.assetId).slice(0,160) })) };
}
export async function readEmbodiedScene(sessionId, fetcher = fetch) {
  try {
    const headers = { Accept: 'application/json' };
    if (process.env.SANDBOX_TOKEN) headers.Authorization = `Bearer ${process.env.SANDBOX_TOKEN}`;
    const response = await fetcher('http://127.0.0.1:8765/api/state', {
      headers, redirect: 'error', signal: AbortSignal.timeout(1000)
    });
    if (!response.ok) return null;
    const raw = await response.text();
    if (raw.length > 4 * 1024 * 1024) return null;
    return embodiedScene(JSON.parse(raw), sessionId);
  } catch { return null; } // Offline Matrix must not prevent ordinary teaching.
}
export function avatarCue(action, scene) {
  if (!action || !['look','point'].includes(action.kind)) return null;
  const target = scene?.objects?.find(item => item.objectId === action.objectId);
  return target ? { kind: action.kind, objectId: target.objectId, assetId: target.assetId,
    runtimeId: scene.runtimeId, roomId: scene.roomId } : null;
}
