# Local Matrix Operator connection

The complete Professor UI can now hand saved structured artifact/location/lab
requests to the existing Matrix Operator. Artifact means an exhibit image;
location/lab means a background preview. Optional Blender/spatial creation and
background application stay in Matrix's explicit selection/version controls.
Images are not automatically 3D objects or working simulations.

In the mounted app, inspect/edit a saved prompt, then choose Request exhibit image
or Request setting image. Operator updates appear in the conversation and the
request card. A verified image preview appears only after its actual job is ready.
Review / select / build in Matrix returns to the existing UI. Recovery and refresh
read the original job instead of creating a duplicate. An edited prompt requires
another explicit request. Older saved sessions are never auto-submitted.

Teacher calls remain tool-disabled native Codex. The frame uses exact parent
origin/source and per-load channel checks; model text cannot invoke arbitrary
tools, URLs or code. School verifies returned IDs against the fixed local Matrix
service before saving a matching lesson/request/prompt-version receipt. Lesson
and quiz revisions/answers are not reset by status updates. Only the last eight
current bounded result summaries enter teaching context, with explicit limits on
claims of loaded scenes, interaction, simulation and mastery.

The candidate uses `http://127.0.0.1:8765/web/` -> Professor, with its own local
backend at 3110. The current Leonardo app and archive remain on 3108 untouched.
No learner data was migrated or silently shared. Standalone Professor is retained.
Build with `npm run build` and `npm run build:matrix`; the isolated Matrix worktree
contains `Tools/start_professor_local.mjs` and the detailed connection/run record
`Docs/Professor-Operator-Connection.md`.

The Matrix mount is opt-in and PC-loopback only. It preserves both applications'
origin/auth checks; no CORS, firewall, remote binding or credential grant changed.
If existing Matrix bearer authentication is configured, status/iframe access
fails closed instead of copying an owner token into the teacher or child frame.
Native image capability must be advertised for the existing ChatGPT account;
there is no paid API fallback and subscription limits still apply.

Evidence: 47 server tests, 22 frontend tests, strict typecheck and standalone +
mounted builds passed. The real applications/HTTP adapters passed a ten-check
mock-backed desktop loop. A separate actual native subscription image completed
with a matching PNG checksum; a separate real read-only desktop check passed.
No live Blender build, background application, scene loading or headset
acceptance is claimed. Test logs, images and archives remain ignored locally.
