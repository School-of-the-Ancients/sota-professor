import { randomUUID } from 'node:crypto';
import { exact, text, strings, requireValue } from './teaching.mjs';

export const learnerContributions = session => session.messages.flatMap((message, messageIndex) => message.role === 'user' ? [{ messageIndex, text: message.text }] : []);
export async function assessConversation(provider, session) {
  const contributions = learnerContributions(session);
  const assessment = contributions.length ? await provider.generate('assess', { goal: session.goal, objectives: session.objectives, learnerContributions: contributions }) : {
    summary: 'No learner contributions yet. Understanding remains uncertain.',
    objectives: session.objectives.map(objective => ({ objectiveId: objective.id, status: 'insufficient_evidence', evidence: [], gaps: ['No learner contribution to assess.'], nextSteps: ['Explain or apply this idea in your own words.'] })),
    limitations: ['A conversation review cannot establish lasting mastery.'],
  };
  requireValue(exact(assessment, ['summary', 'objectives', 'limitations']) && text(assessment.summary, 1600)
    && strings(assessment.limitations, 1, 5, 500) && Array.isArray(assessment.objectives)
    && assessment.objectives.length === session.objectives.length
    && new Set(assessment.objectives.map(item => item.objectiveId)).size === session.objectives.length
    && assessment.objectives.every(item => exact(item, ['objectiveId', 'status', 'evidence', 'gaps', 'nextSteps'])
      && session.objectives.some(objective => objective.id === item.objectiveId)
      && ['demonstrated', 'gaps', 'insufficient_evidence'].includes(item.status)
      && strings(item.gaps, item.status === 'demonstrated' ? 0 : 1, 5, 600) && strings(item.nextSteps, 1, 4, 600)
      && Array.isArray(item.evidence) && item.evidence.length <= 4
      && (item.status !== 'demonstrated' || (item.evidence.length > 0 && item.gaps.length === 0))
      && (item.status !== 'insufficient_evidence' || item.evidence.length === 0)
      && item.evidence.every(evidence => exact(evidence, ['messageIndex', 'quote', 'explanation'])
        && Number.isInteger(evidence.messageIndex) && text(evidence.quote, 800) && text(evidence.explanation, 800)
        && contributions.some(contribution => contribution.messageIndex === evidence.messageIndex && contribution.text.includes(evidence.quote)))),
  502, 'Conversation assessment evidence was invalid or not grounded in your contributions. No assessment was saved.');
  return { id: randomUUID(), createdAt: new Date().toISOString(), throughMessageIndex: session.messages.length - 1, ...assessment,
    overall: assessment.objectives.every(item => item.status === 'demonstrated') ? 'demonstrated_in_conversation'
      : assessment.objectives.some(item => item.status === 'gaps') ? 'gaps' : 'uncertain',
    limitations: [...assessment.limitations, 'Model interpretation of these contributions only; separate from quiz score and not evidence of lasting mastery.'] };
}
