---
title: 'Story 3.2: Accessibility audit — zero critical WCAG 2.1 AA violations'
type: 'feature'
created: '2026-08-27'
status: 'done'
review_loop_iteration: 0
baseline_commit: '935a908c2425d698699d9238dd047d7ffe211372'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app has never been scanned for accessibility — there is zero `axe` integration anywhere, and the only evidence today is hand-written RTL role queries. Two a11y defects sit unresolved in the deferred ledger: no stable page heading across loading/error/empty/populated, and every row's checkbox, Edit, and Delete share an identical accessible name, so assistive-tech control lists cannot tell rows apart.

**Approach:** Scan the five UI states with `@axe-core/playwright` inside the existing real-stack suite, gate CI on zero critical or serious WCAG 2.1 AA violations, automate the keyboard, focus, dialog, and reflow checks a browser can prove, fix what the audit surfaces, and record the results and residual items in a committed checklist that Story 4.3 turns into the formal report.

## Boundaries & Constraints

**Always:** Scope `axe` to tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`; reach each state deterministically and reuse the role/name helpers in `e2e/support/app.ts`; persist per-state `axe` JSON (violations **and** `incomplete`) as CI-uploaded evidence; keep every control at a ≥44×44px effective hit area; keep completion conveyed by checkbox state plus strike-through, never color alone; test-first; leave the existing suite green after any accessible-name change.

**Ask First:** Disabling, excluding, or narrowing any `axe` rule or selector; changing a *visible* label, layout, or interaction purely to satisfy a rule; any dependency beyond `@axe-core/playwright`; widening scope to WCAG 2.2 or AAA.

**Never:** Drive the Docker Compose lifecycle from the a11y specs (`stack.spec.ts` owns that and runs serially); manufacture violations if a scan is clean; silence a finding by hiding content from assistive tech; alter server behavior; take on Story 3.3 security scope.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Populated list | One active + one completed todo | Zero critical/serious violations; completed cue is state + strike-through | Report rule id, impact, and target selector |
| Empty state | `GET /api/todos` fulfilled with `[]` | Zero critical/serious violations; heading and add form still present | Fail if the empty heading never renders |
| Inline edit open | Edit clicked, not yet saved | Zero critical/serious violations; input has a programmatic label | Cancel edit in `finally` so state does not leak |
| Delete dialog open | Delete clicked, not yet confirmed | Zero critical/serious violations; dialog named, focus on Cancel | Dismiss with `Esc` in `finally`; never confirm |
| Load failure | `GET /api/todos` aborted | Zero critical/serious violations; `role="alert"` banner with Retry | Unroute before the next test |
| 200% zoom / reflow | Halved viewport + doubled root font size | No horizontal overflow; add, edit, and delete stay operable | Identify the overflowing element |

</frozen-after-approval>

## Code Map

- `e2e/package.json:17-27` -- devDeps only, no `axe`. Add `@axe-core/playwright`. Scripts (`test`, `lint`, `typecheck`) at L10-13 need no change. `engines.node >= 24`, ESM, npm lockfile.
- `e2e/support/a11y.ts` -- **new**. Wrap `AxeBuilder({ page }).withTags([...])`; write `e2e/axe-results/{state}.json` containing `violations` + `incomplete`; assert no violation has `impact` of `critical`/`serious`. Failure message must list rule id, impact, help URL, and target. `e2e/tsconfig.json:17` already includes `support`.
- `e2e/support/app.ts:7-55` -- reuse `openApp`/`addTodo`/`toggleTodo`. **Ripples:** `toggleTodo:37` pins checkbox name `Completed`/`Not completed`; `editTodo:43` pins `Edit todo`; `deleteTodo:50` pins `Delete todo`. All three must move to the new per-row names.
- `e2e/tests/a11y.spec.ts` -- **new**. The five DOM states from the matrix; the zoom/reflow row belongs to `keyboard.spec.ts`. Use `page.route('**/api/todos', ...)` for empty and load-failure — the local DB is shared and `cleanupE2eTodos` only removes `e2e `-prefixed rows, so a real empty list is not reachable. Do **not** add `mode: 'serial'`.
- `e2e/tests/keyboard.spec.ts` -- **new**. Tab order reaches add input → checkbox → Edit → Delete; focused controls report a non-zero computed `outlineWidth`; dialog traps Tab between Cancel and Delete, `Esc` closes, focus returns to the triggering Delete button; reflow test halves the viewport and sets root `font-size: 200%`.
- `frontend/src/components/TodoItem.tsx:143` -- checkbox `aria-label` is `'Completed'`/`'Not completed'`, identical on every row. Make the name the description and let `checked` carry state. `:201` / `:229` -- `Edit todo` / `Delete todo` become `Edit todo: {description}` / `Delete todo: {description}`. When descriptions repeat, `TodoList` appends duplicate-only position text (`item 1 of 2`) to the row and control names so valid duplicate todos remain distinguishable.
- `frontend/src/App.tsx:46-98` -- `<main>` wraps three mutually exclusive branches (load-failure `:48`, loading `:59`, content `:61`), so no heading survives across states. Add a persistent `<h1>` inside `<main>` **above** the branch. Live region `:95-97` and `aria-busy` `:47` are correct — do not touch.
- `frontend/src/components/EmptyState.tsx:6` -- demote its `<h1>` to `<h2>` once the shell owns `<h1>`. `crud.spec.ts:25` queries this heading without a level, so it keeps working.
- `frontend/src/styles/app.css:119-126` (`.error-banner__retry`) and `:196-202` (`.add-todo-form__submit`) -- padding only, no `min-height`; every other control already sets 44px. Add `min-height: 44px`. No `outline: none` exists anywhere; focus rings are `2px solid var(--color-focus-ring)` with `offset: 2px`.
- Contrast is already computed and passing — muted `#6b7480` on `#ffffff` is 4.73:1, secondary `#5b6470` is 5.99:1, danger `#b42318` on `#fdecec` is 5.71:1, white on accent `#2563eb` is 5.17:1. Expect `color-contrast` to pass; disabled controls at `opacity: 0.6` are exempt under 1.4.3.
- Test ripple from the renames: `frontend/src/components/TodoItem.test.tsx`, `TodoList.test.tsx`, `App.test.tsx`, `frontend/src/styles/app.test.ts`, `e2e/tests/crud.spec.ts`.
- `.github/workflows/ci.yml:128-139` -- `npm test` then the always-upload of `playwright-report`. Add a sibling always-upload of `e2e/axe-results/` with `if-no-files-found: error`, before the `always()` teardown at `:148-151`.
- `.gitignore:8-11` -- add `axe-results/` next to `playwright-report/`.
- `docs/` -- exists and is empty; the audit checklist lands here.

