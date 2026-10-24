import type { SchoolSession } from './contracts';

export function MiniLessonCard({ session, busy, onAction }: {
  session: SchoolSession; busy: boolean; onAction: (action: string) => void;
}) {
  const mini = session.miniLesson;
  const active = mini?.mode === 'guided' && mini.status === 'active';
  const ended = mini?.status === 'complete' || mini?.status === 'needs_review';
  const covered = new Set([...(session.miniLessonHistory || []), mini].filter(m => m?.status === 'complete').map(m => m!.objective.id));
  const disabled = busy || !!session.quiz || session.practice?.status === 'active';
  const button = (action: string, label: string) => <button key={action} type="button" disabled={disabled}
    className="rounded-lg border border-teal-700 px-3 py-2 text-sm disabled:opacity-40" onClick={() => onAction(action)}>{label}</button>;
  return <section aria-label="Guided mini-lesson" className="space-y-3 rounded-xl border border-teal-700 bg-teal-950/20 p-5">
    <h2 className="font-serif text-xl text-teal-100">{mini?.title || 'Learn one idea in a mini-lesson'}</h2>
    {!mini ? <p className="text-sm">A short explanation, an activity, a reflection and a clear ending. Free conversation stays available.</p> : <>
      <p className="text-sm text-teal-200">{mini.status === 'paused' ? 'Paused · free conversation' : ended ? (mini.status === 'complete' ? 'Mini-lesson finished' : 'Ready for review') :
        `Step ${['learn', 'try', 'reflect', 'recap'].indexOf(mini.phase) + 1} of 4 · ${{ learn: 'Learn', try: 'Try', reflect: 'Reflect', recap: 'Recap' }[mini.phase]}`}</p>
      <p className="text-sm text-stone-400">{mini.objective.label}</p>
      <p className="whitespace-pre-wrap text-sm">{ended ? mini.recap : mini.phase === 'learn' ? mini.explanation : mini.currentPrompt || (mini.phase === 'try' ? mini.activity : mini.reflection)}</p>
      {mini.feedback && !ended && <p className="text-sm text-teal-200">{mini.feedback}</p>}
      {ended && <p className="text-sm text-amber-200">Next step: {mini.nextStep}</p>}
    </>}
    <div className="flex flex-wrap gap-2">
      {!mini && button('start', 'Start mini-lesson')}
      {active && mini.phase === 'learn' && button('continue', 'Try the activity')}
      {active && button('pause', 'Pause and talk freely')}
      {(active || mini?.status === 'paused') && button('finish', 'Finish with a recap')}
      {mini?.status === 'paused' && button('resume', 'Resume mini-lesson')}
      {ended && button('review', 'Review this idea')}
      {mini?.status === 'complete' && covered.size < session.objectives.length && button('next', 'Next mini-lesson')}
      {ended && mini.mode !== 'free' && button('explore', 'Explore freely')}
    </div>
    {active && mini.phase !== 'learn' && <p className="text-sm text-stone-400">Answer below or speak to your professor. You can ask for a clue.</p>}
    {disabled && !busy && <p className="text-sm text-stone-400">Finish or pause the current quiz/practice first.</p>}
  </section>;
}
