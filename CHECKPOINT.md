# Professor implementation checkpoint

Consolidated October 24, 2026: [Professor #14](https://github.com/School-of-the-Ancients/sota-professor/pull/14),
[Matrix #229](https://github.com/School-of-the-Ancients/matrix-loading-operator/pull/229)
and [Matrix #230](https://github.com/School-of-the-Ancients/matrix-loading-operator/pull/230).
The PR merge records identify the source checkpoint. See the [roadmap](docs/ROADMAP.md)
for the proposed mini-lesson, progression, curriculum-authoring and optional
live-voice milestone order.

## Implemented

- Native Codex teacher/goal/lesson/quiz/remediation, attributed durable journal,
  per-teacher voices and asynchronous Matrix Operator delegation (#5/#7 and follow-ups).
- P1/P2 avatar/cast/selection; P4 conversation during background creation;
  P5 persisted teacher bindings, pinned appearance and reusable roster.
- AR/VR goals, formal quiz answers/progress and creation status in the workspace.
  Static exhibit descriptions are hidden by default, with explicit show/read controls.
- Tracked Socratic practice: observe, explain, predict and transfer; one short
  question at a time, hints/revisions, explicit point answers and saved progress.
  School owns advancement and requires cited learner evidence beyond pointing.
- Answer-revealing labels disappear during questions and return for lecture/exploration.
  The pointer/highlight remains available so learners can identify their selection.
- Spoken start-quiz recognition tolerates filler and transcription variants;
  ordinary teaching does not pretend that a tracked practice session started.
- Hard conversation/practice turn caps removed. Full history remains saved;
  model requests use a bounded recent context window. This does not promise
  unlimited storage, memory or provider context.
- Fresh lessons prefer available locally upgraded teacher models; saved explicit
  appearance pins and old worlds remain intact.

## Validation and limits

Current source checks: **100 server tests, 27 UI tests, School typecheck and
standalone/Matrix UI builds; 910 Matrix runtime tests, 40 Professor service tests,
13 release-builder tests and Matrix production build**. Existing chunk-size
warnings remain. Automated and synthetic checks are separate from native-provider
and wearer evidence.

Recorded development use includes embodied dialogue during creation, part
selection and returning to saved lessons. A real tracked Ada practice session was
started without inventing learner responses. A complete fresh Quest Socratic
course, every recovery path and per-avatar performance are not accepted by these
checks. Preserve Matrix's [single acceptance record](https://github.com/School-of-the-Ancients/matrix-loading-operator/blob/main/Validation/V1.2-Headset-Acceptance.md)
and broader #187/#214/#215 owners.

## Remaining

- [#3](https://github.com/School-of-the-Ancients/sota-professor/issues/3): optional
  streaming voice, automatic turns, barge-in, reconnect and provider/cost evaluation.
- [#2](https://github.com/School-of-the-Ancients/sota-professor/issues/2): curriculum
  contract, two-lesson reviewed draft and EACL authoring comparison.
- [#4](https://github.com/School-of-the-Ancients/sota-professor/issues/4): reviewed
  template consumption, independent learner sessions and objective-linked exhibit reuse.

## Release identity and lineage

Published `v1.3.0-rc.1` remains Matrix
`e0135516f9357877d0a1657181fb001abcfe7640` / School
`a6c2934f267463714b72a14a980d1c472a798aaa`. The separate draft `v1.3.0-rc.2`
package pins Matrix `9e0158ec475e206d65eb3de070c3c1535ba24159` / School
`cc4896019a78fb0d0ea9e6bedeac7802e5ab1ef5`; it predates the new XR/Socratic
checkpoint and is not its distribution. Neither package is replaced by these merges.

Professor succeeds `sota-beta` from imported commit
`5bf4ba01c794b398b3121081c06dd3b6bf6684f4`. Its older Gemini/Supabase UI and
voice code remain historical references. [Earlier checkpoint](docs/archive/pre-embodied-CHECKPOINT.md)
and [beta roadmap](docs/archive/sota-beta-ROADMAP-2025-10-04.md) preserve that history.
Private footage, transcripts and learner records remain outside the repository.