## Tasks & Acceptance

**Execution:**
- [x] `e2e/package.json`, `.gitignore` -- add the `@axe-core/playwright` devDependency and ignore generated `axe-results/`.
- [x] `e2e/support/a11y.ts` -- add the tag-scoped scan helper that persists per-state JSON evidence and fails on critical/serious violations with actionable detail.
- [x] `e2e/tests/a11y.spec.ts` -- test-first: scan the five DOM matrix states, driving empty and load-failure through request interception so they are deterministic.
- [x] `e2e/tests/keyboard.spec.ts` -- test-first: assert keyboard reachability, visible focus, dialog trap plus `Esc` plus focus return, and 200% zoom reflow.
- [x] `frontend/src/components/TodoItem.tsx` -- give each row's checkbox, Edit, and Delete controls a name that identifies its todo, resolving the deferred duplicate-name defect.
- [x] `frontend/src/App.tsx`, `frontend/src/components/EmptyState.tsx` -- add a stable page `<h1>` that survives every state and demote the empty-state heading, resolving the deferred heading-outline defect.
- [x] `frontend/src/styles/app.css` -- bring the add-submit and retry buttons up to the 44px minimum height the rest of the UI already meets.
- [x] `e2e/support/app.ts`, `e2e/tests/crud.spec.ts`, `frontend/src/**/*.test.{ts,tsx}` -- update every selector and assertion pinned to a renamed accessible name; do not weaken an assertion to make it pass.
- [x] `.github/workflows/ci.yml` -- upload the `axe` evidence whether the E2E job passes or fails, before teardown.
- [x] `docs/accessibility-audit.md` -- record the per-state automated results, browser-driven keyboard checks, every `incomplete` axe result with its resolution, and residual non-critical items.

