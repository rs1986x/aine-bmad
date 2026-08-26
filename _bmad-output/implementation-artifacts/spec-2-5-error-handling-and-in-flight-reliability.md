---
title: 'Story 2.5: Error Handling and In-Flight Reliability'
type: 'feature'
created: '2026-08-26'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'e418fafd7c8a0cc5c3b49671d0ee15c1783671c4'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Todo failures use fragmented interim messages, lack intent replay, and can leave requests busy indefinitely or accept malformed success data. Recovery must not lose typed text or confirmed state.

**Approach:** Add a reusable error banner and retry coordinator for load, create, edit, and toggle, while keeping delete failures inside the open dialog. Classify connection failures, harden request races and parsing, and announce confirmed list changes.

## Boundaries & Constraints

**Always:** Use exact copy `"Couldn't load your todos. Retry."`, `"Couldn't save that change. Retry."`, and, for an unreachable backend, `"Couldn't connect. Check your connection and retry."`. Show load and non-delete failures in one `role="alert"` banner above the list; Retry replays the owning UI transaction. Preserve create/edit input, confirmed state, and pending guards. Keep delete errors retryable inside the dialog. Abort superseded/unmounted requests, time out hung requests after 10 seconds, and reject malformed success payloads as typed errors. Announce confirmed changes through `aria-live="polite"` as `"Todo added: {description}."`, `"Todo completed: {description}."`, `"Todo marked active: {description}."`, or `"Todo deleted: {description}."`.

**Ask First:** Adding dependencies; changing backend code, HTTP/error-envelope contracts, design tokens, delete-dialog copy/focus behavior, or the agreed error/announcement copy.

**Never:** Use optimistic updates, expose raw errors, replace pending guards with timer debounce, globalize delete failures, clear drafts on failure, or let stale GETs overwrite/duplicate later confirmed mutations.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Failed load | Initial GET fails | Banner replaces list state; Retry shows loading and re-fetches | Load or connection copy; no raw details |
| Failed create/edit/toggle | Request rejects | List/draft stay unchanged; global Retry re-enters the transaction once | Save or connection copy; controls re-enable |
| Failed delete | Confirmation remains open | Todo remains; Delete can retry once controls re-enable | Dialog-local alert only |
| Hung/superseded request | Times out, unmounts, or is superseded | Abort; stale completion cannot commit; busy state ends | Retryable unless intentionally superseded |
| Confirmed list change | Add, complete, activate, or delete succeeds | Commit server result and announce action plus description once | Never announce before confirmation |
| Malformed success | 2xx body has invalid JSON/Todo shape | No commit or render crash | Typed retryable failure |

</frozen-after-approval>

## Code Map

