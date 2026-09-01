# D-10 — AI integration log

Formal stakeholder deliverable for Story 4.4. Compiled on **2026-09-01** from
committed lifecycle records at baseline
`8f704bacd3d675ba7b7818c8a049d0fa8afbcb0d`. This log does not reconstruct
unrecorded activity.

## Executive conclusion

**Attestation:** Committed records show Fast-path PRD and UX planning with
written decisions, subagent or rubric reviews, and human-fixed findings.
They name implementer models only for Stories 1.1–2.3 and preserve review
corrections in story Review Findings, Spec Change Logs, and the
`bmad-code-review` deferral ledger. Two explicit human overrides are
recorded (Story 3.3 kept `INTERNAL`; Story 4.2 approved local-only QA
evidence). Architecture planning, epics/stories planning, implementer models
for Stories 2.4–4.4, review-model identity, verbatim prompts, CI run URLs,
QA-report authorship, value delivered, and a separate override inventory
are **Gaps**.

This is not a complete archive of AI use. Missing sources are labeled Gap
rather than inferred from finished documents, chat memory, or later stories.

## Evidence labels

- **Verified:** a claim that restates a cited committed record in this
  checkout.
- **Historical:** a dated planning or review record that is cited, not
  re-run.
- **Attestation:** a bounded reading of those records, not a reconstructed
  session.
- **Gap:** no committed source records the prompt, model, date, decision,
  correction, author, URL, value, or override inventory. Nothing is filled
  in from inference.

Every usage, decision, value, or correction claim below cites a committed
path. Unstated prompts and models are not added.

## PRD — Historical, verified 2026-06-15

Source:
`_bmad-output/planning-artifacts/prds/prd-aine-bmad-2026-06-15/.decision-log.md`.
Supporting files: `reconcile-source.md`, `review-rubric.md`, `addendum.md`.
`prd.md` states the D-10 requirement only; it is not an AI-usage log.

**Working mode — Verified:** Fast path, user-requested. Intent was Create;
stakes were a BMAD training exercise that still had to be implementation-ready.

**Source input — Verified:** a user-supplied high-level prose PRD pasted in
chat for a single-user Todo app with no auth. The pasted text itself is not
preserved here. **Gap:** no verbatim prompt archive.

**Recorded gap-batch decisions — Verified:** React + TypeScript frontend and
Node/Express + TypeScript backend, recorded in `addendum.md` rather than the
capability-focused PRD; PostgreSQL as its own Compose service; edit-description
added as FR-4 beyond the original create/view/complete/delete list; minimal
fields (`id`, `description`, `completed`, `created_at`, no `updated_at`);
moderate downstream depth.

**Subagent reconcile — Verified:** a subagent compared the source prose with
`prd.md` and `addendum.md` and wrote `reconcile-source.md`. The decision log
records that no core source requirement was dropped, and that flagged
additions (training framing, Docker/tests/docs deliverables, FR-4) were
confirmed as intentional. **Gap:** the subagent model is not named.

**Rubric review — Verified:** `review-rubric.md` verdict was strong across six
dimensions and adequate on downstream usability (0 critical, 0 high, 1 medium,
3 low). **Human-fixed findings — Verified:** the medium NFR cross-references
that cited "§9" were corrected to §8; glossary `created_at` was normalized;
SM-1's "discoverable" target was tightened to an unaided-completion check;
NFR-5 was split into a testable extensibility core versus intent.

**Polish and close — Verified:** light-touch polish in place rather than full
editorial subagent passes; `prd.md` closed `status: final`, `updated:
2026-06-15`. **Gap:** no PRD implementer or reviewer model is recorded.
**Gap:** value delivered — no cited PRD record states AI value.

## UX — Historical, verified 2026-06-15

Source:
`_bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/.decision-log.md`.
Cited review outputs: `review-rubric.md`, `review-accessibility.md`.

**Working mode — Verified:** Fast path, user-requested. Source was the
finalized PRD plus addendum, inherited by reference.

**Recorded gap-batch decisions — Verified:** from-scratch CSS tokens (no UI
library); calm light-mode visual direction; Active todos above Completed,
newest first within each group; lightweight delete confirmation dialog
(undo-toast declined).

