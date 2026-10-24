import React, { useEffect, useState } from 'react';
import type { PresentationRequest, SchoolSession } from './contracts';
import type { OperatorConnection } from './useOperator';

const button = 'rounded-lg border border-stone-600 px-4 py-2 text-sm text-stone-200 hover:border-amber-200 disabled:opacity-40';
export type ExhibitAction = (action: string, fields?: object) => Promise<boolean>;

function PromptCard({ request, disabled, onAction, operator }: { request: PresentationRequest; disabled: boolean; onAction: ExhibitAction; operator?: OperatorConnection }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(request.prompt);
  const [baseVersion, setBaseVersion] = useState(request.version || 1);
  useEffect(() => { if (!editing) setDraft(request.prompt); }, [request.prompt, editing]);
  const state = request.preparation?.status;
  const result = request.operator?.requestVersion === (request.version || 1) ? request.operator : null;
  const label = state === 'preparing' ? 'Preparing request' : state === 'error' ? 'Preparation error'
    : request.promptEdited ? 'Edited prompt saved' : state === 'ready' ? 'Request prepared' : request.status;
  return <article className="space-y-3 rounded-lg bg-stone-800/50 p-4 text-sm">
    <h3 className="font-serif text-lg text-stone-100">{request.title} · {request.kind}</h3>
    <p role="status" className="text-amber-100">{result ? result.build?.status === 'requested' ? 'Operator: building 3D exhibit' : result.build?.status === 'failed' ? 'Operator: 3D build needs attention' : result.build?.status === 'completed' ? 'Operator: 3D build recorded' : `Operator: ${result.status.replaceAll('_', ' ')}` : `${label} · ${operator?.connected ? 'Matrix connected; not submitted' : 'Matrix not connected'}`}</p>
    {result && <div aria-label="Operator result" className="space-y-2 rounded-lg border border-stone-600 p-3">
      <p>{result.summary}</p>
      {operator && request.kind === 'artifact' && result.image && <button type="button"
        className={`${button} border-amber-300 bg-amber-200/10`} disabled={disabled || !operator.connected || !!operator.building || !!result.build}
        onClick={() => operator.build(request)}>{result.build ? result.build.status === 'requested' ? 'Building in Blender…' : '3D build recorded' : operator.building === request.id ? 'Starting Blender…' : 'Create 3D in Blender'}</button>}
      <p className="text-xs text-stone-400">Concept {result.conceptId}, version {result.conceptVersion}. {result.selected ? 'Selected in Matrix.' : 'No selection confirmed.'}</p>
      {result.observedAt && <p className="text-xs text-stone-500">Last verified {new Date(result.observedAt).toLocaleString()}. Refresh to check current runtime state.</p>}
      {result.image && <img src={`${window.location.port === '8765' ? '' : 'http://127.0.0.1:8765'}${result.image.previewUrl}`} alt={`Operator illustration: ${request.title}`} className="max-h-80 w-full object-contain" />}
      <p className="text-xs text-stone-400">Request {result.actionId}. Static media does not establish interaction or scientific simulation.</p>
    </div>}
    {!result && <p className="text-stone-400">{operator?.connected ? 'Saved prompt only. Submit explicitly to Operator; no media completion is assumed.' : request.reason}</p>}
    <p className="text-xs text-stone-400">Learning intent: {request.learningIntent || request.description}</p>
    <p className="text-xs text-stone-400">Interaction: {request.interaction?.requirement || 'unspecified'}. {request.interaction?.description || 'A static image or GLB does not establish playability or instructional interaction.'}</p>
    {editing ? <form className="space-y-3" onSubmit={async event => {
      event.preventDefault();
      if (await onAction('presentation-edit', { requestId: request.id, requestVersion: baseVersion, prompt: draft })) setEditing(false);
    }}>
      <label className="block font-bold" htmlFor={`prompt-${request.id}`}>Edit full presentation prompt</label>
      <textarea id={`prompt-${request.id}`} aria-label={`Edit prompt for ${request.title}`} rows={10} maxLength={6000} value={draft} disabled={disabled}
        onChange={event => setDraft(event.target.value)} className="w-full rounded-lg border border-stone-600 bg-stone-950 p-3 text-sm leading-6" />
      <p className="text-xs text-stone-500">Saving preserves your version and stops a late preparation result from replacing it. This edits the prompt only; nothing is sent to Matrix.</p>
      <div className="flex flex-wrap gap-2"><button className={button} disabled={disabled || !draft.trim()}>Save prompt</button>
        <button type="button" className={button} disabled={disabled} onClick={() => setEditing(false)}>Cancel edit</button></div>
    </form> : <>
      <details open={request.origin === 'initial'}><summary className="cursor-pointer font-bold">View presentation prompt</summary>
        <p className="mt-2 text-xs text-stone-500">Full saved prompt · version {request.version || 1} · {request.promptSource || 'saved request'}</p>
        <pre className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-stone-950 p-4 font-sans text-sm leading-6 text-stone-300">{request.prompt}</pre>
      </details>
      <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={disabled} onClick={() => {
        setDraft(request.prompt); setBaseVersion(request.version || 1); setEditing(true);
      }}>Edit prompt</button>
        {operator && <>
          <button type="button" className={button} disabled={disabled || !operator.connected || state === 'preparing'} onClick={() => operator.request(request)}>
            {result ? 'Recover existing Operator job' : request.kind === 'artifact' ? 'Request exhibit image from Operator' : 'Request setting image from Operator'}
          </button>
          {result && <button type="button" className={button} disabled={!operator.connected} onClick={() => operator.refresh(request)}>Refresh Operator status</button>}
          <button type="button" className={button} disabled={!operator.connected} onClick={() => operator.review(request)}>Review / select / build in Matrix</button>
        </>}
        {state === 'error' && request.origin === 'initial' && !request.promptEdited && <button type="button" className={button} disabled={disabled}
          onClick={() => void onAction('exhibit-prepare')}>Retry request preparation</button>}
        {!request.preparation && request.status === 'pending' && <button type="button" className={button} disabled={disabled}
          onClick={() => void onAction('presentation', { requestId: request.id })}>Check presentation availability</button>}
      </div>
    </>}
  </article>;
}

export function ExhibitPanel({ session, disabled, onAction, operator }: { session: SchoolSession; disabled: boolean; onAction: ExhibitAction; operator?: OperatorConnection }) {
  return <section aria-label="Presentation requests" className="space-y-4 rounded-xl border border-stone-700 p-5">
    <h2 className="font-serif text-xl text-amber-100">Requested exhibits and settings</h2>
    <p className="text-sm text-stone-400">Inspect and edit the full prompt. Exhibit requests create images; setting requests create background previews. Spatial creation and scene changes require the existing explicit Matrix selection/build/apply controls.</p>
    {operator && <p role="status" className="text-sm text-amber-100">{operator.notice}</p>}
    {(session.presentations || []).map(request => <PromptCard key={request.id} request={request} disabled={disabled} onAction={onAction} operator={operator} />)}
    {!session.presentations?.some(request => request.origin === 'initial') && <div className="space-y-3">
      <p className="text-sm text-stone-400">This older quest has no automatically prepared initial request. Its saved conversation and existing exhibits are unchanged.</p>
      <button type="button" className={button} disabled={disabled} onClick={() => void onAction('exhibit-prepare')}>Prepare a focused exhibit request</button>
    </div>}
  </section>;
}
