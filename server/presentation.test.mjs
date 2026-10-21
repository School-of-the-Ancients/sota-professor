import { test } from 'node:test';
import assert from 'node:assert/strict';
import { presentationRecords, presentationHandoff, validateReceiptShape, presentationProgress } from './presentation.mjs';

const session = { id: 'synthetic-session', mentor: { name: 'Hypatia', era: 'Late antiquity' }, objectives: [{ id: 'proof', label: 'Explain the parallel-line angle proof.' }] };
const request = { kind: 'artifact', title: 'Movable angle cards', description: 'Three clearly visible cards showing triangle angles.', objectiveId: 'proof', learningIntent: 'Rearrange angles to investigate a proof, without treating a picture as proof.', interaction: { requirement: 'required', description: 'Move and rotate individual cards.', capabilities: ['move', 'rotate'] } };
const handoff = () => presentationHandoff(session, presentationRecords([request], session)[0]);
const receipt = (input, status) => ({ requestId: input.requestId, adapterId: 'synthetic-contract-test-only', status, concept: { id: 'synthetic-selected-concept', version: 2 }, asset: { id: 'synthetic-asset', format: 'glb', validation: 'validated_glb' } });

test('handoff preserves objective, educational intent, interaction requirements and visual prompt separately', () => {
  const input = handoff();
  assert.deepEqual(input.learningObjective, session.objectives[0]);
  assert.equal(input.learningIntent, request.learningIntent);
  assert.deepEqual(input.requestedInteraction, request.interaction);
  assert.match(input.visualPrompt, /Museum-style/);
  assert.match(input.visualPrompt, /not.*interactive scientific simulation/);
  const legacy = { ...request }; delete legacy.learningIntent; delete legacy.interaction;
  const old = presentationHandoff(session, presentationRecords([legacy], session)[0]);
  assert.equal(old.requestedInteraction.requirement, 'unspecified');
  assert.equal(old.learningIntent, legacy.description);
});

test('generated mockup, generated GLB and loaded object never satisfy required movable interaction', () => {
  const input = handoff();
  const mockup = { ...receipt(input, 'mockup_generated'), asset: { id: 'synthetic-image', format: 'image', validation: 'generated' } };
  assert.equal(presentationProgress(input, mockup).assetGenerated, false);
  assert.equal(presentationProgress(input, mockup).fulfilled, false);
  assert.equal(presentationProgress(input, receipt(input, 'asset_generated')).fulfilled, false);
  const loaded = { ...receipt(input, 'object_loaded'), object: { runtimeId: 'synthetic-desktop-runtime', objectId: 'synthetic-loaded-object' } };
  const result = presentationProgress(input, loaded);
  assert.equal(result.objectLoaded, true);
  assert.equal(result.interactionVerified, false);
  assert.equal(result.fulfilled, false);
});

test('interaction receipts require specific capability evidence and preserve automated versus wearer evidence', () => {
  const input = handoff();
  const verified = { ...receipt(input, 'interaction_verified'), object: { runtimeId: 'synthetic-runtime', objectId: 'synthetic-object' }, interaction: { capabilities: ['move'], evidence: { kind: 'automated', reference: 'synthetic-test-report' } } };
  assert.equal(presentationProgress(input, verified).fulfilled, false);
  verified.interaction.capabilities.push('rotate');
  const result = presentationProgress(input, verified);
  assert.equal(result.fulfilled, true);
  assert.equal(result.evidenceKind, 'automated');
  assert.notEqual(result.evidenceKind, 'headset_wearer');
  // These are fabricated contract fixtures, not runtime execution evidence.
});

test('stale concept shape, missing runtime/object/evidence and ambiguous confirmed receipts fail closed', () => {
  const input = handoff();
  const loaded = { ...receipt(input, 'object_loaded'), object: { runtimeId: 'synthetic-runtime', objectId: 'synthetic-object' } };
  const invalid = [
    { ...loaded, requestId: 'other-request' }, { ...loaded, concept: { id: 'concept', version: 0 } },
    { ...loaded, object: { runtimeId: 'runtime' } }, { ...loaded, asset: { ...loaded.asset, validation: 'generated' } },
    { ...loaded, status: 'confirmed' }, { ...loaded, status: 'interaction_verified' },
    { ...loaded, status: 'interaction_verified', interaction: { capabilities: ['move'], evidence: { kind: 'headset_wearer', reference: '' } } },
  ];
  for (const value of invalid) assert.throws(() => validateReceiptShape(value, input), /receipt|identity/);
  assert.throws(() => validateReceiptShape(loaded, input, { id: loaded.concept.id, version: 1 }), /selected concept version/);
  assert.throws(() => validateReceiptShape(loaded, input, { id: 'different-concept', version: 2 }), /selected concept version/);
  const unavailable = { requestId: input.requestId, adapterId: 'not-connected', status: 'unavailable', reason: 'No adapter is connected.' };
  assert.equal(presentationProgress(input, unavailable).fulfilled, false);
});

test('invalid or contradictory interaction requests cannot become pending executable work', () => {
  for (const interaction of [{ ...request.interaction, capabilities: [] }, { ...request.interaction, requirement: 'none' }, { ...request.interaction, capabilities: ['shell'] }]) {
    assert.throws(() => presentationRecords([{ ...request, interaction }], session), /invalid presentation/);
  }
});
