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

## Proposed milestone order — learning loop before premium immersion

The owner reopened the priority decision after selecting voice: what is missing
is a coherent curriculum, finite mini-lessons and visible learner progression.
This is the proposed sequence for review, not a claim of implementation or a
new provider authorization. Live voice remains useful and optional.

| Order | Deliverable and acceptance | Owning issues |
| --- | --- | --- |
| 1. Finish one mini-lesson | A learner sees a small objective, brief explanation, attempt, reasoning/check, recap and a next step. A struggling learner reaches review or pause rather than endless questioning. Resume works. | [Professor #15](https://github.com/School-of-the-Ancients/sota-professor/issues/15); [School #7](https://github.com/School-of-the-Ancients/school-of-the-ancients/issues/7) |
| 2. Small curriculum and progression | Two reviewed lessons, stable prerequisites/objectives, course map, private enrollment/progress and a few evidence-backed achievements; two independent learners and reload/retry work. | [#16](https://github.com/School-of-the-Ancients/sota-professor/issues/16), [#4](https://github.com/School-of-the-Ancients/sota-professor/issues/4), Matrix #211 |
| 3. EACL-assisted curriculum authoring | Map and evaluate one generated two-lesson draft against the authored/native baseline; check citations, alignment, human review effort, latency and cost. Approve before catalog use. | [#2](https://github.com/School-of-the-Ancients/sota-professor/issues/2) |
| 4. Optional live conversation | One feature-flagged voice provider feeds the same lesson/progression and existing tool backend; interruption, background work and reconnect preserve state. | [#3](https://github.com/School-of-the-Ancients/sota-professor/issues/3) |

The smallest curriculum contract is part of milestone 2, before coupling an
external generator to it. EACL source evaluation can continue in parallel; the
full upstream stack is not needed to prove that one lesson is useful.

### 1. Finite learning, open-ended exploration

Use a 5–10 minute lesson design target, not a wall-clock cutoff or a conversation
turn cap. The guided path is goal → explain/example → try/predict → reason/check
→ recap → next lesson or targeted review. The server owns persisted phase and
completion; free Ask more / Explore mode stays available after the recap.

Reuse current formal checks and Socratic evidence. Four practice milestones do
not automatically pass the formal quiz. Distinguish lesson finished, needs review,
check passed and longer-term mastery. An unsuccessful attempt should produce a
helpful next action, not an infinite retry requirement. The existing ten-formal-
assessment limit also needs a record-preserving continuation/review policy.

First pilot: Ada and the Analytical Engine, with one narrow concept and one
optional existing exhibit. Browser text/push-to-talk works without Matrix; AR
presents the same phase and completion state. No new world is created for a
planning or automated test.

### 2. Curriculum and motivation

Keep reusable CoursePlan/LessonTemplate/objective IDs separate from private
learner enrollment, evidence, attempts and achievements. Pin each enrollment to
its reviewed course version. Show current lesson, what was demonstrated and why
a particular lesson/review comes next. Start with a few meaningful achievements:
finished a first lesson, revised an explanation, transferred an idea. Award them
once from persisted events, not message counts. Hints are learning support, not
penalties. Avoid gating core study behind streaks or a premium feature.

### 3. EACL is an authoring candidate

The [pinned review](RESEARCH_INSTRUCTIONAL_AGENTS_EACL26.md) covers the EACL 2026
Instructional Agents code, license and dependencies. It is a possible producer
of reviewed course drafts, not the learner progression engine. Start with two
lessons and one optional immutable Matrix asset reference. Compare the draft
with the small baseline before adopting any upstream dependency or paid run.

### 4. Voice provider review

Architectural preference: evaluate GPT-Live client delegation first because it
explicitly supports an existing backend and application-owned context. This is
a fit assessment, not a latency/quality/cost benchmark or account-access check.

| Option | Fit | Cost / tradeoff checked October 24 |
| --- | --- | --- |
| Existing native text + local STT/TTS | Preserve as default and fallback; no new voice API integration. | Existing account/hardware costs; less natural turn-taking. |
| GPT-Live 1 + client delegation | Voice handles listening/speaking; our backend keeps lesson, scoring and tool authority. | Published $0.05/session minute, billed per second, plus any separately billed backend/tool usage. Ten connected minutes cost $0.50 for voice alone. |
| Gemini Live | Strong voice/vision candidate; WebSocket PCM, transcripts, barge-in and tool calls. | Token/audio usage pricing, context and model-specific asynchronous-tool behavior need measurement; no fixed per-session comparison is asserted. |
| OpenAI Realtime | Alternative speech/tool interface, also seen in current VisionClaw. | Token billing and a more application-owned speech/tool orchestration loop; benchmark only if the first candidate misses requirements. |

[GPT-Live client delegation](https://developers.openai.com/api/docs/guides/live-delegation)
lets the application run an existing agent and validate its results.
[OpenAI pricing](https://developers.openai.com/api/docs/pricing),
[Gemini Live](https://ai.google.dev/gemini-api/docs/live-api),
[tool behavior](https://ai.google.dev/gemini-api/docs/live-api/tools) and
[Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) are the checked
primary references. Choose the exact model at the pilot; do not copy an old
sample's model ID or assume all Gemini Live models have the same tool lifecycle.

[VisionClaw source](https://github.com/Intent-Lab/VisionClaw/tree/3f39807058c5ddf9faf763de3cbc70aa0b5f6fad)
now contains a LiveKit agent with Google/OpenAI voice options and a hosted action
gateway, beyond the README's simpler Gemini/OpenClaw diagram. Its useful pattern
is responsive audio plus asynchronous backend work and later result delivery.
Reuse that pattern, not its mobile SDK/hosted agent stack: Matrix already renders
and School/Operator already hold authoritative state. No need to replace them
with OpenClaw, LiveKit or another managed agent to test voice.

The [voice contract](PROFESSOR_DELEGATION.md#optional-live-voice-adapter) remains:
one microphone owner; one shared attributed journal; stable session/turn IDs;
finalized learner evidence only; verified backend results; interruption stops
speech without implicitly cancelling a world task; reconnect does not replay
uncertain actions. Keep provider secrets on the PC, a visible Stop/mute, and
text/push-to-talk fallback. No provider calls or installs occur in this review.

## Website and later work

The [public site](https://schooloftheancients.com/) describes the intended
curriculum/mentor/Matrix combination, but still has unchecked world-loader,
mentor and Socratic milestones despite the current source checkpoint. A later
content update should distinguish implemented prototype, remaining acceptance
and future curriculum/voice/multiplayer. Planning does not publish a new site.

Keep multiplayer, autonomous faculty/company, broad content marketplace and
large-scale public onboarding after the small learner loop. Maintain the existing
avatar, recovery and Quest acceptance work without making every art improvement
a prerequisite for the browser lesson pilot.

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