**Acceptance Criteria:**
- Given the health-gated Compose stack, when the E2E suite runs in CI, then every matrix state is scanned against WCAG 2.1 A/AA tags and any critical or serious violation fails the job.
- Given a CI run that passes or fails, when evidence is collected, then per-state `axe` JSON is uploaded alongside the Playwright report and survives teardown.
- Given assistive technology enumerating controls, when a list holds more than one todo, then each row's checkbox, Edit, and Delete control is distinguishable by accessible name alone.
- Given any application state — loading, load failure, empty, or populated — when the heading outline is inspected, then exactly one stable top-level heading is present and no heading level is skipped.
- Given the audit is complete, when `docs/accessibility-audit.md` is read, then it states real observed outcomes for each recorded check and each residual item, with no placeholder or aspirational text.

### Review Findings

- [x] [Review][Patch] Disambiguate duplicate descriptions with duplicate-only position labels [frontend/src/components/TodoList.tsx]
- [x] [Review][Patch] Make the populated-list scan deterministic [e2e/tests/a11y.spec.ts:39]
- [x] [Review][Patch] Pin stable target identity for incomplete axe results [e2e/support/a11y.ts:72]
- [x] [Review][Patch] Correct direct contrast measurement for translucent or painted backgrounds [e2e/support/a11y.ts:104]
- [x] [Review][Patch] Pin the exact required WCAG tag scope in gate tests [e2e/tests/a11y-gate.spec.ts:10]
- [x] [Review][Patch] Verify the complete five-state axe evidence manifest [e2e/support/global-teardown.ts]
- [x] [Review][Patch] Verify focus-ring contrast rather than only width and opacity [e2e/tests/keyboard.spec.ts:50]
- [x] [Review][Patch] Check horizontal overflow while the editor and delete dialog are open [e2e/tests/keyboard.spec.ts:263]
- [x] [Review][Patch] Dismiss the delete dialog with Escape in its scan cleanup [e2e/tests/a11y.spec.ts:106]
- [x] [Review][Patch] Prevent Playwright retries from turning a blocking accessibility result into a passing gate [e2e/tests/a11y.spec.ts]
- [x] [Review][Patch] Add a negative self-test for undecided-contrast enforcement [e2e/tests/a11y-gate.spec.ts:35]

## Design Notes

Request interception, not container control, is what makes the empty and load-failure scans deterministic: the local database is shared across runs and `cleanupE2eTodos` only deletes `e2e `-prefixed rows, so a genuinely empty list cannot be guaranteed. `stack.spec.ts` already proves real backend-down behavior; these scans only need the rendered DOM.

`axe` returns `incomplete` for checks it cannot decide alone — the row action buttons sit at `opacity: 0` until `:hover`/`:focus-within`, which commonly lands there. Persist them and resolve each in the checklist; never let an `incomplete` count as a pass.

The expected accessible-name shape, with state carried by `checked` rather than by the name. `accessibleName` equals `description` for ordinary rows and adds duplicate-only position text when needed:

```tsx
<input type="checkbox" checked={completed} aria-label={accessibleName} />
<button aria-label={`Edit todo: ${accessibleName}`}>…</button>
<button aria-label={`Delete todo: ${accessibleName}`}>…</button>
```

If the scans come back clean at critical/serious, that is the honest result — the deliverable is the enforced gate plus the evidence, not a violation count.

## Verification

**Commands:**
- `cd frontend && npm run lint && npm run typecheck && npm run test:coverage` -- expected: checks pass and every coverage metric stays ≥70% after the rename ripple.
- `docker compose up -d --build --wait && curl -fsS http://localhost:8080/api/health` -- expected: the stack is healthy before any browser test runs.
- `cd e2e && npm run lint && npm run typecheck && npm test` -- expected: the full suite passes, including the new a11y and keyboard specs, with `e2e/axe-results/*.json` written for every state.
- `docker compose down -v` -- expected: the local verification stack is removed after all assertions complete.

