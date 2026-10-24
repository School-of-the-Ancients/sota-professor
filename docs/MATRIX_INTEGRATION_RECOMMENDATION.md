# Professor inside Matrix: integration recommendation

Read-only source review on Demerzel: Matrix checkout
`C:/Users/theto/Documents/Codex/2026-10-16/task-4/matrix`, HEAD
`2279c3d65228827ec3484aa008b991c8612287df`, with existing uncommitted changes.
No Matrix file, service setting, world or permission was changed. These are
source findings, not proof of current PC capabilities or headset acceptance.

## Boundaries and first embodied professor

Professor owns historical persona, pedagogy, objectives, assessment and learner
records. Matrix owns the one world, entity identity/rendering, AR/VR presentation,
assets, Blender authoring, permissions and execution receipts. Attach the first
professor persona/session to one ordinary Matrix entity or a clearly labeled
placeholder. Do not start a separate citizen simulation, scene graph, loader or
clock. A persona is not a visible avatar, and an avatar is not the teaching model.
Historical character models/rigs, lip sync and their device readiness were not
verified. Existing Citizens data/inspector code is not evidence that an embodied
LLM professor is already implemented.

| Layer | Existing source to reuse | Missing connection |
| --- | --- | --- |
| Entry and world | `/web/`, `MatrixView`, `XRSessionController`, world/scene persistence | Explicit lesson entry in a white room or blank scene; preserve any existing world instead of clearing it silently. |
| Ask input | `main.js` Hold for Codex/voice capture; `agent_client.js` → `POST /api/agent/transcribe` | Route recognized learner text into the School teaching session, not into privileged Operator authoring. Keep a text option. |
| Output speech | `POST /api/voice/speak`, Windows `tts.py`/worker, optional browser speech synthesis | Feed mentor reply text into the existing optional speech path; it is bounded (300 characters in current PC TTS), not an unlimited realtime voice API. |
| Persona and teaching | School's selectable figures, historical-person review, durable transcript, quiz/review | Map one Matrix professor identity to one learner session; retain the tool-disabled teaching boundary. |
| Request preparation | School's automatic asynchronous exhibit draft and full prompt editor | Owner-reviewed handoff, version/cancellation mapping and capability checks. No image job is started today. |
| Visible professor | Ordinary Matrix world entities and existing asset/rendering paths | Choose/verify a suitable avatar or placeholder and preserve its identity. Do not claim historical-avatar rendering or wearer testing from a text persona. |

The intended flow is: enter an explicitly chosen blank teaching area → press Ask
(or type) → learner question selects a historical interpretation → introduction
and focused request preparation proceed independently. A historical atmosphere
may support the lesson, separately from the focused learning exhibit. In VR an
explicit transition can surround the learner with a setting. In AR retain real
surroundings/passthrough and add exhibits; do not promise to replace the room.

## Existing creation surface

`ControlService/AGENT_PORTAL.md`, `server.py`, `concept_store.py`,
`matrix_mcp.py`, and `WebRuntime/src/concept_client.js` provide the concrete path:

| Step | Existing contract |
| --- | --- |
| Check image capability | `GET /api/agent/concepts?sessionId=...` reports providers/availability and jobs/concepts/builds. Native images are conditional on ChatGPT login plus app-server image capability, not on the subscription alone. |
| Image mockup | `POST /api/agent/concepts` with `{sessionId,prompt,providerId?}` returns a job. |
| Poll/preview | Same GET plus `GET /api/agent/concepts/<conceptId>/preview`; retain returned concept id and one-based version. |
| Explicit selection | `POST /api/agent/concepts/select` with `{sessionId,conceptId,designNotes?}`. A later result never changes selection automatically. |
| Build selected mockup | `POST /api/agent/turn` with explicit build text, session/context, `expectedConceptId`, `expectedConceptVersion`, `creationMode:"blender"`. `agent_portal_turn` rejects a changed selection or unsupported mode. |
| Asset/load receipts | Existing Blender export → GLB validation/registration (`matrix_register_glb`) → typed spawn (`matrix_spawn_asset`) → status/observed receipt. Require actual runtime/object/asset identity. |

Optional historical panoramas already have a separate `purpose:"panorama"`
selection, registration and environment-action/receipt path. They must not be
confused with object concepts. A registered panorama is not an applied world;
its application requires current room/revision and an explicit transition.

The School adapter remains missing. It needs an approved server-side connection,
owner/session mapping, current Matrix capability/permission checks, exact prompt
and selected-version provenance, bounded job polling, and normalized receipts.
Do not put Matrix/Codex/MCP credentials in the browser or teacher context. Existing
bearer/same-origin checks mean a new browser origin cannot simply call privileged
Matrix routes. No credentials, OAuth grant or access change was performed here.

## Small first end-to-end slice (future authorization)

Use one learner question, one professor persona/placeholder and one static
educational exhibit. Start with text and optional existing PC speech. Prepare and
review the prompt while the professor teaches. After explicit handoff, request a
single Matrix-native mockup only when advertised available; show progress/failure
and preview. The owner selects an exact version, then explicitly requests the
existing Blender build and loader. Report a loaded object only after its real
receipt/observed state. Do not auto-replace an active AR/VR scene when work becomes
ready. Keep image/mockup readiness, asset readiness, loaded object and verified
interaction separate. Scientific simulation validity, instructional playability,
voice quality, permissions UX and wearer evidence remain later checks.

No Matrix jobs, images, Blender work, scene transitions, realtime voice API calls
or fleet/civilization features are part of the current implementation. No paid
fallback is enabled. Current standalone automatic preparation is one bounded
subscription-backed text operation, not this future creation adapter.
