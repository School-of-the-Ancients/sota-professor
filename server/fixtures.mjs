export const plan = {
  title: 'From an idea to an algorithm',
  description: 'Trace a sequence, compare a conditional branch and work a terminating loop by hand.',
  durationEstimate: 'About 20 minutes, adaptable; no guaranteed outcome.',
  alternatives: [{ name: 'Aristotle', reason: 'A structured approach to logic.' }],
  mentor: { name: 'Ada Lovelace', era: '1815–1852', expertise: 'Analytical engines and mathematics', rationale: 'Her work connects symbolic ideas with ordered operations. Modern programming examples extend beyond her lifetime.' },
  objectives: [
    { id: 'sequence', label: 'Trace a sequence of algorithmic steps.' },
    { id: 'branch', label: 'Explain how a condition selects a branch.' },
    { id: 'loop', label: 'Predict when a loop terminates.' },
  ],
};
export const quiz = { questions: plan.objectives.map((objective, index) => ({
  objectiveId: objective.id,
  prompt: ['Starting at 1, add 2 then multiply by 3. What is the result?', 'If x is 5, what does “if x > 3 return A, otherwise B” return?', 'A counter starts at 0 and increases by 1 while below 3. What is its final value?'][index],
  options: [['9', '7', '6'], ['B', 'A', 'Both'], ['0', '2', '3']][index],
  answer: index,
  explanation: ['Operations execute in order: (1 + 2) × 3 = 9.', '5 > 3 is true, so the first branch returns A.', 'At 3 the condition is false, so the loop stops.'][index],
})) };

/** Tests only. This provider is never selectable by the running app. */
export function mockProvider() {
  return {
    calls: [], fail: false,
    status() { return { provider: 'test', configured: true, liveValidated: false, message: 'Mock provider; no live model.' }; },
    async generate(kind, context) {
      this.calls.push({ kind, context: structuredClone(context) });
      if (this.fail) throw new Error('private upstream detail');
      if (kind === 'practice') return {
        decision:context.task==='review'?'advance':context.task==='hint'?'scaffold':'probe',
        feedback:context.task==='opening'?'Let us explore how this illustrative machine carries motion.':'Your explanation connects input with motion.',
        question:context.task==='opening'?'Where would you supply effort to start this machine?':
          context.nextStage==='predict'?'What would happen if that connection came loose, and why?':
          context.nextStage==='transfer'?'How is this like turning a bicycle pedal?':'What about this connection helps you explain the motion?',
        evidenceQuote:context.task==='review'?context.learnerText:'',
        evidenceReason:context.task==='review'?'Connects an input action to a described result.':''};
      if (kind === 'plan') return structuredClone(plan);
      if (kind === 'exhibit') return { kind: 'artifact', title: 'Algorithm sequence cards', description: 'Three cards illustrating an ordered sequence of operations.', objectiveId: context.quest.objectives[0].id,
        learningIntent: 'Help the learner trace the operation sequence.', interaction: { requirement: 'none', description: 'A static explanatory exhibit only.', capabilities: [] } };
      if (kind === 'match') return { mentorId: 'ada_lovelace', suitable: true, reason: plan.mentor.rationale, caveats: ['Modern programming extends beyond her lifetime.'], alternatives: [{ mentorId: 'aristotle', reason: 'Structured logic.' }] };
      if (kind === 'assess') return { summary: 'Insufficient learner evidence for all objectives.', objectives: context.objectives.map(objective => ({ objectiveId: objective.id, status: 'insufficient_evidence', evidence: [], gaps: ['An independent explanation is missing.'], nextSteps: ['Explain a new example.'] })), limitations: ['Model review of a short conversation only.'] };
      if (kind === 'quiz') {
        const next = structuredClone(quiz);
        if (context.previousQuestions?.length) next.questions.forEach(question => { question.prompt = `New check ${context.previousQuestions.length}: ${question.prompt}`; });
        return next;
      }
      return { text: context.missedObjectiveIds?.length ? 'Let us revisit the missed branch with a different example. What if x were 2?' : 'An algorithm is an ordered set of steps. Starting with 1, add 2, then multiply by 3. What result do you predict?', suggestions: ['Can we trace another example?'] };
    },
  };
}
