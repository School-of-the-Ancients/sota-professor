# School beta rebuild: subscription checkpoint

Implementation date: October 21, 2026.
Target repository: School-of-the-Ancients/sota-beta.
Base: 5bf4ba01c794b398b3121081c06dd3b6bf6684f4.
Worktree: C:\Users\theto\Documents\Codex\2026-10-20\task\sota-beta-openai.
Original implementation branch: feat/openai-text-school, checkpoint 6eeb566.
Clean private source repository: School-of-the-Ancients/sota-professor,
checkpoint/subscription-beta. See CHECKPOINT.md for provenance and limits.

## Selected scope and current provider

This is the standalone beta rebuild. The shared teaching engine supports any
learning goal, a suitable historically inspired mentor, objectives, conversation,
quiz, targeted remediation, a fresh check, saved sessions and export. Text is the
working initial interface. Voice and presentation tools remain future adapters;
Matrix and Blender are not integrated.

The default provider is native Codex with its existing ChatGPT-managed sign-in.
It does not read tokens, scrape browser sessions, create a login, require an API
key, or fall back to a paid API. Codex manages its own authentication lifecycle.
Subscription/model/workspace limits apply. A local Codex installation, signed-in
computer account, network and running School server are required. This is not an
unlimited public SaaS entitlement. No ChatGPT history or account memory is read.

The owner later discussed a paid API demo with live voice. No paid provider,
billing, key configuration or multimodal rewrite has been selected or enabled.
The earlier Responses adapter is preserved as server/api-responses.mjs, with
mock tests, for a future explicit choice. It has no environment defaults and is
not imported by the runtime provider wiring. Its API-key contract is distinct
from the newer Sign in with ChatGPT plan-usage OAuth flow. No live API call has
been made through that optional adapter.

## Review and architecture

Reviewed AGENTS.md, execplan.md, README.md, docs/ROADMAP.md, quest flow/progress/
quiz specs and the existing Gemini implementation. No additional scoped AGENTS
or software engineering skill was found. Canonical School's tool-disabled
CodexMentorProvider was consulted as a reference. Existing Matrix checkouts were
read only and never edited. The target changed to standalone beta before editing.

The default React entry is src/school/SchoolApp.tsx. Legacy Gemini/Supabase code
and records are preserved, but not mounted by index.tsx. The old Google import
map is removed. The eleven original mentor personas are adapted in the active library; the
learner can supply another goal or historical mentor.

server/teaching.mjs uses generate(kind, context) for the seven structured operations documented in the restoration section below.
The provider never updates progress or performs presentation actions. The core
owns validation, session state and deterministic quiz scoring. The browser calls
the local API and receives no unsubmitted answer keys.

The original microphone-coupled text lifecycle is replaced with ordinary text
requests. Full saved transcript, goal, mentor, objectives and assessment feedback
are replayed on teaching calls. No context is silently truncated. Historical
persona prompts distinguish modern knowledge from a mentor's lifetime and
prohibit invented quotations or claims of historical verification.

The learning states are learning -> quiz -> complete, or quiz -> needs_review ->
mentor review -> quiz. Each check covers all objectives and requires every
answer correct. There are no generic fallback questions or completion before
assessment. Missed concepts and feedback are persisted and supplied for
reteaching. Exact repeated question text is rejected on retry; semantic novelty
and question correctness still require live/content evaluation. A short check
is evidence from that check, not proof of lasting mastery.

## Native execution boundary

server/codex.mjs discovers a native executable, supports optional local
SCHOOL_CODEX_EXE / SCHOOL_CODEX_MODEL settings, and defaults to gpt-6.1-sol.
The installed CLI is pinned to verified version 0.159.0. A different version
fails closed until its compatibility is reviewed. Help and feature names are
checked before inference; a catalog alone is not an entitlement check.

Before each generation, native login status must report ChatGPT authentication.
API-key login is refused. Child environment inheritance is allowlisted to OS,
proxy and Codex-managed login-location variables; API keys, access-token
variables, provider endpoints and NODE_OPTIONS are excluded.

Each call uses direct spawn with shell:false and windowsHide:true, an isolated
temporary working directory, --ignore-user-config, --ignore-rules, --ephemeral,
--strict-config, read-only sandbox, never approvals, forced ChatGPT login,
native OpenAI provider, no web search/MCP configuration, and zero AGENTS bytes.
The command disables shell/unified execution, Code Mode and its host, browser,
computer, image, realtime, apps/plugins/hooks, multi-agent, skill/tool discovery
and other authoring feature paths. User text goes through stdin, never into
executable paths, command options or shell strings. The controller writes only
temporary schema/final-response files; cleanup verifies the absolute temp path.

The JSONL reader requires a started/completed turn and a matching final structured
response. Unexpected tool/action events immediately stop the process. Unknown
errors, failed/interrupted turns, malformed or incomplete output, nonzero exit,
timeouts, excessive output and mismatched final output are rejected before save.
Raw diagnostics and credential data are not returned by the local browser API.

