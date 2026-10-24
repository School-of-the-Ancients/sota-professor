# Asynchronous Matrix Operator tool

## Professor appearance

**Automatic match** uses the registered human catalog: curated matches for familiar historical figures, otherwise one bounded teaching-model choice based on the teacher and available visual descriptors. Riko and other uncurated imports remain manual choices. Picking an individual model pins it in the saved lesson; selecting Automatic again requests a new match. The chosen name and reason are shown before placement. This is an approximate representation, never an exact portrait claim.

Press **Update professor appearance** to apply a different model to an existing avatar without replacing the lesson, transcript, voice, object ID or transform. Selecting a model alone does not change the world or interrupt speech. New models are registered by the existing Matrix launcher; they are original geometric characters using the project license, with no downloaded character assets.

The teacher's structured response may contain one `toolCalls` entry named `matrix_operator`, with `title`, `instruction` and `objectiveId` arguments. The server checks its shape, bounds and actual lesson objective, then persists a task linked to the teaching reply. Direct PC tools remain disabled in the teaching provider.

The Matrix client submits that task to the existing Operator queue and immediately leaves the lesson available for conversation. School's `operator-task-result` endpoint verifies the real Matrix task before updating the lesson. Requested, queued, running, completed, cancelled, failed and unconfirmed are distinct. A completed Operator turn is an attributed report, not independent proof of world geometry or scientific validity. The next teaching context receives the result; task requests and status are preserved in the shared journal.

Task retries preserve identity. Existing Operator permissions still apply, cancellation does not roll back world edits, and service restarts do not replay uncertain work automatically. The full School surface is available locally and on an explicitly USB-forwarded Quest with one-use learner pairing. Native full-duplex voice remains future work.

Tracked in [School #5](https://github.com/School-of-the-Ancients/sota-professor/issues/5) and [Matrix #212](https://github.com/School-of-the-Ancients/matrix-loading-operator/issues/212). Broader live voice remains [School #3](https://github.com/School-of-the-Ancients/sota-professor/issues/3).

## Conversational teaching

## Exhibit gaze and pointing

Teaching turns now read a bounded scene summary from the existing local Matrix service when the live world contains this lesson's professor. Only object IDs, asset IDs and labels reach the teaching prompt; this is not image recognition. The provider can return one `avatarAction` (`none`, `look` or `point`) tied to a listed ID. School validates its membership and saves the runtime/room/object/asset-bound cue on the reply, outside spoken text. Unknown targets and unavailable Matrix context produce no gesture and do not block conversation.

Matrix revalidates the cue during actual audio playback, tracks a moved exhibit and drops removed/replaced or wrong-world targets. Gaze lasts through speech; pointing releases after six seconds or Stop. Original avatar/model bytes and saved world transforms are unchanged. The native-Codex synthetic cue test and desktop/real-rig checks passed; Quest wearer checks remain open in Matrix #215.

## Short spoken exchanges

The user reports working mouth movement but too much uninterrupted speech. [School #7](https://github.com/School-of-the-Ancients/sota-professor/issues/7) now has a conversational policy applied to new replies in existing and new lessons: usually 2-4 spoken sentences, 30-70 words, one focused question or small action, then wait for the learner. The next reply responds to that answer rather than repeating the lesson introduction. Riko's useful spoken-style rules inform the adaptation: natural phrasing, no default lists/headings or canned sign-offs, and a consistent persona voice. Historical identity and factual honesty remain School's responsibility.

The policy distinguishes an image, a pending task, an Operator completion report and a verified loaded object. It invites observation of a relevant existing exhibit without claiming to see the student or silently starting another build. Explicit requests for more detail allow a longer reply. Saved earlier messages and quiz/assessment behavior are preserved.

The server checks the response before saving or speaking it: ordinary replies have a 110-word ceiling, requested detail has a 300-word ceiling, and either may contain at most one question. A reply that exceeds those bounds or emits unsupported animation markup is rewritten once; the original validated tool/presentation requests are retained exactly once. A failed rewrite saves no assistant reply and starts no task. There is no text truncation or automatic answer to the professor's own question.

Validation: 63 server tests, 26 UI tests, type checking and both builds pass. A five-turn native Codex check used an isolated synthetic Leonardo lesson: four ordinary replies were 44–61 words with at most one question; they adapted to the student's answer and correctly reported an unfinished model as pending. An explicit request for detail produced 199 words. No extra world task was requested. This is model/software evidence; the user's assessment of the new style in Quest remains to be collected.

The parallel visual TODOs remain [Matrix #214](https://github.com/School-of-the-Ancients/matrix-loading-operator/issues/214), appropriate curated teacher avatars with dynamic generation deferred, and [Matrix #215](https://github.com/School-of-the-Ancients/matrix-loading-operator/issues/215), fixing the rigid rest pose and adding natural motion. Riko's expression/emote tags belong to that future adapter; they are not emitted as spoken text.


## Optional live voice adapter

October 24 priority review: Matrix/Loading Operator is School's spatial creation
module, retaining free-form sandbox creation. The owner is weighing a complete
mini-lesson/curriculum loop before premium voice. The [roadmap](ROADMAP.md) proposes
that order. This contract preserves the VisionClaw-inspired fast voice layer
in front of the existing native teaching/Operator backend when selected. It is
not a claim that live audio has been implemented.

| Boundary | Contract |
| --- | --- |
| Session | A voice session binds one learner, School session/teacher, optional current Matrix world and a connection generation. Never restore it against a different lesson. |
| Input | Partial transcripts update captions only. A provider-finalized/grouped utterance receives one stable event ID before teaching, scoring or world work; retries reuse that ID. |
| Fast response | Greetings, acknowledgements and repetition of current verified content may remain in the voice layer. Lesson decisions, scoring and new world actions delegate to the backend. |
| Backend result | Carry request/event ID, session revision, answer or next question, optional practice revision, and task handle/status/receipt. Drop stale results after teacher/world/session changes. |
| Interruption | Stop audible output and discard its queued audio; do not silently cancel an already accepted world task. Record what was actually spoken separately from the complete backend answer. |
| Tool status | Reuse current Operator queue and authorized endpoints. Distinguish accepted/running from observed completion; late results cannot speak over a new question without coordination. |
| Recovery | One microphone owner and one active output stream. Disconnect releases audio resources; reconnect preserves learner records, reconciles pending work and never automatically replays uncertain actions. |
| Fallback | Feature flag defaults off until configured. Text and existing push-to-talk remain available without a live-provider key. Never put durable provider secrets in the Quest page. |

First acceptance: two spoken questions, one interrupted answer and one real
background exhibit job during continued conversation; correct result narration,
no duplicate actions, preserved practice/quiz state, and reconnect recovery.
Record first-audible latency, interruption-to-silence, task status latency and
provider usage on desktop, then Quest. Set measurable targets from the actual
baseline; do not substitute response-finished timing for first-audible timing.

[Current OpenAI migration guidance](https://developers.openai.com/api/docs/guides/live-migration)
describes client delegation for keeping an existing agent behind GPT-Live.
Evaluate that adapter alongside the legacy Gemini Live reference; do not wire
both or assume old provider event names match current APIs. Provider selection,
account availability and a spending limit precede a paid live test. Existing
Codex sign-in remains the teaching backend, not a source of extracted API tokens.

Owner: [Professor #3](https://github.com/School-of-the-Ancients/sota-professor/issues/3).
