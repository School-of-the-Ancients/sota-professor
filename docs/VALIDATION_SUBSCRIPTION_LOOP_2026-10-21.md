# Subscription text loop validation — October 21, 2026

Candidate: local uncommitted feat/openai-text-school in sota-beta-openai, based
on 5bf4ba01c794b398b3121081c06dd3b6bf6684f4. Machine: Demerzel.
Browser: Chrome profile Matthew, local http://127.0.0.1:3107.
Provider: native Codex 0.159.0, existing ChatGPT-managed sign-in under the normal
computer account. Requested model: gpt-6.1-sol. The stream does not separately
report an actual model identifier; no model identity was invented.

This was one bounded, synthetic browser loop, not a scientific mastery study.

## Live browser evidence

Synthetic topic: classify whole numbers 2 through 12 as prime or composite using
distinct positive factors and factor pairs. Mentor: Euclid (explicitly an AI
interpretation). Session: 4936b07e-14c8-44d8-9dd5-b95964061f4f.

| Step | Observed result |
| --- | --- |
| Goal -> mentor/lesson | Created one quest with Euclid, three objectives and an accurate introductory explanation. |
| One substantive learner turn | Entered factor pairs and classifications for 2–12. The mentor accurately checked that explanation and followed up on distinct factors. |
| First live quiz | Four questions covering the objectives; answer choices were selected through the UI. |
| Intentional miss | Selected an incorrect repeated-factor explanation for 9, with the other three answers correct. Server scored 3/4 and withheld completion. |
| Targeted review | UI identified define_prime_and_composite as missed. Mentor reteaching used 8/7 and repeated-factor example 4, plus a transfer question about 16. |
| Fresh retry | Four different questions, including the missed concept. Answered correctly through the browser: 4/4, check passed. |
| Save/reopen | Stopped and restarted the local server, then reloaded the same browser URL. The same mentor, conversation, result and one-completed-quest count returned from disk. |
| Export | Clicked Export learning record. Chrome saved an 8,817-byte JSON file. The automation download receipt timed out, but the expected file existed; no duplicate export was issued. |

The loop used six successful native generations: plan, opening lesson, learner
reply, first quiz, targeted review and retry quiz. Scoring, reopening and export
did not call a model. No paid API call, new login, token extraction, credential
change, billing change, authoring tool action, deployment, merge or Matrix
integration occurred. The native adapter's fail-closed restrictions stayed in
place throughout. Models were live for the six generations, not mocked.

## Export verification and local evidence

Export was read from Chrome's download and copied to the ignored local evidence
directory. It matched:
- Session ID above; revision 7; status complete; mentor Euclid.
- Three objectives, five messages, two assessment attempts.
- First attempt 3/4, passed=false, missed define_prime_and_composite.
- Second attempt 4/4, passed=true, no missed objectives.
- No active quiz. No cookie, API key, access/refresh token or answer-key fields
  appeared in the checked export structure.

Private local evidence (ignored by Git; not public artifacts):
- ../.school-data/validation/live-needs-review.jpg
- ../.school-data/validation/live-complete-reopened.jpg
- ../.school-data/validation/live-session-export.json

Screenshots show the withheld-completion state and the reopened passed-check
state. The latter explicitly says that one short check is not proof of lasting
mastery. Raw exported conversation text is retained only in ignored local files.

## Recoverable bug fixed

Development Strict Mode issued overlapping archive reads. The store treated
reads like conflicting writes, so one read returned 409 and initial provider
status was discarded. This was reproduced in Chrome before quest creation.

GET archive operations now read the last atomically committed snapshot without
taking or releasing the write lock. Writes retain their exclusive per-owner
lock and revision checks. Read-only operations cannot write. The regression
test holds an active write transaction, completes two reads concurrently, rejects
a write from a read-only transaction, and confirms a second writer remains
blocked. Startup and post-restart reload both passed in Chrome afterward.

Files changed for the fix:
- server/store.mjs
- server/http.mjs
- server/http.test.mjs

## Automated regressions

After the fix:
- npm run test:server: 17/17 passed, 0 failed.
- npm run test:run: 14/14 passed across four files, 0 failed.
- npm run typecheck:school: passed.
- npm run build: passed (Vite 6.3.6).
- git diff --check: passed.

Automated model execution is mocked. Process boundary tests use bounded local
test processes, not model requests. Existing browser-data freshness, legacy
Supabase-unconfigured and React Router future-flag warnings remain.

## Limits and gaps

This establishes one desktop browser path on one local computer and account.
It does not establish durable mastery, general question correctness, mentor
quality across topics, public-service readiness, a latency benchmark, or
headset/MR/VR acceptance. Generated Markdown is currently rendered as plain text;
the table in the teacher response was readable but not formatted as a table.
No extra formatting feature was added for this bounded validation.

Voice/images, a selected GPT-Live/API demo provider, account sync/migration,
broader responsive/accessibility checks, streaming/cancellation and longer
sessions remain unvalidated. The paid API adapter stays inactive, with no
fallback. The temporary local server was stopped after validation.
