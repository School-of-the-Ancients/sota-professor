# School of the Ancients — Professor

Talk to a historically inspired teacher, explore a lesson, and check your
understanding. School owns the teacher, lesson, assessments and learner record.
The optional Matrix connection gives the teacher a body and lets it request
exhibits while the conversation continues.

## Current implementation

The active application is `src/school/SchoolApp.tsx` with the PC-local API in
`server/`. It uses the existing native Codex ChatGPT sign-in. No browser API key
is required by this path. The retained Gemini/Supabase components are historical
reference; they are not the active default application.

| Capability | Current state |
| --- | --- |
| Historical teacher, goals, lesson, quiz and remediation | Implemented in the standalone app. |
| Short spoken turns and one focused question/action | Implemented; recorded Quest conversations show adaptive follow-up. |
| Shared student/Professor/Operator journal | Implemented with attribution and stable event IDs. |
| Background `matrix_operator` requests | Implemented through Matrix's task queue; the teacher has no direct shell/MCP authority. |
| VRM body, voices, lip-sync, gestures, part selection and virtual-view image | Supplied by the companion Matrix runtime. |
| Native full-duplex speech and automatic turn detection | Not implemented. Current Matrix voice uses push-to-talk. |
| Reviewed reusable courses and objective-driven exhibit preload | Partial foundations; not a completed curriculum library. |

See [checkpoint and remaining work](CHECKPOINT.md). The shared source tag
`v1.3.0-rc.1` pairs this repository with Matrix; later documentation does not
change that frozen code or its package.

## Run the standalone School app

Install Node/npm and use the native Codex version accepted by `server/codex.mjs`
(the current checkpoint checks 0.159.0), with an existing ChatGPT-managed sign-in.

```powershell
npm ci
npm run dev
```

Open **http://127.0.0.1:3000/**. For the built app, run `npm run build` and
`npm run preview`. Preview also runs the local School API: serving `dist/` alone
does not provide teaching. If native compatibility fails, review the check and
the selected executable; do not bypass it or add an API-key fallback silently.

## Use Professor in Quest AR

Use the paired [Matrix release and setup guide](https://github.com/School-of-the-Ancients/matrix-loading-operator/blob/main/Docs/V1.3-Checkpoint.md).
The release contains `Start-Professor.ps1`. From source, build School with
`npm run build` and `npm run build:matrix`, build Matrix's `WebRuntime`, and run
Matrix's `node Tools/start_professor_local.mjs` with this checkout as its argument.

The companion starts Matrix on port **8765** and School on **3110**. It refuses to
replace occupied services. Its local Operator default is the owner's selected
Full access policy; School's teacher remains tool-restricted.

Connect Quest by USB, run Matrix's `python Tools/connect_professor_quest.py`, and
open **http://127.0.0.1:8765/web/** in Quest Browser. With Professor selected, a
first question creates a lesson; an existing avatar restores its bound lesson.
The optional `?professor=davinci` parameter prefers an existing Leonardo binding;
it does not create or reset a lesson. Matrix owns microphone capture, voice
playback, body animation, placement, part selection and scene execution.

For a fresh demonstration, archive/start a new Matrix world and separately start
a new idle Operator conversation, then reload the browser. Old School lessons
stay in History. A new world alone is not a new Operator conversation.

## Data and access

School stores plaintext learner records in ignored `.school-data/`, scoped by a
long-lived HttpOnly browser cookie. Keep the folder and cookie when preserving a
lesson; use **Export learning record** for a portable record. Device-link codes
provide one-use access to the same local archive, not cloud synchronization.
Do not expose the API/Vite server on the public network. Quest's USB loopback
route retains the local origin checks.

Do not commit archives, recordings, tokens, generated images or private avatar
files. The virtual-view image sent with a selected-point question is transient;
it is not a physical passthrough-camera feed.

## Validate changes

```powershell
npm run test:server
npm run test:run
npm run typecheck:school
npm run build
npm run build:matrix
```

`npm run check:codex` checks local compatibility/login. `npm run smoke:codex`
explicitly performs a synthetic native teaching turn; ordinary tests use mocks.
Builds/tests do not establish Quest wearer acceptance or long-term learning gains.

## Documentation

- [Current checkpoint and issue status](CHECKPOINT.md)
- [Teaching, records and native adapter](docs/OPENAI_REBUILD.md)
- [Matrix request contract](docs/OPERATOR_HANDOFF.md)
- [Existing concept/image connection](docs/OPERATOR_CONNECTION.md)
- [Living implementation history](execplan.md) — dated entries describe their original scope
- [Preserved pre-embodied README](docs/archive/pre-embodied-README.md)
