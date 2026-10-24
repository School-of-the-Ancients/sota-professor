# Automatic exhibit preparation — validation

A new quest creates one focused draft after the chosen historical figure and
learning objectives are known. The native text preparation starts alongside the
introduction and never blocks that reply. Its output is a saved editable prompt,
not an image, Blender asset, loaded scene or interactive exercise. Matrix remains
not connected.

The default full prompt is visible immediately. Edit prompt saves a versioned
user draft. Late generation cannot overwrite an edit or a changed mentor/topic.
Reload only reads state; it does not generate again. A server restart or failed
save shows interrupted/error with the draft retained and an explicit retry.
Retries reuse the initial request identity. Older quests are unchanged on reads
and offer Prepare a focused exhibit request instead of consuming a subscription
call merely because they were reopened.

Background updates use a separate presentation revision and short serialized
archive writes. They do not change quiz/lesson authority or replace a learner's
new messages. Two preparation workers and eight total in-memory jobs bound the
queue. No teacher authoring tools or image/Matrix adapter is introduced.

Checks: 42 server tests, 19 frontend/legacy tests, strict School typecheck and
production build passed. Focused tests cover concurrent introduction, duplicate
prevention, edit/reopen and stale versions, failures and retry, restart without
replay, mentor/topic invalidation, legacy compatibility, active learner-turn
preservation, failed-introduction abandonment, editor state during refresh, and
old UI polling after quest navigation. Existing learning/quiz/auth restrictions
continue to pass.

Actual native-subscription evidence is separate: one synthetic quest completed
four operations (plan, match, exhibit and teach). Exhibit and introduction calls
overlapped. The introduction returned with exactly one preparing draft. The
request then completed, its full prompt was saved, a user edit survived API/store
reopen, and reload did not trigger another generation. No paid API, images,
Blender, Matrix or real-user archive was involved. Private receipt and synthetic
records stay ignored under .school-data/validation.

Build artifact: index-CReO4utH.js (247.10 kB before gzip). This is desktop/server
and automated UI evidence, not a headset or real interactive-exhibit acceptance.
The read-only Matrix recommendation is MATRIX_INTEGRATION_RECOMMENDATION.md.
Remote publishing was not attempted; the prior rejected documentation push is
still pending separate approval. Local commits are the checkpoint for this task.

Both comparison runtimes were updated deliberately after idle checks and private
archive/source backups. Every existing top-level archive hash remained unchanged
during the source update; data was neither moved nor copied from the synthetic
validation archive. Source differences were three-way merged or narrowly edited.
The 3107 runtime then passed 42 server tests, 19 UI tests, strict typecheck and
build. The 3108 build also passed. Both emitted index-CReO4utH.js, matching the
private source build, and both served HTTP 200 with native Codex configured.
The transformed ExhibitPanel module was checked on both URLs. A fresh manual
browser/headset interaction is not claimed for this update.

For an older saved quest with no initial request, use Prepare a focused exhibit
request. New quests start it automatically after mentor matching. The View
presentation prompt section is open for the initial request; Edit prompt → Save
prompt persists the full text. Failure/restart offers explicit retry and never
replays a native call just because the page was reopened.

The original 3107 runtime source is locally committed as
0d00170d8ca2f3778a9d39adf5147e03c417b19d. The staged 3108 copy uses the same
feature/build while retaining its separate learner archive.
