import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ExhibitPanel } from './ExhibitPanel';
import type { SchoolSession } from './contracts';

const request = { id: 'request-1', kind: 'artifact' as const, title: 'An educational exhibit', description: 'The visual description.', objectiveId: 'proof', prompt: 'Full saved draft with mentor, objective and question.', status: 'pending' as const, reason: 'Preparing request only. Matrix is not connected.', createdAt: '2026-10-21', origin: 'initial' as const, version: 1,
  preparation: { status: 'preparing' as const, token: 'synthetic-token', fingerprint: 'synthetic-fingerprint' } };
const session = { id: 'session-1', presentations: [request] } as SchoolSession;
afterEach(cleanup);

it('shows the full saved prompt immediately and preserves an edit while background results arrive', async () => {
  const onAction = vi.fn().mockResolvedValue(true);
  const view = render(<ExhibitPanel session={session} disabled={false} onAction={onAction} />);
  expect(screen.getByText(request.prompt)).toBeVisible();
  expect(screen.getByText('Preparing request · Matrix not connected')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Edit prompt' }));
  fireEvent.change(screen.getByLabelText('Edit prompt for An educational exhibit'), { target: { value: 'My own full prompt edit.' } });
  view.rerender(<ExhibitPanel session={{ ...session, presentations: [{ ...request, prompt: 'A late generated prompt.', preparation: { ...request.preparation, status: 'ready' } }] }} disabled={false} onAction={onAction} />);
  expect(screen.getByLabelText('Edit prompt for An educational exhibit')).toHaveValue('My own full prompt edit.');
  fireEvent.click(screen.getByRole('button', { name: 'Save prompt' }));
  await waitFor(() => expect(onAction).toHaveBeenCalledWith('presentation-edit', { requestId: request.id, requestVersion: 1, prompt: 'My own full prompt edit.' }));
});

it('keeps an unsuccessful edit draft, exposes explicit retry, and does not auto-start older quests', async () => {
  const onAction = vi.fn().mockResolvedValue(false);
  const failed = { ...request, preparation: { ...request.preparation, status: 'error' as const }, reason: 'Preparation failed; saved draft retained.' };
  const view = render(<ExhibitPanel session={{ ...session, presentations: [failed] }} disabled={false} onAction={onAction} />);
  expect(screen.getByText(failed.reason)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry request preparation' }));
  expect(onAction).toHaveBeenCalledWith('exhibit-prepare');
  fireEvent.click(screen.getByRole('button', { name: 'Edit prompt' }));
  fireEvent.change(screen.getByLabelText('Edit prompt for An educational exhibit'), { target: { value: 'Do not lose my draft if save fails.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save prompt' }));
  await waitFor(() => expect(onAction).toHaveBeenCalledTimes(2));
  expect(screen.getByLabelText('Edit prompt for An educational exhibit')).toHaveValue('Do not lose my draft if save fails.');
  view.rerender(<ExhibitPanel session={{ ...session, presentations: [] }} disabled={false} onAction={onAction} />);
  expect(screen.getByRole('button', { name: 'Prepare a focused exhibit request' })).toBeInTheDocument();
  expect(onAction).toHaveBeenCalledTimes(2);
});


it('offers a one-click 3D build only for a ready artifact and shows progress without claiming a loaded object', () => {
  const build = vi.fn();
  const operator = { connected: true, notice: '', building: null, build, request: vi.fn(), refresh: vi.fn(), review: vi.fn() };
  const ready = { ...request, preparation: { ...request.preparation, status: 'ready' as const },
    operator: { adapterId: 'matrix-operator-v1', actionId: 'b'.repeat(64), matrixSessionId: 'a'.repeat(32),
      requestVersion: 1, lessonRevision: 1, status: 'image_ready' as const, kind: 'artifact' as const,
      conceptId: 'c'.repeat(32), conceptVersion: 2, selected: false, summary: 'Image ready.',
      image: { sha256: 'd'.repeat(64), previewUrl: '/preview' }, build: null, environment: null } };
  const view = render(<ExhibitPanel session={{ ...session, presentations: [ready] }} disabled={false} onAction={vi.fn()} operator={operator} />);
  fireEvent.click(screen.getByRole('button', { name: 'Create 3D in Blender' }));
  expect(build).toHaveBeenCalledWith(ready);
  view.rerender(<ExhibitPanel session={{ ...session, presentations: [{ ...ready, operator: { ...ready.operator, build: { status: 'requested' } } }] }} disabled={false} onAction={vi.fn()} operator={operator} />);
  expect(screen.queryByRole('button', { name: 'Create 3D in Blender' })).not.toBeInTheDocument();
  expect(screen.getByText('Operator: building 3D exhibit')).toBeInTheDocument();
});
