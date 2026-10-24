# Professor implementation checkpoint

Reviewed October 24, 2026 against School `a6c2934f267463714b72a14a980d1c472a798aaa`
and the paired Matrix `v1.3.0-rc.1` source
`e0135516f9357877d0a1657181fb001abcfe7640`.

## Delivered bounded work

- [#5](https://github.com/School-of-the-Ancients/sota-professor/issues/5): shared
  conversation, Matrix voice target, avatar/lesson binding and asynchronous
  Operator handoff. Merged #6, with follow-ups through #12.
- [#7](https://github.com/School-of-the-Ancients/sota-professor/issues/7): short,
  exhibit-led dialogue with one focused student action/question. Native fixture
  checks and recorded Quest exchanges cover follow-up after a student's answer.
- The Matrix companion adds per-teacher local voices, idle/talking motion,
  grounded part attention, explicit student selection and transient virtual-view
  input. The teacher remains separated from privileged world execution.

These close bounded implementation checkpoints, not every integration or device
requirement. The single Matrix [acceptance record](https://github.com/School-of-the-Ancients/matrix-loading-operator/blob/main/Validation/V1.2-Headset-Acceptance.md)
distinguishes source, extracted-package and wearer evidence.

## Partial and future work

| Issue | What exists | Still required |
| --- | --- | --- |
| [#3](https://github.com/School-of-the-Ancients/sota-professor/issues/3) — live voice | Durable transcript and concurrent slow Operator tasks. | Streaming speech-to-speech, turn detection, interruption/reconnect evaluation and provider decision. |
| [#4](https://github.com/School-of-the-Ancients/sota-professor/issues/4) — reuse-first lessons | Local exhibit/appearance lookup and background task foundations. | Reviewed lesson templates, objective-driven automatic preload, two independent learner sessions, reuse/failure/latency evaluation. |
| [#2](https://github.com/School-of-the-Ancients/sota-professor/issues/2) — curriculum research | Research/mapping proposal. | Provider/cost decision, reproducible evaluation, typed reviewed CoursePlan and adopt/adapt/reject decision. |

Matrix retains broader integration/recovery (#187/#31), avatar art and generation
reliability (#214), per-model motion/performance (#215), reusable publication
(#211), and interactive experiment contracts (#32). A successful animated model
is not a validated physical simulation or a finished curriculum system.

## Release evidence

Both repositories have an immutable `v1.3.0-rc.1` source tag. The [paired Matrix
release](https://github.com/School-of-the-Ancients/matrix-loading-operator/releases/tag/v1.3.0-rc.1)
is published; its manifest records both code identities and package hashes.
Release preparation recorded 83 School server tests, 27 UI tests, typecheck and
builds, plus Matrix's 882 runtime tests, 37 focused Professor service tests and
12 packaging tests. The extracted package checked UI assets, an empty School
archive, six original avatar imports and hosted-world token separation.

Recorded Quest use shows an embodied teacher, dialogue during a build, selected
part explanations and interactive questions. The owner confirmed responsive AR
and persistent floating transcript text. Those are bounded observations from
the development installation, not a full headset run of the extracted package.
Private footage and learner records are not published in the repositories.

## Provenance

The standalone remake originated from `sota-beta` at
`5bf4ba01c794b398b3121081c06dd3b6bf6684f4`. Original source, legacy components and
their history are retained. The [earlier checkpoint record](docs/archive/pre-embodied-CHECKPOINT.md)
describes that text-only phase; its deferred-feature statements are historical.