**Manual check (if no CLI):**
- Confirm at 200% browser text zoom that the single-column layout reflows without horizontal scrolling and no control becomes unreachable.

## Suggested Review Order

**The gate**

- Start here: tag scope, fail-closed impact filter, and what counts as evidence.
  [`a11y.ts:178`](../../e2e/support/a11y.ts#L178)

- Fails closed on an unrated violation — the one failure mode a gate must not have.
  [`a11y.ts:54`](../../e2e/support/a11y.ts#L54)

- axe reports obscured text as `incomplete` with `contrastRatio: 0`, so measure the pair directly.
  [`a11y.ts:153`](../../e2e/support/a11y.ts#L153)

- Pins `incomplete` on stable fields only; React `useId` targets shift between renders.
  [`a11y.ts:75`](../../e2e/support/a11y.ts#L75)

- Proves the gate can fail, using synthetic results and no browser.
  [`a11y-gate.spec.ts:1`](../../e2e/tests/a11y-gate.spec.ts#L1)

**State coverage**

- Interception, not container control: a shared database cannot guarantee an empty list.
  [`a11y.spec.ts:23`](../../e2e/tests/a11y.spec.ts#L23)

- Reveals the hover-hidden row actions so axe actually evaluates those buttons.
  [`a11y.spec.ts:36`](../../e2e/tests/a11y.spec.ts#L36)

- Serves a fixed row count so the dialog reliably overlaps content behind it.
  [`a11y.spec.ts:106`](../../e2e/tests/a11y.spec.ts#L106)

**Keyboard, focus, and hit areas**

- Width alone passes a transparent ring, so style and colour alpha are checked too.
  [`keyboard.spec.ts:104`](../../e2e/tests/keyboard.spec.ts#L104)

- Rendered `boundingBox()` measurements; jsdom does no layout, so unit tests cannot see this.
  [`keyboard.spec.ts:233`](../../e2e/tests/keyboard.spec.ts#L233)

- Dialog trap, `Esc`, and focus return to the triggering control.
  [`keyboard.spec.ts:203`](../../e2e/tests/keyboard.spec.ts#L203)

- Reflow checks both edges; leftward overflow produces no scrollbar to notice.
  [`keyboard.spec.ts:263`](../../e2e/tests/keyboard.spec.ts#L263)

**Accessibility fixes**

- Row controls named for their todo; `checked` carries completion instead of the name.
  [`TodoItem.tsx:143`](../../frontend/src/components/TodoItem.tsx#L143)

- A stable `<h1>` above the branches, so the outline survives every state.
  [`App.tsx:48`](../../frontend/src/App.tsx#L48)

- Demoted so the shell owns the only level-1 heading.
  [`EmptyState.tsx:6`](../../frontend/src/components/EmptyState.tsx#L6)

- The two controls that missed the 44px floor every other control already met.
  [`app.css:121`](../../frontend/src/styles/app.css#L121)

**Evidence and supporting changes**

- The audit record Story 4.3 consumes, including the seven residual items.
  [`accessibility-audit.md:1`](../../docs/accessibility-audit.md#L1)

- Uploads evidence on pass or fail; a missing scan is a broken job, not a clean pass.
  [`ci.yml:140`](../../.github/workflows/ci.yml#L140)

- Clears stale evidence so a renamed state cannot leave a passing artifact behind.
  [`global-setup.ts:5`](../../e2e/support/global-setup.ts#L5)

- Row-control locators pinned `exact`, since substring matching would defeat the new names.
  [`app.ts:18`](../../e2e/support/app.ts#L18)

- Cross-row name uniqueness asserted over the whole rendered list.
  [`TodoList.test.tsx:70`](../../frontend/src/components/TodoList.test.tsx#L70)

- Heading outline pinned across loading, load failure, empty, and populated.
  [`App.test.tsx:408`](../../frontend/src/App.test.tsx#L408)
