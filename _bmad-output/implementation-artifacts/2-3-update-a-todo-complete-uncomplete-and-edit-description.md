---
baseline_commit: b038a33
---

# Story 2.3: Update a Todo — Complete/Un-complete and Edit Description

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Story

As the end user,
I want to check off (and uncheck) a todo and fix its wording inline,
so that I can keep my list accurate without recreating items.

This is the third story of Epic 2 and the second write slice. Story 2.2 established the full
route → service → repository and component → hook → typed-client mutation patterns for create.
This story extends those patterns with one server endpoint, `PATCH /api/todos/:id`, and two UI
interactions:

1. toggle `completed` in either direction; and
2. edit `description` inline without changing `id`, `createdAt`, or `completed`.

Postgres remains authoritative. The checkbox and description change only after the server returns
the updated `Todo`; there is no optimistic state or rollback path. `groupTodos` remains the only
ordering authority, so replacing a Todo with the server response automatically moves it between
the Active and Completed groups.

Scope is update only. Delete remains Story 2.4. The complete `ErrorBanner` + Retry + `aria-live`
reliability experience remains Story 2.5; this story provides only non-destructive row-local
failure feedback and re-enables the affected control so the user can try again.

## Acceptance Criteria

1. **Given** an Active or Completed Todo, **When** I activate its checkbox by pointer, touch, Space,
   or Enter, **Then** the client sends `PATCH /api/todos/:id` with only
   `{ "completed": !currentValue }`; the visible checked state does not change until the server
   returns `200 Todo`. On that confirmed response, the exact server object replaces the existing
   Todo immutably, the row receives the checked + strike-through dual signal when completed (or
   loses both when un-completed), and `groupTodos` moves it to the correct group while preserving
   newest-first ordering within the group.
   [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3; EXPERIENCE.md#Information Architecture, #Component Patterns, #State Patterns; architecture.md#State Management Patterns]

2. **Given** a toggle request is in flight, **When** the user tries to activate that checkbox again,
   **Then** the checkbox has a visible busy/disabled affordance, exposes its busy state
   programmatically, and does not submit a duplicate request. **If** the request fails, **Then** the
   original checked state remains unchanged, the control re-enables, and the row shows the minimal
   local copy **"Couldn't save that change."** so the user can try again. The full banner/Retry
   treatment is deferred to Story 2.5.
   [Source: EXPERIENCE.md#State Patterns ("Action in flight", "Save/create/toggle/delete failure"); UX-DR14; UX-DR15]

3. **Given** a Todo in display mode, **When** I activate its Edit action, **Then** its Description is
   replaced in place by a pre-filled, programmatically labeled text input; the row uses the
   `accent-subtle` edit treatment and shows Save (compact primary) and Cancel (secondary/ghost)
   controls. No modal opens, the input receives focus, and no more than one Todo is in edit mode at
   any time.
   [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3; DESIGN.md#Components ("Inline edit field"); EXPERIENCE.md#Component Patterns]

4. **Given** an edited, non-empty Description, **When** I press Enter or activate Save, **Then** the
   client trims the value for the empty check and sends `PATCH /api/todos/:id` with only
   `{ "description": "<value>" }`; while awaiting the response, the edit input and controls prevent
   duplicate submission. On `200 Todo`, the server-confirmed Description replaces the original,
   edit mode closes, and `id`, `createdAt`, and `completed` are unchanged. The update persists after
   a list reload/page refresh.
   [Source: PRD FR-4/FR-6/FR-7; architecture.md#API Contracts, #Persistence Strategy; EXPERIENCE.md#Inline edit]

5. **Given** a Todo in edit mode, **When** I press Escape or activate Cancel before a save starts,
   **Then** edit mode closes without an API call and the original server-backed Todo remains
   unchanged. **Given** a save request that fails, **Then** edit mode remains open, the typed draft
   is preserved, controls re-enable, and the row shows **"Couldn't save that change."** without
   setting the `useTodos` load-error state.
   [Source: PRD FR-4; NFR-2; EXPERIENCE.md#Component Patterns, #State Patterns]

6. **Given** an empty or whitespace-only edit, **When** I press Enter or Save, **Then** no API call
   occurs, edit mode stays open, the inline danger treatment and **"Enter some text first."** are
   shown, the message is associated to the input with `aria-describedby`, and the persisted
   original Description remains unchanged. A server-side Description over 500 characters is
   rejected with `400 VALIDATION_ERROR`; no partial update is persisted.
   [Source: PRD FR-4/FR-7; architecture.md#Validation rules; EXPERIENCE.md#Edit validation error; UX-DR12/UX-DR14]

7. **Given** `PATCH /api/todos/:id`, **When** the body contains `description`, `completed`, or both,
   **Then** Zod trims/validates Description (1–500 characters), requires `completed` to be boolean,
   and requires at least one recognized update field. The route validates `:id` as a UUID before
   calling the service. A malformed id returns `400 VALIDATION_ERROR`; a valid UUID absent from the
   database returns `404 NOT_FOUND`. Bodies that reach the route and fail `updateTodoSchema`,
   including `{}`, extra-fields-only objects, arrays, invalid field types, and invalid Descriptions,
   return `400 VALIDATION_ERROR`. Malformed JSON and top-level JSON primitives remain
   `400 BAD_REQUEST` under the existing strict `express.json()` parser. A valid update returns `200`
   with the complete camelCase `Todo`.
   [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3; architecture.md#API Contracts, #Validation rules, AR-4/AR-5/AR-6/AR-9]

8. **Given** a successful PATCH, **When** the repository updates the row, **Then** it uses one
   parameterized `UPDATE ... WHERE id = ... RETURNING id, description, completed, created_at`,
   maps the row through the existing `toTodo` boundary, and changes only the supplied fields. It
   never changes `id` or `created_at`, never adds `updated_at`, never interpolates input into SQL,
   and returns no row for an unknown id so the service can throw `NotFoundError`.
   [Source: architecture.md#Data Architecture, #Data Model, #Service Boundaries, #Security Considerations; AR-1/AR-3/AR-5/AR-9/AR-13]

9. **Given** the update UI, **When** inspected and operated with keyboard or touch, **Then** the
   native checkbox remains controlled by `checked` + `onChange`, its visual 22px box is wrapped by an
   effective target of at least 44×44px, Space and Enter both toggle it, and interactive update
   controls have visible focus indicators. The edit input has a programmatic label, row-local
   failures are announced, focus returns to the originating Edit action when edit mode closes, and
   existing `<ul>/<li>` semantics and per-row accessible labels remain intact.
   [Source: EXPERIENCE.md#Interaction Primitives, #Accessibility Floor; deferred-work.md#Deferred from code review of 2-1; UX-DR12/UX-DR15]

10. **Given** the verification harness, **When** Story 2.3 is complete, **Then** tests were written
    first and prove: update-schema rules; service success/not-found behavior; PATCH `200/400/404`
    contracts and persistence for both fields; typed client + hook confirmed-response replacement
    and failure immutability; component toggle/busy/no-optimism/re-sort behavior; inline edit
    save/cancel/empty/failure/one-at-a-time behavior; and all pre-existing create/list/loading tests
    still pass. `npm run lint`, `npm run typecheck`, and `npm test` pass in both packages.
    [Source: epics.md#Test-first discipline, #Story 2.3 Test expectations; architecture.md#Testing Strategy]

> **Scope boundary**
>
> **IS (backend):** `updateTodoSchema` + inferred `UpdateTodoInput`,
> `todoRepository.update`, `todoService.update`, `PATCH /api/todos/:id`, typed not-found handling,
> schema/service/API tests.
>
> **IS (frontend):** `UpdateTodoInput`, `api.updateTodo`, `useTodos.toggleTodo` +
> `useTodos.editTodo`, callback wiring through `App`/`TodoList`, interactive checkbox, inline-edit
> mode, per-control busy/debounce, row-local validation/failure feedback, 44×44 checkbox target,
> token-based styles, and component/hook/API tests.
>
> **IS NOT:** delete behavior or `DELETE`/`DeleteDialog` (2.4); global `ErrorBanner`, Retry actions,
> mutation-intent replay, connection-flavored copy, or `aria-live` list announcements (2.5);
> optimistic UI/rollback; a DB migration or `updated_at`; changes to grouping/order semantics;
> dependency upgrades; Playwright/E2E work (3.1); or unrelated items in `deferred-work.md`.

## Tasks / Subtasks

- [x] **Task 1: Add the PATCH schema and inferred input type** (AC: #6, #7, #10)
  - [x] Refactor the existing Description chain in
        `backend/src/schemas/todo.schema.ts` into one internal reusable schema
        (`z.string().trim().min(1).max(500)`) so create and update cannot drift.
  - [x] Keep `createTodoSchema` and `CreateTodoInput` behavior unchanged.
  - [x] Export `updateTodoSchema` with optional `description` and optional `completed`, plus a Zod 4
        refinement that requires at least one defined recognized field. Export
        `UpdateTodoInput = z.infer<typeof updateTodoSchema>` from this file; do not duplicate it in
        `backend/src/types/todo.ts`.
  - [x] Export a reusable `todoIdSchema` using Zod's UUID validation. Preserve current Zod unknown-key
        behavior: recognized fields are retained, unknown fields are stripped, and an
        extra-fields-only object fails the at-least-one-field refinement.
  - [x] Do not import from `zod/v3` or introduce another validation library.
  - [x] Extend `todo.schema.test.ts` for valid description-only, completed-only (`true` and `false`),
        both-fields, trimming, and all invalid body cases in AC #7.

- [x] **Task 2: Add parameterized repository update** (AC: #7, #8, #10)
  - [x] Add `todoRepository.update(id, input): Promise<Todo | null>` beside `list` and `create`.
  - [x] Use one parameterized `UPDATE` that changes only supplied values and returns all Todo
        columns. A static safe pattern is:
        `description = COALESCE($1, description), completed = COALESCE($2, completed)` with
        `[input.description ?? null, input.completed ?? null, id]`. `false ?? null` remains `false`.
        A different implementation is acceptable only if every value remains parameterized.
  - [x] Reuse the existing `TodoRow`, shared `pool`, and `toTodo`; never create a second mapper or
        connection pool. Return `null` when `rows.length === 0`.
  - [x] Do not touch migrations or add an `updated_at` field.

- [x] **Task 3: Add service update and not-found behavior** (AC: #7, #8, #10)
  - [x] Add `todoService.update(id, input): Promise<Todo>`.
  - [x] Delegate to the repository; if it returns `null`, throw the existing
        `new NotFoundError('Todo not found')`. Keep HTTP objects and SQL out of the service.
  - [x] Add `backend/src/__tests__/todo.service.test.ts` that spies/mocks the repository and proves
        successful delegation and not-found, matching the architecture's service-test location.

- [x] **Task 4: Add `PATCH /api/todos/:id`** (AC: #4, #6, #7, #10)
  - [x] In the existing router, parse `req.params.id` with `todoIdSchema.safeParse` and `req.body`
        with `updateTodoSchema.safeParse`; keep the two parsed results distinct.
  - [x] Convert parse failure to the existing `ValidationError`; do not let `ZodError` reach
        `errorHandler` because it would become a generic `500`.
  - [x] Call `todoService.update(parsedId.data, parsedBody.data)` and return `200` with the Todo
        directly (no success envelope). Keep `try/catch(next)` and the existing `/api` mount.
  - [x] Test malformed id → `400 VALIDATION_ERROR` and valid absent UUID (for example
        `crypto.randomUUID()`) → `404 NOT_FOUND`; never allow PostgreSQL error `22P02` to become
        `500`.

- [x] **Task 5: Extend backend integration tests** (AC: #4, #6–#8, #10)
  - [x] Reuse `backend/src/__tests__/todo.api.test.ts`'s real Postgres migration/TRUNCATE harness.
  - [x] Prove completed `false → true → false`, `200`, complete camelCase body, no `created_at`, and
        persistence through a follow-up GET.
  - [x] Prove description update trims and preserves `id`, `createdAt`, and `completed`; prove a
        body containing both supported fields also works.
  - [x] Prove `400 VALIDATION_ERROR` and no mutation for malformed id and route-reaching invalid
        bodies (`{}`, extra-only object, array, empty/whitespace, over-500, wrong field types).
  - [x] Prove malformed JSON/top-level primitives retain the existing `400 BAD_REQUEST` contract.
  - [x] Prove `404 NOT_FOUND` for a valid absent UUID.

- [x] **Task 6: Add the typed frontend PATCH client** (AC: #1, #4, #7, #10)
  - [x] Add `UpdateTodoInput { description?: string; completed?: boolean }` to
        `frontend/src/types/todo.ts`.
  - [x] Add `updateTodo(id, input): Promise<Todo>` to `frontend/src/api/api.ts`: `PATCH`,
        `Content-Type: application/json`, `JSON.stringify(input)`, existing `toApiError` on non-2xx,
        existing `isTodo` on success. Return the server object.
  - [x] Keep `API_BASE = '/api'`; do not add an environment URL or a library. Encode the id if it is
        interpolated into the path.
  - [x] Add focused client tests for method/path/body, error-envelope mapping, and a valid JSON
        success body with an invalid Todo shape. Empty/non-JSON 2xx handling remains the explicit
        Story 2.5 deferral.

- [x] **Task 7: Add confirmed-response update actions to `useTodos`** (AC: #1, #2, #4, #5, #10)
  - [x] Add `toggleTodo(todo): Promise<Todo>` and
        `editTodo(id, description): Promise<Todo>` to `UseTodos`.
  - [x] Share one internal confirmed-update path: call `api.updateTodo`, then
        `setList(prev => prev.map(item => item.id === updated.id ? updated : item))`, and return the
        updated Todo. Never mutate the array/object and never construct a client-side replacement.
  - [x] Toggle sends `{ completed: !todo.completed }`; edit sends `{ description }`.
  - [x] On failure, rethrow and leave `list` unchanged. Do **not** call `setError`; that state drives
        `App`'s load-error branch and would unmount the list/edit input and lose the draft.
  - [x] Do not sort in the hook. `TodoList` already calls `groupTodos` on every render.
  - [x] Extend `useTodos.test.tsx` for request shapes, exact-object replacement, immutable previous
        array, unchanged sibling Todos, both-direction toggle, failed-update immutability, and
        top-level `error === null`.

- [x] **Task 8: Coordinate one-at-a-time editing and wire callbacks** (AC: #1, #3–#5, #10)
  - [x] Pull `toggleTodo` and `editTodo` from `useTodos` in `App` and pass them to `TodoList`.
  - [x] Let `TodoList` own the single `editingTodoId: string | null` coordination state and pass
        `isEditing`, start/cancel/save callbacks into each `TodoItem`. At all times, render at most
        one inline-edit input.
  - [x] While one draft is open, disable/suppress other rows' Edit actions so typed text cannot be
        discarded by implicitly switching editors. Allow at most one in-flight PATCH per Todo:
        disable Edit while that row is toggling and keep toggle unavailable throughout edit mode.
  - [x] Close edit mode only after a successful edit response or explicit Cancel/Escape. Keep it
        open on validation/API failure.
  - [x] On Cancel/Escape and successful save, restore focus to that row's originating Edit action.
  - [x] Preserve `TodoList`'s single `<ul>`, the two existing `groupTodos` maps, keys by `todo.id`,
        and Active-above-Completed order. Do not modify `groupTodos`.
  - [x] Preserve the existing Delete control markup and do not wire deletion in this story.

- [x] **Task 9: Make `TodoItem` interactive and implement inline edit** (AC: #1–#6, #9)
  - [x] Replace checkbox `readOnly` with a controlled `checked={todo.completed}` + `onChange`
        handler. Use the prop value as the displayed state until the callback resolves. Add only an
        Enter key handler; native Space/change behavior already covers Space.
  - [x] Guard toggle with local in-flight state; disable/suppress repeat activation, expose
        `aria-busy`, disable Edit for the same row, and on rejection retain the prop-backed state and
        show the local failure copy.
  - [x] Wrap the 22px visual checkbox in a real label/target whose effective dimensions are at least
        44×44px. Do not use the previously rejected pseudo-element-on-input approach.
  - [x] Edit mode uses local controlled draft/error/saving state initialized from
        `todo.description`, a programmatically labeled input, `autoFocus` or a ref, native form
        submit for Enter/Save, and an Escape key path for Cancel. Trim only for empty validation and
        the outbound value; preserve the typed draft on rejected save.
  - [x] Empty save: no callback, exact validation copy, `aria-invalid` +
        `aria-describedby`. API failure: exact minimal save-failure copy, no global banner.
        Row-local failures use `role="alert"`; edit failures are also associated with the input.
        Clear stale errors when retrying, typing, or succeeding.
  - [x] Save/input/Cancel must prevent duplicate or contradictory actions while a save is in
        flight. Keep the checkbox/toggle unavailable while that row is editing.
  - [x] Preserve the `<li>` label, `<time dateTime>`, completed dual signal, and edit/delete action
        semantics from Story 2.1.

- [x] **Task 10: Extend token-based styles** (AC: #2, #3, #6, #9)
  - [x] Update `frontend/src/styles/app.css`; do not change `tokens.css`.
  - [x] Add the 44×44 checkbox target, pointer/busy states, and visible focus indicator. Remove
        stale display-only/deferred comments now that the behavior is implemented.
  - [x] Add `todo-item--editing` with `--color-accent-subtle`; style the edit input with existing
        `--input-text-*`, Save with primary tokens, Cancel with secondary tokens, and inline errors
        with danger tokens. Use the spacing/radius/type scale; no new hex colors.
  - [x] Add visible `:focus-visible` treatment to the Edit, checkbox, Save, and Cancel update
        controls. Preserve the existing Delete styling without adding behavior.
  - [x] Ensure long descriptions, 200% text resize, and narrow widths wrap/reflow without hiding
        Save/Cancel or forcing horizontal page scroll.

- [x] **Task 11: Frontend interaction tests (red → green)** (AC: #1–#6, #9, #10)
  - [x] Extend `TodoItem.test.tsx`: toggle callback/request value; pending disabled/busy state;
        duplicate suppression; no visual flip before prop rerender; confirmed checked/strike-through;
        failure unchanged + local copy; Enter activation; 44px-target wrapper.
  - [x] Extend `TodoItem.test.tsx`: edit input pre-filled/labeled/focused; Save button and Enter;
        trim; pending debounce; Cancel and Escape without save; empty validation association; failed
        save preserves draft and edit mode.
  - [x] Assert same-row mutation exclusion, second-editor suppression, local failure
        announcement/clearing, and focus restoration.
  - [x] Extend `TodoList.test.tsx`: callback forwarding; exactly one edit input; server-confirmed
        completed replacement re-renders in the correct group without changing newest-first order.
  - [x] RTL/jsdom cannot prove pixel hit-area dimensions: assert semantic label-wrapper
        structure/class in component tests and verify the 44×44 CSS dimensions manually or in a
        browser-capable check.
  - [x] Keep `App.test.tsx`, `AddTodoForm.test.tsx`, list semantics, loading/empty/error branches,
        and all Story 2.2 create behavior green. Add an App wiring test only if needed to prove the
        real hook callbacks reach the list.

- [x] **Task 12: Verify the full slice** (AC: #1–#10)
  - [x] Start the ephemeral DB with `docker compose -f docker-compose.test.yml up -d --wait`.
  - [x] Run `npm run lint && npm run typecheck && npm test` in `backend/` and `frontend/`; stop the
        test DB with `docker compose -f docker-compose.test.yml down -v`.
  - [x] Capture Supertest + RTL results. If practical, capture the normal, completed, and inline-edit
        states for QA evidence. Do not claim a live-browser/E2E result unless it was actually run.
  - [x] Confirm a manual/API reload shows toggled and edited values persisted.

### Review Findings

- [x] [Review][Patch] Prevent toggle failure feedback from overflowing non-wrapping rows [frontend/src/styles/app.css:372]
- [x] [Review][Patch] Distinguish disabled and busy cursor states across the full checkbox target [frontend/src/styles/app.css:241]
- [x] [Review][Patch] Add completed-to-active UI coverage for un-completion and strike-through removal [frontend/src/components/TodoItem.test.tsx:87]
- [x] [Review][Patch] Cover top-level JSON `null` through the PATCH parser contract [backend/src/__tests__/todo.api.test.ts:166]
- [x] [Review][Patch] Prove native Space-key checkbox activation in the component tests [frontend/src/components/TodoItem.test.tsx:633]

## Dev Notes

### Current implementation state — files to update

**Backend**

- `backend/src/schemas/todo.schema.ts` currently exports only `createTodoSchema` and inferred
  `CreateTodoInput`. Its Description chain is the behavior to reuse for update.
- `backend/src/repositories/todo.repository.ts` owns the shared `pg.Pool`, `TodoRow`, and the only
  `toTodo` snake_case/Date → camelCase/ISO mapper. It currently has `list` and `create`; add `update`
  without duplicating any of those primitives.
- `backend/src/services/todo.service.ts` is a plain `todoService` object with thin `list` and `create`
  methods. Update is the first service method with not-found business behavior.
- `backend/src/routes/todo.routes.ts` has GET + POST and converts failed `safeParse` results to
  `ValidationError` inside `try/catch(next)`. Add PATCH to this same router.
- `backend/src/errors/AppError.ts` already provides `ValidationError` (`400 VALIDATION_ERROR`) and
  `NotFoundError` (`404 NOT_FOUND`). Reuse both; no new error class.
- `backend/src/middleware/errorHandler.ts` formats only `AppError` as the stable envelope; a raw
  `ZodError` becomes `500`. Preserve this boundary.
- `backend/src/__tests__/todo.api.test.ts` already runs migrations once and truncates the real test
  database around each test. Extend it; do not create a parallel DB harness.
- `backend/src/types/todo.ts` contains only the wire `Todo` and a comment reserving
  `UpdateTodoInput`; update the comment, but keep the inferred input type with its schema.

**Frontend**

- `frontend/src/api/api.ts` owns `API_BASE`, `ApiError`, `toApiError`, and `isTodo`. `createTodo`
  demonstrates the exact mutation-client shape; update must reuse all four.
- `frontend/src/hooks/useTodos.ts` owns authoritative rendered list state. `addTodo` established the
  rule that mutation failures are rethrown locally and never set the load-error state.
- `frontend/src/App.tsx` currently wires `{ list, loading, error, reload, addTodo }`; only add update
  callbacks. Preserve loading, load-error, Add form, empty, and populated branches.
- `frontend/src/components/TodoList.tsx` is presentational and invokes `groupTodos`; this story adds
  only the minimal coordination state needed to enforce one editor.
- `frontend/src/components/TodoItem.tsx` is display-only: a controlled-looking checkbox is
  `readOnly`, Edit/Delete are labeled but inert, and display semantics/styles are already correct.
  Extend it rather than replacing it.
- `frontend/src/utils/groupTodos.ts` is the single ordering authority and already copies/sorts
  immutably. No change is needed for re-sorting after a confirmed replacement.
- `frontend/src/styles/app.css` has tokenized row/checkbox/action styles, but the checkbox is only
  22px and action buttons lack an explicit focus ring. The deferred 2.1 requirement assigns the
  reliable 44×44 target to this story.
- `frontend/src/styles/tokens.css` already contains `accent-subtle`, input, primary/secondary,
  checkbox, danger, focus, spacing, and radius tokens. Do not add or rename tokens.

### Update data flow

**Toggle**

user activates native checkbox → `TodoItem` guards local in-flight state →
`TodoList` callback → `useTodos.toggleTodo(todo)` →
`api.updateTodo(id, { completed: !todo.completed })` →
`PATCH /api/todos/:id` → route Zod parse → service →
repository parameterized `UPDATE ... RETURNING` → `toTodo` → `200 Todo` →
hook immutably replaces by id → `TodoList`/`groupTodos` re-sorts → checkbox + text dual signal.

**Edit**

user activates Edit → `TodoList` sets one `editingTodoId` → `TodoItem` shows pre-filled input →
Enter/Save validates trimmed non-empty draft → `useTodos.editTodo(id, description)` →
same PATCH stack with `{ description }` → server object replaces by id → edit mode closes.
Cancel/Escape exits before the request and changes nothing.

### Architecture compliance (non-negotiable)

- Route = HTTP + Zod parsing; service = orchestration/not-found; repository = SQL. No SQL in routes
  or services and no `req`/`res` outside routes.
- DB/SQL stays snake_case; wire/frontend stays camelCase; mapping happens only in `toTodo`.
- All SQL values are parameters. Never interpolate Description or id.
- Postgres/server response is authoritative. No optimistic checkbox flip, temporary client Todo,
  rollback state, or refetch required after PATCH.
- React state updates are immutable. Replace by `id`; never mutate a Todo object or array.
- The update response is the complete Todo directly, not `{ data: ... }`.
- No authentication, router, Redux/server-state library, UI library, or event layer.

### Error and scope behavior

- Client-empty edit is handled inline before the request.
- Server-invalid body becomes `400 VALIDATION_ERROR`.
- Valid-but-absent UUID becomes `404 NOT_FOUND` through the service.
- Mutation network/API failure leaves the current list object unchanged. Edit failure also preserves
  local draft and edit mode.
- Row-local **"Couldn't save that change."** is the interim retry path: the user can activate the
  control again. Do not build Story 2.5's global banner/Retry/intent-replay/live-region machinery.
- Do not use the `useTodos.error` state for PATCH failures; it is specifically list-load state and
  causes the whole interactive surface to unmount.

### TypeScript and toolchain guardrails

- Type-only imports use `import type` (`verbatimModuleSyntax` on frontend; same convention backend).
- Frontend has `erasableSyntaxOnly`: no enum, namespace, or parameter properties.
- `strict`, `noUnusedLocals`, and `noUnusedParameters` are enforced. Prefix intentionally unused
  route parameters with `_`.
- Use React's native controlled-input contract: checkbox `checked` is boolean and requires
  `onChange`; read `event.target.checked` only if the callback needs the browser value.
- No new dependencies are needed.

### Previous story intelligence (Story 2.2)

- Story 2.2 created the mutation pattern to copy: route `safeParse` → existing typed error →
  service delegate → parameterized repository write + `RETURNING`/`toTodo`; typed fetch client →
  hook immutable confirmed-response update; component-local busy/error state.
- The 2.2 code review fixed malformed Todo shape checking and disabled-input refocus ordering. Reuse
  `isTodo`, and focus edit fields only when enabled/rendered.
- Story 2.2 verified Docker Desktop and the real Postgres integration harness work locally. The old
  "Docker unavailable" assumption is false.
- Mutation methods must not set the hook's top-level load error. This prevented typed-input loss in
  2.2 and is more important here because an inline edit draft would otherwise be unmounted.
- Existing deferred Unicode length/zero-width/NUL hardening remains Story 2.5 or later; do not expand
  this story while keeping existing create/edit validation behavior consistent.

### Git intelligence

- `b038a33 feat(story-2.2): create a todo (full vertical slice)` established the current schema,
  repository/service/route mutation pattern and Add form/hook/client tests.
- `590bb7c feat(story-2.1): render the populated todo list` established `TodoList`, `TodoItem`,
  `groupTodos`, semantic list tests, and tokenized row CSS.
- Earlier foundation commits established the Express error boundary, real-DB Supertest harness,
  typed fetch client, Docker test DB, strict TypeScript, and co-located RTL tests. Extend these
  patterns instead of introducing parallel abstractions.

### Latest technical information (verified 2026-08-26)

- Project lockfiles currently use React `19.2.7`, Zod `4.4.3`, node-postgres `8.21.0`, Express
  `5.2.1`, and Vitest `4.1.9`. Registry checks show React `19.2.8`, Zod `4.4.3`, pg `8.23.0`,
  Express `5.2.1`, and Vitest `4.1.11` as latest stable. **Do not upgrade in this story**: the
  installed APIs are sufficient and dependency changes would add unrelated risk.
- Zod 4 supports optional object fields plus `.refine()` on the object schema. Use the installed
  Zod 4 API; refinements remain within the schema and inferred types stay available.
- node-postgres continues to require query text + a separate values array for safe parameter
  substitution; `UPDATE ... RETURNING` is supported through the normal `pool.query` result rows.
- React's current input contract still requires `checked` + `onChange` for controlled checkboxes.
  Native checkbox Space behavior should be preserved; add Enter only because this project's UX
  contract explicitly requires it.
- Native `disabled` suppresses control interaction automatically; `aria-busy` can additionally
  expose pending modification. Do not rely on `aria-disabled` alone without JavaScript suppression.

### Project Structure Notes

Expected modified files:

- `backend/src/schemas/todo.schema.ts`
- `backend/src/schemas/todo.schema.test.ts`
- `backend/src/repositories/todo.repository.ts`
- `backend/src/services/todo.service.ts`
- `backend/src/routes/todo.routes.ts`
- `backend/src/types/todo.ts` (comment only)
- `backend/src/__tests__/todo.api.test.ts`
- `frontend/src/types/todo.ts`
- `frontend/src/api/api.ts`
- `frontend/src/hooks/useTodos.ts`
- `frontend/src/hooks/useTodos.test.tsx`
- `frontend/src/App.tsx`
- `frontend/src/components/TodoList.tsx`
- `frontend/src/components/TodoList.test.tsx`
- `frontend/src/components/TodoItem.tsx`
- `frontend/src/components/TodoItem.test.tsx`
- `frontend/src/styles/app.css`

Expected new test files:

- `backend/src/__tests__/todo.service.test.ts`
- `frontend/src/api/api.test.ts`

Files that should not change:

- `backend/migrations/001_create_todos.sql`
- `frontend/src/utils/groupTodos.ts`
- `frontend/src/styles/tokens.css`
- `frontend/src/components/AddTodoForm.tsx`
- delete/dialog/E2E files

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3: Update a Todo — complete/un-complete & edit description]
- [Source: _bmad-output/planning-artifacts/epics.md#Requirements Inventory] — FR-3, FR-4, FR-6, FR-7; NFR-1–NFR-4
- [Source: _bmad-output/planning-artifacts/epics.md#UX Design Requirements] — UX-DR3–UX-DR5, UX-DR10–UX-DR15
- [Source: _bmad-output/planning-artifacts/architecture.md#API Contracts] — PATCH request/response and 400/404
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] — naming, layering, errors, immutable confirmed-response state
- [Source: _bmad-output/planning-artifacts/architecture.md#Testing Strategy] — service/API/component test levels
- [Source: _bmad-output/planning-artifacts/architecture.md#Accessibility & Performance Considerations] — busy feedback, focus, 44px targets
- [Source: _bmad-output/planning-artifacts/prds/prd-aine-bmad-2026-06-15/prd.md#FR-3: Complete / un-complete a Todo]
- [Source: _bmad-output/planning-artifacts/prds/prd-aine-bmad-2026-06-15/prd.md#FR-4: Edit a Todo's Description]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/DESIGN.md#Components]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/EXPERIENCE.md#Component Patterns]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/EXPERIENCE.md#State Patterns]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/EXPERIENCE.md#Interaction Primitives]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/EXPERIENCE.md#Accessibility Floor]
- [Source: _bmad-output/implementation-artifacts/2-2-create-a-todo.md] — mutation patterns, review fixes, toolchain and test harness
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — 44px checkbox target assigned to 2.3 and unrelated deferrals
- [Source: backend/src/schemas/todo.schema.ts, repositories/todo.repository.ts, services/todo.service.ts, routes/todo.routes.ts]
- [Source: frontend/src/api/api.ts, hooks/useTodos.ts, components/TodoList.tsx, components/TodoItem.tsx, utils/groupTodos.ts]
- [External: https://zod.dev/api] — Zod 4 optionals/partial/refinements
- [External: https://node-postgres.com/features/queries] — parameterized query values
- [External: https://react.dev/reference/react-dom/components/input] — controlled checkbox contract
- [External: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy] — programmatic busy state

## Story Completion Status

- Story file created with exhaustive epic, PRD, architecture, UX, previous-story, repository,
  current-code, test, Git, and current-technology analysis.
- Status set to `ready-for-dev`.
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide
  created.

## Dev Agent Record

### Agent Model Used

GPT-5.6 Sol

### Implementation Plan

- Implement each backend and frontend task in story order using focused red-green-refactor cycles.
- Keep PostgreSQL/server responses authoritative and preserve existing route/service/repository and React hook/component boundaries.
- Run focused tests after each task, then both package quality gates and full regression suites before review.

### Debug Log References

- Task 1 RED: update-schema and UUID tests failed because the new exports did not exist.
- Task 1 GREEN: 27 schema tests and the 46-test backend regression suite passed.
- Task 2 RED: repository update tests failed because `todoRepository.update` did not exist.
- Task 2 GREEN: 2 focused repository tests and the 48-test backend regression suite passed.
- Task 3 RED: service tests failed because `todoService.update` did not exist.
- Task 3 GREEN: 2 focused service tests and the 50-test backend regression suite passed.
- Task 4 RED: PATCH API tests returned the generic route `404` because the endpoint did not exist.
- Task 4 GREEN: 15 API tests and the 53-test backend regression suite passed.
- Task 5 GREEN: the completed backend implementation satisfied 31 real-Postgres API tests and the 69-test backend regression suite.
- Task 6 RED: PATCH client tests failed because `updateTodo` did not exist.
- Task 6 GREEN: 3 focused API-client tests and the 30-test frontend regression suite passed.
- Task 7 RED: hook tests failed because `toggleTodo` and `editTodo` did not exist.
- Task 7 GREEN: 11 hook tests and the 35-test frontend regression suite passed.
- Task 8 RED: list tests exposed missing callback forwarding, one-editor coordination, focus restoration, and same-row mutation exclusion.
- Task 8 GREEN: 8 list coordination tests and the 41-test frontend regression suite passed.
- Task 9 RED: TodoItem tests exposed missing local failure feedback, semantic checkbox target/Enter support, and edit validation feedback.
- Task 9 GREEN: 14 focused TodoItem tests and the 51-test frontend regression suite passed.
- Task 10 RED: static style contracts failed for the missing target, edit treatment, focus rings, and narrow-layout reflow.
- Task 10 GREEN: 4 style contract tests and the 55-test frontend regression suite passed.
- Task 11 GREEN: 28 focused interaction/wiring tests and the 58-test frontend regression suite passed.
- Task 12: Backend lint/typecheck plus 70 tests passed; frontend lint/typecheck plus 61 tests passed. Real-Postgres follow-up GETs verified toggle/edit persistence. No live-browser/E2E capture was run.

### Completion Notes List

- Task 1: Added shared Description validation, update-body and UUID schemas, inferred update input type, and exhaustive schema tests.
- Task 2: Added one parameterized repository UPDATE with confirmed row mapping and unknown-id handling.
- Task 3: Added service-level update orchestration with typed `NOT_FOUND` behavior and isolated service tests.
- Task 4: Added the validated PATCH route with separate id/body parsing and stable 200/400/404 contracts.
- Task 5: Expanded real-Postgres API coverage across persistence, immutable columns, all validation bodies, malformed JSON, and not-found.
- Task 6: Added the typed, id-encoding frontend PATCH client with backend-envelope and malformed-success handling.
- Task 7: Added shared confirmed-response hook updates with immutable exact-object replacement and failure immutability.
- Task 8: Wired App/list update callbacks, single-editor ownership, confirmed-close behavior, focus restoration, and per-row mutation exclusion.
- Task 9: Implemented confirmed-response checkbox interaction and accessible inline editing with validation, busy guards, draft preservation, and local alerts.
- Task 10: Added token-based update styles, a measured 44×44 checkbox target, focus/busy/error states, and responsive inline-edit wrapping.
- Task 11: Completed interaction coverage for toggle/edit state machines, one-editor coordination, grouping, focus, accessibility, and App-to-hook wiring.
- Task 12: Completed all quality gates, verified API reload persistence, reconciled every changed file, and removed the ephemeral test database.
- Final: Story 2.3 now provides server-confirmed toggle and inline-edit flows across the full PostgreSQL-to-React slice, with local failure recovery and accessibility coverage.

### File List

- _bmad-output/implementation-artifacts/2-3-update-a-todo-complete-uncomplete-and-edit-description.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- backend/src/schemas/todo.schema.test.ts
- backend/src/schemas/todo.schema.ts
- backend/src/repositories/todo.repository.test.ts
- backend/src/repositories/todo.repository.ts
- backend/src/routes/todo.routes.ts
- backend/src/services/todo.service.ts
- backend/src/__tests__/todo.service.test.ts
- backend/src/__tests__/todo.api.test.ts
- backend/src/types/todo.ts
- frontend/src/api/api.test.ts
- frontend/src/api/api.ts
- frontend/src/hooks/useTodos.test.tsx
- frontend/src/hooks/useTodos.ts
- frontend/src/App.tsx
- frontend/src/App.test.tsx
- frontend/src/components/TodoItem.tsx
- frontend/src/components/TodoItem.test.tsx
- frontend/src/components/TodoList.test.tsx
- frontend/src/components/TodoList.tsx
- frontend/src/styles/app.css
- frontend/src/styles/app.test.ts
- frontend/src/types/todo.ts

## Change Log

- 2026-08-26: Implemented Story 2.3 PATCH persistence, typed update clients/hooks, accessible toggle and inline-edit UI, responsive token-based styles, and comprehensive backend/frontend tests.
