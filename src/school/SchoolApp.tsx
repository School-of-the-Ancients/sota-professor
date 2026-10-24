import { MiniLessonCard } from './MiniLessonCard';
import React, { useEffect, useRef, useState } from 'react';
import { CHARACTERS, QUESTS } from '../../constants';
import { schoolApi, type ProviderStatus, type SessionSummary } from './api';
import type { SchoolSession, Teacher, Preferences } from './contracts';
import { HISTORICAL_TEACHERS } from './personas.mjs';
import { QuestPreferences, TeacherLibrary, QuestDetail, LearningReview } from './RestorationPanels';
import { useOperator } from './useOperator';
import { DeviceLink } from './DeviceLink';

const button = 'rounded-lg bg-amber-200 px-5 py-3 text-sm font-bold text-stone-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40';
const secondary = 'rounded-lg border border-stone-600 px-4 py-2 text-sm text-stone-200 transition hover:border-amber-200 disabled:opacity-40';
const input = 'w-full rounded-lg border border-stone-600 bg-stone-950 p-3 text-stone-100 placeholder:text-stone-500 focus:border-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-200';
const labels = { learning: 'In conversation', quiz: 'Knowledge check', needs_review: 'Needs review', complete: 'Check passed' };

function sessionFromUrl() {
  const id = new URLSearchParams(window.location.hash.slice(1)).get('session');
  return id && /^[a-f0-9-]{36}$/.test(id) ? id : null;
}

