import { randomUUID } from 'node:crypto';
import { HISTORICAL_TEACHERS, findTeacher } from '../src/school/personas.mjs';
import { requireValue, text, exact, strings } from './teaching.mjs';

export async function createTeacher(provider, input) {
  requireValue(exact(input, ['name']) && text(input.name, 160), 400, 'Name a real historical figure, up to 160 characters. Teaching employment is not required.');
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

export async function ensureTeacher(provider, name, custom = []) {
  const known = findTeacher(name, custom);
  if (known) return known;
  requireValue(custom.length < 30, 422, 'This archive has reached its limit of 30 custom teachers.');
  const created = await createTeacher(provider, { name });
  // Identity review may normalize a spoken name to an already saved person.
  const existing = findTeacher(created.name, custom);
  if (existing) return existing;
  custom.push(created);
  return created;
}

export async function reviewMentor(provider, plan, input, custom = []) {
  const requested = input.mentor.trim() || plan.requestedMentor?.trim() || '';
  const explicit = requested ? await ensureTeacher(provider, requested, custom) : null;
  const proposedName = explicit?.name || plan.mentor.name;
  const review = await provider.generate('match', { goal: input.goal, preferences: input.preferences,
    quest: plan, preferredMentor: proposedName, explicitChoice: Boolean(explicit),
    availableTeachers: teacherRoster(custom).map(({ id, name, era, expertise }) => ({ id, name, era, expertise })) });
  const named = Object.hasOwn(review || {}, 'mentorName');
  requireValue(exact(review, ['mentorId', ...(named ? ['mentorName'] : []), 'suitable', 'reason', 'caveats', 'alternatives']) && typeof review.suitable === 'boolean'
    && typeof review.mentorId === 'string' && review.mentorId.length <= 80
    && (named ? text(review.mentorName, 160) : !!findTeacher(review.mentorId, custom))
    && text(review.reason, 1400) && strings(review.caveats, 0, 5, 500)
    && Array.isArray(review.alternatives) && review.alternatives.length >= 1 && review.alternatives.length <= 3
    && review.alternatives.every(item => exact(item, ['mentorId', ...(named ? ['mentorName'] : []), 'reason'])
      && typeof item.mentorId === 'string' && item.mentorId.length <= 80
      && (named ? text(item.mentorName, 160) : !!findTeacher(item.mentorId, custom)) && text(item.reason, 600)),
    502, 'The mentor-fit review was invalid. Nothing was saved.');
  const selectionName = named ? review.mentorName.trim() : findTeacher(review.mentorId, custom).name;
  const selectedById = findTeacher(review.mentorId, custom);
  requireValue(!review.mentorId || selectedById?.name.toLowerCase() === selectionName.toLowerCase(), 502, 'The mentor name and saved identity disagree. Nothing was saved.');
  const alternatives = review.alternatives.map(item => ({ ...item, name: named ? item.mentorName.trim() : findTeacher(item.mentorId, custom).name }));
  requireValue(new Set(alternatives.map(item => item.name.toLowerCase())).size === alternatives.length
    && alternatives.every(item => item.name.toLowerCase() !== selectionName.toLowerCase()), 502, 'The mentor alternatives must be distinct from the selected teacher.');
  requireValue(!explicit || selectionName.toLowerCase() === explicit.name.toLowerCase(), 502, 'The mentor review changed your explicit choice. Nothing was saved.');
  requireValue(review.suitable, 422, `Mentor fit needs reconsideration: ${review.reason} Alternatives: ${alternatives.map(item => `${item.name}: ${item.reason}`).join('; ')}`);
  const proposed = explicit || await ensureTeacher(provider, selectionName, custom);
  return { mentor: { ...structuredClone(proposed), rationale: review.reason }, mentorReview: {
    ...review, mentorId: proposed.id, alternatives } };
}
