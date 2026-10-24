import { useEffect, useRef, useState } from 'react';
import type { PresentationRequest, SchoolSession } from './contracts';

const allowed = (origin: string) => /^http:\/\/(127\.0\.0\.1|localhost):(8765|5182)$/.test(origin);
export function useOperator(session: SchoolSession | null, onResult: (fields: object) => Promise<void>, onConversationChanged: () => Promise<void> = async () => {}) {
  const current = useRef(session), accept = useRef(onResult);
  current.current = session; accept.current = onResult;
  const conversationChanged=useRef(onConversationChanged);conversationChanged.current=onConversationChanged;
  const peer = useRef<{ origin: string; channel: string } | null>(null);
  const [connected, setConnected] = useState(false), [notice, setNotice] = useState('Open Professor inside Matrix to connect Operator.');
  const [avatars, setAvatars] = useState<{catalogId: string; displayName: string}[]>([]);
  const [avatarId, setAvatarId] = useState('generic-professor');
  const [placing, setPlacing] = useState(false);
  const placingRef = useRef(false);
  const placed = useRef(new Map<string,string>());
  const pendingAvatar = useRef<string | null>(null);
  const [building, setBuilding] = useState<string | null>(null);
  const buildPending = useRef(false);
  const send = (type: string, payload: object) => {
    if (!peer.current) { setNotice('Open the complete Professor app from Matrix to connect Operator.'); return; }
    window.parent.postMessage({ type, channel: peer.current.channel, payload }, peer.current.origin);
  };
  useEffect(() => {
    const listener = async (event: MessageEvent) => {
      if (window.parent === window || event.source !== window.parent || !allowed(event.origin)) return;
      const message = event.data;
      if (!message || typeof message !== 'object') return;
      if (message.type === 'matrix-operator-hello' && typeof message.channel === 'string' && /^[a-f0-9-]{36}$/.test(message.channel)) {
        peer.current = { origin: event.origin, channel: message.channel }; setConnected(true);
        setNotice('Matrix Operator connected. Image requests use its existing native subscription capability; no paid fallback.');
        window.parent.postMessage({ type: 'school-operator-ready', channel: message.channel }, event.origin); return;
      }
      if (event.origin !== peer.current?.origin || message.channel !== peer.current.channel) return;
      if(message.type==='matrix-school-refresh'&&message.sessionId===current.current?.id){await conversationChanged.current();return;}
      if (message.type === 'matrix-professor-catalog') {
        const values=message.catalog?.avatars;
        if(Array.isArray(values)&&values.length<=256){
          const entries=values.filter((item: any)=>typeof item?.catalogId==='string'&&typeof item?.displayName==='string').map((item: any)=>({catalogId:item.catalogId,displayName:item.displayName}));
          setAvatars(entries);
          placed.current.clear();
          if(Array.isArray(message.placements)&&message.placements.length<=256)for(const item of message.placements)
            if(typeof item?.schoolSessionId==='string'&&entries.some((entry: {catalogId:string})=>entry.catalogId===item.catalogId))placed.current.set(item.schoolSessionId,item.catalogId);
          setAvatarId(placed.current.get(current.current?.id||'')||'generic-professor');
        }
        return;
      }
      if(message.type==='matrix-professor-placed'){
        if(message.schoolSessionId===current.current?.id){
          if(pendingAvatar.current)placed.current.set(message.schoolSessionId,pendingAvatar.current);
          placingRef.current=false;setPlacing(false);setNotice('Professor placed in Matrix. Close this panel to see the avatar.');
        }
        return;
      }
      if (message.type === 'matrix-operator-error') { placingRef.current=false;setPlacing(false); buildPending.current = false; setBuilding(null); setNotice(String(message.message || 'Operator request was not confirmed.').slice(0, 600)); return; }
      if (message.type !== 'matrix-operator-result') return;
      const result = message.result, saved = current.current;
      const request = saved?.presentations?.find(item => item.id === result?.requestId);
      if (!saved || result?.schoolSessionId !== saved.id || !request || result.requestVersion !== (request.version || 1)
        || result.prompt !== request.prompt.trim()) return;
      if (result.build) { buildPending.current = false; setBuilding(null); }
      try {
        await accept.current({ requestId: request.id, requestVersion: result.requestVersion,
          matrixSessionId: result.sessionId, actionId: result.actionId });
        setNotice('Operator status verified and saved with this lesson.');
      } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not verify Operator status. Refresh it before claiming success.'); }
    };
    window.addEventListener('message', listener);
    return () => { window.removeEventListener('message', listener); peer.current = null; };
  }, []);
  useEffect(() => {
    buildPending.current = false; setBuilding(null);
    placingRef.current=false;setPlacing(false);
    setAvatarId(placed.current.get(session?.id||'')||'generic-professor');
    if (!connected || !session) return;
    for (const request of session.presentations || []) if (request.operator?.requestVersion === (request.version || 1))
      send('school-operator-watch', { schoolSessionId: session.id, requestId: request.id,
        requestVersion: request.version || 1, sessionId: request.operator.matrixSessionId, actionId: request.operator.actionId });
  }, [connected, session?.id]);
  useEffect(()=>{
    if(connected)send('school-professor-session',{sessionId:session?.id||null});
  },[connected,session?.id,session?.revision]);
  useEffect(() => {
    if (!placing) return;
    const timer = window.setTimeout(() => {
      placingRef.current = false; setPlacing(false);
      setNotice('Placement was not confirmed. Check the Matrix world before trying again; retrying reuses this lesson’s avatar.');
    }, 15000);
    return () => window.clearTimeout(timer);
  }, [placing]);
  return { connected, notice, building, avatars, avatarId, setAvatarId, placing,
    placeProfessor:()=>{const saved=current.current;if(!saved||!peer.current||placingRef.current||!avatars.some(avatar=>avatar.catalogId===avatarId))return;placingRef.current=true;setPlacing(true);
      pendingAvatar.current=avatarId;
      send('school-professor-place',{schoolSessionId:saved.id,teacherId:saved.mentor.id||'custom-teacher',teacherName:saved.mentor.name,catalogId:avatarId});},
    request: (request: PresentationRequest) => {
      const saved = current.current; if (!saved) return;
      if (request.prompt.length > 3600) { setNotice('Matrix image prompts are limited to 3,600 characters. Edit this saved prompt before submitting; nothing was sent.'); return; }
      send('school-operator-request', { schoolSessionId: saved.id, requestId: request.id,
        requestVersion: request.version || 1, lessonRevision: saved.revision, kind: request.kind,
        prompt: request.prompt, objectiveId: request.objectiveId, learningIntent: request.learningIntent || request.description,
        interaction: request.interaction || { requirement: 'unspecified', description: 'No instructional interaction has been verified.', capabilities: [] } });
      setNotice('Request sent to Operator. Waiting for a confirmed job; no completion is assumed.');
    },
    build: (request: PresentationRequest) => {
      const saved = current.current, result = request.operator;
      if (!saved || !peer.current || !result?.image || result.requestVersion !== (request.version || 1)
        || request.kind !== 'artifact' || result.build || buildPending.current
        || !saved.presentations?.some(item => item.id === request.id && item.prompt === request.prompt && (item.version || 1) === (request.version || 1))) return;
      buildPending.current = true;
      setBuilding(request.id);
      send('school-operator-build', { schoolSessionId: saved.id, requestId: request.id,
        requestVersion: request.version || 1, sessionId: result.matrixSessionId, actionId: result.actionId,
        conceptId: result.conceptId, conceptVersion: result.conceptVersion, imageSha256: result.image.sha256 });
      setNotice('Starting the 3D exhibit in Blender from this image and your lesson.');
    },
    refresh: (request: PresentationRequest) => { if (session && request.operator) send('school-operator-watch', {
      schoolSessionId: session.id, requestId: request.id, requestVersion: request.version || 1,
      sessionId: request.operator.matrixSessionId, actionId: request.operator.actionId }); },
    review: (request: PresentationRequest) => send('school-operator-review', { kind: request.kind }),
  };
}
export type OperatorConnection = Pick<ReturnType<typeof useOperator>, 'connected' | 'notice' | 'building' | 'request' | 'build' | 'refresh' | 'review'>;