- `frontend/src/api/api.ts:28-247` -- enforce exact success statuses, deterministic cancellation/deadlines, strict envelopes, and validated Todo payloads without changing CRUD contracts.
- `frontend/src/hooks/useTodos.ts:68-357` -- coordinate owner-scoped retry queues, confirmed-mutation reconciliation, collision protection, and exact announcements.
- `frontend/src/components/ErrorBanner.tsx:7-31` -- render exact/reusable alert copy with preserved punctuation and Retry busy behavior.
- `frontend/src/App.tsx:9-78` -- keep active recovery visible, preserve content during mutation errors, and host the live region.
- `frontend/src/components/AddTodoForm.tsx:46-80` and `frontend/src/components/TodoItem.tsx:60-118` -- register owner-scoped create/edit/toggle replay while preserving local state.
- `frontend/src/components/TodoList.tsx:138-180` and `frontend/src/components/DeleteDialog.tsx:80-136` -- supply announcement context while keeping delete recovery local.
- `frontend/src/styles/app.css:104-128` -- style the banner/live region with existing tokens; `tokens.css` remains read-only.
- `frontend/src/{api/api,useTodos,App}.test.*` and `frontend/src/components/{ErrorBanner,AddTodoForm,TodoItem,TodoList,DeleteDialog}.test.tsx` -- reliability and regression seams.
- `backend/migrations/002_add_todo_idempotency_key.sql`, `backend/src/routes/todo.routes.ts`, `backend/src/services/todo.service.ts`, `backend/src/repositories/todo.repository.ts`, and backend tests -- make create replay idempotent after uncertain timeouts.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/api/api.ts` and `frontend/src/api/api.test.ts` -- classify connection/timeout errors, parse and validate success bodies, and prove aborted/malformed requests never commit.
- [x] `frontend/src/hooks/useTodos.ts` and `frontend/src/hooks/useTodos.test.tsx` -- coordinate Retry, cancel superseded work, clear reload state, and prevent GET/mutation races.
- [x] `frontend/src/components/ErrorBanner.tsx` and `frontend/src/components/ErrorBanner.test.tsx` -- implement exact-copy, duplicate-safe alert and Retry states.
- [x] `frontend/src/App.tsx`, `frontend/src/App.test.tsx`, and mutation component tests -- wire load/create/edit/toggle recovery, state-preserving replay, and exact confirmed announcements.
- [x] `frontend/src/components/DeleteDialog.tsx`, `frontend/src/components/TodoList.tsx`, and tests -- preserve local delete recovery and announce confirmed deletion.
- [x] `frontend/src/styles/app.css` and `frontend/src/styles/app.test.ts` -- style banner, Retry, busy, and visually hidden live-region states using existing tokens.

**Acceptance Criteria:**
- Given any failed or hung request, when recovery appears, then copy is classified, Retry is duplicate-safe, and unaffected input/state is preserved.
- Given overlapping or superseded requests, when they settle out of order, then stale data never overwrites, resurrects, loses, or duplicates a confirmed Todo.
- Given assistive technology, when failure or confirmed list change occurs, then alerts are assertive, successes are polite/exact, and nothing is announced early.
- Given Story 2.5 is complete, when frontend lint, typecheck, and tests run, then all new reliability cases and Stories 2.1–2.4 regressions pass without backend or token changes.

### Review Findings

- [x] [Review][Patch] Add backend/API idempotency-key support for create Retry after uncertain timeouts [frontend/src/api/api.ts:142; backend/src/services/todo.service.ts:15]
- [x] [Review][Patch] Bound the confirmed-mutation journal to active overlapping loads [frontend/src/hooks/useTodos.ts:137]
- [x] [Review][Patch] Clear owner failures and abort or invalidate owned work when transaction UI unmounts [frontend/src/components/AddTodoForm.tsx:24; frontend/src/components/TodoItem.tsx:50]
- [x] [Review][Patch] Reject PATCH success responses that do not apply the requested fields [frontend/src/api/api.ts:187]
- [x] [Review][Patch] Enforce UUID validity equivalent to the backend contract [frontend/src/api/api.ts:214]
- [x] [Review][Patch] Compare requested and returned UUID identity case-insensitively [frontend/src/api/api.ts:191]
- [x] [Review][Patch] Do not resolve a confirmed update when no state commit or explicit cancellation occurred [frontend/src/hooks/useTodos.ts:188]
- [x] [Review][Patch] Treat a timeout-followed-by-404 delete retry as confirmed absence [frontend/src/hooks/useTodos.ts:230]
- [x] [Review][Patch] Use a monotonic clock for request deadlines [frontend/src/api/api.ts:34]
- [x] [Review][Patch] Preserve connection-error classification for response-body stream failures [frontend/src/api/api.ts:92]
- [x] [Review][Patch] Preserve keyboard focus when a failed replay replaces the Retry banner [frontend/src/App.tsx:40]
- [x] [Review][Patch] Verify pending, failed, timed-out, and aborted mutations never announce success [frontend/src/hooks/useTodos.test.tsx:290]
- [x] [Review][Patch] Verify the rendered announcement queue advances automatically [frontend/src/App.test.tsx:138]
- [x] [Review][Patch] Verify initial load cancellation on hook unmount [frontend/src/hooks/useTodos.test.tsx:429]
- [x] [Review][Patch] Verify manual unchanged-draft resubmission invalidates the stale create Retry [frontend/src/components/AddTodoForm.test.tsx:79]
- [x] [Review][Patch] Verify 501-character Todo payloads are rejected as malformed [frontend/src/api/api.test.ts:265]

## Spec Change Log

- 2026-08-26: Applied code-review patches for idempotent create replay, owner cancellation, strict response contracts, bounded reconciliation, delete absence confirmation, Retry focus, and missing regression coverage.
- 2026-08-26: Implemented all execution tasks; review hardened body-read deadlines, payload identity/shape checks, queued failures and announcements, stale-retry invalidation, and end-to-end recovery coverage.
- 2026-08-26: Applied review fixes for exact transport contracts, owner-scoped retry replacement, overlapping-load reconciliation, collision safety, reusable punctuation, and second-failure replay coverage.

## Design Notes

Keep transport in `useTodos`, but let create/edit/toggle owners register retry transactions with its failure coordinator. Replay must use the original local pending/success path, so create clears/refocuses and edit closes only after success. Generation-guard loads; mutation confirmation outranks an older GET.

## Verification

**Commands:**
- `cd frontend && npm run lint && npm run typecheck && npm test` -- expected: reliability and regression gates pass.
- `cd frontend && npm run build` -- expected: production bundle compiles without asset or type-resolution failures.

**Actual results (2026-08-26):**
- `npm run lint` -- passed with 0 errors.
- `npm run typecheck` -- passed with 0 TypeScript errors.
- `npm test` -- passed: 10 test files, 147 tests.
- `npm run build` -- passed with Vite 8.0.16; 27 modules transformed.
- Backend lint, typecheck, tests, and build -- passed: 6 test files, 84 tests.

**Manual checks (if no CLI):**
- Disconnect the backend during load and create, then verify exact banner copy, preserved create text, one-request Retry, recovered focus, dialog-local delete failure, and correct screen-reader announcements.

## Suggested Review Order

**Reliability coordination**

- Start with queued recovery, mutation generations, and stale-load protection.
  [`useTodos.ts:93`](../../frontend/src/hooks/useTodos.ts#L93)

- Follow the duplicate-safe Retry path and replacement-failure handling.
  [`useTodos.ts:313`](../../frontend/src/hooks/useTodos.ts#L313)

- Review bounded transport, caller cancellation, and full-body deadlines.
  [`api.ts:28`](../../frontend/src/api/api.ts#L28)

- Check runtime Todo validation and response-identity guarantees.
  [`api.ts:217`](../../frontend/src/api/api.ts#L217)

**Recovery UI and accessibility**

- See how load and mutation failures preserve content while sharing one banner.
  [`App.tsx:9`](../../frontend/src/App.tsx#L9)

- Review exact-copy rendering and duplicate-safe Retry busy states.
  [`ErrorBanner.tsx:7`](../../frontend/src/components/ErrorBanner.tsx#L7)

- Trace create intent replay and stale-retry invalidation.
  [`AddTodoForm.tsx:46`](../../frontend/src/components/AddTodoForm.tsx#L46)

- Trace edit/toggle replay while preserving confirmed state.
  [`TodoItem.tsx:60`](../../frontend/src/components/TodoItem.tsx#L60)

- Confirm delete failures remain local and retryable.
  [`DeleteDialog.tsx:81`](../../frontend/src/components/DeleteDialog.tsx#L81)

**Verification**

- Start with transport timeout and body-read cancellation coverage.
  [`api.test.ts:172`](../../frontend/src/api/api.test.ts#L172)

- Review queued identical announcements and concurrent failure recovery.
  [`useTodos.test.tsx:561`](../../frontend/src/hooks/useTodos.test.tsx#L561)

- Finish with exact connection composition and second-failure create/edit/toggle replay through App.
  [`App.test.tsx:80`](../../frontend/src/App.test.tsx#L80)
