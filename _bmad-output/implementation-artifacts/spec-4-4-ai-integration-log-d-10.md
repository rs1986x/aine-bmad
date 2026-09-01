---
title: 'Story 4.4: AI integration log (D-10)'
type: 'feature'
created: '2026-09-01'
status: 'done'
review_loop_iteration: 0
baseline_commit: '8f704bacd3d675ba7b7818c8a049d0fa8afbcb0d'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The BMAD lifecycle used AI across planning, implementation, and review, but D-10 does not exist, so stakeholders cannot see what was recorded, what humans corrected, or where the record is incomplete.

**Approach:** Compile a chronological stakeholder log from existing committed records only. Cover every required phase; label missing sources as gaps; make D-10 discoverable from the README and QA report without rewriting those deliverables.

## Boundaries & Constraints

**Always:** Cite a committed path for every usage, decision, value, or correction claim. Distinguish recorded facts from gaps. Cover PRD, UX, architecture, epics/stories, development, and QA even when a phase is only a gap. Reuse the D-7/D-8 evidence-label style (Verified / Historical / Attestation plus an explicit Gap label). Keep the log chronological and bounded to this checkout.

**Ask First:** Any product, test, CI, or generated-evidence change; a filename other than `docs/ai-integration-log.md`; reconstructing activity from chat memory or uncommitted transcripts; more than a discovery-link edit to README, QA, accessibility, or security reports.

**Never:** Invent prompts, models, dates, decisions, or corrections that are not already written down. Infer architecture or epics AI usage from document existence or frontmatter. Claim completeness, CI run URLs, or live prompt archives that were never captured. Absorb or rewrite D-6 through D-9.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Recorded planning source | PRD/UX decision logs and review artifacts exist | Phase entries cite those files and summarize only what they record | Do not add unstated prompts or models |
| Missing phase record | Architecture and epics have no decision log | Phase is present and labeled Gap | Do not infer a workflow from the finished doc |
| Unsupported identity claim | Spec-format stories 2.4–4.3 have Review Findings but no Agent Model Used | Record the review corrections; state model identity as Gap | Do not backfill models from later stories |
| Stakeholder discovery | README and QA report already link D-8/D-9 | Both also link D-10 without duplicating the log | Do not rewrite those reports |

</frozen-after-approval>

## Code Map

- `docs/ai-integration-log.md` -- new canonical D-10; mirror D-8/D-9 opening (deliverable ID, compilation date, “does not reconstruct unrecorded activity”), bounded executive conclusion, evidence labels, then phase sections.
- `_bmad-output/planning-artifacts/prds/prd-aine-bmad-2026-06-15/.decision-log.md:7-31` -- richest PRD record: Fast path, pasted source PRD, gap-batch decisions, subagent reconcile, rubric walker, human-fixed findings, light-touch polish.
- `_bmad-output/planning-artifacts/prds/prd-aine-bmad-2026-06-15/{reconcile-source.md:35-36,review-rubric.md,addendum.md:5-11}` -- supporting PRD artifacts; `prd.md:244` is the D-10 requirement only.
- `_bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/.decision-log.md:7-38` -- UX Fast path, gap-batch decisions, parallel rubric + a11y subagents, human-applied token/spec fixes.
- `_bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/{review-rubric.md,review-accessibility.md}` -- UX review outputs cited by the decision log.
- `_bmad-output/planning-artifacts/architecture.md:1-15` -- workflow frontmatter only (`user_name: Riccardo`, `2026-06-16`); no decision log, reviews, or model names. Treat as Gap.
- `_bmad-output/planning-artifacts/epics.md:119-120,149,505-525` -- D-10 ACs and a Story 1.1 “CI URL for the AI log” note that was never captured. No epics creation log. Treat planning of epics/stories as Gap.
- `_bmad-output/implementation-artifacts/{1-1,1-2,1-3,1-4,2-1,2-2,2-3}-*.md` -- `## Dev Agent Record` / `### Agent Model Used`: Opus 4.8 (Cursor) on 1.1–2.2; GPT-5.6 Sol on 2.3. Also their Review Findings.
- `_bmad-output/implementation-artifacts/spec-{2-4,2-5,3-1,3-2,3-3,4-1,4-2,4-3}-*.md` -- human-owned `<frozen-after-approval>` plus Review Findings / Spec Change Logs; **no** Agent Model Used.
- `_bmad-output/implementation-artifacts/deferred-work.md:1-9` -- `bmad-code-review` deferrals as the cross-story human-correction ledger.
- `_bmad-output/implementation-artifacts/sprint-status.yaml:35-36,83` -- “different LLM recommended” for code review; Story 4.4 status is tracked here and is no longer `backlog`.
- `docs/qa-report.md:10-17,65-68` -- reuse evidence-label vocabulary; add a D-10 discovery sentence after the D-8/D-9 links. No record of who authored the QA report — label that identity Gap.
- `docs/{accessibility-audit.md:1-36,security-review.md}` -- read-only pattern for bounded conclusion and labels; do not rewrite.
- `README.md:277-282` -- add D-10 beside D-8/D-9; do not expand the operator guide into the log.
- `docs/readme-verification.md` -- D-6 archive only; not an AI-usage source.

