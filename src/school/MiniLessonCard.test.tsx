import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MiniLessonCard } from './MiniLessonCard';
import type { SchoolSession, MiniLesson } from './contracts';

afterEach(cleanup);
const mini: MiniLesson = { id: 'mini-1', title: 'Ordered operations', mode: 'guided', status: 'active', phase: 'learn',
  objective: { id: 'order', label: 'Explain the order' }, explanation: 'Operations use the previous result.', activity: 'What happens first?',
  reflection: 'Where else does order matter?', feedback: '', recap: '', nextStep: '', followUp: 'Try another procedure.', replyId: null, attempts: { try: 0, reflect: 0 }, evidence: [] };
const session = { id: 's', objectives: [mini.objective, { id: 'next', label: 'Next idea' }], quiz: null } as SchoolSession;

it('keeps the legacy conversation opt-in and offers the explicit guided controls', () => {
  const act = vi.fn(); const view = render(<MiniLessonCard session={session} busy={false} onAction={act} />);
  fireEvent.click(screen.getByRole('button', { name: 'Start mini-lesson' })); expect(act).toHaveBeenCalledWith('start');
  view.rerender(<MiniLessonCard session={{ ...session, miniLesson: mini }} busy={false} onAction={act} />);
  expect(screen.getByText('Step 1 of 4 · Learn')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Pause and talk freely' })); expect(act).toHaveBeenCalledWith('pause');
});

it('restores the saved activity, and ends with an honest review or next-lesson choice', () => {
  const view = render(<MiniLessonCard session={{ ...session, miniLesson: { ...mini, status: 'paused', phase: 'try', currentPrompt: 'Saved targeted clue?' } }} busy={false} onAction={() => {}} />);
  expect(screen.getByText('Saved targeted clue?')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Resume mini-lesson' })).toBeEnabled();
  view.rerender(<MiniLessonCard session={{ ...session, miniLesson: { ...mini, phase: 'recap', status: 'needs_review', recap: 'No success has been awarded.', nextStep: 'Review this idea.' } }} busy={false} onAction={() => {}} />);
  expect(screen.getByText('No success has been awarded.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Next mini-lesson' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Review this idea' })).toBeEnabled();
  view.rerender(<MiniLessonCard session={{ ...session, miniLesson: { ...mini, phase: 'recap', status: 'complete', recap: 'Practice finished.', nextStep: 'Try another procedure.' } }} busy={false} onAction={() => {}} />);
  expect(screen.getByRole('button', { name: 'Next mini-lesson' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Explore freely' })).toBeEnabled();
});
