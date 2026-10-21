import { useEffect, useRef, useState } from 'react';
import type { PresentationRequest, SchoolSession } from './contracts';

const allowed = (origin: string) => /^http:\/\/(127\.0\.0\.1|localhost):(8765|5182)$/.test(origin);
export function useOperator(session: SchoolSession | null, onResult: (fields: object) => Promise<void>) {
  const current = useRef(session), accept = useRef(onResult);
  current.current = session; accept.current = onResult;
  const peer = useRef<{ origin: string; channel: string } | null>(null);
  const [connected, setConnected] = useState(false), [notice, setNotice] = useState('Open Professor inside Matrix to connect Operator.');
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
      if (message.type === 'matrix-operator-error') { setNotice(String(message.message || 'Operator request was not confirmed.').slice(0, 600)); return; }
      if (message.type !== 'matrix-operator-result') return;
      const result = message.result, saved = current.current;
      const request = saved?.presentations?.find(item => item.id === result?.requestId);
      if (!saved || result?.schoolSessionId !== saved.id || !request || result.requestVersion !== (request.version || 1)
        || result.prompt !== request.prompt.trim()) return;
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
    if (!connected || !session) return;
    for (const request of session.presentations || []) if (request.operator?.requestVersion === (request.version || 1))
      send('school-operator-watch', { schoolSessionId: session.id, requestId: request.id,
        requestVersion: request.version || 1, sessionId: request.operator.matrixSessionId, actionId: request.operator.actionId });
  }, [connected, session?.id]);
  return { connected, notice,
    request: (request: PresentationRequest) => {
      const saved = current.current; if (!saved) return;
      if (request.prompt.length > 3600) { setNotice('Matrix image prompts are limited to 3,600 characters. Edit this saved prompt before submitting; nothing was sent.'); return; }
      send('school-operator-request', { schoolSessionId: saved.id, requestId: request.id,
        requestVersion: request.version || 1, lessonRevision: saved.revision, kind: request.kind,
        prompt: request.prompt, objectiveId: request.objectiveId, learningIntent: request.learningIntent || request.description,
        interaction: request.interaction || { requirement: 'unspecified', description: 'No instructional interaction has been verified.', capabilities: [] } });
      setNotice('Request sent to Operator. Waiting for a confirmed job; no completion is assumed.');
    },
    refresh: (request: PresentationRequest) => { if (session && request.operator) send('school-operator-watch', {
      schoolSessionId: session.id, requestId: request.id, requestVersion: request.version || 1,
      sessionId: request.operator.matrixSessionId, actionId: request.operator.actionId }); },
    review: (request: PresentationRequest) => send('school-operator-review', { kind: request.kind }),
  };
}
export type OperatorConnection = ReturnType<typeof useOperator>;
