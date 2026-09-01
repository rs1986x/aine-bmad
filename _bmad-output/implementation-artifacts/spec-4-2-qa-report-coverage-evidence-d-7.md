---
title: 'Story 4.2: QA report + coverage evidence (D-7)'
type: 'feature'
created: '2026-08-31'
status: 'done'
review_loop_iteration: 0
baseline_commit: '9eed5e8bd5f42fa23c0c8361e3e3937919e52284'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Stakeholders cannot see what was tested, that it passed, or that the ≥70% coverage claim is reproducible. No consolidated QA report exists; coverage HTML/LCOV is gitignored; SM-1 and NFR-1 have no recorded results.

**Approach:** Publish a committed QA report that traces every FR/NFR to covering tests, records level counts and defects, archives a reproducible local per-area coverage breakdown, and captures the unaided-walkthrough and responsiveness observations. Point the README at it.

## Boundaries & Constraints

**Always:** Treat regenerated local `test:coverage` output as authoritative over `docs/readme-verification.md`. Label facts vs targets vs attestations. Keep coverage HTML/LCOV and Playwright HTML gitignored; commit narrative tables plus verbatim reproduce commands. Reference `docs/accessibility-audit.md` and `docs/security-review.md` without rewriting them. Log `deferred-work.md` defects with open/resolved status. Classify tests as frontend unit, frontend component/hook (RTL), backend unit, backend integration (Supertest/Postgres), and E2E.

**Ask First:** Presenting SM-1 as a first-time-user 5/5 without a real first-time volunteer (otherwise record an operator walkthrough labeled attestation). Any application, test, CI, threshold, or `.gitignore` change.

**Never:** Invent counts, coverage %, walkthrough outcomes, or latency figures. Pad coverage. Absorb Stories 4.3–4.4. Treat ~200ms UI / <500ms API as CI gates. Change product code to improve the report.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy-path compile | Green local suites + coverage ≥70% | Report records counts, pass/fail, per-area %, and reproduce commands | N/A |
| Stale documented snapshot | Fresh local results differ from prior documentation | Fresh local results are reported with their environment and revision | Label the prior snapshot as historical |
| Coverage below 70% | Any metric under threshold | Do not claim ≥70%; record the actual % | HALT rather than padding tests |
| SM-1 without first-time user | No volunteer | Record operator walkthrough as attestation, not SM-1 5/5 | Ask First before claiming unaided first-time success |
| 4.3 still backlog | D-8/D-9 not formalized | Link Story 3.2/3.3 evidence docs; state 4.3 will formalize | Do not duplicate or mark D-8/D-9 done |

</frozen-after-approval>

## Code Map

- `docs/qa-report.md` -- implemented D-7: environment, method, observed outcomes, traceability, local coverage, safe reproduce commands, and residuals.
- `README.md:192-281` -- Tests/CI; QA-report pointer sits beside the a11y/security links without duplicating the report.
- `docs/readme-verification.md:32-69,116-128` -- 2026-08-31 local snapshot only (FE 10/157, BE 7/95, E2E 30, coverage in the 86–97% range). Re-run; do not copy as CI-matched.
- `.github/workflows/ci.yml:39,48-57,83-105` -- existing automation context only; this exercise does not require triggering CI or retrieving artifacts.
- `frontend/vite.config.ts:19-32`, `backend/vitest.config.ts:7-18` -- v8, html+lcov+text, 70% all four metrics; outputs `frontend/coverage/` and `backend/coverage/`.
- `.gitignore:8-12` -- `coverage/`, `playwright-report/`, `test-results/`, `axe-results/` stay ignored.
- Frontend tests -- unit: `groupTodos.test.ts`, `api.test.ts`, `styles/app.test.ts`; component/hook: `components/*.test.tsx`, `useTodos.test.tsx`, `App.test.tsx`.
- Backend tests -- unit: `env.test.ts`, `todo.schema.test.ts`, `todo.service.test.ts`, `errorHandler.test.ts`, `todo.repository.test.ts`; integration: `todo.api.test.ts`, `security.api.test.ts`.
- E2E -- `e2e/tests/{crud,stack,a11y,keyboard,a11y-gate}.spec.ts`. `crud.spec.ts` covers the five core actions; cite a11y/keyboard, do not copy those reports.
- `_bmad-output/planning-artifacts/prds/prd-aine-bmad-2026-06-15/prd.md` -- FR-1..7, NFR-1..7, SM-1..4 (SM-1 = unaided FR-1..5; NFR-1 = SM-3).
- `_bmad-output/implementation-artifacts/deferred-work.md` -- defect log source. Open: NUL→500, volume remount, reload stale list, unbounded GET, a11y residuals. Resolved: 2.5 abort/timeout; 3.2 heading/name collisions.
- `_bmad-output/planning-artifacts/epics.md:459-481`, `epic-4-context.md:19-22,34,41`, `spec-3-1-e2e-suite-5-playwright-coverage-gate-70.md` -- D-7 ACs and coverage-gate origin; the E2E suite has grown since 3.1.

## Tasks & Acceptance

**Execution:**
- [x] `docs/qa-report.md` -- author strategy, level counts/outcomes, FR/NFR traceability with pass/fail, defect log, ≥70% per-area coverage from fresh local runs, SM-1 walkthrough result, NFR-1 observational latency, and reproduce commands -- this is D-7
- [x] `README.md` -- add a one-line pointer to `docs/qa-report.md` in Tests and Quality Checks / CI -- make D-7 discoverable without duplicating the report

