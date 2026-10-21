import React, { useEffect, useState } from 'react';
import type { PresentationRequest, SchoolSession } from './contracts';

const button = 'rounded-lg border border-stone-600 px-4 py-2 text-sm text-stone-200 hover:border-amber-200 disabled:opacity-40';
export type ExhibitAction = (action: string, fields?: object) => Promise<boolean>;

function PromptCard({ request, disabled, onAction }: { request: PresentationRequest; disabled: boolean; onAction: ExhibitAction }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(request.prompt);
  const [baseVersion, setBaseVersion] = useState(request.version || 1);
  useEffect(() => { if (!editing) setDraft(request.prompt); }, [request.prompt, editing]);
  const state = request.preparation?.status;
  const label = state === 'preparing' ? 'Preparing request' : state === 'error' ? 'Preparation error'
    : request.promptEdited ? 'Edited prompt saved' : state === 'ready' ? 'Request prepared' : request.status;
  return <article className="space-y-3 rounded-lg bg-stone-800/50 p-4 text-sm">
    <h3 className="font-serif text-lg text-stone-100">{request.title} · {request.kind}</h3>
    <p role="status" className="text-amber-100">{label} · Matrix not connected</p>
    <p className="text-stone-400">{request.reason}</p>
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
        {state === 'error' && request.origin === 'initial' && !request.promptEdited && <button type="button" className={button} disabled={disabled}
          onClick={() => void onAction('exhibit-prepare')}>Retry request preparation</button>}
        {!request.preparation && request.status === 'pending' && <button type="button" className={button} disabled={disabled}
          onClick={() => void onAction('presentation', { requestId: request.id })}>Check presentation availability</button>}
      </div>
    </>}
  </article>;
}

export function ExhibitPanel({ session, disabled, onAction }: { session: SchoolSession; disabled: boolean; onAction: ExhibitAction }) {
  return <section aria-label="Presentation requests" className="space-y-4 rounded-xl border border-stone-700 p-5">
    <h2 className="font-serif text-xl text-amber-100">Requested exhibits and settings</h2>
    <p className="text-sm text-stone-400">The professor prepares one focused request from the mentor and your question. You can inspect and edit the full prompt. No image, Blender asset or scene has been created.</p>
    {(session.presentations || []).map(request => <PromptCard key={request.id} request={request} disabled={disabled} onAction={onAction} />)}
    {!session.presentations?.some(request => request.origin === 'initial') && <div className="space-y-3">
      <p className="text-sm text-stone-400">This older quest has no automatically prepared initial request. Its saved conversation and existing exhibits are unchanged.</p>
      <button type="button" className={button} disabled={disabled} onClick={() => void onAction('exhibit-prepare')}>Prepare a focused exhibit request</button>
    </div>}
  </section>;
}
