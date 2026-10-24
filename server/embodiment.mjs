// Read-only presentation context. Never grants world execution or visual perception.
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(value);
export function embodiedScene(state, sessionId) {
  const scene = state?.snapshot?.scene;
  if (!state?.online || !id(state.clientId) || !id(scene?.roomId) || !Array.isArray(scene.objects)
      || !scene.objects.some(item => item.professor?.schoolSessionId === sessionId)) return null;
  const assets = new Map((state.snapshot.assets || []).map(asset => [asset.assetId, asset]));
  const objects=scene.objects.filter(item => !item.professor && id(item.objectId) && id(item.assetId)).slice(0,64)
    .map(item=>{
      const asset=assets.get(item.assetId),parts=Array.isArray(asset?.parts)?asset.parts.slice(0,64).filter(p=>
        id(p?.partId)&&typeof p.label==='string'&&p.label.length<=120&&typeof p.description==='string'&&p.description.length<=600&&['authored','node-name'].includes(p.provenance)):[];
      return {objectId:item.objectId,assetId:item.assetId,
        label:String(item.name||asset?.displayName||item.assetId).slice(0,160),
        ...(parts.length&&/^[a-f0-9]{64}$/.test(asset.partsRevision||'')?{partsRevision:asset.partsRevision,
          parts:parts.map(({partId,label,description,provenance})=>({partId,label,description,provenance}))}:{}),
        ...(asset?.description?{description:String(asset.description).slice(0,500)}:{})};
    });
  const selected=state.snapshot.selectedPart;
  const selectedObject=selected&&objects.find(o=>o.objectId===selected.objectId&&o.assetId===selected.assetId&&o.partsRevision===selected.partsRevision);
  return { runtimeId: state.clientId, roomId: scene.roomId,objects,
    ...(selectedObject?.parts?.some(p=>p.partId===selected.partId)?{selectedPart:{objectId:selected.objectId,partId:selected.partId}}:{}) };
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
  if(action.partId&&(!target?.parts?.some(p=>p.partId===action.partId)||!target.partsRevision))return null;
  return target ? { kind: action.kind, objectId: target.objectId, assetId: target.assetId,
    ...(action.partId?{partId:action.partId,partsRevision:target.partsRevision}:{}),
    runtimeId: scene.runtimeId, roomId: scene.roomId } : null;
}
