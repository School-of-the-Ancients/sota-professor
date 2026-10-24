# Asynchronous Matrix Operator tool

The teacher's structured response may contain one `toolCalls` entry named `matrix_operator`, with `title`, `instruction` and `objectiveId` arguments. The server checks its shape, bounds and actual lesson objective, then persists a task linked to the teaching reply. Direct PC tools remain disabled in the teaching provider.

The Matrix client submits that task to the existing Operator queue and immediately leaves the lesson available for conversation. School's `operator-task-result` endpoint verifies the real Matrix task before updating the lesson. Requested, queued, running, completed, cancelled, failed and unconfirmed are distinct. A completed Operator turn is an attributed report, not independent proof of world geometry or scientific validity. The next teaching context receives the result; task requests and status are preserved in the shared journal.

Task retries preserve identity. Existing Operator permissions still apply, cancellation does not roll back world edits, and service restarts do not replay uncertain work automatically. The full School surface is available locally and on an explicitly USB-forwarded Quest with one-use learner pairing. Native full-duplex voice remains future work.

Tracked in [School #5](https://github.com/School-of-the-Ancients/sota-professor/issues/5) and [Matrix #212](https://github.com/School-of-the-Ancients/matrix-loading-operator/issues/212). Broader live voice remains [School #3](https://github.com/School-of-the-Ancients/sota-professor/issues/3).

## Next teaching UX

The user reports working mouth movement but too much uninterrupted speech. [School #7](https://github.com/School-of-the-Ancients/sota-professor/issues/7) records the next iteration: short, exhibit-led Socratic exchanges, one observation/action/question at a time, a pause for the learner, and an answer-dependent follow-up. Refer to a loaded exhibit only after its actual receipt; reuse it rather than creating another object for each turn. Longer explanation remains available when requested.

The parallel visual TODOs are [Matrix #214](https://github.com/School-of-the-Ancients/matrix-loading-operator/issues/214), appropriate curated teacher avatars with dynamic generation deferred, and [Matrix #215](https://github.com/School-of-the-Ancients/matrix-loading-operator/issues/215), fixing the rigid rest pose and adding natural motion. These are future tasks; the current update does not modify teaching prompts or animation.
