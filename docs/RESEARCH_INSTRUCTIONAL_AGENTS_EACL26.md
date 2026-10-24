# Research proposal: EACL 2026 Instructional Agents as SOTA curriculum creator

**Status:** research and bounded integration evaluation; no upstream runtime installed or course generated in SOTA.
**Captured:** 2026-10-22, following Hua Wei's CU Boulder colloquium.
**Owner:** School of the Ancients curriculum/teaching module. Matrix is an optional presentation consumer, not an integration prerequisite.

## Source and provenance

- [Instructional Agents: Reducing Teaching Faculty Workload through Multi-Agent Instructional Design](https://darl-genai.github.io/instructional_agents_homepage/) — Huaiyuan Yao, Wanpeng Xu, Justin Turnau, Nadia Kellam and Hua Wei, EACL 2026 Main ([arXiv:2508.19611](https://arxiv.org/abs/2508.19611)).
- [Open-source implementation](https://github.com/DaRL-GenAI/instructional_agents) — **MIT license**; implements an ADDIE-based multi-agent instructional-design workflow. Produces course goals, syllabus, scripts, slides and assessments, with CLI, REST API, a web interface and an evaluation path.
- [Instructional Agents skills](https://github.com/DaRL-GenAI/instructional_agents-skills) — optional Claude Code workflows for course generation, slide conversion and review; not a dependency on Claude for School.
- Existing SOTA adaptive curriculum concept: [sota-v2 #76](https://github.com/School-of-the-Ancients/sota-v2/issues/76). Existing cross-project School educational sequence: [roadmap #11](https://github.com/School-of-the-Ancients/school-of-the-ancients-roadmap/issues/11) (closed historical issue; do not reopen without scope/evidence).

## Why this matters

SOTA currently owns goal selection, historical mentor identity, Socratic dialogue, objective-linked quizzes, mastery review, and learner records. It does **not** need to invent a full multi-role instructional department before evaluating upstream's available course-authoring research.

**Architectural separation:**

```text
Learner goal / constraints
  -> optional multi-agent curriculum authoring (Instructional Agents candidate)
  -> typed, reviewed CoursePlan (no silent publish)
  -> SOTA quest / lesson planner
  -> historical-mentor teaching and checks
  -> mastery evidence, remediation and next learning objective
      \-> optional, reviewed Matrix/Blender exhibit prompts
```

The authored plan should not determine the learner's actual mastery. Quiz observations and learner-owned records remain School's authority. Generated 3D visuals do not establish a correct lesson or a passing assessment.

## Proposed adapter boundary (research design only)

Treat upstream's syllabus, objectives, chapter/slide/script and assessments as **candidate documents**. Parse/validate into an internal draft contract rather than directly coupling SOTA code to upstream files or agent prompts:

- Course identity, audience, learning goal, duration, prerequisites and source/provenance.
- Versioned objective IDs, a sequence of lessons and their objectives/dependencies.
- Reviewable citations/resources and content status: `draft | reviewed | rejected`.
- Assessment rubric/questions mapping back to objectives, with answer keys server-side.
- Optional exhibit descriptors and reusable asset provenance; ordinary text fallback.
- Learning progress and personal data stay in SOTA's existing learner model; do not send a learner's private wiki to course generators by default.

## Test plan and acceptance before selecting a dependency

1. **Upstream feasibility, isolated:** read pinned tag/license/dependency tree; run a toy course in a sandbox (e.g. Galileo's moons or a two-lesson algorithms prerequisite). Record install steps, supported model/provider, API usage/cost, latency and generated artifacts.
2. **Educational quality:** human-check facts, stated learning objectives, assessment alignment, prerequisites, citation traceability and pedagogy. Compare to a baseline small course authored through current School prompts. Automated self-review is not independent validation.
3. **Narrow adapter:** produce a schema-validated `CoursePlan` draft from one upstream output, with error/empty/invalid cases. SOTA must not execute lessons or publish materials from unreviewed candidates.
4. **Complete School loop:** a user goal opens the reviewed plan, a historical mentor delivers one lesson, a quiz records actual learner evidence, a miss triggers remediation and progress survives reload. **No Matrix headset dependency.**
5. **Optional exhibit:** map one approved lesson concept to a versioned Matrix presentation prompt/asset; if unavailable, browser teaching proceeds normally.

**Done for this spike:** one reproducible evaluated course-generation example, typed candidate mapping, recorded cost/errors/quality, and explicit go/no-go decision. This is not a request to auto-generate every course or ship a public curriculum editor.

## Provider, cost, privacy and security limits

The upstream implementation's README describes **OpenAI API-key backed** model calls. The active SOTA Professor local checkpoint instead uses **native Codex/ChatGPT subscription login**, not API-key fallback. These are different authorization and billing mechanisms. Do not assume upstream can use the subscription, expose keys in client code, infer unlimited free generation, or activate paid API calls without an explicit provider/cost decision.

Do not install upstream code, make live model requests, store credentials, transfer learner records, deploy a service, or modify SOTA's running learning state as part of this documentation proposal. Confirm dependency/licensing implications at integration time and keep generated content reviewable/attributed.

## Scope / non-goals

- No wholesale migration from `sota-professor` back to `sota-v2`; #76 is historical conceptual overlap.
- No new curriculum service required to complete the existing mentor conversation / quiz prototype.
- No AR/VR, Matrix, AI Citizens, multi-instructor marketplace or monetization in the evaluation.
- This research references Hua Wei's *published* Instructional Agents work; the **unpublished** act/adapt/defer SWE-bench claims discussed at the same colloquium are a separate Demerzel/harness research question.
