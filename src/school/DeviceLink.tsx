import React, { useState } from 'react';
import { request } from './api';

export function DeviceLink() {
  const [code, setCode] = useState('');
  const [issued, setIssued] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function issue() {
    setBusy(true); setMessage('');
    try {
      const result = await request<{code: string}>('device-link', {});
      setIssued(result.code); setMessage('On your fresh Quest browser, enter this code below. It expires in five minutes and can be used once.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not create a device code.'); }
    finally { setBusy(false); }
  }
  async function claim() {
    setBusy(true); setMessage('');
    try {
      await request('device-link/claim', { code: code.replace(/[\s-]/g, '').toUpperCase() });
      window.location.hash = '';
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not link this device.'); setBusy(false); }
  }
  return <details className="mt-4 rounded-xl border border-stone-700 p-3 text-sm">
    <summary>Continue on Quest / another device</summary>
    <p className="my-3 text-stone-400">Link your own device to the same saved lessons and transcript. The receiving browser must have no existing learning records. Your Codex sign-in stays on the PC.</p>
    <button type="button" disabled={busy} onClick={() => void issue()} className="rounded-lg border border-stone-600 p-2">Create device code</button>
    {issued && <p className="my-3 font-mono text-lg" aria-label="Device code">{issued}</p>}
    <label className="mt-3 block">Code from your other device
      <input value={code} maxLength={16} onChange={event => setCode(event.target.value)} autoComplete="off" spellCheck={false} className="my-2 block w-full rounded bg-stone-950 p-2 font-mono" />
    </label>
    <button type="button" disabled={busy || !code.trim()} onClick={() => void claim()} className="rounded-lg border border-stone-600 p-2">Link this browser</button>
    <p className="mt-2 text-stone-400" role="status">{message}</p>
  </details>;
}
