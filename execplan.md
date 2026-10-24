# Implementation history and current scope

The active architecture and setup are in [README.md](README.md); current delivered,
partial and future issue status is in [CHECKPOINT.md](CHECKPOINT.md). This document
retains dated implementation decisions. An old entry saying a feature was excluded,
unmerged or unauthorized describes that phase, not the current implementation.
Current user instructions take precedence. The October 24 consolidation includes
Professor #14 and Matrix #229/#230, updates current roadmaps and retains prior
release/acceptance evidence. P4/P5 core behavior is implemented; P3 native live
voice and reviewed curriculum consumption remain separate work. No learner
history or world reset accompanies source consolidation.

### Point & Speak exhibit practice

The owner's subsequent AR request adds a bounded part-identification practice
beside the formal quiz. School owns the persisted activity, current round,
exact part checks, feedback, attempt IDs and progress. Matrix provides the
current annotated exhibit, explicit A/X selection and existing Professor voice.
Prompts explain authored annotations before asking for the part; they do not
assert validated mechanics. Wrong selections retry the same round; correct
selections advance. Hints, repeat and stop are explicit voice commands. Formal
quiz answers, scores and completion are preserved. Public responses omit the
internal part-answer plan. Device readability/input/voice acceptance stays
separate from synthetic HTTP and controller evidence.
Explanation and question are separate saved speech events. Matrix permits
labels during explanation and hides answer-revealing overlays for the question.


### Direct invention requests after historical preview failures

Current teaching context explicitly distinguishes direct Blender creation from
the selected-concept-image build path. A request to create and load an invention
delegates that outcome, reusing the library first, without inventing a preview
prerequisite from old messages. Retain failed task evidence and expose whether a
task actually started; do not duplicate a running task. Validation: 83 server
tests, School typecheck, Matrix bundle build, and isolated native teaching replay
with a historical preview error. Live Operator loading and Quest display remain
separate evidence.

### Part-aware embodied teaching

The Matrix adapter supplies bounded part IDs, labels and author descriptions for
registered exhibits. Teaching can point to a specific validated part and explain
its intended role without treating metadata as physical observation or verified
simulation. Learner `partReference` is persisted with their spoken/text event so
“this is the shaft” refers to the part selected with that answer, not a later
pointer position. Invalid/stale references require clarification. Matrix owns
geometry, moving targets, highlights/arrows and the authoring API; School retains
teaching, attribution and learner records. Camera vision is separate work.

### Reusable professor appearances

The active Matrix-mounted School now prepares an appearance alongside the normal
lesson introduction. It reuses exact local teacher matches, asks a bounded model
selection question for other candidates, and requests a durable VRoid asset job
only when no suitable model exists. The standalone HTTP factory remains inert
unless appearance preparation is explicitly enabled; test fixtures cannot launch
live modeling jobs. Manual pins supersede late results. Avatar progress uses a
separate revision and cannot overwrite lesson turns or quiz state.

Matrix owns VRM export/validation, the local asset library, background Operator
execution and attaching a ready appearance to the existing teacher object. The
first spoken question can create a normal School lesson and remains the first
attributed transcript event. See Matrix's `Docs/Professor-Library.md` for the local
asset contract. Quest wearer acceptance remains separate from desktop validation.

### Local Operator action connection

Preserve the full UI and current Leonardo archive. Add explicit structured
image/background requests, exact frame/source/channel checks and server-verified
Matrix job receipts. Reuse the existing concept/panorama store and selected-image
build/load path; no new generator, implicit background apply or mandatory 3D.
Persist only matching current prompt-version results; reopen watches old jobs,
not generation. Teacher remains tool-disabled and receives bounded truthful
status context. Run focused security/idempotency, existing suites, mock-backed
desktop and one bounded native subscription image check. Use a separate 3110
candidate archive; do not restart or rewrite the user app at 3108. Local commits
only, no push/merge/deployment/credentials/network-permission changes. See
docs/OPERATOR_CONNECTION.md for evidence and remaining hardware/spatial limits.

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

### Historical person eligibility correction

