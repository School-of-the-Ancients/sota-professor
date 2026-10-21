import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import SchoolApp from './SchoolApp';
import { schoolApi } from './api';
import type { SchoolSession } from './contracts';
import { HISTORICAL_TEACHERS } from './personas.mjs';

vi.mock('./api', () => ({ schoolApi: { status: vi.fn(), list: vi.fn(), open: vi.fn(), create: vi.fn(), action: vi.fn(), teachers: vi.fn(), createTeacher: vi.fn() } }));

const session: SchoolSession = {
  id: '00000000-0000-4000-8000-000000000001', revision: 1, createdAt: '2026-10-21T12:00:00Z', updatedAt: '2026-10-21T12:00:00Z',
  title: 'Understanding algorithms', goal: 'Explain algorithms', mentor: { name: 'Ada Lovelace', era: '1815–1852', expertise: 'Mathematics', rationale: 'A useful guide to symbolic computation.' },
  objectives: [{ id: 'sequence', label: 'Trace a sequence' }, { id: 'branch', label: 'Choose a branch' }, { id: 'loop', label: 'Trace a loop' }],
  messages: [{ role: 'assistant', text: 'An algorithm describes an ordered set of steps. What would you like to explore?' }],
  status: 'learning', reviewCompleted: false, quiz: null, attempts: [], suggestions: ['Show me an example'],
};

beforeEach(() => {
  vi.resetAllMocks();
  window.history.replaceState(null, '', '/');
  vi.mocked(schoolApi.status).mockResolvedValue({ provider: 'codex-chatgpt', configured: true, liveValidated: false, message: 'Configured locally, not live validated.' });
  vi.mocked(schoolApi.list).mockResolvedValue([]);
  vi.mocked(schoolApi.teachers).mockResolvedValue([]);
});
afterEach(cleanup);

