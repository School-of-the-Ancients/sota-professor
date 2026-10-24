# School of the Ancients — Professor roadmap

Updated October 24, 2026. [Checkpoint](../CHECKPOINT.md) records shipped source
and validation; GitHub issues own acceptance. These are tracker issues, not
GitHub milestone objects. The [2025 beta roadmap](archive/sota-beta-ROADMAP-2025-10-04.md)
is preserved as history, not the current queue.

## Current checkpoint: embodied, interactive learning

Professor is the current successor to [sota-beta](https://github.com/School-of-the-Ancients/sota-beta).
Its active SchoolApp and native Codex backend retain the goal → mentor → teach →
practice → review loop. The predecessor's Gemini Live, Supabase and quest UI are
reference implementations, not automatically active features of Professor.

| Slice | Current status | Remaining boundary |
| --- | --- | --- |
| P1/P2: embodied teacher and catalog | Implemented; original VRoid cast, teacher matches and manual/pinned selection. | Per-avatar art, performance and hardware coverage: Matrix #214/#215. |
| P4: teach while an exhibit is prepared | Implemented core; asynchronous Operator tasks, progress and continued conversation. | Cancellation/failure/reconnect and broader integration: Matrix #187/#31. |
| P5: persistent teacher and reusable roster | Implemented core; compatible bindings, saved selections and lesson restoration. | Complete missing-asset/rebinding/device matrix remains explicit acceptance work. |
| Interactive AR learning | Goals, formal quiz/progress, creation status and Socratic point-and-speak practice are implemented in Professor #14 / Matrix #230. | Full Quest scenario acceptance remains in Matrix's existing record. |
| P3: natural live conversation | Current push-to-talk → transcription → native response → local speech works. | Streaming audio, automatic turns and barge-in remain [#3](https://github.com/School-of-the-Ancients/sota-professor/issues/3). P3 is not a prerequisite for the implemented P4/P5. |
| Reusable curriculum | Research and reuse foundations exist. | No reviewed, versioned CoursePlan library or automatic curriculum preload yet. |

## Next milestone: fast live voice with the existing backend

The owner selected [#3](https://github.com/School-of-the-Ancients/sota-professor/issues/3)
on October 24: a VisionClaw-inspired fast conversational layer plus slower
teaching/tool execution. Start with a provider-neutral session contract, then
one optional provider and one teacher. Preserve current text/push-to-talk,
Socratic state, world receipts and concurrent background creation.

Matrix/Loading Operator is the spatial creation module within School of the
Ancients. Its free-form AR sandbox remains available through Operator; the
Professor route adds teaching and learning records. This product relationship
does not require merging repositories or duplicating runtime authority.

Acceptance: one microphone owner; two natural questions; interrupt an answer;
continue talking during a real background task; speak its observed result;
reconnect without duplicate turns/actions; preserve saved lesson and quiz
progress. Test desktop first, then Quest separately. Select credentials/provider
and a spending limit before a paid live-provider test.

## Following milestone: reviewed curriculum pilot

Track authoring/evaluation in [#2](https://github.com/School-of-the-Ancients/sota-professor/issues/2)
and lesson consumption/reuse in [#4](https://github.com/School-of-the-Ancients/sota-professor/issues/4).
Start with a contract and two-lesson draft; keep it usable without Matrix.

1. Define versioned CoursePlan/LessonTemplate/objective IDs, citations, prerequisites,
   assessment rubrics, review state and optional immutable Matrix asset references.
2. Prepare a small Ada Lovelace / Analytical Engine course: observe and explain
   operations/data, then predict and transfer the idea of a general procedure.
   Distinguish historical evidence from an illustrative reconstruction.
3. Require evidence in the learner's own explanation, revision, prediction and
   transfer. Pointing identifies attention; it does not alone establish mastery.
   Keep hints, retry and reflection; progress rewards demonstrated understanding.
4. Review the draft before publication, instantiate two independent learner sessions,
   preserve private answers/progress, and exercise quiz → remediation → reload.
5. Reuse one approved exhibit through Matrix #211 when available. Missing or slow
   3D must not block teaching or silently edit an existing world.

The first step can use authored fixtures and the existing native provider. The
EACL 2026 Instructional Agents candidate is a separate evaluated authoring option:
its API configuration, dependencies and cost require a decision before running
it. No new paid service, upstream installation or public publication is selected
by this checkpoint consolidation.

## Live voice implementation boundaries

[#3](https://github.com/School-of-the-Ancients/sota-professor/issues/3) should first
specify one microphone owner, session/turn IDs, final transcript synchronization,
interruption, cancellation and stale-response handling. Use one feature flag and
preserve text/push-to-talk. Select a provider and spending limit before an API
experiment. School remains the authority for assessment; voice cannot independently
award progress or issue privileged Matrix commands.

## Educational direction and evidence

The [education framework](https://github.com/School-of-the-Ancients/research/blob/main/Ancient%20Educational%20Philosophies%20and%20a%20Modern%20AI-Era%20Framework.pdf),
pp. 9–12, proposes Socratic dialogue, experiential learning, reasoning-based oral
assessment, reflection and learning-aligned rewards. The implemented practice
loop addresses part of that direction. Source criticism, portfolios, peer review,
broad interdisciplinary curricula and learning-efficacy evaluation remain future
work; a proposal or successful demo is not educational validation.

Keep the existing Matrix acceptance record and frozen releases. A source merge
is not a new tested distribution. Do not reset learner histories or scenes to
make a checkpoint look clean.
