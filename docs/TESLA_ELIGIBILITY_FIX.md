# Tesla historical mentor eligibility fix — October 21, 2026

Root cause: the identity prompt requested a real historical teacher, and the
model treated teaching as an occupation. The validator required no teaching
credentials; it correctly rejected the model's uncertain result. The corrected
prompt asks whether the name identifies a real historical person and explicitly
states that professional teaching employment is not required. Persona generation
must not invent teaching jobs or documented classroom methods. The subsequent
Mentor Matcher still reviews expertise against the actual quest.

New regressions cover Tesla, Darwin, Monet and curated Leonardo eligibility,
genuine ambiguous/fictional identities, distinct topic-fit rejection, the exact
policy reaching native Codex, and the eligibility explanation in the UI. No
whitelist or automatic override converts genuinely uncertain identities to
plausible.

The private source checkout passes 35 server tests, 16 frontend/legacy tests,
strict School typecheck and production build. The original restoration runtime
passes its 30 server tests, 16 frontend tests, strict typecheck and build (it does
not include the five later presentation-contract tests).

Live evidence: exactly two native ChatGPT-auth generations via the actual local
HTTP creation endpoint accepted Nikola Tesla, created a full reusable persona,
saved/reopened it and confirmed archive-owner isolation. This ran in a new
synthetic archive under ignored .school-data/validation, created no learner
sessions and did not touch a user's archive. The receipt is private and excluded
from Git. This model plausibility check is not independent historical verification.

The main served restoration worktree includes this same eligibility policy in
local commit db3ed482bbe45abe083c64046acf5c5b7f9627f7, based on 6eeb566.
Only the targeted prompts, eligibility copy and regressions were applied there;
the later Operator contracts were not silently substituted. The original
sota-beta origin/history and all saved archives are preserved. No push is made
to sota-beta. No paid API, billing, access, Matrix or deployment changes occur.