**Parallel reviews — Verified:** rubric walker and accessibility lens ran as
parallel subagents. Rubric (`review-rubric.md`): PASS across eight categories;
0 blocking/high, 1 medium (no numeric contrast targets), 3 low, 4 info.
Accessibility (`review-accessibility.md`): behavioral a11y strong; 3 contrast
failures and 1 focus-ring collision in the from-scratch tokens. **Gap:**
subagent models are not named. **Gap:** no verbatim prompts.

**Input reconciliation — Verified:** source was the PRD only; the UX
`.decision-log.md` records that inheritance discipline was verified PASS
(strong) by the rubric walker and that no separate reconcile subagent was
needed.

**Human-applied token and spec fixes — Verified:** `danger-text #B42318` for
error-banner text; `border-strong` darkened `#CBD2DA → #8B94A1`; `ink-muted
#6B7480` for completed-todo text; `focus-ring-offset #FFFFFF` with a 2px ring
plus 2px offset; error banner set to `role="alert"`; EXPERIENCE.md's "all text
pairs meet AA" claim replaced with a verified-contrast statement; 44px padded
targets and `:focus-within` reveal recorded in spec.

**Close — Verified:** DESIGN.md and EXPERIENCE.md closed `status: final`,
`updated: 2026-06-15`. **Gap:** no UX implementer or reviewer model is
recorded. **Gap:** value delivered — no cited UX record states AI value.

## Architecture — Gap

`_bmad-output/planning-artifacts/architecture.md` frontmatter records
`workflowType: architecture`, `user_name: Riccardo`, `date: 2026-06-16`,
`status: complete`, and `completedAt: 2026-06-16`. There is no decision log,
review artifact, prompt archive, or model name.

This phase is present because D-10 must cover architecture. The finished
document is not treated as proof of an AI workflow. **Gap:** architecture AI
usage, prompts, models, decisions, value, and human corrections.

## Epics and stories planning — Gap

`_bmad-output/planning-artifacts/epics.md` states D-10 as a deliverable and
gives Story 4.4 acceptance criteria.

There is no epics or stories creation decision log, review, prompt archive, or
model name. This phase is present so the gap is visible. The finished epics
file is not treated as proof of an AI workflow. **Gap:** epics/stories
planning AI usage, prompts, models, decisions, value, and human corrections.

## Development

### Implementer models — Verified for Stories 1.1–2.3 only

