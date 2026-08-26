---
title: 'Story 2.4: Delete a Todo with Confirmation'
type: 'feature'
created: '2026-08-26'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'b730e601c640e4fc4cc808fcc5217baff2b6a08c'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Users can create and update Todos but cannot permanently remove obsolete items. Deletion must be deliberate, accessible, persisted, and resistant to duplicate or failed requests.

**Approach:** Add a full server-authoritative DELETE slice and an accessible confirmation dialog. Keep the Todo visible until the API returns `204`; cancel or failure leaves the persisted and rendered list unchanged.

## Boundaries & Constraints

**Always:** Validate the path UUID before service dispatch; keep HTTP/Zod, business/not-found behavior, and parameterized SQL in route, service, and repository respectively. Use the existing error envelope and `NotFoundError('Todo not found')`. The dialog uses title `"Delete this todo?"`, body `"“{description}” — this can't be undone."`, is focus-trapped, focuses Cancel by default, closes on Escape, and prevents duplicate confirmation. Cancel restores the originating Delete focus; success moves focus to the nearest remaining Delete control or the Add input when the list becomes empty. Mutation errors remain local and preserve the open dialog/list.

**Ask First:** Adding a dependency, changing migrations or wire types, changing the `204`/`400`/`404` API contract, adding design tokens, or altering the established confirmation copy.

**Never:** Optimistically remove a Todo, soft-delete it, add undo/trash, parse JSON from a successful `204`, interpolate an id into SQL, stack dialogs, or implement Story 2.5's global ErrorBanner, Retry/intent replay, connection-specific copy, or `aria-live` announcements.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Request deletion | User activates a row's Delete control | One labelled modal opens with the specified title/body, traps focus, and initially focuses Cancel | Existing row and edit state remain unchanged |
| Dismiss | Cancel or Escape before confirmation | No request; dialog closes and focus returns to the triggering Delete control | Todo remains present |
| Confirm success | Existing Todo; one or repeated confirm activation | One `DELETE /api/todos/:id`; controls show pending state; after `204`, remove exactly that Todo and close | Last removal renders the existing empty state |
| Invalid or missing id | Malformed UUID or valid absent UUID | API returns `400 VALIDATION_ERROR` or `404 NOT_FOUND` with the standard envelope | No row is removed |
| Delete failure | Network/API failure while confirming | Dialog stays open, buttons re-enable, Todo remains, and local `role="alert"` shows `"Couldn't save that change."` | User may confirm again; no global load error |

</frozen-after-approval>

## Code Map

- `backend/src/repositories/todo.repository.ts` -- extend `todoRepository` after `update` with one parameterized `DELETE ... WHERE id = $1 RETURNING id`; affected-row state drives not-found.
- `backend/src/services/todo.service.ts` -- mirror `update` delegation and typed `NotFoundError`.
- `backend/src/routes/todo.routes.ts` -- mirror PATCH UUID parsing and `try/catch(next)`; send an empty `204`.
- `backend/src/{repositories/todo.repository.test.ts,__tests__/todo.service.test.ts,__tests__/todo.api.test.ts}` -- existing mocked layer tests and real-Postgres API harness.
- `frontend/src/api/api.ts` -- implement the Story 2.4 `deleteTodo` stub with encoded id and no success-body parsing; `api.test.ts` owns client contracts.
- `frontend/src/hooks/useTodos.ts` -- add confirmed-response removal beside `confirmedUpdate`; mutation failures must not set the load-error state. Extend `useTodos.test.tsx`.
- `frontend/src/components/DeleteDialog.tsx` -- new accessible modal, focus loop, pending guard, Escape/cancel, and local failure state; colocate `DeleteDialog.test.tsx`.
- `frontend/src/components/TodoItem.tsx` -- wire the existing inert Delete control and preserve edit/toggle mutual exclusion and trigger registration; extend `TodoItem.test.tsx`.
- `frontend/src/components/TodoList.tsx` -- own the single delete target alongside `editingTodoId`, render the dialog, coordinate callbacks, and manage post-close focus; extend `TodoList.test.tsx`.
- `frontend/src/App.tsx` -- pass the hook removal action into the populated-list branch; `App.test.tsx` covers last-item empty-state transition.
- `frontend/src/styles/app.css` -- add token-based scrim, dialog, danger/secondary, busy, responsive, and focus-visible styles; extend `app.test.ts`. Keep `tokens.css` read-only unless approved.
- `backend/src/schemas/todo.schema.ts`, `backend/src/errors/AppError.ts`, `frontend/src/utils/groupTodos.ts`, and migrations -- reuse-only boundaries; no changes expected.

## Tasks & Acceptance

