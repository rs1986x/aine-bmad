---
baseline_commit: 12aa945
---

# Story 2.2: Create a Todo

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the end user,
I want to add a todo quickly,
so that I can capture tasks the moment I think of them.

This is the **second story of Epic 2** and the first **write** slice of the app — the first
vertical slice that spans the whole stack: `AddTodoForm` (frontend component) → `useTodos.addTodo`
(hook action) → `api.createTodo` (typed client) → `POST /api/todos` (route + Zod parse) →
`todoService.create` → `todoRepository.create` (`INSERT … RETURNING`) → Postgres. Story 2.1 left a
**read-only** list (`TodoList` + `TodoItem` + `groupTodos`) rendered from `useTodos`'s read path.
This story adds the create path end-to-end **plus** the `AddTodoForm` UI pinned above the list, wires
the empty-state's "Add your first one above." call-to-action to a real input, and prepends the
server-confirmed Todo into the list immutably so it appears in the Active group **without a refresh**.

Scope is **create only**: no toggle/edit (2.3), no delete (2.4), and **no full `ErrorBanner` + Retry +
`aria-live` region (2.5)**. Empty/whitespace input is rejected **inline without clearing the field**;
a failed network create keeps the typed text and re-enables the form (a minimal, non-destructive
fallback) — the polished banner/retry/announcement UX is explicitly Story 2.5.

## Acceptance Criteria