Correct the occupational-teacher ambiguity in the identity prompt. Eligibility
means an identifiable real historical person, without a formal teaching job
requirement; quest expertise remains a separate matcher decision. Keep ambiguity
and fictional-identity gates. Add five server regressions plus a UI assertion,
run current suites/typecheck/build and a two-generation native Tesla creation
in a synthetic archive. Reconcile only the scoped fix into existing comparison
runtimes, preserving source differences and archive hashes. No live media or
Matrix work. See docs/TESLA_ELIGIBILITY_FIX.md. The intended future scene-prep
trigger (figure plus objective, asynchronous alongside introduction) is recorded
in docs/OPERATOR_HANDOFF.md only; no jobs are enabled.

### Automatic focused exhibit preparation and editor

After plan/matcher selection, create one durable focused draft and start a
bounded text-only exhibit operation alongside the introduction. Never wait for
that operation before returning the professor's opening. Persist prompt/status,
allow full-prompt edits, reject late results after edits/context changes, and
avoid replay/duplicates on reload. Use a separate presentation revision and
short background store writes so lesson/quiz revisions and user contributions
are preserved. Interrupted preparation retains the draft and needs explicit
retry. Existing quests are not silently regenerated; they offer an explicit
Prepare button. Matrix stays unavailable. The source inspection/recommended
first embodied-professor slice is docs/MATRIX_INTEGRATION_RECOMMENDATION.md.
No remote push is authorized by this task; the earlier documentation push denial
remains in effect. Local commits and deliberate archive-preserving runtime
updates are allowed.


### October 21 Operator retry/error correction

The matching Matrix transport now accepts one valid image after a rejected
attempt while rejecting multiple successful images. Keep the verified,
bounded failure reason in the Operator summary shown to the learner and in
teaching context. The 48 server tests, 22 frontend tests and School typecheck
passed. The existing image was recovered into its original Matrix job and
refreshed through the current lesson's normal status controls. Only that
Operator result and presentation revision changed; no new generation, lesson
conversation, answers, 3108 archive or Matrix scene changes were made.


### October 21 one-click Professor image to Blender

The owner selected immediate build after clicking a ready Professor image.
Add Create 3D in Blender on artifact cards. Carry only the exact verified
lesson/request/concept/checksum identity; Matrix composes the spatial build
instruction and uses its existing selected-image Blender pipeline. Preserve
teacher tool restrictions and saved image prompts. Report progress and verified
loaded objects separately; repeated clicks/reopen return the existing job.
Keep the original 3108 runtime and archive untouched. Full suites/typecheck/
builds and bounded actual HTTP handoff tests precede the local UI update.

### October 23 embodied professor first slice

Add an appearance picker and explicit Place professor in Matrix action to the existing lesson screen. Use the existing authenticated parent-window channel; send only catalog/teacher/lesson identity. Matrix owns the immutable VRM asset and world object. Reopening a bound object restores the exact lesson and its current appearance. Repeated clicks are blocked, failures/timeouts are visible, and re-placement is idempotent in Matrix. No teaching provider, API credential, original archive, live voice or image/build authorization changes. The isolated browser fixture validated the actual Riko model; 26 frontend tests, School typecheck and build:matrix passed. Quest acceptance remains separate.

### October 23 voice routing and shared transcript

Implement the owner's explicit Professor/Operator target switch with Professor as the default, a versioned shared conversation journal, and the existing persona-backed School teaching path. Preserve existing messages and assessment semantics. Journal direct Operator exchanges as attributed context, never as replayable commands or scored student evidence. Spoken input is saved before teaching generation; retries reuse its event ID. Generated Professor text and actual playback state are recorded without retranscribing TTS. Matrix owns local transcription, SoVITS playback and VRM mouth animation; School receives no new shell/tool authority. Validation includes 52 server tests, 26 frontend tests, production/type checks, local TTS/ASR and an actual native Codex reply in an isolated lesson. Full-duplex voice, automatic Operator delegation and Quest acceptance remain pending.

### October 23 asynchronous Operator delegation and PR checkpoint

The owner now explicitly requested implementation of the Professor's Operator tool and draft PR/issue checkpoints. This authorizes pushing the scoped implementation branches and opening draft PRs in School and Matrix, superseding earlier task-local no-push notes for this checkpoint only; no merge or release is authorized.

Structured teaching output can return one bounded matrix_operator call per turn. School validates and persists its intent; Matrix queues it through the existing Operator session, checks current world scope, and preserves task identity across retries. School verifies actual task status from Matrix, retains attributed results, and can continue teaching while Operator works. UI, voice, avatar and journal changes already in this local implementation are included in the checkpoint. Native full-duplex voice and Quest acceptance remain open. Related: School #5/#3 and Matrix #212/#187.