Each name is taken from that story's `## Dev Agent Record` / `### Agent Model
Used`. Later stories are not used to backfill earlier ones.

| Story | Recorded implementer model | Source |
| --- | --- | --- |
| 1.1 | Claude Opus 4.8 (Cursor) | `_bmad-output/implementation-artifacts/1-1-scaffold-repository-test-harness-and-ci.md` |
| 1.2 | Claude Opus 4.8 (Cursor) | `_bmad-output/implementation-artifacts/1-2-backend-foundation-db-migrations-repository-api-skeleton.md` |
| 1.3 | Claude Opus 4.8 (Cursor) — dev-story workflow | `_bmad-output/implementation-artifacts/1-3-one-command-docker-compose-bring-up.md` |
| 1.4 | Claude Opus 4.8 (Cursor) | `_bmad-output/implementation-artifacts/1-4-frontend-skeleton-tokens-shell-usetodos-loading-and-empty-states.md` |
| 2.1 | Opus 4.8 (Cursor) — bmad-dev-story workflow | `_bmad-output/implementation-artifacts/2-1-render-the-populated-todo-list.md` |
| 2.2 | Opus 4.8 (Cursor) — bmad-dev-story workflow | `_bmad-output/implementation-artifacts/2-2-create-a-todo.md` |
| 2.3 | GPT-5.6 Sol | `_bmad-output/implementation-artifacts/2-3-update-a-todo-complete-uncomplete-and-edit-description.md` |
| 2.4–4.3 | **Gap** — no `Agent Model Used` | `spec-2-4` through `spec-4-3` under `_bmad-output/implementation-artifacts/` |
| 4.4 | **Gap** — no `Agent Model Used` | `_bmad-output/implementation-artifacts/spec-4-4-ai-integration-log-d-10.md` |

**Gap:** verbatim development prompts. **Gap:** review-model identity. Sprint
tracking records only the process note that code review should use a fresh
context and a different LLM
(`_bmad-output/implementation-artifacts/sprint-status.yaml`). No review
`Agent Model Used` exists. **Gap:** value delivered — no cited development
record states AI value.

### Human review corrections — Verified

Story Review Findings record applied patches, accepted decisions, and
deferrals. The cross-story ledger is
`_bmad-output/implementation-artifacts/deferred-work.md`, introduced as
findings that `bmad-code-review` classified as `defer`.

Summaries below restate those records. They are not a full copy of every
finding. Dates appear only when that story artifact records one.

**Stories 1.1–2.3 (named models, Review Findings present):**

- 1.1 (2026-06-16 and re-review 2026-06-17),
  `_bmad-output/implementation-artifacts/1-1-scaffold-repository-test-harness-and-ci.md`:
  e2e lint/typecheck wired into CI; test Compose port aligned to
  `.env.example`; backend test emit split from typecheck; CI concurrency key
  corrected. A second review found the first review-fix changeset still
  uncommitted and required that commit. Deferrals included ungated Prettier
  and, later, no package `build` stage and toolchain drift.
- 1.2 (2026-06-17),
  `_bmad-output/implementation-artifacts/1-2-backend-foundation-db-migrations-repository-api-skeleton.md`:
  pool error listener, migration advisory lock, headers-sent guard, 4xx
  body-parser mapping, listen-error exit, and uniform 404 envelope.
  Deferrals included unbounded `GET /api/todos`, non-format env checks, and
  no graceful shutdown.
- 1.3 (2026-06-17),
  `_bmad-output/implementation-artifacts/1-3-one-command-docker-compose-bring-up.md`:
  `restart: unless-stopped`, healthcheck `start_period`, and Compose
  `--wait-timeout 180`. Deferred: nginx resolves `backend` once at config
  load.
- 1.4 (2026-06-17),
  `_bmad-output/implementation-artifacts/1-4-frontend-skeleton-tokens-shell-usetodos-loading-and-empty-states.md`:
  empty-state headline token, duplicated Retry copy, and runtime array
  guard on `getTodos`. Deferrals included missing AbortController/timeout
  (later resolved in 2.5), stale `reload()` list, and unstable empty-state
  heading (later resolved in 3.2).
- 2.1 (2026-07-13),
  `_bmad-output/implementation-artifacts/2-1-render-the-populated-todo-list.md`:
  state-aware checkbox name. A first ≥44px `::before` overlay was applied,
  then **reverted** as ineffective on a replaced checkbox; the real target
  was deferred to 2.3 and later resolved there.
- 2.2 (2026-07-13),
  `_bmad-output/implementation-artifacts/2-2-create-a-todo.md`:
  `isTodo` guard on create, refocus after the input re-enables, `useId` for
  the add field. Deferrals included the NUL description that still returns
  500 (still open in `deferred-work.md`).
- 2.3,
  `_bmad-output/implementation-artifacts/2-3-update-a-todo-complete-uncomplete-and-edit-description.md`:
  review patches for toggle-failure overflow, disabled/busy cursor,
  un-complete coverage, top-level JSON `null` on PATCH, and native Space-key
  activation.

**Stories 2.4–4.3 (review corrections recorded; implementer model is Gap):**

- 2.4,
  `_bmad-output/implementation-artifacts/spec-2-4-delete-a-todo-with-confirmation.md`:
  dialog focus after failed delete, overlay shadow, post-delete focus from
  the latest list, and DELETE contract tests. Duplicate Delete names
  deferred, later resolved in 3.2.
- 2.5 Spec Change Log (2026-08-26),
  `_bmad-output/implementation-artifacts/spec-2-5-error-handling-and-in-flight-reliability.md`:
  review patches for idempotent create replay, owner cancellation, strict
  response contracts, bounded reconciliation, and regression coverage.
- 3.1 (2026-08-27),
  `_bmad-output/implementation-artifacts/spec-3-1-e2e-suite-5-playwright-coverage-gate-70.md`:
  isolated test Compose project name, tighter backend-down assertion,
  coverage-artifact upload, README persistence notes, teardown diagnostics,
  and a browser-session persistence test. Named-volume remount durability
  remains deferred.
- 3.2,
  `_bmad-output/implementation-artifacts/spec-3-2-accessibility-audit-zero-critical-wcag-2-1-aa-violations.md`:
  duplicate-description accessible names, deterministic scans, pinned
  incomplete axe identity, contrast measurement, and fail-closed gate tests.
- 3.3 Spec Change Log (2026-08-28),
  `_bmad-output/implementation-artifacts/spec-3-3-security-review-of-baseline-hardening.md`:
  **human kept** the established `INTERNAL` error code and corrected the spec
  matrix instead of changing the API response; review patches strengthened
  headers, CORS preflights, runtime dev-dependency checks, and `.env*`
  exclusion.
- 4.1,
  `_bmad-output/implementation-artifacts/spec-4-1-readme-d-6.md`:
  README and verification-archive patches for floating tags, Compose project
  warnings, API partial-update notes, and command-evidence gaps.
- 4.2 Spec Change Log (2026-09-01),
  `_bmad-output/implementation-artifacts/spec-4-2-qa-report-coverage-evidence-d-7.md`:
  **human approved** local-only QA evidence after CI artifacts were
  unavailable; review corrected overstated FR/NFR verdicts and measured UI
  reaction from browser `responseEnd`.
- 4.3,
  `_bmad-output/implementation-artifacts/spec-4-3-accessibility-and-security-review-reports-d-8-d-9.md`:
  spec has an empty Spec Change Log and no Review Findings section.
  **Gap:** no recorded 4.3 review corrections in that spec.

Git review-patch commits may corroborate a cited Review Finding. They are not
a substitute for a missing model or prompt.

### Human overrides — Verified for two recorded cases

These two explicit overrides are already recorded in Spec Change Logs:

- Story 3.3: human kept the established `INTERNAL` error code and corrected
  the spec matrix instead of changing the API response.
  `_bmad-output/implementation-artifacts/spec-3-3-security-review-of-baseline-hardening.md`
- Story 4.2: human approved local-only QA evidence after CI artifacts were
  unavailable.
  `_bmad-output/implementation-artifacts/spec-4-2-qa-report-coverage-evidence-d-7.md`

**Gap:** a separate override inventory is not recorded. Other human-fixed
findings and review patches are corrections, not collected overrides.

## QA

`docs/qa-report.md` is the D-7 stakeholder report (results collected
2026-09-01). It defines Verified / Historical / Attestation / Target and
links D-8 and D-9 without duplicating them. Story 4.2 Review Findings and
Spec Change Log record corrections to that report, cited in Development
above.

**Gap:** who authored the QA report, and whether that authorship was AI,
human, or mixed. No model, prompt, or author name appears in `docs/qa-report.md`.

**Gap:** live prompt archives and CI run URLs for the QA pass. The report
records local commands and outcomes, not a CI URL.

**Gap:** Story 1.1 listed a CI run log/URL with typecheck/build logs as
expected QA evidence for this log
(`_bmad-output/planning-artifacts/epics.md`). None was captured.

**Gap:** value delivered — no cited QA record states AI value.

## Cross-cutting gaps

These absences apply across phases and are not filled from chat, uncommitted
transcripts, or document existence:

| Missing record | Status |
| --- | --- |
| Verbatim prompts | **Gap** |
| Live prompt archives | **Gap** |
| Architecture AI workflow | **Gap** |
| Epics/stories planning AI workflow | **Gap** |
| Implementer models for Stories 2.4–4.4 | **Gap** |
| Review-model identity | **Gap** |
| Story 1.1 CI URL for this log | **Gap** |
| QA-report author identity | **Gap** |
| Value delivered | **Gap** |
| Separate override inventory | **Gap** |
