this is a living document

## October 21, 2026: standalone subscription rebuild

Selected repository: sota-beta. Isolated branch: `feat/openai-text-school`, based
on `5bf4ba0`. Matrix integration was removed from scope before editing.

1. Reviewed AGENTS, beta documentation, Gemini audio/creation/quiz code, and
   canonical School's tool-disabled mentor provider as a reference.
2. Added a provider-independent teaching core, then replaced the initial paid
   Responses adapter when the owner clarified subscription-only access. Native
   Codex now reuses its own ChatGPT-managed sign-in; no API fallback remains.
3. Added a text-first default entry: arbitrary goal/mentor, objective-linked
   quest, conversation, quiz, remediation/retry, saved history and export.
4. Added local file persistence with learner cookie isolation, revision checks,
   atomic writes, limits, and protection against public/cross-site API use.
5. Added server and UI regression tests, a scoped strict typecheck, and local
   desktop inspection. See `docs/OPENAI_REBUILD.md` for commands and evidence.

The installed native Codex is `0.159.0`; its help/features and existing ChatGPT
sign-in were checked. The adapter enforces native-version/capability checks,
isolated ephemeral execution, read-only sandboxing, disabled tools, structured
responses and completed-event validation. See the implementation record for
actual live-smoke outcome separately from mock tests. No credentials, billing,
access settings or OAuth grants were changed.
One synthetic text teaching response completed on the existing ChatGPT sign-in
with no accepted tool actions. Five prior diagnostic attempts did not produce a
valid completed response and are not counted as passes. The original paid API
adapter is retained as inactive mock-tested code, with no default selection or
fallback, while the owner considers a later voice/API demo decision.

One bounded live Chrome learning loop subsequently passed: goal/Euclid lesson,
one learner explanation, 3/4 intentional-miss check with completion withheld,
targeted review, fresh 4/4 check, server restart/reopen and verified JSON export.
Fixed only the exposed concurrent archive-read startup race; writes remain
exclusive and revision checked. All 17 server tests, 14 frontend tests, scoped
strict typecheck and build pass. Details and ignored local screenshot/export
paths are in docs/VALIDATION_SUBSCRIPTION_LOOP_2026-10-21.md. This is one desktop
path and short assessment, not evidence of durable mastery or headset acceptance.
Legacy records and code are preserved. Voice and Matrix/Blender remain future
work; this branch is a local implementation and has not been deployed or merged.

### Original-beta prompt restoration, October 21, 2026

Restore all seven audited prompt areas in the active standalone path. Preserve
individual teacher styles without compulsory questions/voice/media; add rich
preferences and separate fit review; pass full persona/quest/transcript context;
record bounded inert presentation requests honestly; preserve the improved quiz;
add independent learner-evidence review; persist reusable reviewed custom
teachers. Keep archive version 1 compatible and native subscription restrictions.
Implementation was staged away from the live 3107 comparison server. Validate
focused adversarial/compatibility/UI regressions, full suites/typecheck/build,
then bounded native-subscription/browser smoke before promoting tested files.
No Matrix, hosting/Supabase, billing, credential or access work is included.

Restoration validation completed: 25 server tests and 16 frontend/legacy tests
passed, strict School typecheck and production build passed. Eight bounded
native-subscription operations and a Demerzel Chrome loop verified custom
identity/persona, rich planning plus fit review, teaching, inert artifact status,
independent grounded uncertainty, objective-covered 4/4 check, reload and actual
22,083-byte JSON export. Quiz pass did not upgrade conversation uncertainty.
See docs/VALIDATION_PROMPT_RESTORATION_2026-10-21.md. Media execution stays deferred.