it('starts from an arbitrary goal and mentor without microphone or browser-key setup', async () => {
  vi.mocked(schoolApi.create).mockResolvedValue(session);
  render(<SchoolApp />);
  await screen.findByText('Configured locally, not live validated.');
  fireEvent.change(screen.getByLabelText('Your question or learning goal'), { target: { value: 'Explain algorithms' } });
  fireEvent.change(screen.getByLabelText(/A mentor you have in mind/), { target: { value: 'Ada Lovelace' } });
  fireEvent.click(screen.getByRole('button', { name: /Create my learning quest/ }));
  await screen.findByRole('heading', { name: 'Understanding algorithms' });
  expect(schoolApi.create).toHaveBeenCalledWith('Explain algorithms', 'Ada Lovelace', { difficulty: 'beginner', style: 'balanced', timeBudget: '' });
  expect(screen.getByText(/No microphone required/)).toBeInTheDocument();
  expect(window.location.hash).toBe(`#session=${session.id}`);
  expect(screen.queryByLabelText(/API Key/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Ready for a knowledge check' })).toBeDisabled();
});

it('restores saved context and pending quiz on reload, and submits answers with revision identity', async () => {
  const pending: SchoolSession = { ...session, revision: 3, status: 'quiz', messages: [...session.messages, { role: 'user', text: 'My saved question about algorithms' }],
    quiz: { id: 'quiz-1', questions: [{ id: 'q1', objectiveId: 'branch', prompt: 'Which branch runs?', options: ['First branch', 'Second branch', 'Both'] }] } };
  window.history.replaceState(null, '', `/#session=${session.id}`);
  vi.mocked(schoolApi.open).mockResolvedValue(pending);
  vi.mocked(schoolApi.action).mockResolvedValue({ ...pending, quiz: null, status: 'complete', revision: 4 });
  render(<SchoolApp />);
  await screen.findByText('My saved question about algorithms');
  expect(schoolApi.open).toHaveBeenCalledWith(session.id);
  const form = screen.getByRole('form', { name: 'Knowledge check' });
  expect(within(form).getByRole('button', { name: 'Check my understanding' })).toBeDisabled();
  fireEvent.click(within(form).getByRole('radio', { name: 'Second branch' }));
  fireEvent.click(within(form).getByRole('button', { name: 'Check my understanding' }));
  await waitFor(() => expect(schoolApi.action).toHaveBeenCalledWith(pending, 'answers', { quizId: 'quiz-1', answers: { q1: 1 } }));
  await screen.findByText('Check passed', { selector: 'span' });
});

it('shows targeted remediation and preserves a draft when a teaching request fails', async () => {
  const review: SchoolSession = { ...session, status: 'needs_review', attempts: [{ id: 'attempt-1', correct: 2, total: 3, passed: false, missedObjectiveIds: ['branch'],
    feedback: [{ objectiveId: 'branch', prompt: 'Branch question', correct: false, explanation: 'A true condition selects the first branch.' }] }] };
  window.history.replaceState(null, '', `/#session=${session.id}`);
  vi.mocked(schoolApi.open).mockResolvedValue(review);
  vi.mocked(schoolApi.action).mockRejectedValue(new Error('Provider unavailable. Your session is unchanged.'));
  render(<SchoolApp />);
  await screen.findByText('A true condition selects the first branch.');
  expect(screen.queryByRole('button', { name: 'Try a fresh knowledge check' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Continue the conversation'), { target: { value: 'Help me understand branching' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
  await screen.findByRole('alert');
  expect(screen.getByLabelText('Continue the conversation')).toHaveValue('Help me understand branching');
  expect(screen.getByRole('button', { name: 'Review missed concepts with my mentor' })).toBeEnabled();
});

it('blocks new live requests with clear local sign-in status and supports a read-only recheck', async () => {
  vi.mocked(schoolApi.status).mockResolvedValueOnce({ provider: 'codex-chatgpt', configured: false, liveValidated: false, message: 'Local Codex ChatGPT sign-in required.' })
    .mockResolvedValue({ provider: 'codex-chatgpt', configured: true, liveValidated: false, message: 'Native ChatGPT sign-in available. Subscription limits apply.' });
  render(<SchoolApp />);
  await screen.findByText('Local Codex ChatGPT sign-in required.');
  fireEvent.change(screen.getByLabelText('Your question or learning goal'), { target: { value: 'Why do stars shine?' } });
  expect(screen.getByRole('button', { name: /Create my learning quest/ })).toBeDisabled();
  expect(schoolApi.create).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Recheck local Codex' }));
  await screen.findByText('Native ChatGPT sign-in available. Subscription limits apply.');
  expect(screen.getByRole('button', { name: /Create my learning quest/ })).toBeEnabled();
});

it('selects the restored roster, preserves preferences and reuses a custom reviewed teacher', async () => {
  vi.mocked(schoolApi.teachers).mockResolvedValue(HISTORICAL_TEACHERS);
  const custom = { ...HISTORICAL_TEACHERS[0], id: 'custom-hypatia', name: 'Hypatia of Alexandria', source: 'local-custom' };
  vi.mocked(schoolApi.createTeacher).mockResolvedValue(custom);
  vi.mocked(schoolApi.create).mockResolvedValue(session);
  render(<SchoolApp />);
  await screen.findByText('Configured locally, not live validated.');
  const library = screen.getByRole('region', { name: 'Historical teacher library' });
  expect(within(library).getAllByRole('button', { pressed: false })).toHaveLength(11);
  fireEvent.click(within(library).getByRole('button', { name: /Ada Lovelace/ }));
  expect(screen.getByLabelText(/A mentor you have in mind/)).toHaveValue('Ada Lovelace');
  fireEvent.change(screen.getByLabelText('Difficulty'), { target: { value: 'intermediate' } });
  fireEvent.change(screen.getByLabelText('Teaching style'), { target: { value: 'explanation' } });
  fireEvent.change(screen.getByLabelText('Time preference'), { target: { value: '20 minutes' } });
  fireEvent.click(screen.getByText('Create a reusable historical teacher'));
  expect(screen.getByText(/Formal teaching employment is not required/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Historical figure'), { target: { value: custom.name } });
  fireEvent.click(screen.getByRole('button', { name: 'Review identity and save teacher' }));
  await waitFor(() => expect(screen.getByLabelText(/A mentor you have in mind/)).toHaveValue(custom.name));
  expect(schoolApi.createTeacher).toHaveBeenCalledWith(custom.name);
  expect(within(library).getByText('Saved custom interpretation')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Your question or learning goal'), { target: { value: 'Explain geometry' } });
  fireEvent.click(screen.getByRole('button', { name: /Create my learning quest/ }));
  await screen.findByRole('heading', { name: session.title });
  expect(schoolApi.create).toHaveBeenCalledWith('Explain geometry', custom.name, { difficulty: 'intermediate', style: 'explanation', timeBudget: '20 minutes' });
});

it('keeps conversation evidence separate from quiz results and exposes honest presentation availability', async () => {
  const restored: SchoolSession = { ...session, assessments: [{ id: 'review-1', createdAt: session.updatedAt, throughMessageIndex: 0, summary: 'No independent explanation yet.', overall: 'uncertain', limitations: ['Not lasting mastery.'], objectives: session.objectives.map(objective => ({ objectiveId: objective.id, status: 'insufficient_evidence', evidence: [], gaps: ['A learner explanation is missing.'], nextSteps: ['Explain a new example.'] })) }],
    presentations: [{ id: 'request-1', kind: 'artifact', title: 'Sequence cards', description: 'An illustrative set of operation cards.', objectiveId: 'sequence', prompt: 'Museum-style object study; illustrative only.', status: 'pending', reason: 'No media created.', createdAt: session.updatedAt }] };
  window.history.replaceState(null, '', `/#session=${session.id}`);
  vi.mocked(schoolApi.open).mockResolvedValue(restored);
  vi.mocked(schoolApi.action).mockResolvedValue({ ...restored, revision: 2, presentations: restored.presentations!.map(item => ({ ...item, status: 'unavailable', reason: 'Unavailable: execution is not connected.' })) });
  render(<SchoolApp />);
  await screen.findByText('No independent explanation yet.');
  expect(screen.getByText(/Interaction: unspecified/)).toBeInTheDocument();
  expect(screen.getByText(/A static image or GLB does not establish playability/)).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Assessment result' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Check presentation availability' }));
  await screen.findByText('Unavailable: execution is not connected.');
  expect(schoolApi.action).toHaveBeenCalledWith(restored, 'presentation', { requestId: 'request-1' });
  fireEvent.click(screen.getByRole('button', { name: 'Review my conversation evidence' }));
  await waitFor(() => expect(schoolApi.action).toHaveBeenLastCalledWith(expect.objectContaining({ revision: 2 }), 'assess', {}));
});

it('does not apply an old preparation poll after moving to a different quest', async () => {
  let resolvePoll: (value: SchoolSession) => void = () => {};
  const pending: SchoolSession = { ...session, presentations: [{ id: 'initial-request', kind: 'artifact', title: 'Old exhibit', description: 'Old description', objectiveId: 'sequence', prompt: 'Old saved prompt', status: 'pending', reason: 'Preparing', createdAt: session.createdAt, origin: 'initial', version: 1, preparation: { status: 'preparing', token: 'old-token', fingerprint: 'old-fingerprint' } }] };
  window.history.replaceState(null, '', `/#session=${session.id}`);
  vi.mocked(schoolApi.open).mockResolvedValueOnce(pending).mockImplementationOnce(() => new Promise(resolve => { resolvePoll = resolve; }));
  const next: SchoolSession = { ...session, id: '00000000-0000-4000-8000-000000000002', title: 'A different quest', presentations: [] };
  vi.mocked(schoolApi.create).mockResolvedValue(next);
  render(<SchoolApp />);
  await screen.findByText('Old saved prompt');
  await waitFor(() => expect(schoolApi.open).toHaveBeenCalledTimes(2), { timeout: 2000 });
  fireEvent.click(screen.getByRole('button', { name: '+ Begin a new quest' }));
  fireEvent.change(screen.getByLabelText('Your question or learning goal'), { target: { value: 'Explore another question' } });
  fireEvent.click(screen.getByRole('button', { name: /Create my learning quest/ }));
  await screen.findByRole('heading', { name: 'A different quest' });
  resolvePoll({ ...pending, presentationRevision: 2, presentations: pending.presentations!.map(request => ({ ...request, prompt: 'Late stale result', preparation: { ...request.preparation!, status: 'ready' } })) });
  await waitFor(() => expect(screen.getByRole('heading', { name: 'A different quest' })).toBeInTheDocument());
  expect(screen.queryByText('Late stale result')).not.toBeInTheDocument();
});
