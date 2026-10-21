# Presentation handoff preparation

This is an interface and validation boundary only. No Matrix adapter, image
generation, Blender execution, runtime loader or interaction exercise is enabled.
The active availability check returns unavailable. Subscription-only teaching
has no paid image/API fallback and exposes no authoring tools to the teacher.

School owns the learning goal, detailed mentor, objectives, assessment and
learner archive. A bounded presentation request separates educational intent,
the exact learning objective, requested interaction, and the visual prompt.
For example, movable angle cards need move/rotate capabilities; a picture of
cards or an inert GLB cannot fulfill that interaction requirement. Legacy
requests without explicit interaction metadata remain unspecified, not assumed
to be satisfied by static media.

The future trusted server adapter in `src/school/contracts.ts` requests an image
mockup through the existing Matrix concept mechanism. Its selected concept id
and version must then be handed to Matrix's existing selected-version → Blender
creation → validated GLB → scene loader pipeline. School does not implement a
second image/asset pipeline or loader. Selection must refer to the exact concept
version; an asset or load receipt cannot silently substitute another version.
AR preserves passthrough and adds exhibits; VR may surround the learner. Matrix
owns those runtime/world/asset choices. School never claims observed room or
headset behavior from a prompt.

Receipt stages deliberately distinguish pending/unavailable/failed,
mockup_generated, asset_generated, object_loaded and interaction_verified.
Generated assets carry concept/version and asset identity. Loaded GLBs require
validated_glb plus runtime and object identity. Verified interaction requires
specific capabilities and an evidence reference, labeled automated, desktop or
headset_wearer. A generated asset is not a loaded scene, a loaded scene is not
verified interaction, and an automated result is not headset/wearer acceptance.
Even verified interaction does not establish scientific simulation validity or
instructional effectiveness.

`validateReceiptShape` validates only the contract; it does not prove the supplied
identities/evidence exist. A future adapter must obtain and verify receipts from
Matrix, bind selected concept/version, and validate evidence before reporting a
stage. No current endpoint accepts success receipts from model/browser input.
The pure progress helper refuses to mark unspecified or unmet interaction
requirements fulfilled. Its tests use explicitly synthetic identities only.

Instructional AR/VR playability, interaction exercises and simulations remain
deferred by the owner. This preparation must not be described as a plugged-in
Operator, available image capability, tested headset experience or live Blender
integration.

## Intended preparation trigger (future adapter only)

Once the historical figure has been selected and the lesson objective is known,
prepare an initial teaching setting or exhibit using BOTH inputs, in parallel
with the introduction. Mentor choice alone is not enough to choose a useful
scene. Future concept-image and Blender work must be asynchronous, with honest
pending/progress/failure and ready-to-load states. The selected concept/version
still enters Matrix's existing pipeline; becoming ready must not automatically
replace an active AR/VR scene. Loading remains an explicit runtime decision.
While no adapter is connected, this is a documented intended trigger only: no
image, Blender or scene job starts, and no paid fallback is enabled.
