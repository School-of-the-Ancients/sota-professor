# Asynchronous Matrix Operator tool

The teacher's structured response may contain one `toolCalls` entry named `matrix_operator`, with `title`, `instruction` and `objectiveId` arguments. The server checks its shape, bounds and actual lesson objective, then persists a task linked to the teaching reply. Direct PC tools remain disabled in the teaching provider.

The Matrix client submits that task to the existing Operator queue and immediately leaves the lesson available for conversation. School's `operator-task-result` endpoint verifies the real Matrix task before updating the lesson. Requested, queued, running, completed, cancelled, failed and unconfirmed are distinct. A completed Operator turn is an attributed report, not independent proof of world geometry or scientific validity. The next teaching context receives the result; task requests and status are preserved in the shared journal.

Task retries preserve identity. Existing Operator permissions still apply, cancellation does not roll back world edits, and service restarts do not replay uncertain work automatically. The full School surface is available locally and on an explicitly USB-forwarded Quest with one-use learner pairing. Native full-duplex voice remains future work.

Tracked in [School #5](https://github.com/School-of-the-Ancients/sota-professor/issues/5) and [Matrix #212](https://github.com/School-of-the-Ancients/matrix-loading-operator/issues/212). Broader live voice remains [School #3](https://github.com/School-of-the-Ancients/sota-professor/issues/3).

## Conversational teaching

The user reports working mouth movement but too much uninterrupted speech. [School #7](https://github.com/School-of-the-Ancients/sota-professor/issues/7) now has a conversational policy applied to new replies in existing and new lessons: usually 2-4 spoken sentences, 30-70 words, one focused question or small action, then wait for the learner. The next reply responds to that answer rather than repeating the lesson introduction. Riko's useful spoken-style rules inform the adaptation: natural phrasing, no default lists/headings or canned sign-offs, and a consistent persona voice. Historical identity and factual honesty remain School's responsibility.

The policy distinguishes an image, a pending task, an Operator completion report and a verified loaded object. It invites observation of a relevant existing exhibit without claiming to see the student or silently starting another build. Explicit requests for more detail allow a longer reply. Saved earlier messages and quiz/assessment behavior are preserved.

The server checks the response before saving or speaking it: ordinary replies have a 110-word ceiling, requested detail has a 300-word ceiling, and either may contain at most one question. A reply that exceeds those bounds or emits unsupported animation markup is rewritten once; the original validated tool/presentation requests are retained exactly once. A failed rewrite saves no assistant reply and starts no task. There is no text truncation or automatic answer to the professor's own question.

Validation: 63 server tests, 26 UI tests, type checking and both builds pass. A five-turn native Codex check used an isolated synthetic Leonardo lesson: four ordinary replies were 44–61 words with at most one question; they adapted to the student's answer and correctly reported an unfinished model as pending. An explicit request for detail produced 199 words. No extra world task was requested. This is model/software evidence; the user's assessment of the new style in Quest remains to be collected.

The parallel visual TODOs remain [Matrix #214](https://github.com/School-of-the-Ancients/matrix-loading-operator/issues/214), appropriate curated teacher avatars with dynamic generation deferred, and [Matrix #215](https://github.com/School-of-the-Ancients/matrix-loading-operator/issues/215), fixing the rigid rest pose and adding natural motion. Riko's expression/emote tags belong to that future adapter; they are not emitted as spoken text.
