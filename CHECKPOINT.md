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

Validated locally on Demerzel: 25 server tests, 16 frontend/legacy tests, strict
School typecheck and build. Eight real subscription generations plus a Chrome
synthetic learning loop are documented separately from mocked tests. Media,
voice, deployment and live Matrix execution remain unavailable/deferred.
A private source repository does not provide a hosted teaching runtime.

This is a checkpoint branch, not a deployment or release. No hosting project,
workflow, billing, collaborators or access grants were configured. Matrix owns
any future concept image/version selection, Blender build and existing loader;
School owns teaching intent, objectives and learner records. Instructional AR/VR
interactivity and simulations are explicitly deferred.
