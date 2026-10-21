import { randomUUID } from 'node:crypto';
import { HISTORICAL_TEACHERS, findTeacher } from '../src/school/personas.mjs';
import { requireValue, text, exact, strings } from './teaching.mjs';

export async function createTeacher(provider, input) {
  requireValue(exact(input, ['name']) && text(input.name, 160), 400, 'Name a historical teacher, up to 160 characters.');
  const known = findTeacher(input.name);
  if (known) return structuredClone(known);
  const identity = await provider.generate('identity', { requestedName: input.name.trim() });
  requireValue(exact(identity, ['status', 'name', 'era', 'reason', 'caveats'])
    && ['plausible', 'uncertain', 'not_historical'].includes(identity.status)
    && text(identity.name, 160) && text(identity.era, 160) && text(identity.reason, 1000) && strings(identity.caveats, 1, 5, 500), 502, 'Invalid historical identity review. No teacher was saved.');
  requireValue(identity.status === 'plausible', 422, `Historical identity remains ${identity.status.replace('_', ' ')}: ${identity.reason} Clarify the name; no teacher was saved. This is a model plausibility review, not historical verification.`);
  const profile = await provider.generate('teacher', { identity });
  requireValue(exact(profile, ['title', 'bio', 'greeting', 'expertise', 'passion', 'systemInstruction', 'suggestedPrompts'])
    && ['title', 'bio', 'greeting', 'expertise', 'passion'].every(key => text(profile[key], key === 'bio' ? 1500 : 600))
    && text(profile.systemInstruction, 6000) && profile.systemInstruction.length >= 180 && strings(profile.suggestedPrompts, 2, 4, 300),
  502, 'The provider returned an incomplete teacher persona. No teacher was saved.');
  return { id: `custom_${randomUUID()}`, name: identity.name, era: identity.era, ...profile,
    source: 'local-custom', identity: { ...identity, caveats: [...identity.caveats, 'Model plausibility review only; no independent historical verification.'] } };
}

export const teacherRoster = custom => [...HISTORICAL_TEACHERS, ...(custom || [])];

export async function reviewMentor(provider, plan, input, custom = []) {
  let proposed = findTeacher(input.mentor, custom) || findTeacher(plan.mentor.name, custom);
  // Explicit names outside the reusable library must be reviewed and saved first.
  requireValue(!input.mentor || findTeacher(input.mentor, custom), 422, 'Select a roster teacher or create and review this custom historical teacher first.');
  const review = await provider.generate('match', { goal: input.goal, preferences: input.preferences,
    quest: plan, preferredMentor: proposed?.name || '', explicitChoice: Boolean(input.mentor),
    availableTeachers: teacherRoster(custom).map(({ id, name, era, expertise }) => ({ id, name, era, expertise })) });
  requireValue(exact(review, ['mentorId', 'suitable', 'reason', 'caveats', 'alternatives']) && typeof review.suitable === 'boolean'
    && text(review.mentorId, 80) && text(review.reason, 1400) && strings(review.caveats, 0, 5, 500)
    && Array.isArray(review.alternatives) && review.alternatives.length >= 1 && review.alternatives.length <= 3
    && review.alternatives.every(item => exact(item, ['mentorId', 'reason']) && findTeacher(item.mentorId, custom) && text(item.reason, 600))
    && findTeacher(review.mentorId, custom), 502, 'The mentor-fit review was invalid. Nothing was saved.');
  requireValue(new Set(review.alternatives.map(item => item.mentorId)).size === review.alternatives.length
    && review.alternatives.every(item => item.mentorId !== review.mentorId), 502, 'The mentor alternatives must be distinct from the selected teacher.');
  requireValue(!input.mentor || review.mentorId === proposed.id, 502, 'The mentor review changed your explicit choice. Nothing was saved.');
  requireValue(review.suitable, 422, `Mentor fit needs reconsideration: ${review.reason} Alternatives: ${review.alternatives.map(item => `${findTeacher(item.mentorId, custom).name}: ${item.reason}`).join('; ') || 'clarify your goal'}`);
  proposed = findTeacher(review.mentorId, custom);
  return { mentor: { ...structuredClone(proposed), rationale: review.reason }, mentorReview: {
    ...review, alternatives: review.alternatives.map(item => ({ ...item, name: findTeacher(item.mentorId, custom).name })) } };
}
