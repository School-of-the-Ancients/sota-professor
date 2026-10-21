# Prompt restoration validation — October 21, 2026

Target: local `sota-beta-openai`, branch `feat/openai-text-school`.
All changes remain uncommitted; no deployment, push, merge, issue closure,
credential/access/billing changes or Matrix/Supabase integration occurred.

## Automated evidence

- `npm run test:server`: 25/25 passed.
- `npm run test:run`: 16/16 passed across four files, including legacy suites.
- `npm run typecheck:school`: passed (the current strict School typecheck).
- `npm run build`: passed.

Eight new server regressions cover all eleven detailed personas reaching the
assembled teaching prompt; distinct plan/match/preferences/context; explicit
mentor protection; bounded pending/unavailable presentation records; independent
learner-only assessment and rejection of fabricated/tutor quotes; custom identity
ambiguity/full profile checks; version-1 Ada read compatibility without archive
writes; and durable owner-isolated custom teacher reuse through HTTP.
Two new UI regressions cover roster/preferences/custom reuse and independent
review/presentation availability. The native invocation contract also asserts
Ada's full persona actually reaches the Codex stdin prompt. Existing no-tool,
no-API-fallback, malformed-output, revision, quiz-coverage, intentional-miss,
targeted-review/fresh-retry and persistence regressions continue to pass.

These automated model responses are mocked. Existing baseline-browser-mapping,
Browserslist freshness, legacy Supabase-unconfigured and React Router warnings
remain; no unrelated dependency or hosted-service changes were made.

## Actual subscription and Demerzel Chrome evidence

A separate staging server on loopback port 3108 kept the user's 3107 app and
archives untouched while testing. Eight structured native Codex generations
completed with the already-managed ChatGPT subscription login: identity,
teacher, plan, match, opening teach, learner-response teach, assess and quiz.
No paid API, image, voice or teacher authoring tool was used. Native execution
retains the existing read-only/no-tools restrictions and fail-closed event reader.

Synthetic session: `50ffcfba-4d26-47a5-9341-27a20899b950`.
The test created and saved Hypatia of Alexandria with a full reusable persona,
then selected that profile for a Euclidean triangle lesson with explanation-first
style and a flexible 15-minute preference. This is test data, not a user-selected
curriculum and not the rejected dimensions demo.

The learner contributed a correct missing-angle calculation and explicitly lacked
the proof. The teacher supplied a substantive explanation without a compulsory
question and recorded a bounded artifact request. UI status went from pending
to unavailable on an availability check, with no image/runtime/object claim.
The independent review quoted the actual learner calculation, marked that one
objective demonstrated, and left the two unexpressed objectives insufficient.
The quiz then covered all three objectives with four questions and server-side
shuffled choices; 4/4 passed. The independent conversation result stayed
uncertain. A reload retained the custom profile, full transcript, review,
unavailable request and quiz result at revision 6.

Browser export was clicked once and the downloaded JSON was verified on disk:
22,083 bytes; id/revision/status/profile/review/request and quiz result matched.
SHA256: `B9407901DE4B33B9850A510742E853E90BD3C012DD9B11D6A299ECDA99E62130`.
Private evidence is ignored under `.school-data/validation/`:
`restoration-session-export.json` and `restoration-evidence.jpg`.
No learner-cookie archive filenames or real user transcripts are published here.

The previous full live baseline test separately exercised intentional quiz miss,
targeted reteaching and fresh retry; this restoration did not repeat those extra
live inference calls. They are also covered by the current automated lifecycle.

## Preservation and remaining limits

The original saved Ada lesson was compared with its pre-restoration backup and
remained identical. The newer Leonardo lesson was preserved. An observed Stoicism
draft was backed up privately; the user later cleared the form before transfer,
so the latest empty form was respected. Source files have a private backup plus guarded hash manifest
before transfer; no staging archive replaces the active archive. Older sessions
hydrate known personas on read without changing stored messages or revision.

All seven audited prompt functions now have active adapted implementations.
Presentation/image/3D execution, portraits, voice, independent historical source
verification and cloud/Supabase migration remain deferred. Assessment is model
judgment grounded in quotes, not independent scientific proof or lasting mastery.
Only the tested synthetic lesson is live evidence; the full roster/adversarial
cases are automated evidence. No headset/wearer or mixed-reality acceptance is
claimed. Final app remains local and dependent on this computer and subscription.

Final transfer verified all 20 source/document files against staging and checked
that active archive hashes did not change. The first final-worktree frontend run passed 16 tests but also discovered two
private source backup suites; those duplicate suites could not load because the
private data directory is denied to Vite. The backup was moved outside the app
to sibling `sota-restoration-source-backup-20261021`, preserving all files.
After correcting this test-discovery artifact, the final worktree passed all
25 server tests, 16 frontend/legacy tests, strict School typecheck and build.

## Local checkpoint and remote hold

This is a WIP local beta checkpoint with media and deployment deferred. The
owner requested a GitHub checkpoint, then a new private repository, then paused
repository creation/push while reconsidering its name. No repository was created
and nothing was pushed. The original `sota-beta` origin and history are preserved.
Only source, tests and these implementation records belong in the local commit;
private archives, raw transcripts, screenshots, exports and backups are excluded.
