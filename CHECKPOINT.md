# Private WIP checkpoint

This repository starts with a clean source snapshot of the standalone School
beta remake. Upstream provenance: School-of-the-Ancients/sota-beta at
5bf4ba01c794b398b3121081c06dd3b6bf6684f4; local implementation checkpoint
6eeb56601af5aacaf7f38354d9b5d4a76ef872d0 on feat/openai-text-school.
The original checkout, origin and history remain preserved locally. Upstream
history was not copied into this new repository; inherited history has not been
claimed comprehensively free of secrets. The current source snapshot was scanned
for private/runtime paths and recognizable credentials before checkpointing.

The active entry is src/school/SchoolApp.tsx, using the local native Codex
ChatGPT-auth provider. Read README.md and docs/OPENAI_REBUILD.md for setup and
limits. Legacy Gemini/Supabase files and original static media are retained as
reference, not enabled providers. No .school-data, learner records, raw exports,
screenshots, credentials, generated runtime logs or backups are included.

Validated locally on Demerzel: 30 server tests, 16 frontend/legacy tests, strict
School typecheck and build. Eight real subscription generations plus a Chrome
synthetic learning loop are documented separately from mocked tests. Media,
voice, deployment and live Matrix execution remain unavailable/deferred.
A private source repository does not provide a hosted teaching runtime.

This is a checkpoint branch, not a deployment or release. No hosting project,
workflow, billing, collaborators or access grants were configured. Matrix owns
any future concept image/version selection, Blender build and existing loader;
School owns teaching intent, objectives and learner records. Instructional AR/VR
interactivity and simulations are explicitly deferred.

The prepared handoff contract separates learning intent, objective, requested
interaction and visual prompt. Future mockup/asset/load/interaction receipts
retain concept/version and runtime/object identity with evidence categories.
See docs/OPERATOR_HANDOFF.md. Shape checks are not proof of runtime execution;
the current app still reports presentation execution unavailable.

Final follow-up validation: 30 server tests and 16 frontend/legacy tests, strict
School typecheck and production build pass. One additional native subscription
turn preserved move/rotate requirements separately from a mockup request, with
pending status and no execution. The original 3107 comparison server and user
archives remain in their original worktree; this checkout contains no learner
archive. Browser reattachment was unavailable at the final refresh, so no forced
reload or data migration was attempted.

After reconnection, both preserved comparison URLs (3107 real archive, 3108
synthetic validation) returned HTTP 200 and 3107 native Codex status was configured.
They serve the original restoration checkpoint; the later handoff preparation is
in this source checkout, not silently swapped into the user's running archive.
The final current-source build passed again. See the validation record for exact
served/source distinctions and the browser-control limitation.