**Execution:**
- [x] `backend/src/repositories/todo.repository.ts`, `backend/src/services/todo.service.ts`, and `backend/src/routes/todo.routes.ts` -- implement validated, parameterized deletion and empty `204` behavior.
- [x] `backend/src/repositories/todo.repository.test.ts`, `backend/src/__tests__/todo.service.test.ts`, and `backend/src/__tests__/todo.api.test.ts` -- prove SQL parameters, typed not-found, `204` persistence, malformed UUID, absent UUID, and unaffected siblings.
- [x] `frontend/src/api/api.ts`, `frontend/src/api/api.test.ts`, `frontend/src/hooks/useTodos.ts`, and `frontend/src/hooks/useTodos.test.tsx` -- add typed confirmed deletion, immutable filtering, failure preservation, and duplicate-safe contracts.
- [x] `frontend/src/components/DeleteDialog.tsx` and `frontend/src/components/DeleteDialog.test.tsx` -- implement accessible confirmation, focus containment/restoration, pending and local failure states.
- [x] `frontend/src/components/TodoItem.tsx`, `frontend/src/components/TodoItem.test.tsx`, `frontend/src/components/TodoList.tsx`, `frontend/src/components/TodoList.test.tsx`, `frontend/src/App.tsx`, and `frontend/src/App.test.tsx` -- wire one-dialog ownership, mutation exclusion, confirmed removal, cancellation, post-close focus, and last-item empty state.
- [x] `frontend/src/styles/app.css` and `frontend/src/styles/app.test.ts` -- implement responsive token-based dialog/focus/busy styling without new literal colors.

**Acceptance Criteria:**
- Given a populated list, when a user completes the confirmation flow, then exactly one server-confirmed Todo is permanently removed and remains absent after reload while siblings are unchanged.
- Given the confirmation dialog, when operated by keyboard, then it has correct dialog naming/modal semantics, starts on Cancel, cycles focus internally, dismisses on Escape, and moves focus sensibly after either cancellation or confirmed removal.
- Given a pending or failed deletion, when the user interacts again, then duplicate requests are suppressed and failure preserves both the Todo and a retryable local dialog state.
- Given malformed or unknown identifiers, when DELETE is called, then the stable `400`/`404` contracts are returned without changing persisted data.
- Given all Story 2.4 changes, when quality gates run, then existing list/create/update behavior and tests remain green.

## Spec Change Log

## Design Notes

`TodoList` owns the selected Todo and renders one `DeleteDialog`; `TodoItem` only requests deletion and registers its trigger. The dialog calls the hook action and closes only after success. `TodoList` restores the original trigger on cancellation or chooses the adjacent surviving trigger/Add input after confirmed removal, avoiding focus on an unmounted row while preserving `App`/`useTodos` as the sole list-state authority.

## Verification

**Commands:**
- `docker compose -f docker-compose.test.yml up -d --wait` -- expected: ephemeral Postgres is healthy.
- `cd backend && npm run lint && npm run typecheck && npm test` -- expected: all backend gates and real-Postgres DELETE tests pass.
- `cd frontend && npm run lint && npm run typecheck && npm test` -- expected: all frontend gates, dialog accessibility interactions, and regressions pass.
- `docker compose -f docker-compose.test.yml down -v` -- expected: test services and volumes are removed.

**Manual checks (if no CLI):**
- In a browser, verify Cancel receives initial focus, Tab/Shift+Tab cannot leave the dialog, Escape/cancel restores Delete focus, narrow/200%-text layouts remain usable, and a confirmed deletion persists after reload.

## Suggested Review Order

**Accessible confirmation flow**

- List ownership coordinates one target, server confirmation, and deterministic post-close focus.
  [`TodoList.tsx:20`](../../frontend/src/components/TodoList.tsx#L20)

- Modal containment, pending guards, and local retry feedback stay within the dialog.
  [`DeleteDialog.tsx:10`](../../frontend/src/components/DeleteDialog.tsx#L10)

- Row controls register the originating Delete trigger and preserve mutation exclusion.
  [`TodoItem.tsx:202`](../../frontend/src/components/TodoItem.tsx#L202)

**Server deletion contract**

- Start at the validated HTTP boundary and empty `204` response.
  [`todo.routes.ts:52`](../../backend/src/routes/todo.routes.ts#L52)

- Typed not-found behavior remains isolated in the business layer.
  [`todo.service.ts:29`](../../backend/src/services/todo.service.ts#L29)

- Parameterized SQL reports affected-row state without leaking persistence details.
  [`todo.repository.ts:56`](../../backend/src/repositories/todo.repository.ts#L56)

**Server-authoritative client state**

- Exact `204` acceptance prevents removal on malformed successful responses.
  [`api.ts:86`](../../frontend/src/api/api.ts#L86)

- Immutable filtering occurs only after the DELETE request resolves.
  [`useTodos.ts:57`](../../frontend/src/hooks/useTodos.ts#L57)

**Presentation**

- Responsive token-based presentation keeps destructive actions usable.
  [`app.css:466`](../../frontend/src/styles/app.css#L466)

**Verification**

- Real-Postgres API coverage proves persistence, validation, and sibling preservation.
  [`todo.api.test.ts:309`](../../backend/src/__tests__/todo.api.test.ts#L309)

- Dialog tests cover semantics, focus containment, pending suppression, and retry.
  [`DeleteDialog.test.tsx:14`](../../frontend/src/components/DeleteDialog.test.tsx#L14)

- App coverage verifies last-item removal, empty state, and Add-input focus.
  [`App.test.tsx:90`](../../frontend/src/App.test.tsx#L90)