Codex 0.159 emits two startup advisories as error items. The under-development
notice for skip_host_skill_discovery is acknowledged only in the child process
with suppress_unstable_features_warning=true. The separate notice that Code
Mode's host is disabled is accepted only as an exact known item.completed
controller message. It grants no execution authority; the host stays disabled.
A regression test rejects similar/altered errors. No broad error suppression,
tool enablement, persistent config or sandbox relaxation was added.

## Persistence and limits

Sessions have stable UUIDs and monotonic revisions. An HttpOnly, SameSite=Strict
cookie identifies a local browser archive; UUID knowledge does not grant another
cookie access. Per-owner serialization and revisions reject concurrent/stale
writes. Provider failures leave the archive unchanged. Atomic replacement avoids
partial saves; corrupt archives fail closed.

Ignored .school-data files are plaintext local records, not encrypted or cloud
synced. Clearing the learner cookie loses browser access. Export omits learner
cookies and unsubmitted quiz keys. Legacy localStorage/Supabase records are not
migrated or modified. Unsent drafts and unsubmitted radio choices are not durable;
a mounted draft survives a failed request.

Use one local server per archive. Bounds: 50 quests per browser, 40 learner turns
and 10 assessment attempts per quest, 16 MB per browser archive, 12 writes/minute
per browser, 40 globally and four concurrent writes. Limits fail explicitly with
no automatic deletion or completion.

Vite binds to loopback; API requests reject non-loopback Host, cross-site/origin
requests and non-JSON/oversized bodies. Responses are no-store. Server sources,
environment files and learning records are denied by Vite file serving. This
cookie is not public-service account authentication; do not expose this local
prototype or deploy it as SaaS.

## Subscription OAuth, images and voice

Official Sign in with ChatGPT plan usage for eligible local/open-source apps is
a separate supported OAuth flow, not blanket paid-API access and not permission
to extract an existing Codex token. It requires its own authorized registration,
consent and credential lifecycle. None was created in this task. Its HTTP
Responses requests require stream:true/store:false and full supplied context;
previous_response_id and several paid-API parameters are unsupported.

That plan-usage preview does not support image generation, audio/video input,
transcription, hosted file search, Code Interpreter or hosted connectors. Native
Codex feature flags are a different surface and do not establish entitlement or
a working School image/voice integration. This teacher disables those paths.
No image generation or live voice is implemented or validated here. A future
GPT-Live/API voice decision can reuse the same teaching/session engine but needs
separate supported-interface, credential and budget decisions. Text stays usable.