### Quest continuation

The owner requested Quest AR, local voice/lip-sync and concurrent Matrix builds, plus Full access as the local Professor launcher's default. The USB port mapping keeps the loopback service and existing auth/origin checks. School adds five-minute, one-use learner continuation codes for an empty receiving browser; an existing archive cannot be silently displaced. Codex credentials stay on the PC. Pairing shares saved lessons and the conversation archive across the user's two devices. Record actual headset results separately from software/USB readiness and update the existing draft checkpoint PRs; no merge or release is authorized.

### Short, exhibit-led conversation

The owner selected School #7 and supplied Riko's spoken conversation prompt as a style reference. Apply natural short spoken turns to existing/new lessons without changing persona identity, old transcripts, quiz scoring or world authority. Default to one observation/action/question and wait, use actual exhibit/task evidence, and avoid lists or canned assistant language. Explicit detail requests allow longer explanations. Validate new replies and allow one rewrite for verbosity/multiple questions, retaining original validated tool intent exactly once. Do not introduce Riko's unsupported animation tags into speech; pose/catalog work remains future scope.

### Exhibit attention and merged source checkpoint

The owner subsequently selected natural body motion, exhibit-directed gaze/pointing and merging the existing Professor PRs. This supersedes the earlier no-merge notes for School PR #6 and Matrix PR #213 only. Scene identities from the existing local Matrix service ground one optional presentation cue per reply; the saved journal owns that cue and the Matrix renderer revalidates its target during speech. No model assets or learner data are published. Checkpoint the merged sources with the matching `checkpoint/professor-exhibit-attention-2026-10-23` tag in both repositories. Keep native full-duplex voice, avatar catalog expansion and Quest wearer acceptance open; this is not a frozen-v1.2 release.

### Human avatar catalog

The owner selected additional professor bodies and closest-available matching. Matrix supplies six original human VRM models and validated metadata; School persists automatic/manual selection separately from teaching identity. Familiar figures have curated matches, other names use a bounded choice from the approved list, and failed matching falls back to a generic representation. Manual picks remain pinned. Applying a different body uses the existing avatar entity without moving it, changing its lesson or duplicating it. Preserve user models, credentials, archives and worlds; validate model rigs, replacement/undo, matching and saved pins before the local service update. New source work remains in draft PRs unless the owner authorizes another merge.

### Selected-surface snapshot vision

The owner requested exact item-surface pointing beyond predefined parts and an image the Professor can describe. Matrix captures a user-selected virtual point and one marked virtual-view image, with trigger/grip bindings preserved. School validates the bounded point and JPEG against the current scene and delivers the image through native Codex input within the same restricted teaching turn. It stores the point reference and reply, never the image bytes. Temporary files are removed after inference; there is no camera passthrough, new tool access or API-key fallback. Explanations separate visible evidence, metadata and uncertain function. Automated checks, a real-model capture and native model inference are separate from pending Quest wearer acceptance. Preserve all existing archives and worlds.

### Socratic exhibit practice

The owner requested implementation and deployment of adaptive spoken learning.
New practice starts with a source-grounded observation puzzle, then uses the
existing native teaching provider to review explanations, predictions and
transfer. Each model-reviewed milestone retains an exact learner quote and a
reason; observation alone is not scored as understanding. Short single-question
turns, hints, revisions and stage-scoped label masking keep interaction in AR.
Existing recognition activity remains saved until the learner starts the new
mode. Formal quiz scores, scene state, identities and archives are unchanged.
Validation includes malformed-evidence rejection, stale scene/round handling,
idempotency, voice journal reuse, transfer selections and native-provider review
in a synthetic lesson. Physical wearer acceptance remains separate.

### Continuous conversations

The owner requested removal of conversation turn limits. Remove the 81-message
teaching cap, 100-turn/attempt practice caps and 5000-event journal cap. Keep the
complete saved transcript and all scores; send a bounded recent-history window
to teaching rather than eventually failing on accumulated prompt size. Existing
input validation, request rate protection and archive byte-size safety remain.
Regression coverage continues long lessons, large journals and both practice
modes past their former limits while checking history retention and prompt size.