1. **Given** a non-empty description, **When** I submit (Enter **or** the "Add" button), **Then** a
   Todo is created (`completed=false`, server-assigned `id` + `createdAt`), the input **clears and
   refocuses**, and the new Todo appears in the **Active** group **newest-first without a page
   refresh**. [Source: epics.md#Story 2.2; EXPERIENCE.md#Component Patterns ("Add-Todo input"), #Key Flows Flow 1; architecture.md#Data Flow (create example)]
2. **Given** an empty or whitespace-only description, **When** I submit, **Then** **no** Todo is
   created (no network call), the exact copy **"Enter some text first."** shows inline in `danger`
   (danger-colored border on the field + a helper line), the typed text is **preserved** (field not
   cleared), and the message is associated to the field via `aria-describedby`. [Source: epics.md#Story 2.2; EXPERIENCE.md#Voice and Tone ("Enter some text first."), #State Patterns ("Create validation error"), #Accessibility Floor; UX-DR2, UX-DR14]
3. **Given** a description **> 500 characters**, **When** submitted to the API, **Then** it is
   rejected with **`400`** and the envelope `{ error: { code: "VALIDATION_ERROR", message } }`; the
   backend never persists it. (The 500-char cap is enforced server-side by Zod + the DB `CHECK`; the
   client does not need to pre-guard length.) [Source: epics.md#Story 2.2; architecture.md#API Contracts, #Data Model (CHECK 1..500), AR-6]
4. **Given** the API, **When** `POST /api/todos { "description": "<non-empty>" }` is called, **Then**
   it returns **`201`** with the created `Todo` (camelCase: `id`, `description`, `completed:false`,
   `createdAt` ISO-8601); **When** the body is missing `description`, is not an object, or the
   (trimmed) description is empty/whitespace-only, **Then** it returns **`400`** with the error
   envelope and persists nothing. Description is **trimmed** server-side before insert. [Source: epics.md#Story 2.2; architecture.md#API Contracts, #Validation rules, AR-4/AR-5/AR-6/AR-9]
5. **Given** a create request in flight, **When** awaiting the server, **Then** the input and Add
   button show a brief **busy/disabled** state and are **debounced against double-submit**; the new
   Todo is committed to the list **only on the confirmed `201` response** (no optimistic insert).
   [Source: epics.md#Story 2.2; EXPERIENCE.md#State Patterns ("Action in flight"), #Interaction Primitives; architecture.md#State Management Patterns (confirm-on-response), UX-DR15]
6. **Given** a create that **fails** at the API (validation `400`, backend down, or any non-2xx),
   **When** it errors, **Then** the user's typed text is **never lost** (stays in the field), the
   controls re-enable so the user can try again, and a minimal inline failure message is shown. The
   `addTodo` action **must not** set the `useTodos` top-level `error` state (doing so would swap the
   whole surface to the load-error branch and unmount the form, destroying the typed input). Full
   `ErrorBanner` + Retry + `aria-live` is Story 2.5. [Source: epics.md#Story 2.5 boundary; EXPERIENCE.md#State Patterns ("Save/create failure"), #Key Flows failure beat; architecture.md#Error Handling Patterns; NFR-2]
7. **Given** the add input, **When** rendered, **Then** it has a programmatic label, the placeholder
   **"Add a todo…"** (exact, with the ellipsis character `…`), a **16px** font (no mobile zoom), and
   is pinned at the **top of the column above the list** — present in **both** the empty state (as the
   single call-to-action beneath "No todos yet. / Add your first one above.") **and** the populated
   list state. It is **not** shown during the initial loading skeleton or the (2.5) load-error branch.
   [Source: epics.md#Story 2.2; DESIGN.md#Components ("Add-Todo input"), #Layout & Spacing; EXPERIENCE.md#Information Architecture, #Component Patterns; UX-DR2, UX-DR7, UX-DR13]
8. **Given** the verification harness, **When** tests run, **Then**: backend **unit** tests prove the
   `CreateTodoInput` Zod schema trims + rejects empty/whitespace/over-500 and accepts a valid
   description; backend **integration** (Supertest) tests prove `POST /api/todos` → `201` (persisted,
   camelCase, `completed:false`) and `400` for whitespace-only / missing / over-500 with the error
   envelope; frontend **component** tests prove submit-success clears+refocuses and prepends, empty
   submit shows "Enter some text first." without clearing or calling the API, and a failed submit
   preserves the text; and `npm run lint`, `npm run typecheck`, and `npm test` stay green in **both**
   `frontend/` and `backend/`. Tests are written **first (red)** and land in the **same change** as the
   code. [Source: epics.md#Story 2.2 Test expectations, #Test-first discipline; architecture.md#Testing Strategy]

> **Scope note — what this story IS / IS NOT.**
> **IS (backend):** `backend/src/schemas/todo.schema.ts` (`createTodoSchema` + inferred
> `CreateTodoInput`), `todoRepository.create` (`INSERT … RETURNING`), `todoService.create`, the
> `POST /api/todos` route (Zod parse → `ValidationError` on failure), the `CreateTodoInput` type note
> in `backend/src/types/todo.ts`, and co-located unit + integration tests.
> **IS (frontend):** `src/components/AddTodoForm.tsx`, `api.createTodo`, `CreateTodoInput` in
> `src/types/todo.ts`, `useTodos.addTodo` (immutable prepend, returns/throws — does NOT touch the
> hook's top-level `error`), the `App.tsx` restructure to render `AddTodoForm` above the empty/
> populated branches, the CSS for `.add-todo-form` (+ error state) in `src/styles/app.css`, and
> co-located RTL tests. Update `App.test.tsx` only as needed so it stays green.
> **IS NOT:** any toggle/complete or inline-edit behavior or `PATCH` (2.3); any delete or
> `DeleteDialog` or `DELETE` (2.4); the full `ErrorBanner` component, Retry affordance, `aria-live`
> region, or `api.ts`→EXPERIENCE error-copy mapping (2.5); `updateTodo`/`deleteTodo` client methods or
> `UpdateTodoInput`; any change to `groupTodos`, `TodoList`, or `TodoItem` (they already render a
> prepended active todo correctly); any migration/schema/DB change; any token change; any Playwright/
> e2e spec (3.1). Do **not** add optimistic UI.

## Tasks / Subtasks

- [x] **Task 1: Zod schema + `CreateTodoInput` type — `backend/src/schemas/todo.schema.ts`** (AC: #3, #4, #8)
  - [x] Create `backend/src/schemas/todo.schema.ts` exporting `createTodoSchema`:
        `z.object({ description: z.string().trim().min(1).max(500) })`. `.trim()` runs before
        `.min(1)`/`.max(500)`, so a whitespace-only string trims to `''` and fails `.min(1)`, and the
        stored value is already trimmed. Export the inferred type:
        `export type CreateTodoInput = z.infer<typeof createTodoSchema>` (resolves to `{ description: string }`).
  - [x] Zod is **v4** (`zod@^4.4.3`) — use `safeParse` at the route (Task 3). `z.string().trim().min(1).max(500)`
        is valid v4 syntax; `ZodError` exposes `.issues`. Do **not** import from `zod/v3` or use v3-only APIs.
  - [x] Update the placeholder comment in `backend/src/types/todo.ts`: `CreateTodoInput` is now defined
        (via `z.infer`) in `schemas/todo.schema.ts` — do **not** duplicate the type there. Leave the
        `UpdateTodoInput` note for Story 2.3. Keep the `Todo` interface untouched.

- [x] **Task 2: Repository + service create — `todo.repository.ts`, `todo.service.ts`** (AC: #4, #8)
  - [x] `todoRepository.create(input: CreateTodoInput): Promise<Todo>` — parameterized
        `INSERT INTO todos (description) VALUES ($1) RETURNING id, description, completed, created_at`,
        then map the row via the existing `toTodo` helper (do not add a second mapper). `completed`
        defaults `false`, `created_at` defaults `now()`, `id` = `gen_random_uuid()` — all from the DB.
        Parameterized query only (AR-13); never interpolate `input.description`.
  - [x] `todoService.create(input: CreateTodoInput): Promise<Todo>` — thin delegate to
        `todoRepository.create`. The service does **not** re-validate (the route's Zod parse is the
        validation boundary); keep the layering (no `req`/`res` in the service, no SQL in the service).
        Add it alongside the existing `list` method on the `todoService` object.
  - [x] Import the `CreateTodoInput` type with `import type { CreateTodoInput } from '../schemas/todo.schema'`.

- [x] **Task 3: `POST /api/todos` route — `todo.routes.ts`** (AC: #3, #4, #5, #8)
  - [x] Add `router.post('/todos', async (req, res, next) => { … })`. Inside a `try/catch(next)`:
        `const parsed = createTodoSchema.safeParse(req.body)`. On `!parsed.success`, **throw**
        `new ValidationError(<message>)` (import from `../errors/AppError`) — do NOT let a raw
        `ZodError` escape (the error middleware only maps `AppError`; a `ZodError` would become a
        generic `500`). Derive a decent message from the first issue (e.g. the over-500 vs empty case)
        or use a static `'Description must not be empty.'`; the exact server message is not asserted and
        is never shown to the user (frontend uses its own copy).
  - [x] On success: `const todo = await todoService.create(parsed.data); res.status(201).json(todo)`.
  - [x] `POST` before or after the existing `GET /todos` in the same router is fine; keep the single
        `export default router` and the existing `app.ts` mount (`app.use('/api', todoRoutes)`) — no
        `app.ts` change is needed. `express.json({ limit: '16kb' })` is already mounted, so `req.body`
        is parsed; a non-JSON/oversized body is already handled by the error middleware (400/413).

- [x] **Task 4: Typed client `createTodo` + `CreateTodoInput` type — frontend `api.ts`, `types/todo.ts`** (AC: #1, #4, #6, #8)
  - [x] In `frontend/src/types/todo.ts` add `export interface CreateTodoInput { description: string }`
        (frontend has no Zod; this mirrors the backend input shape). Update the existing comment. Keep
        the `Todo` interface unchanged.
  - [x] In `frontend/src/api/api.ts` add:
        `export async function createTodo(input: CreateTodoInput): Promise<Todo>` — `fetch(`${API_BASE}/todos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })`.
        On `!response.ok` → `throw await toApiError(response)` (reuse the existing helper). On success,
        parse JSON and return it as `Todo` (a light shape check is optional; mirror `getTodos`'s style).
        Import `CreateTodoInput` with `import type`.
  - [x] Remove/anchor the "createTodo … Epic 2" comment at the bottom of `api.ts` now that it exists;
        keep the `updateTodo`/`deleteTodo` note for 2.3/2.4.

- [x] **Task 5: `useTodos.addTodo` action (immutable prepend, isolated failure) — `useTodos.ts`** (AC: #1, #5, #6, #8)
  - [x] Add `addTodo(description: string): Promise<Todo>` to the hook. Implementation: call
        `createTodo({ description })`; on success `setList(prev => [created, ...prev])` (immutable
        prepend — never mutate) and **return** the created Todo. On failure, **re-throw** so the form
        handles it locally.
  - [x] **CRITICAL (AC #6):** `addTodo` must **not** call `setError(...)` / touch the hook's top-level
        `error`. That state drives `App`'s load-error branch; setting it would unmount `AddTodoForm` and
        lose the user's typed text. The busy/disabled state and the create-failure message live in
        `AddTodoForm` (component-local), not the hook.
  - [x] Extend the `UseTodos` interface with `addTodo: (description: string) => Promise<Todo>`. Wrap it
        in `useCallback` (stable identity; empty dep array — it only uses the `setList` setter and the
        imported `createTodo`). Import `createTodo` next to the existing `getTodos` import.
  - [x] Note the ordering: prepend is enough because `TodoList` runs `groupTodos`, which re-sorts each
        group newest-first by `createdAt` — a freshly created Todo (newest `createdAt`) lands at the top
        of the Active group regardless of array position. Do not re-implement sorting in the hook.

- [x] **Task 6: `AddTodoForm` component — `src/components/AddTodoForm.tsx`** (AC: #1, #2, #5, #6, #7)
  - [x] `export function AddTodoForm({ onAdd }: { onAdd: (description: string) => Promise<unknown> })`.
        Render a `<form>` containing a labeled `<input type="text">` and a primary
        `<button type="submit">Add</button>`. One component per file, named export, no default (mirror
        `EmptyState`/`TodoItem`).
  - [x] Label the input programmatically: a visually-hidden `<label htmlFor>` or `aria-label` (e.g.
        "Add a todo"). Placeholder **exactly** `"Add a todo…"` (use the `…` ellipsis glyph, not three
        dots). Controlled input via `useState('')`.
  - [x] **Submit handling** (Enter submits natively via the `<form onSubmit>`; the Add button is
        `type="submit"`, so a click also fires `onSubmit`) — call `e.preventDefault()` then:
        - Compute `const trimmed = value.trim()`. If `trimmed === ''` → set an inline error state to the
          exact copy **"Enter some text first."**, do **not** call `onAdd`, do **not** clear the field
          (AC #2). Return early.
        - Otherwise set a `submitting` flag (disables input + button, guards double-submit, AC #5),
          clear any prior error, and `await onAdd(trimmed)`. On resolve: clear the field
          (`setValue('')`), clear `submitting`, and **refocus** the input (a `useRef<HTMLInputElement>`
          + `.focus()` in an effect keyed on success, or right after the await while still mounted).
          On reject (catch): keep the field text, clear `submitting`, and show a minimal inline failure
          message (AC #6) — reuse "Couldn't save that change." from EXPERIENCE Voice & Tone (the Retry
          button/banner itself is 2.5; re-enabling the form is the interim retry path). Do **not**
          rethrow past this point (the component owns the failure).
  - [x] **Validation wiring (AC #2, a11y):** give the input `aria-invalid={hasError}` and
        `aria-describedby={errorId}` when an error is shown; render the message in an element with that
        `id` (a `<p className="add-todo-form__error">`). Apply a danger-border modifier class to the
        input when in error. Clearing the field or typing should clear the empty-validation error
        (reset error on change or on next submit). Keep the two message cases (empty-validation vs
        create-failure) in the same described-by region for simplicity.
  - [x] Do **not** implement Retry, `aria-live`, or an `ErrorBanner` here (2.5). Do **not** pre-validate
        the 500-char max on the client (server-authoritative, AC #3) — an over-long submit simply flows
        through the failure path (AC #6).

- [x] **Task 7: Wire `AddTodoForm` into the shell — `src/App.tsx`** (AC: #1, #6, #7)
  - [x] Pull `addTodo` from `useTodos()` alongside `list, loading, error, reload`. Restructure the
        non-loading / non-error render so `AddTodoForm` is **pinned above** both the empty and populated
        branches, e.g.:
        ```tsx
        loading ? <LoadingSkeleton/>
        : error ? <div className="load-error" role="alert">…</div>   // unchanged (2.5)
        : (
            <>
              <AddTodoForm onAdd={addTodo} />
              {list.length === 0 ? <EmptyState/> : <TodoList todos={list}/>}
            </>
          )
        ```
  - [x] Leave the `loading` (skeleton) and `error` (minimal load-error fallback) branches **exactly as
        they are** — the add form is intentionally absent there (AC #7; error-state UX is 2.5). Keep
        `aria-busy={loading}` on `<main>`. Add the `import { AddTodoForm } from './components/AddTodoForm'`.
  - [x] The `EmptyState` component copy ("No todos yet." / "Add your first one above.") already assumes
        the input sits above it — no change to `EmptyState.tsx` is needed; do not duplicate an input in it.

- [x] **Task 8: Styles — extend `src/styles/app.css`** (AC: #2, #7)
  - [x] `.add-todo-form`: full-column-width row; at `≥ md` lay the input + Add button on **one line**
        (flex row, input `flex: 1 1 auto`, button `flex: 0 0 auto`, `gap: var(--space-3)`). The global
        `input { font-size: max(16px, var(--font-size-body)) }` rule already prevents mobile zoom — do
        not fight it.
  - [x] Input styling from `input-text` tokens: `background: var(--input-text-bg)`,
        `color: var(--input-text-fg)`, `border: 1px solid var(--input-text-border)`,
        `border-        radius: var(--input-text-radius)`, `padding: var(--input-text-padding)`; on `:focus` use
        `--input-text-border-focus` plus a visible focus ring drawn with `--color-focus-ring` +
        `--color-focus-ring-offset` (e.g. `outline: 2px solid var(--color-focus-ring); outline-offset: 2px`).
        No interactive element has explicit focus-ring CSS yet — this is the first, so implement it
        directly (don't suppress outlines). Placeholder color `--color-ink-secondary`.
  - [x] Add button from `button-primary` tokens (`--button-primary-bg`, `-fg`, `-radius`, `-padding`,
        hover `--button-primary-bg-hover`) — mirror the existing `.load-error__retry` rule. Disabled
        (busy) state: reduced affordance (e.g. `cursor: default; opacity` or `--color-ink-disabled`),
        keeping the focus ring intact.
  - [x] Error state: an `.add-todo-form__input--error` (or `[aria-invalid="true"]`) modifier sets
        `border-color: var(--color-danger)`; `.add-todo-form__error` renders the helper text in
        `var(--color-danger-text)` (AA-legible on white) at the `meta` or `label` type ramp. The
        error-banner block in `app.css` uses `--error-banner-*` (which resolve to the danger tokens) —
        for a field-level helper prefer `--color-danger` (border) + `--color-danger-text` (text).
  - [x] All tokenized values reference `tokens.css` vars — no hard-coded hex/px for tokenized values
        (mirror the 1.4 / 2.1 discipline). Confirm each `--token` name exists in `tokens.css` before
        using it; the DESIGN token set is already fully defined there (do not add tokens).

- [x] **Task 9: Tests (write first — red, then green)** (AC: #8)
  - [x] **Backend unit — schema** (`backend/src/schemas/todo.schema.test.ts` or co-located): `createTodoSchema`
        (a) accepts `"Buy milk"` → `{ description: 'Buy milk' }`; (b) **trims** `"  Buy milk  "` →
        `'Buy milk'`; (c) rejects `""`, `"   "` (whitespace-only), and a `501`-char string; (d) rejects a
        missing/non-string `description`. Assert via `safeParse(...).success`.
  - [x] **Backend integration — Supertest** (extend `backend/src/__tests__/todo.api.test.ts` with a
        `describe('POST /api/todos')`): valid body → `201`, body is the created `Todo` with `id`,
        `completed === false`, `createdAt` a string, `description` trimmed, and **no** `created_at`
        (camelCase, no snake_case leak); a follow-up `GET /api/todos` includes it (**persisted**).
        Whitespace-only, missing `description`, and a `501`-char description each → `400` with
        `body.error.code === 'VALIDATION_ERROR'` and **nothing persisted** (`GET` still `[]`). Reuse the
        existing `beforeEach/afterEach TRUNCATE` harness — do not add a new app instance or DB setup.
  - [x] **Frontend component — RTL + user-event** (`src/components/AddTodoForm.test.tsx`): use
        `@testing-library/user-event`.
        - Success: pass an `onAdd = vi.fn().mockResolvedValue(aTodo)`; type "Buy milk", press `Enter`
          (and separately, click **Add**); assert `onAdd` called once with `'Buy milk'`, then the input
          value is `''` and the input **has focus** (`toHaveFocus()`).
        - Trims: typing `"  Buy milk  "` calls `onAdd` with `'Buy milk'`.
        - Empty/whitespace: type `"   "` (or nothing) and submit → `onAdd` **not** called, the text
          **"Enter some text first."** is shown, the field value is unchanged (preserved), and the input
          is `aria-invalid` / linked via `aria-describedby`.
        - Failure: `onAdd = vi.fn().mockRejectedValue(new Error('boom'))`; submit a valid value →
          input value is **preserved** (not cleared), controls re-enabled, an inline failure message
          shown.
        - Busy/debounce (AC #5): while `onAdd` is pending (a deferred promise), the input/button are
          disabled and a second submit does not call `onAdd` again.
  - [x] **Frontend hook — RTL `renderHook`** (extend `src/hooks/useTodos.test.tsx`): mock `fetch`
        (mirror the existing `mockFetchOnce` helper, or `vi.spyOn(api, 'createTodo')`) so `addTodo`
        resolves a created Todo; assert `result.current.list` gains the todo **prepended** (index 0),
        the previous array identity is not mutated, and `result.current.error` **stays `null`** (AC #6).
        Also assert a rejected `addTodo` re-throws and leaves `error` `null` + `list` unchanged.
  - [x] **App** (`src/App.test.tsx`): the existing loading→empty and load-error tests must stay green.
        The empty branch now also renders `AddTodoForm`, so add/confirm an assertion that the add input
        (placeholder "Add a todo…") is present in the empty state, and that it is **absent** during
        loading and in the load-error branch. Adjust existing assertions only as needed (they query by
        "No todos yet." text and the alert role — both still hold).
  - [x] `npm run lint`, `npm run typecheck`, and `npm test` all pass in **both** `frontend/` and
        `backend/`. Backend integration needs the ephemeral test Postgres (`docker-compose.test.yml`) —
        see the note in Testing approach about Docker not being installed locally.

- [x] **Task 10: Verify** (AC: #1–#8)
  - [x] Run `npm run lint && npm run typecheck && npm test` in `frontend/`; run the same in `backend/`
        (integration tests require the test DB). Capture the RTL + Supertest output for QA evidence.
  - [x] **Docker is not installed on this dev machine** (carried from 1.1–2.1). Do not fake a compose
        bring-up or a live browser screenshot; the backend integration tests are 2.2's API proof and
        CI/Story 3.1 own the end-to-end browser proof. If the local environment cannot reach a test
        Postgres, state this honestly in Completion Notes and rely on CI for the integration layer — do
        NOT weaken the integration tests to avoid needing a DB.
  - [x] If a headless render is available, capture a screenshot of the add input (normal + the "Enter
        some text first." validation state) for QA evidence; otherwise note the RTL coverage stands in.

## Dev Notes

### What this story IS / IS NOT (read the Scope note under Acceptance Criteria first)

- **IS:** the full create vertical slice — Zod `createTodoSchema`, `repository.create`,
  `service.create`, `POST /api/todos`, `api.createTodo`, `useTodos.addTodo` (immutable prepend),
  `AddTodoForm`, the `App` restructure to pin the form above the list, the form CSS, and unit +
  integration + component tests written first.
- **IS NOT:** toggle/edit (2.3), delete (2.4), the polished `ErrorBanner`/Retry/`aria-live` (2.5),
  any `PATCH`/`DELETE` client or server code, `UpdateTodoInput`, any change to `groupTodos`/`TodoList`/
  `TodoItem`, any DB/migration/token change, or any Playwright/e2e spec (3.1).

### Current state of files this story changes (read before editing)

**Backend**
- `backend/src/routes/todo.routes.ts` — currently only `GET /todos` (calls `todoService.list()`,
  `res.status(200).json`, `catch(next)`). **Add** the `POST /todos` handler in the same router; keep
  the single default export. No change to `app.ts` (it already mounts `app.use('/api', todoRoutes)`).
- `backend/src/services/todo.service.ts` — a plain object `todoService` with a single `list()` method
  delegating to the repository. **Add** `create()` as a sibling method; keep the object shape.
- `backend/src/repositories/todo.repository.ts` — `todoRepository.list()` + the `toTodo(row)` mapper
  (the single snake_case→camelCase / `Date`→ISO boundary) + the `TodoRow` interface. **Add**
  `create()` using the **existing** `toTodo` and `pool`; do not add a second mapper or a new pool.
- `backend/src/errors/AppError.ts` — `AppError`, `ValidationError` (400, `VALIDATION_ERROR`),
  `NotFoundError` (404, `NOT_FOUND`). Reuse `ValidationError` in the route; do not add new error types.
- `backend/src/middleware/errorHandler.ts` — maps `AppError` → `{ error: { code, message } }` at
  `err.statusCode`; known 4xx client errors (malformed/oversized JSON) keep their status; everything
  else is a generic `500`. **A raw `ZodError` is NOT an `AppError` → it would become a 500.** This is
  exactly why the route must convert a failed `safeParse` into a `ValidationError` (Task 3).
- `backend/src/types/todo.ts` — the `Todo` interface + a comment reserving `CreateTodoInput` for this
  story. Update the comment to point at `schemas/todo.schema.ts`; do not duplicate the type.
- `backend/src/schemas/` — **does not exist yet**; create the folder + `todo.schema.ts` (architecture's
  backend tree lists `schemas/` with `todo.schema.ts`). This is the first schema file.
- `backend/src/__tests__/todo.api.test.ts` — existing Supertest suite with a `runMigrations` +
  `TRUNCATE` harness and `GET` coverage. **Extend** it with the `POST` describe block; reuse the harness.

**Frontend**
- `frontend/src/App.tsx` — renders exactly one branch (loading / error / empty / populated). **Restructure**
  the non-loading/non-error path to render `<AddTodoForm onAdd={addTodo} />` above the empty/populated
  branches (Task 7). Keep the loading + load-error branches byte-for-byte.
- `frontend/src/hooks/useTodos.ts` — `{ list, loading, error, reload }`, read-path only, immutable,
  confirm-on-response. **Add** `addTodo` (Task 5). Respect the two 1.4 deferrals: `reload()` does not
  clear a stale `list`, and there's no `AbortController`/timeout — do not "fix" them here (2.5 scope).
- `frontend/src/api/api.ts` — `ApiError`, `API_BASE = '/api'`, `toApiError(response)`, `getTodos()`.
  **Add** `createTodo` reusing `toApiError`. Note: `api.ts` intentionally does **not** map errors to
  EXPERIENCE copy yet (that's 2.5) — it throws the typed `ApiError`; the component supplies user copy.
- `frontend/src/types/todo.ts` — `Todo` + a comment reserving `CreateTodoInput`. **Add** the interface.
- `frontend/src/components/EmptyState.tsx` — static headline + subline; its copy already implies the
  add input is "above." **No change** — just ensure `App` renders the form above it.
- `frontend/src/components/{TodoList,TodoItem}.tsx` + `utils/groupTodos.ts` — Story 2.1 units. **Do not
  change.** `groupTodos` re-sorts newest-first within the Active group, so a prepended new Todo shows at
  the top automatically.
- `frontend/src/styles/app.css` — global reset + shell + skeleton + empty-state + load-error +
  `.todo-list`/`.todo-item` (2.1). **Append** the `.add-todo-form` styles here (same tokenized discipline).
- `frontend/src/styles/tokens.css` — the full DESIGN token set exists (incl. `--input-text-*`,
  `--button-primary-*`, `--color-danger`, `--color-ink-secondary`, `--focus-ring*`). **Reference**
  them; confirm exact var names in the file before use. Do not add/rename tokens.
- `frontend/src/App.test.tsx`, `useTodos.test.tsx` — existing suites to extend/keep green (Task 9).

### TypeScript / toolchain guardrails (hard — CI blocks on these)

- **`verbatimModuleSyntax: true`** (frontend) → type-only imports MUST be `import type { … }`
  (`CreateTodoInput`, `Todo`). Same discipline on the backend for type-only imports.
- **`erasableSyntaxOnly: true`** (frontend) → no `enum`, no `namespace`, no TS parameter-properties.
- **`noUnusedLocals` / `noUnusedParameters`** → no unused imports/vars (lint + tsc both fail). If you
  keep an unused route param, prefix `_` (see `_req` in the existing GET/health routes).
- `strict: true`; `jsx: react-jsx` (no `import React`); import modules without file extensions.
- **Frontend:** React **19.2**, Vite **8**, Vitest **4.x**, TS **~6.0**, Node ≥ 24;
  `npm run typecheck` = `tsc -b --noEmit`. Test libs installed: `@testing-library/react` (incl.
  `renderHook`), `@testing-library/jest-dom`, `@testing-library/user-event`, `@vitest/coverage-v8`.
  **`user-event` is needed this story** (typing/submitting) — it's already a devDependency; no new deps.
- **Backend:** Node ≥ 24, Express **5**, `zod@^4`, `pg@^8.21`, TS **6.0**, Vitest **4.x** + Supertest.
  `npm run typecheck` = `tsc --noEmit`. `"type": "commonjs"`. No new deps.
- Env test isolation: backend tests read `.env.test`; the integration suite runs against the ephemeral
  Postgres from `docker-compose.test.yml` (fresh-migrated, truncated between tests).

### Architecture rules this story MUST honor

- **Layering (backend):** route does HTTP + **Zod parse**; service does logic (delegate); repository
  does SQL. No SQL outside the repository; no `req`/`res` inside the service; casing maps **only** in
  the repository (`created_at` ⇄ `createdAt`). [architecture.md#Service Boundaries, #Naming Patterns, AR-5/AR-9]
- **Validation (AR-6):** Zod `description` trimmed / non-empty / ≤ 500; the DB `CHECK (1..500)` is the
  backstop (defense in depth) — do not remove or rely solely on it. Errors go through the envelope only.
- **Component boundary (frontend):** components never call the API; only the `useTodos` hook (via
  `api.ts`) does. `AddTodoForm` receives `onAdd` as a prop and calls it — it must **not** import
  `api.ts` directly. [architecture.md#Component Boundaries]
- **Immutable / no optimistic UI:** `setList(prev => [created, ...prev])`; commit only on the confirmed
  `201`. No `push`, no optimistic insert, no rollback logic. [architecture.md#State Management Patterns; PRD SM-C2]
- **Error contract:** success returns the resource directly (no envelope) → `201 Todo`; errors are
  `{ error: { code, message } }` with the right status. `201` for create (not `200`). [architecture.md#Format Patterns, #API Contracts]
- **Tokens, not literals:** form CSS references `tokens.css` vars for tokenized colors/spacing/radii/
  type. [architecture.md#Styling Solution; UX-DR1]
- **Accessibility floor:** programmatic label on the input; validation message associated via
  `aria-describedby` + `aria-invalid`; visible focus ring on input + button; ≥ 44×44px effective hit
  areas; 16px input font. **`aria-live` for the successful add is Story 2.5 — not here.** [architecture.md#Accessibility & Performance; EXPERIENCE.md#Accessibility Floor; UX-DR12]

### Exact user-facing copy / labels (do not paraphrase)

- Add input placeholder: **`Add a todo…`** (lowercase "todo", real `…` ellipsis). [UX-DR14, EXPERIENCE Voice & Tone]
- Empty-validation message: **`Enter some text first.`** (verbatim, trailing period). [UX-DR14]
- Create-failure fallback message (interim, AC #6): **`Couldn't save that change.`** (the "Retry."
  affordance/banner is Story 2.5; you may show the sentence without a Retry button this story).
- The server-side Zod/`ValidationError` message is **not** user-visible and **not** asserted — keep it
  reasonable but do not spend effort matching EXPERIENCE copy on the backend.
- "todo" stays lowercase in all copy. No success toast / celebratory microcopy.

### Create-path contract (get these exactly right)

- **Request:** `POST /api/todos`, `Content-Type: application/json`, body `{ "description": string }`.
- **Success:** `201` + the created `Todo` (`{ id, description, completed:false, createdAt }`, camelCase,
  `createdAt` ISO-8601 UTC). The client prepends this exact server object (no client-built object).
- **Validation failure:** trimmed-empty / missing / non-string / > 500 chars → `400`
  `{ error: { code: "VALIDATION_ERROR", message } }`, nothing persisted.
- **Trimming happens server-side** (Zod `.trim()`), so the persisted + returned `description` is
  trimmed even though the client also trims before sending (the client trim is for the empty-check UX;
  the server trim is authoritative).
- **Confirm-on-response:** the UI shows nothing new until the `201` lands; on failure the list is
  unchanged and the typed text stays in the field.

### Data flow (create) — reference

user types + submits → `AddTodoForm` trims + guards empty → `onAdd(trimmed)` = `useTodos.addTodo` →
`api.createTodo({ description })` → `POST /api/todos` → route `safeParse` → `todoService.create` →
`todoRepository.create` (`INSERT … RETURNING`) → row mapped to `Todo` → `201` → hook prepends
immutably → `TodoList`/`groupTodos` renders it at the top of the Active group → form clears + refocuses.
[architecture.md#Integration Points & Data Flow]

### Previous story intelligence (2.1) & deferred items to respect

- 2.1 established: `TodoList`/`TodoItem` (display-only, real focusable checkbox + inert icon buttons),
  the pure `groupTodos` (Active above Completed, newest-first within each — **the single ordering
  authority**; reuse it, don't re-sort in the hook), the `App` populated-branch, and the co-located RTL
  convention. Component convention: one per file, named export, no default.
- 2.1 deferrals (do **not** fix here): `groupTodos` sorts ISO strings via `localeCompare` (fine for
  uniform UTC "Z" strings); no runtime guard for malformed `createdAt` (server-authoritative shape);
  the checkbox ≥44px hit area is deferred to **2.3**. None affect create. [deferred-work.md]
- 1.4 deferrals still standing: `useTodos.reload()` doesn't clear a stale `list`; no `AbortController`/
  timeout in `useTodos`. Irrelevant to the create happy path; full error/reliability UX is 2.5.
- **CI gates are real and block:** both `frontend` and `backend` jobs run `lint` + `typecheck` + `test`
  (the backend job brings up `docker-compose.test.yml` for integration). Top risks: `verbatimModuleSyntax`
  (use `import type`), unused-locals/params, and a stray `ZodError` reaching the error middleware as a 500.

### Zod v4 specifics (avoid v3 muscle-memory)

- `z.string().trim().min(1).max(500)` — chained, `.trim()` first so length checks see the trimmed value.
- Parse at the route with `createTodoSchema.safeParse(req.body)`; branch on `.success`. On failure,
  `.error` is a `ZodError` with `.issues` (array of `{ code, message, path, … }`); read
  `parsed.error.issues[0]?.message` if you want a specific message, else use a static string.
- Infer the type with `z.infer<typeof createTodoSchema>`. Do not import from `zod/v3`.

### Project Structure Notes

- New backend file: `backend/src/schemas/todo.schema.ts` (first file in `schemas/`, matches the
  architecture tree). New frontend file: `frontend/src/components/AddTodoForm.tsx`. Tests co-located
  (`*.test.ts`/`*.test.tsx`) or, for the backend integration, appended to the existing
  `backend/src/__tests__/todo.api.test.ts` (the established pattern).
- No new top-level structure; no backend migration/schema (SQL) change; no frontend token change.

### Testing approach (test-first)

- Write the failing tests first at each level (schema unit → API integration → component/hook), then
  implement until green. Land tests + code in the **same change** (test-first discipline; CI reviews
  history).
- **Backend integration requires a real test Postgres** (`docker-compose.test.yml`). **Docker is not
  installed on this dev machine** (carried from 1.1–2.1). Do NOT weaken or delete the integration tests
  to make them pass without a DB, and do NOT fake a bring-up — author them correctly (they run in CI's
  backend job) and, if you can't run them locally, run lint/typecheck + the frontend + backend **unit**
  (schema) tests locally and state the DB-dependent gap honestly in Completion Notes. CI is the
  authoritative integration proof.
- Frontend uses jsdom + `src/test/setup.ts` (already wired via `vite.config.ts`). Prefer role/label/
  text queries and `user-event` over firing raw events; assert focus with `toHaveFocus()`.
- The browser-rendered create journey (type → Enter → appears in Active group; failure beat keeps
  input) folds into Story 3.1's Playwright E2E — not this story.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2: Create a Todo] — ACs, implementation tasks, test/QA expectations, DoD
- [Source: _bmad-output/planning-artifacts/epics.md#Requirements Inventory] — FR-2 (create), FR-7 (CRUD API), NFR-2 (reliability)
- [Source: _bmad-output/planning-artifacts/epics.md#UX Design Requirements] — UX-DR2 (add input), UX-DR7 (empty CTA), UX-DR12 (a11y floor), UX-DR13 (responsive), UX-DR14 (microcopy), UX-DR15 (in-flight)
- [Source: _bmad-output/planning-artifacts/architecture.md#API Contracts] — `POST /api/todos` `{description}` → `201 Todo`; `400` invalid; error envelope
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Model] — `todos` columns, `CHECK (1..500)`, defaults (`gen_random_uuid()`, `false`, `now()`)
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] — layering, naming (AR-5/AR-6/AR-9), format patterns (201/400 + envelope), immutable state, confirm-on-response
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Flow (create example)] — the exact create round-trip
- [Source: _bmad-output/planning-artifacts/architecture.md#Testing Strategy] — unit/integration/component levels, Supertest + ephemeral test DB
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/DESIGN.md#Components] — Add-Todo input (`input-text` + `button-primary`), danger error treatment
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/EXPERIENCE.md#Component Patterns] — add input behavior (Enter/Add, trim, reject-without-clear, clear+refocus)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/EXPERIENCE.md#State Patterns] — create validation error, action-in-flight, save/create failure
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/EXPERIENCE.md#Voice and Tone] — exact copy: "Add a todo…", "Enter some text first.", "Couldn't save that change."
- [Source: _bmad-output/implementation-artifacts/2-1-render-the-populated-todo-list.md] — `groupTodos`/`TodoList`/`TodoItem` shape, App branch, conventions, toolchain guardrails
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — 1.4 + 2.1 deferrals to respect (not fix) here
- [Source: frontend/src/App.tsx] — the shell branch to restructure
- [Source: frontend/src/hooks/useTodos.ts] — the hook to extend with `addTodo`
- [Source: frontend/src/api/api.ts] — `ApiError` + `toApiError` to reuse for `createTodo`
- [Source: frontend/src/types/todo.ts, backend/src/types/todo.ts] — `Todo` shape + reserved `CreateTodoInput`
- [Source: backend/src/routes/todo.routes.ts, services/todo.service.ts, repositories/todo.repository.ts] — layers to extend
- [Source: backend/src/errors/AppError.ts, middleware/errorHandler.ts] — `ValidationError` + the AppError-only mapping (why the route must convert ZodError)
- [Source: backend/src/__tests__/todo.api.test.ts] — integration harness (migrate + TRUNCATE) to extend
- [Source: frontend/src/styles/tokens.css, app.css] — `--input-text-*`, `--button-primary-*`, `--color-danger` tokens + where to append form CSS

## Dev Agent Record

### Agent Model Used

Opus 4.8 (Cursor) — bmad-dev-story workflow.

### Debug Log References

- Backend suite (real Postgres): `4 files, 28 tests passed` — includes the new `POST /api/todos`
  integration block (201 create/persist/trim, 400 for whitespace/missing/over-500).
- Frontend suite: `6 files, 27 tests passed` — schema/hook/component/App coverage.
- `eslint` + `tsc` clean in both `frontend/` and `backend/`.

### Completion Notes List

- Implemented the full create vertical slice test-first: schema unit → API integration → hook → component.
- **Environment correction:** The story's Dev Notes assumed Docker was not installed (carried from
  1.1–2.1). Docker **is** installed on this machine (Docker Desktop 29.6.1). I ran the backend
  **integration** tests locally against a real Postgres, so the DB-dependent layer is verified here (not
  just deferred to CI).
- **Discovered + fixed infra bug (adjacent to 2.2, unblocks CI):** `docker-compose.test.yml` mounted
  the tmpfs at `/var/lib/postgresql/data`, but `postgres:18.4` requires the mount at
  `/var/lib/postgresql` (18+ stores data in a major-version subdirectory). The container refused to
  start with the old path, which would also break the CI backend job. Fixed the mount path to
  `/var/lib/postgresql`; confirmed the official `docker compose -f docker-compose.test.yml up` bring-up
  is healthy and the backend suite (28 tests, incl. integration) passes against it.
- AC #6 honored: `useTodos.addTodo` never touches the hook's top-level `error`; the busy/disabled state
  and the create-failure message live entirely in `AddTodoForm`.
- No optimistic UI: the list updates only on the confirmed `201` (immutable prepend); `groupTodos`
  places the newest `createdAt` at the top of the Active group.

### File List

**Added**
- `backend/src/schemas/todo.schema.ts`
- `backend/src/schemas/todo.schema.test.ts`
- `frontend/src/components/AddTodoForm.tsx`
- `frontend/src/components/AddTodoForm.test.tsx`

**Modified**
- `backend/src/repositories/todo.repository.ts`
- `backend/src/services/todo.service.ts`
- `backend/src/routes/todo.routes.ts`
- `backend/src/types/todo.ts`
- `backend/src/__tests__/todo.api.test.ts`
- `frontend/src/api/api.ts`
- `frontend/src/types/todo.ts`
- `frontend/src/hooks/useTodos.ts`
- `frontend/src/hooks/useTodos.test.tsx`
- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`
- `frontend/src/styles/app.css`
- `docker-compose.test.yml` (fix `postgres:18.4` tmpfs mount path — unblocks local + CI integration DB)

## Change Log

| Date       | Change                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| 2026-07-13 | Implemented Story 2.2 (Create a Todo) end-to-end; all tasks complete, tests green. |
| 2026-07-13 | Code review (adversarial 3-layer): 3 patch, 3 deferred, 11 dismissed. |

## Review Findings

_Adversarial code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor), 2026-07-13. Baseline `12aa945`. All 8 ACs verified satisfied; findings below are robustness/consistency issues, not AC failures._

- [x] [Review][Patch] `createTodo` does not guard the success response (no JSON-parse guard, no shape check) while `getTodos` does — a malformed 2xx body is blindly cast to `Todo`, flows into `setList`, and crashes render (`groupTodos.localeCompare` / `TodoItem` destructure) [frontend/src/api/api.ts:54-64] — FIXED: added `isTodo` runtime shape check → throws `ApiError('malformed_response')`
- [x] [Review][Patch] Success refocus calls `inputRef.current.focus()` while the input is still `disabled={submitting}` — a no-op in real browsers (focus only "works" here under jsdom, which doesn't enforce the disabled-can't-focus rule), so AC #1's "refocus" silently breaks in production; re-enable before focusing (or disable only the button) [frontend/src/components/AddTodoForm.tsx:25-37] — FIXED: refocus now runs in a `useEffect` after `submitting` clears (input re-enabled)
- [x] [Review][Patch] `AddTodoForm` hardcodes `id="add-todo-input"` / `htmlFor="add-todo-input"` instead of `useId()` (already imported and used for `errorId`) — two mounted instances produce duplicate DOM ids and the label association resolves to the first only [frontend/src/components/AddTodoForm.tsx:50-64] — FIXED: input id/`htmlFor` now use a `useId()`-generated id
- [x] [Review][Defer] `addTodo`'s immutable prepend can be overwritten or duplicated by a concurrent `reload()` (server response replaces the whole list; no de-dup by `id`) [frontend/src/hooks/useTodos.ts:23-28] — deferred, tied to the accepted 1.4 reload/AbortController deferral; full reliability UX is Story 2.5
- [x] [Review][Defer] Zod `.max(500)` measures UTF-16 code units while the DB `CHECK` uses `char_length` (code points), so an astral-plane (emoji) string near the boundary is rejected client/server before the DB would reject it — the "500-character" limit is inconsistent [backend/src/schemas/todo.schema.ts:8] — deferred, low impact, DB is the backstop
- [x] [Review][Defer] Zero-width / non-trimmable Unicode (e.g. `U+200B`) passes `.trim().min(1)` and persists a visually-blank todo [backend/src/schemas/todo.schema.ts:8] — deferred, edge case, low impact

**Re-review (2026-07-13):** 3 patches confirmed fixed by all layers; Acceptance Auditor re-verified all 8 ACs satisfied. No new patch-level issues. 3 additional edge cases deferred:

- [x] [Review][Defer] A NUL byte (`\u0000`) in `description` passes Zod but Postgres rejects it, yielding a generic `500` instead of a `400 VALIDATION_ERROR` [backend/src/schemas/todo.schema.ts:8, backend/src/repositories/todo.repository.ts] — deferred, rare input; broader input hardening is Story 2.5
- [x] [Review][Defer] `createTodo` (like `getTodos`) does not wrap the success `response.json()` — an empty/non-JSON 2xx body throws a raw `SyntaxError` that bypasses the `isTodo` guard [frontend/src/api/api.ts] — deferred, consistent with `getTodos`; server always returns JSON
- [x] [Review][Defer] Enter that commits an IME composition submits the form prematurely (no `isComposing` guard) [frontend/src/components/AddTodoForm.tsx] — deferred, i18n edge, low impact