### Review Findings

- [x] [Review][Patch] Measure response-to-render latency from a trustworthy boundary [docs/qa-report.md:128]
- [x] [Review][Patch] Keep the story lifecycle status consistent with sprint tracking [_bmad-output/implementation-artifacts/spec-4-2-qa-report-coverage-evidence-d-7.md:5]

**Acceptance Criteria:**
- Given the committed report, when a stakeholder reads it without source inspection, then they can see strategy, unit/integration/component/E2E counts and outcomes, every FR-1..7 and NFR-1..7 mapped to covering tests with pass/fail, and defects with status.
- Given coverage evidence in the report, when compared with fresh local `test:coverage` output, then lines/functions/branches/statements match, each is ≥70%, and the breakdown is by area rather than a single headline number.
- Given SM-1, when the walkthrough section is read, then it records create/view/complete/edit/delete results and whether the actor was a first-time user or an operator attestation.
- Given NFR-1 / SM-3, when the responsiveness section is read, then it records an observational UI-reaction (~200ms after server response) and typical API latency (<500ms) under local conditions, labeled as a development target not a CI gate.

## Spec Change Log

- 2026-09-01: Human approved local-only evidence after CI artifacts were unavailable. The frozen intent and matrix now make regenerated local coverage authoritative and do not require CI invocation or CI-matched claims.
- 2026-09-01 (implementation/review): Corrected overstated FR/NFR verdicts to partial where evidence or known defects leave gaps; measured UI reaction from browser Resource Timing `responseEnd` to the matching visible DOM mutation; documented safe root-based reproduction lifecycles, locatable test roots, clean-machine limits, curated defect scope, and both non-exact Add locators.

## Design Notes

Do not commit `coverage/` trees. Copy Vitest's four-metric summaries into the report so a reviewer can regenerate HTML/LCOV with README commands.

Measure API latency with timed `curl` against the health-gated stack; measure UI reaction once (create or toggle) after the network response. Traceability rows name test files, not PRD restatements. Cite NFR-5/6/7 from README and Stories 3.1–3.3; do not re-audit.

## Verification

**Commands:**
- `cd frontend && npm run test:coverage` -- expected: suite passes; capture the four metrics.
- README backend coverage commands (test Compose + `npm run test:coverage` + `down -v`) -- expected: suite passes; capture the four metrics.
- The root-based trapped E2E block in `docs/qa-report.md` -- expected: 30 Playwright tests pass on the disposable local stack; record any failed attempt as well as a successful rerun.
- The root-based trapped operator-measurement block in `docs/qa-report.md` -- expected: prints the create UI-reaction interval measured after the observed POST response and removes its Todo/stack.
- `rg -n "docs/qa-report.md" README.md` -- expected: README points at the report.
- `rg -n "FR-[1-7]|NFR-[1-7]|Partial|e2e/support/app.ts:67|e2e/tests/stack.spec.ts:42" docs/qa-report.md` -- expected: all requirements have explicit outcomes and both selector-flake sites are reconciled.

**Manual checks:**
- `docs/qa-report.md` contains strategy, counts, FR/NFR matrix, defects, coverage breakdown, SM-1, and NFR-1; no invented numbers; a11y/security are links not copies.
- E2E evidence records both the final 30/30 run and the preceding intermittent failure without implying that `crud.spec.ts` measures timing.
- The walkthrough is labeled operator attestation, covers create/view/complete/edit/delete, and documents the browser-clock `responseEnd` → visible DOM mutation measurement sequence.
- FR-7, NFR-1, NFR-2, NFR-3, and NFR-6 remain partial where known defects or unmeasured conditions prevent a full pass.
- The defect table states that it is curated and reconciles relevant open/resolved items with `deferred-work.md`, including both non-exact Add locator sites.
- Reproduction blocks start at the repository root, install dependencies, pre-clean named Compose projects, and trap teardown without invoking CI/CD.

## Suggested Review Order

**QA evidence contract**

- Start with evidence labels, environment, and the layered verification strategy.
  [`qa-report.md:10`](../../docs/qa-report.md#L10)

- Confirm every FR/NFR maps to named tests and an explicit outcome.
  [`qa-report.md:46`](../../docs/qa-report.md#L46)

**Coverage and observations**

- Compare fresh package totals and transparent per-area percentages.
  [`qa-report.md:69`](../../docs/qa-report.md#L69)

- Check the operator-only SM-1 attestation avoids a first-time-user claim.
  [`qa-report.md:104`](../../docs/qa-report.md#L104)

- Review local latency measurements and their non-gate boundaries.
  [`qa-report.md:120`](../../docs/qa-report.md#L120)

**Residual risk and reproducibility**

- Inspect open/resolved defects, including the observed E2E selector flake.
  [`qa-report.md:147`](../../docs/qa-report.md#L147)

- Reproduce each evidence layer without committing generated artifacts.
  [`qa-report.md:164`](../../docs/qa-report.md#L164)

- Track the selector flake for an approved test-only repair.
  [`deferred-work.md:103`](deferred-work.md#L103)

**Discoverability**

- Verify the README points stakeholders to the consolidated report.
  [`README.md:281`](../../README.md#L281)