const SchoolApp: React.FC = () => {
  const [provider, setProvider] = useState<ProviderStatus | null>(null);
  const [history, setHistory] = useState<SessionSummary[]>([]);
  const [session, setSession] = useState<SchoolSession | null>(null);
  const [goal, setGoal] = useState('');
  const [mentor, setMentor] = useState('');
  const [teachers, setTeachers] = useState<Teacher[]>(HISTORICAL_TEACHERS);
  const [customName, setCustomName] = useState('');
  const [preferences, setPreferences] = useState<Preferences>({ difficulty: 'beginner', style: 'balanced', timeBudget: '' });
  const [draft, setDraft] = useState('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState('');
  const [exhibitRefreshError, setExhibitRefreshError] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const currentSession = useRef(session);
  const busyRef = useRef(busy);
  currentSession.current = session;
  busyRef.current = busy;
  const operator = useOperator(session, async fields => {
    const saved = currentSession.current; if (!saved) return;
    const next = await schoolApi.action(saved, 'operator-result', fields);
    setSession(previous => previous?.id === next.id && next.revision >= previous.revision
      && (next.presentationRevision || 0) >= (previous.presentationRevision || 0) ? next : previous);
  }, async (sessionId?:string) => {
    const saved=currentSession.current;if((!saved&&!sessionId)||busyRef.current)return;
    const next=await schoolApi.open(sessionId||saved!.id);
    if(sessionId){setSession(next);window.history.replaceState(null,'',`#session=${next.id}`);return;}
    setSession(previous=>previous?.id===next.id&&next.revision>=previous.revision?next:previous);
  }, async(mode,catalogId)=>{
    const saved=currentSession.current;if(!saved||busyRef.current)throw Error('Finish the current teaching turn before changing appearance.');
    const next=await schoolApi.action(saved,'appearance',{mode,...(mode==='manual'?{catalogId}:{})});
    setSession(previous=>previous?.id===next.id&&next.revision>=previous.revision?next:previous);
    return next;
  });
  const preparingExhibit = session?.presentations?.some(request => request.preparation?.status === 'preparing') || false;
  const preparingAvatar = ['matching','queued','submitting','running'].includes(session?.appearance?.status || '');

  useEffect(() => {
    let cancelled = false;
    schoolApi.teachers().then(value => { if (!cancelled) setTeachers(value); }).catch(() => { if (!cancelled) setError('The saved teacher library could not be loaded. Your archive has not been changed; reopen the app before selecting a custom teacher.'); });
    Promise.all([schoolApi.status(), schoolApi.list()]).then(async ([status, saved]) => {
      if (cancelled) return;
      setProvider(status);
      setHistory(saved);
      const id = sessionFromUrl();
      if (id) {
        const restored = await schoolApi.open(id);
        if (!cancelled) setSession(restored);
      }
    }).catch(error => { if (!cancelled) setError(error instanceof Error ? error.message : 'Could not open the local School.'); })
      .finally(() => { if (!cancelled) setInitializing(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { end.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' }); }, [session?.messages.length]);
  useEffect(() => {
    if (!session || (!preparingExhibit && !preparingAvatar)) return;
    setExhibitRefreshError('');
    const id = session.id;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        if (!busyRef.current) {
          const next = await schoolApi.open(id);
          if (!stopped && !busyRef.current && currentSession.current?.id === id) {
            setExhibitRefreshError('');
            setSession(previous => previous?.id === id && next.revision >= previous.revision
              && (next.presentationRevision || 0) >= (previous.presentationRevision || 0) ? next : previous);
          }
        }
      } catch {
        if (!stopped && currentSession.current?.id === id) setExhibitRefreshError('Could not refresh preparation status. The last saved draft remains visible; no execution is confirmed.');
      }
      if (!stopped) timer = setTimeout(refresh, 1500);
    };
    timer = setTimeout(refresh, 500);
    return () => { stopped = true; clearTimeout(timer); };
  }, [session?.id, preparingExhibit, preparingAvatar]);

  const acceptSession = (next: SchoolSession) => {
    setSession(next);
    setAnswers({});
    window.history.replaceState(null, '', `#session=${next.id}`);
    const summary: SessionSummary = { id: next.id, title: next.title, mentorName: next.mentor.name, status: next.status, updatedAt: next.updatedAt };
    setHistory(previous => [summary, ...previous.filter(item => item.id !== next.id)]);
  };

  const run = async (operation: () => Promise<SchoolSession>, clearDraft = false) => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      acceptSession(await operation());
      if (clearDraft) setDraft('');
      return true;
    } catch (error) { setError(error instanceof Error ? error.message : 'The request failed. Reopen the session to check what was saved.'); return false; }
    finally { busyRef.current = false; setBusy(false); }
  };

  const sendMessage = (text: string) => session && text.trim() && run(() => schoolApi.action(session, 'message', { text }), true);
  const start = (event: React.FormEvent) => { event.preventDefault(); void run(() => schoolApi.create(goal, mentor, preferences)); };
  const createCustomTeacher = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const teacher = await schoolApi.createTeacher(customName);
      setTeachers(previous => [...previous.filter(item => item.id !== teacher.id), teacher]);
      setMentor(teacher.name); setCustomName('');
    } catch (error) { setError(error instanceof Error ? error.message : 'Teacher review failed.'); }
    finally { setBusy(false); }
  };
  const newQuest = () => {
    setSession(null); setDraft(''); setAnswers({}); setError('');
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  };
  const recheckCodex = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try { setProvider(await schoolApi.status()); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not check local Codex.'); }
    finally { setBusy(false); }
  };
  const download = () => {
    if (!session) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = `school-${session.id}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const latest = session?.attempts.at(-1);

  return <div className="min-h-screen bg-[#151715] text-stone-200">
    <header className="border-b border-stone-700/70 px-5 py-5 md:px-10">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <button onClick={newQuest} disabled={busy || initializing} className="text-left" aria-label="School of the Ancients home">
          <span className="block text-[10px] font-bold uppercase tracking-[0.3em] text-amber-200">A personal academy</span>
          <span className="font-serif text-xl text-stone-100">School of the Ancients</span>
        </button>
        <span className="rounded-full border border-stone-600 px-3 py-1 text-xs text-stone-400">Text-first beta · Local learning archive</span>
      </div>
    </header>
    <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 md:grid-cols-[220px_minmax(0,1fr)] md:px-10">
      <aside aria-label="Learning archive" className="space-y-6">
        <DeviceLink />
        <button className={`${secondary} w-full text-left`} onClick={newQuest} disabled={busy || initializing}>+ Begin a new quest</button>
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-stone-500">Your academy</h2>
          <p className="mb-4 text-xs text-stone-400">{history.filter(item => item.status === 'complete').length} checks passed · {history.length} quests</p>
          <nav aria-label="Saved quests" className="flex gap-2 overflow-x-auto md:block md:space-y-2">
            {history.map(item => <button key={item.id} disabled={busy || initializing} aria-current={session?.id === item.id ? 'page' : undefined}
              className={`min-w-40 rounded-lg border p-3 text-left disabled:opacity-50 md:w-full ${session?.id === item.id ? 'border-amber-200/60 bg-amber-200/5' : 'border-stone-700 hover:border-stone-500'}`}
              onClick={() => { setDraft(''); void run(() => schoolApi.open(item.id)); }}>
              <span className="block text-sm text-stone-100">{item.title}</span>
              <span className="mt-1 block text-xs text-stone-400">{item.mentorName} · {labels[item.status]}</span>
            </button>)}
            {!history.length && <p className="text-sm leading-relaxed text-stone-500">Your quests and conversations will appear here. Return to any one to pick up where you left off.</p>}
          </nav>
        </div>
        <p className="text-xs leading-relaxed text-stone-500">Sessions are saved on this computer and linked to this browser. Clearing its learner cookie loses access. Export records you want to keep.</p>
      </aside>
      <main className="min-w-0">
        {initializing && <p role="status">Opening your academy…</p>}
        {error && <div role="alert" className="mb-5 rounded-lg border border-red-400/50 bg-red-950/30 p-4 text-sm text-red-100">
          <p>{error}</p>
          {session && <button className={`${secondary} mt-3`} disabled={busy} onClick={() => void run(() => schoolApi.open(session.id))}>Reopen saved session</button>}
        </div>}
        {!session ? <div className="space-y-8">
          {operator.connected && <p role="status" className="text-sm text-teal-200">{operator.notice}</p>}
          <section className="border-b border-stone-700 pb-8 pt-4">
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-amber-200">Curiosity becomes a course</p>
            <h1 className="max-w-2xl font-serif text-4xl leading-tight text-stone-100 md:text-5xl">What would you like<br />to understand?</h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-stone-400">Bring a question. Meet a mentor from history. Build understanding through conversation, then put it to the test.</p>
          </section>
          <form onSubmit={start} className="space-y-5 rounded-2xl border border-stone-700 bg-stone-900/40 p-5 md:p-7">
            <div><label htmlFor="goal" className="mb-2 block text-sm font-bold text-stone-100">Your question or learning goal</label>
              <textarea id="goal" rows={3} maxLength={2000} required value={goal} onChange={event => setGoal(event.target.value)} disabled={busy}
                placeholder="I want to understand how an algorithm turns an idea into a sequence of steps…" className={input} /></div>
            <div><label htmlFor="mentor" className="mb-2 block text-sm font-bold text-stone-100">A mentor you have in mind <span className="font-normal text-stone-500">(optional)</span></label>
              <input id="mentor" list="mentors" maxLength={160} value={mentor} onChange={event => setMentor(event.target.value)} disabled={busy} className={input} placeholder="Choose for me, or name a historical figure" />
              <datalist id="mentors">{teachers.map(character => <option key={character.id} value={character.name}>{character.expertise}</option>)}</datalist>
              <p className="mt-2 text-xs text-stone-500">Name a historical figure, or leave blank for the best match. Missing mentors are reviewed and created automatically; their appearance can prepare while you talk. All mentors are AI interpretations.</p></div>
            <QuestPreferences value={preferences} onChange={setPreferences} disabled={busy} />
            <button type="submit" className={button} disabled={busy || initializing || !provider?.configured || !goal.trim()}>{busy ? 'Preparing your quest…' : 'Create my learning quest →'}</button>
            {provider && <div className="space-y-3"><p role="status" className={`text-xs leading-relaxed ${provider.configured ? 'text-stone-400' : 'text-amber-100'}`}>{provider.message}</p>
              <button type="button" className={secondary} disabled={busy} onClick={() => void recheckCodex()}>Recheck local Codex</button></div>}
          </form>
          <TeacherLibrary teachers={teachers} selected={mentor} onSelect={setMentor} customName={customName} onCustomName={setCustomName} onCreate={() => void createCustomTeacher()} disabled={busy || initializing || !provider?.configured} />
          <section aria-labelledby="quest-inspiration">
            <h2 id="quest-inspiration" className="mb-3 font-serif text-xl text-stone-100">A few doors into the academy</h2>
            <div className="grid gap-3 lg:grid-cols-3">{QUESTS.map(quest => <button key={quest.id} className="rounded-xl border border-stone-700 p-4 text-left transition hover:border-amber-200/60 disabled:opacity-50" disabled={busy}
              onClick={() => { setGoal(quest.objective); setMentor(CHARACTERS.find(character => character.id === quest.characterId)?.name ?? ''); document.getElementById('goal')?.focus(); }}>
              <span className="font-serif text-lg text-amber-100">{quest.title}</span><span className="mt-2 block text-xs leading-relaxed text-stone-400">{quest.description}</span>
            </button>)}</div>
            <p className="mt-3 text-xs text-stone-500">Starting points, not a prescribed curriculum. Your own topic is welcome.</p>
          </section>
        </div> : <div className="space-y-6">
          <section className="border-b border-stone-700 pb-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs uppercase tracking-widest text-amber-200">{labels[session.status]}</span>
              <button className={secondary} onClick={download}>Export learning record</button></div>
            <h1 className="font-serif text-3xl text-stone-100">{session.title}</h1>
            <p className="mt-3 text-sm text-stone-400">Your goal: {session.goal}</p>
            {operator.connected && <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="text-sm">Professor appearance <select aria-label="Professor appearance" className={input} disabled={busy||operator.matching||operator.placing} value={session.appearance?.mode==='manual'?operator.avatarId:'auto'} onChange={event=>void operator.selectAppearance(event.target.value)}>
                <option value="auto">Automatic match for {session.mentor.name}</option>
                {operator.avatars.map(avatar=><option key={avatar.catalogId} value={avatar.catalogId}>{avatar.displayName}</option>)}
              </select></label>
              {session.appearance?.mode!=='manual'&&<button className={secondary} disabled={busy||operator.matching||operator.placing} onClick={()=>void operator.selectAppearance('auto')}>Match again</button>}
              <button className={secondary} disabled={busy||operator.placing||operator.matching||!operator.avatars.length} onClick={operator.placeProfessor}>{operator.matching?'Matching appearance…':operator.placing?'Updating professor…':operator.hasProfessor?'Update professor appearance':'Place professor in Matrix'}</button>
              <div className="text-xs text-stone-400"><p>{operator.avatars.find(avatar=>avatar.catalogId===operator.avatarId)?.displayName} — {session.appearance?.reason||'Choose a model or automatic matching.'}</p><p>A stylized stand-in, not an exact historical likeness. Your teacher, voice and lesson stay the same.</p></div>
            </div>}
            <div className="mt-5 rounded-xl bg-stone-800/60 p-4"><h2 className="font-serif text-xl text-amber-100">{session.mentor.name}</h2>
              <p className="mt-1 text-xs text-stone-400">{session.mentor.era} · {session.mentor.expertise} · AI interpretation</p>
              <p className="mt-2 text-sm leading-relaxed text-stone-300">{session.mentor.rationale}</p></div>
            <QuestDetail session={session} />
            <details className="mt-4 text-sm" open><summary className="cursor-pointer text-stone-300">Three things to understand</summary>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-stone-400">{session.objectives.map(objective => <li key={objective.id}>{objective.label}</li>)}</ol></details>
          </section>
          <MiniLessonCard session={session} busy={busy || !provider?.configured} onAction={action => void run(() => schoolApi.action(session, 'mini-lesson', { action, requestId: crypto.randomUUID() }))} />
          <section aria-label="Teaching conversation" className="space-y-5">
            {session.operatorTasks?.length ? <section aria-label="Delegated Operator tasks" className="rounded-xl border border-teal-800 p-4">
              <h3>Operator tasks · continue the conversation while they run</h3>
              {session.operatorTasks.map(task=><p key={task.id} className="mt-2 text-sm">{task.title} — {task.status}</p>)}
            </section> : null}
            {session.conversation && <details className="rounded-xl border border-stone-700 p-4">
              <summary>Shared Professor / Operator transcript</summary>
              <p className="mt-2 text-xs text-stone-400">Direct Operator commands are context, not evidence of mastery. Interrupted speech may not have been heard in full.</p>
              {session.conversation.events.slice(-100).map(event=><article key={event.id} className="mt-3 whitespace-pre-wrap text-sm">
                <strong>{event.speaker} → {event.recipient}{event.speaker==='professor'?` · ${event.delivery}`:''}</strong><p>{event.text}</p>
              </article>)}
            </details>}
            {session.messages.map((message, index) => <article key={index} className={`rounded-xl p-5 ${message.role === 'user' ? 'ml-6 border border-stone-700 bg-stone-800/40' : 'border-l-2 border-amber-200/50 bg-stone-900/50'}`}>
              <h3 className={`mb-2 text-xs font-bold uppercase tracking-widest ${message.role === 'user' ? 'text-stone-400' : 'text-amber-200'}`}>{message.role === 'user' ? 'You' : session.mentor.name}</h3>
              <p className="whitespace-pre-wrap text-sm leading-7 text-stone-200">{message.text}</p>
            </article>)}
            {(session.presentations || []).filter(request => request.operator?.requestVersion === (request.version || 1)).map(request => <article key={`operator-${request.id}`} aria-label="Operator conversation update" className="rounded-xl border border-teal-800 bg-teal-950/20 p-5">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-teal-200">Operator · {request.title}</h3>
              <p className="text-sm leading-7">{request.operator!.summary}</p>
            </article>)}
            <div ref={end} />
          </section>
          {latest && <section aria-label="Assessment result" className={`rounded-xl border p-5 ${latest.passed ? 'border-emerald-700 bg-emerald-950/20' : 'border-amber-700 bg-amber-950/20'}`}>
            <h2 className="font-serif text-xl text-stone-100">{latest.passed ? 'Knowledge check passed' : 'Let’s revisit a few ideas'} · {latest.correct}/{latest.total}</h2>
            <p className="mt-2 text-sm text-stone-400">{latest.passed ? 'You answered every question correctly on this check. This is evidence from one short assessment, not proof of lasting mastery.' : 'Completion waits until every objective is covered correctly in a new check. Review the missed ideas with your mentor, then try fresh questions.'}</p>
            <ul className="mt-4 space-y-3 text-sm">{latest.feedback.filter(item => !item.correct).map((item, index) => <li key={index}>
              <p className="font-bold text-amber-100">{session.objectives.find(objective => objective.id === item.objectiveId)?.label}</p>
              <p className="mt-1 text-stone-300">{item.explanation}</p>
            </li>)}</ul>
            {session.status === 'needs_review' && !session.reviewCompleted && <button className={`${secondary} mt-4`} disabled={busy || !provider?.configured}
              onClick={() => void sendMessage('Help me review the concepts I missed, with a different example.')}>Review missed concepts with my mentor</button>}
          </section>}
          {session.quiz ? <form aria-label="Knowledge check" className="space-y-5 rounded-xl border border-stone-600 p-5" onSubmit={event => {
            event.preventDefault(); void run(() => schoolApi.action(session, 'answers', { quizId: session.quiz!.id, answers }));
          }}>
            <h2 className="font-serif text-2xl text-amber-100">Put your understanding to work</h2>
            <p className="text-sm text-stone-400">Every objective must be covered correctly to finish this quest. Take your time.</p>
            {session.quiz.questions.map((question, index) => <fieldset key={question.id} disabled={busy} className="space-y-2"><legend className="mb-3 text-sm font-bold text-stone-100">{index + 1}. {question.prompt}</legend>
              {question.options.map((option, choice) => <label key={choice} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${answers[question.id] === choice ? 'border-amber-200 bg-amber-200/5' : 'border-stone-700'}`}>
                <input type="radio" required name={question.id} value={choice} checked={answers[question.id] === choice} onChange={() => setAnswers(previous => ({ ...previous, [question.id]: choice }))} className="mt-1 accent-amber-200" />{option}
              </label>)}</fieldset>)}
            <button className={button} disabled={busy || Object.keys(answers).length !== session.quiz.questions.length}>{busy ? 'Saving your check…' : 'Check my understanding'}</button>
          </form> : <section className="space-y-4 border-t border-stone-700 pt-5">
            <form onSubmit={event => { event.preventDefault(); void sendMessage(draft); }} className="space-y-3">
              <label htmlFor="reply" className="block text-sm font-bold text-stone-100">Continue the conversation</label>
              <textarea id="reply" rows={3} maxLength={4000} value={draft} onChange={event => setDraft(event.target.value)} disabled={busy} className={input} placeholder="Share your thinking or ask a question…" />
              <div className="flex flex-wrap gap-3"><button className={button} disabled={busy || !provider?.configured || !draft.trim()}>{busy ? 'Your mentor is thinking…' : 'Send message'}</button>
                {!(session.miniLesson?.mode === 'guided' && session.miniLesson.status === 'active') && (session.status === 'learning' || (session.status === 'needs_review' && session.reviewCompleted)) && <button type="button" className={secondary} disabled={busy || !provider?.configured || !session.messages.some(message => message.role === 'user')}
                  onClick={() => void run(() => schoolApi.action(session, 'quiz'))}>{session.status === 'needs_review' ? 'Try a fresh knowledge check' : 'Ready for a knowledge check'}</button>}
                {session.status === 'complete' && <button type="button" className={secondary} disabled={busy} onClick={newQuest}>Explore another question</button>}
              </div>
            </form>
            {session.status !== 'complete' && <div className="flex flex-wrap gap-2" aria-label="Suggested replies">{session.suggestions.map((suggestion, index) => <button key={index} className={`${secondary} text-left text-xs`} disabled={busy} onClick={() => setDraft(suggestion)}>{suggestion}</button>)}</div>}
            <p className="text-xs text-stone-500">Saved after each successful turn. Your full conversation is restored for your mentor when you return. No microphone required.</p>
          </section>}
          {exhibitRefreshError && preparingExhibit && <p role="status" className="text-sm text-amber-100">{exhibitRefreshError}</p>}
          <LearningReview session={session} disabled={busy || !provider?.configured} operator={operator} onAction={(action, fields = {}) => run(() => schoolApi.action(session, action, fields))} />
          {busy && <p role="status" className="text-sm text-amber-100">Working on this request. Your saved session remains available.</p>}
        </div>}
        <footer className="mt-10 border-t border-stone-800 pt-5 text-xs leading-relaxed text-stone-500">Historically inspired teaching, with room for questions and correction. AI can make mistakes; verify consequential claims. Teaching uses native Codex with your ChatGPT sign-in on this computer and sends your goal and saved lesson context to OpenAI. Your plan, model and workspace limits apply. Keep the local School server running; this is a personal local app. No API-key fallback or ChatGPT history import. Direct PC tools and native live voice remain disabled. Requested Matrix tasks run through the existing Operator. Explicit Matrix image/background requests use its advertised native Codex capability; optional spatial creation stays in Matrix controls.</footer>
      </main>
    </div>
  </div>;
};

export default SchoolApp;