Official references reviewed:
- [Codex CLI reference](https://developers.openai.com/codex/cli/reference)
- [Codex authentication](https://developers.openai.com/codex/auth)
- [Codex app-server](https://developers.openai.com/codex/app-server)
- [ChatGPT plan usage overview](https://developers.openai.com/siwc/token-sharing-open-source)
- [Plan models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)
- [Plan app-server configuration](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server)
- [Plan preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)

## Validation evidence and remaining work

Node v24.16.0, npm 11.17.0, locked Vite 6.3.6 on Demerzel.
- npm run test:server: 17 Node tests cover the provider/process boundary, no API
  fallback, rejected API-key login, missing/incompatible CLI, error/malformed
  output/tool attempts, exact advisory handling, output/deadline limits, native
  environment isolation, full learning/remediation/retry loop, exact replay,
  disk reload, cookie isolation, hidden answers, stale/concurrent writes,
  corrupt archives, rate limits, and the inactive API adapter with mocks.
- npm run test:run: 14 tests pass, including all 10 existing beta tests and four
  new School component tests. They cover arbitrary goal/mentor entry, restored
  pending checks, revision identity, targeted review, failed-draft preservation,
  and local Codex sign-in recheck. Model execution is mocked.
- npm run typecheck:school: strict check of new School UI/contracts/tests.
- npm run build: production bundle builds. Existing dependency browser-data
  freshness warnings remain. No dependency sweep was performed.
- Earlier Chrome desktop inspection confirmed the new landing layout, broad
  goal/mentor inputs, starter quests and local archive. It was not a live lesson.
  HTTP checks confirmed server sources and a synthetic private record returned
  403. The synthetic record was removed. Provider implementations were absent
  from the browser bundle. The temporary preview was stopped.

Native login is available under Matt's normal Windows account. The restricted
CodexSandboxOffline account reports not logged in; it cannot borrow that sign-in.
No new login or credential change was performed. CLI help, features and generated
app-server protocol were inspected without calling a model. Live smoke uses only
a synthetic prime-number question and is opt-in via npm run smoke:codex; ordinary
tests and npm run check:codex do not generate a model response.

Live evidence: one synthetic teaching response completed through native Codex
under Matt's existing ChatGPT sign-in. The requested model was gpt-6.1-sol. The
response correctly explained that 7 has only positive divisors 1 and 7, then asked
whether 9 is prime or composite. The completed JSONL turn and matching final
JSON passed teaching-domain validation, with zero tool actions accepted and the
execution host disabled. The stream did not independently report an actual model
identifier; the requested model is recorded without inventing a receipt field.

Five earlier smoke attempts were rejected before a valid completed response.
Diagnostics identified the CLI startup advisory representation described above;
those attempts are not passes, and their subscription usage was not established
by a completion receipt. No learner session was saved by the smoke script. This
proves one text-generation request on the existing sign-in, not the full live
quest/quiz loop, voice, images, teaching quality across topics, or general model
entitlement. No new login was required for the normal computer account.

One bounded live Chrome loop now passes: goal, Euclid lesson, learner turn,
4-question check with one intentional miss (3/4, completion withheld), targeted
review, fresh check (4/4), full server restart/reopen and verified export. See
[the exact validation record](VALIDATION_SUBSCRIPTION_LOOP_2026-10-21.md).
It exposed and fixed a development startup race: concurrent GET archive reads
now use committed snapshots without taking/releasing the exclusive write lock.
The write lock, revision checks and read-only write prohibition remain covered
by regression tests. All 17 server and 14 frontend tests pass after this fix.

Remaining work includes broader live mentor/quiz/content-quality and latency
evaluation, accessible streaming/cancellation, broader
responsive checks, account migration/sync, and a selected voice-provider plan.
No headset/MR/VR evidence, Matrix runtime work, deployment, merge, issue closure,
PR178 edit, credential/access change, OAuth grant or billing change occurred.

## Exact changed files

All work is local and uncommitted in the isolated worktree.
- Entry: index.tsx; index.html.
- School: src/school/SchoolApp.tsx; src/school/SchoolApp.test.tsx;
  src/school/api.ts; src/school/contracts.ts.
- Server: server/teaching.mjs; server/schemas.mjs; server/codex.mjs;
  server/store.mjs; server/http.mjs; server/vite-plugin.mjs;
  server/smoke-codex.mjs; server/api-responses.mjs (inactive).
- Tests: server/fixtures.mjs; server/teaching.test.mjs; server/codex.test.mjs;
  server/http.test.mjs; server/api-responses.test.mjs.
- Config: .gitignore; package.json; package-lock.json; tsconfig.school.json;
  vite.config.ts.
- Docs: README.md; execplan.md; docs/OPENAI_REBUILD.md;
  docs/VALIDATION_SUBSCRIPTION_LOOP_2026-10-21.md.


## Original-beta prompt restorations (October 21, 2026)

The active standalone path now covers all seven audited prompt areas, adapted
rather than copied verbatim. This does not restore Gemini media infrastructure.

| Original area | Active restoration |
| --- | --- |
| Eleven historical system prompts | `src/school/personas.mjs`: individual methods, all eleven selectable; balanced text teaching, explicit AI interpretation and modern/historical limits. |
| Quest Architect and Mentor Matcher | Separate `plan` and `match` operations; description, objectives, cautious duration, difficulty/style/time preferences and useful alternatives. Explicit mentor choices cannot silently change. |
| Assembled teaching persona and quest | `teachingPrompt` plus full saved transcript, actual detailed persona, quest, objectives, preferences, missed-concept feedback and server-owned completion guidance. |
| Operator image prompt construction | `server/presentation.mjs`: bounded objective-linked location/lab/artifact requests, reusable environment/object prompts, pending then honestly unavailable. No execution adapter or fabricated object identity. |
| Objective-tagged quiz | Existing validated coverage, shuffled choices, deterministic scoring, targeted review/fresh retry and no fake fallback preserved. |
| Independent conversation assessment | Separate `assess` operation receives learner contributions only. Literal quotes and original message indices are checked; gaps and insufficient evidence remain explicit. No quiz or completion authority. |
| Custom historical teachers | Separate identity plausibility and full-persona generation; reusable owner-scoped library. Ambiguous/fictional identities are refused with uncertainty, not asserted verified. No paid portrait or voice. |

Archive version 1 remains supported without migration. New fields are additive;
older known mentors hydrate a detailed roster persona on read without rewriting
the archive or transcript. Unknown old mentors keep their original profile.
Custom teachers, assessments and inert requests persist with the same local
archive and export. Quiz answer keys remain hidden until submitted.

Provider operations are now `plan`, `match`, `identity`, `teacher`, `teach`,
`quiz`, and `assess`. Every operation uses the same native subscription route
and fail-closed tool restrictions. The inactive paid adapter stays unselected.
A historical plausibility review is a model judgment, not external verification.
Conversation evidence classification is also model judgment: quote validation
prevents invented evidence but does not prove semantic correctness or mastery.

Restoration was developed in an isolated staging directory to avoid reloading
the user's running comparison session. Private archives were backed up locally;
no Supabase schema or original hosted beta changes are part of this work.