## Tasks & Acceptance

**Execution:**
- [x] `docs/ai-integration-log.md` -- compile D-10 with a bounded conclusion, evidence labels including Gap, and chronological PRD → UX → architecture → epics/stories → development → QA sections that cite only the Code Map sources.
- [x] `README.md` and `docs/qa-report.md` -- add stakeholder discovery links to D-10 without duplicating the log or restating other reports.
- [x] `_bmad-output/implementation-artifacts/sprint-status.yaml` -- keep Story 4.4 status synchronized with the approved workflow lifecycle.

**Acceptance Criteria:**
- Given the PRD and UX decision logs, when D-10 is read, then those phases cite Fast path, recorded decisions, subagent/rubric reviews, and human-fixed findings, and do not invent verbatim prompts.
- Given architecture.md frontmatter and the absence of an epics decision log, when those phases are read, then each is present and labeled Gap rather than reconstructed.
- Given implementation artifacts, when the development section is read, then agent models are named only for stories 1.1–2.3, review corrections cite Review Findings or `deferred-work.md`, and stories 2.4–4.3 state model identity as Gap.
- Given incomplete records, when a prompt, CI URL, or author identity is missing, then D-10 labels it Gap and does not fill it from inference.
- Given completed D-10, when a stakeholder follows README or QA-report links, then the log is reachable without reading implementation specs.

### Review Findings

- [x] [Review][Patch] Spec Code Map still calls Story 4.4 backlog [_bmad-output/implementation-artifacts/spec-4-4-ai-integration-log-d-10.md:51]

## Spec Change Log

## Design Notes

Mirror D-8/D-9: one canonical file, executive framing first, then sourced detail. Summarize records; do not paste decision logs wholesale. Git “review patches” commits may corroborate a cited Review Finding but are not a substitute for a missing model or prompt.

## Verification

**Commands:**
- `rg -n "D-10|Gap|decision-log|Agent Model Used|Opus 4.8|GPT-5.6 Sol|bmad-code-review" docs/ai-integration-log.md` -- expected: deliverable identity, Gap labels, and recorded models/reviews are locatable.
- `rg -n "ai-integration-log|D-10" README.md docs/qa-report.md` -- expected: stakeholder links exist and no text says Story 4.4 remains backlog.

**Manual checks:**
- Every phase heading exists; architecture and epics/stories are Gaps.
- No prompt, model, or CI URL appears unless its source file is cited.
- D-6 through D-9 content is unchanged except the two discovery-link edits.

## Suggested Review Order

**Bounded conclusion**

- Start here: attestation, recorded models, and first-class Gaps.
  [`ai-integration-log.md:8`](../../docs/ai-integration-log.md#L8)

- Evidence labels include Gap so missing records stay visible.
  [`ai-integration-log.md:24`](../../docs/ai-integration-log.md#L24)

**Recorded planning**

- PRD Fast path, reconcile, rubric, and human-fixed findings.
  [`ai-integration-log.md:39`](../../docs/ai-integration-log.md#L39)

- UX reviews, token fixes, and no-reconcile-subagent decision.
  [`ai-integration-log.md:78`](../../docs/ai-integration-log.md#L78)

**Phase gaps**

- Architecture is present only as a frontmatter-cited Gap.
  [`ai-integration-log.md:115`](../../docs/ai-integration-log.md#L115)

- Epics/stories planning has no creation log.
  [`ai-integration-log.md:126`](../../docs/ai-integration-log.md#L126)

**Development and QA**

- Models named only for 1.1–2.3; 2.4–4.4 are Gap.
  [`ai-integration-log.md:136`](../../docs/ai-integration-log.md#L136)

- Two recorded overrides; no separate override inventory.
  [`ai-integration-log.md:258`](../../docs/ai-integration-log.md#L258)

- QA authorship and Story 1.1 CI URL remain Gaps.
  [`ai-integration-log.md:272`](../../docs/ai-integration-log.md#L272)

**Discovery**

- README lists D-10 beside D-8 and D-9.
  [`README.md:281`](../../README.md#L281)

- QA report links D-10 without duplicating the log.
  [`qa-report.md:70`](../../docs/qa-report.md#L70)

**Tracking**

- Story 4.4 lifecycle moved out of backlog.
  [`sprint-status.yaml:83`](sprint-status.yaml#L83)
