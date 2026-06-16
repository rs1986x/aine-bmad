---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-aine-bmad-2026-06-15/prd.md
  - _bmad-output/planning-artifacts/prds/prd-aine-bmad-2026-06-15/addendum.md
  - _bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/EXPERIENCE.md
  - _bmad-output/planning-artifacts/architecture.md
---

# Todo App (Training Exercise) - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the Todo App (Training Exercise), decomposing the requirements from the PRD, the UX Design (DESIGN.md + EXPERIENCE.md), and the Architecture document into implementable stories.

A core constraint of this exercise: **QA, testing, accessibility, security, and documentation are first-class, integrated work — not an afterthought bolted on at the end.** The epic and story structure below reflects that. Stories are intentionally consolidated to fit a time-bounded delivery while preserving full scope.

**Test-first discipline (applies to every implementation story):** tests for each slice are written first (red), and the implementation makes them pass (green). Commit/PR history must show the tests added in the same change as the code they cover — no story is "done" with code committed ahead of its tests.

## Requirements Inventory

### Functional Requirements

```
FR-1: View the Todo List — on load, render all Todos with Description + Completed status; visually distinguish Active vs Completed; show empty state when no Todos; show loading state while fetching.
FR-2: Create a Todo — submit a non-empty Description to create a Todo (completed=false, server-assigned id + created_at); new Todo appears without refresh; empty/whitespace rejected with a clear validation message; created Todo persists.
FR-3: Complete / un-complete a Todo — toggle Completed status both directions (reversible); visual state updates immediately; new status persists across refresh and session.
FR-4: Edit a Todo's Description — enter edit mode, change Description, save; non-empty save updates Description while preserving id/created_at/completed; empty save rejected with original preserved; cancel leaves Todo unchanged; update persists.
FR-5: Delete a Todo — permanently remove a Todo; removed from rendered list without refresh; gone from persistence (no undo, no soft-delete).
FR-6: Persist Todos across refreshes and sessions — Todo List identical after refresh, browser restart, and backend restart; persistence is server-side and authoritative; zero data loss.
FR-7: Provide CRUD operations over Todos — API can list, create, update (description and/or completed), and delete by id; unknown id returns 404; invalid input returns 400; contract stable enough for frontend + tests to depend on.
```

### NonFunctional Requirements

```
NFR-1: Performance / Responsiveness — under normal local/dev conditions, UI actions reflect within ~200ms of server response; typical API responses well under ~500ms (single-user dev targets).
NFR-2: Reliability / Error handling — client shows clear, non-destructive error states and never silently loses typed input; server validates input and returns clear error responses without corrupting data or crashing.
NFR-3: Usability / UX states — responsive desktop + mobile; Completed visually distinct from Active; empty/loading/error states present; no onboarding; experience qualities: clear, intuitive, instantaneous, polished.
NFR-4: Data integrity / Durability — persistence durable and authoritative on the server; no accepted write lost on refresh/session/backend restart; stored data stays consistent (no partial/corrupt Todos).
NFR-5: Maintainability / Extensibility — architecture must admit a future `user` dimension (auth/multi-user) without a rewrite; clear, conventional code organization and API contract.
NFR-6: Deployability — full stack (frontend, backend, db) runs via Docker Compose with a single command, reproducibly, on a clean machine with Docker installed.
NFR-7: Testability — system covered by automated tests sufficient to validate FRs and persistence; tests runnable in a documented, repeatable way.
```

### Additional Requirements

*(Technical requirements extracted from the Architecture document and Addendum that shape implementation.)*

```
- STARTER TEMPLATE (impacts Epic 1, Story 1): Frontend scaffolded via Vite `react-ts` template (React 19.2 + TS 6.0); backend hand-built minimal Express 5 + TypeScript. Two-folder repo (frontend/, backend/) + root docker-compose.yml. Scaffolding the repo is the explicit first implementation story.
- AR-1 Data access: raw node-postgres `pg` driver, all SQL isolated in a single todoRepository module, parameterized queries only ($1, $2), one shared pg.Pool.
- AR-2 Migrations: versioned migrations/NNN_*.sql applied at backend startup by a runner that records applied files in a `_migrations` ledger table (idempotent). migrations/001_create_todos.sql creates todos table + idx_todos_created_at.
- AR-3 Data model: Todo = id (UUID, gen_random_uuid()), description (TEXT, 1–500 chars, CHECK constraint), completed (boolean default false), created_at (TIMESTAMPTZ, ISO-8601 on the wire). user_id deliberately omitted but easy to add later.
- AR-4 API design: REST under /api prefix; GET /api/todos, POST /api/todos, PATCH /api/todos/:id, DELETE /api/todos/:id, GET /api/health; uniform error envelope { error: { code, message } }; status codes 200/201/204/400/404/500/503.
- AR-5 Backend layering: routes (HTTP + Zod parse) → services (logic, throws typed errors) → repositories (SQL). Single Express error-handling middleware formats all errors. No SQL outside repositories; no req/res inside services.
- AR-6 Validation: Zod schemas (CreateTodoInput, UpdateTodoInput); description trimmed/non-empty/≤500; PATCH must include at least one field; DB CHECK as backstop (defense in depth).
- AR-7 Config: dotenv + Zod env schema validated at startup (fail-fast). Vars: NODE_ENV, PORT, DATABASE_URL, CORS_ORIGIN. Separate .env / .env.test; committed .env.example; no secrets committed.
- AR-8 Frontend data layer: typed fetch client (api.ts) that throws typed ApiError; useTodos() hook owning list + loading + error + actions; no router, no Redux/server-state lib; immutable state updates; confirm-on-response (no optimistic UI).
- AR-9 Casing boundary: snake_case in DB/SQL, camelCase in API/JSON + TS; mapping happens ONLY in the repository layer (created_at ⇄ createdAt).
- AR-10 Containerization: 3 services — frontend (multi-stage vite build → nginx stable-alpine serving static + reverse-proxying /api → backend), backend (multi-stage tsc → node, non-root user, npm ci --omit=dev), db (postgres:18.4 with named volume db-data). Health checks on all three; depends_on: service_healthy ordering db → backend → frontend; only frontend port published (8080:80).
- AR-11 One-command bring-up: `docker compose up` starts the full stack health-gated; app usable at http://localhost:8080 (NFR-6, D-5).
- AR-12 CI pipeline: .github/workflows/ci.yml runs lint + typecheck + unit/integration + e2e; docker-compose.test.yml provides an ephemeral test Postgres (migrated fresh, truncated between tests).
- AR-13 Security baseline: helmet (security headers), CORS scoped to configured origin, express.json({ limit: '16kb' }) body cap, parameterized SQL, generic client error messages (no stack traces leaked), non-root container user.
- AR-14 List ordering: server returns ORDER BY created_at DESC; client groups Active above Completed, newest-first within each group (resolves PRD Open Question 1).
- AR-15 Tooling/quality gates: ESLint + Prettier + `tsc --noEmit` (TypeScript strict) run in CI and block on violation.
```

### UX Design Requirements

*(Extracted from DESIGN.md and EXPERIENCE.md — first-class work items, each specific enough to generate a story.)*

```
UX-DR1: Design tokens — implement the full DESIGN.md token set (colors, typography ramp, spacing scale, rounded, component tokens) as :root CSS custom properties in tokens.css. Hand-authored CSS only; no UI/component library. Light mode only in v1, structured so dark mode can be added later.
UX-DR2: Add-Todo input component — input-text + primary "Add" button, full column width, Enter-to-submit, placeholder "Add a todo…", trims whitespace, rejects empty inline WITHOUT clearing the field, clears + refocuses on success, new Todo appears in Active group.
UX-DR3: Todo row component — left-to-right checkbox, Description (body), created_at (meta), edit + delete icon buttons; one accessible labeled group; action icons reveal on hover/focus at ≥md and are always visible on touch.
UX-DR4: Checkbox component — 22px, border-strong unchecked, accent fill + white check when Completed; primary completed-vs-active signal; toggles both directions.
UX-DR5: Inline edit field — in-place replacement of Description with a pre-filled input-text, row tinted accent-subtle, Save (compact primary) + Cancel (ghost); Enter saves, Esc cancels; only one Todo in edit mode at a time; no modal.
UX-DR6: Delete-confirmation dialog — centered rounded.lg card on a scrim, title "Delete this todo?", body quoting the Description, Cancel (default focus) + Delete (danger); focus-trapped, labeled by title, Esc dismisses, focus returns to a sensible element after close.
UX-DR7: Empty state component — centered display headline "No todos yet." + body subline "Add your first one above." + the add-Todo input as the single call to action; shown only after loading resolves to zero Todos.
UX-DR8: Error banner component — full-column-width banner above the list, danger-subtle background + danger-text, role="alert", with a Retry affordance that re-attempts the failed operation.
UX-DR9: Loading skeleton component — 3–5 surface-sunken placeholder rows matching the Todo-row silhouette, shown during the initial list fetch.
UX-DR10: Completed visual treatment — Completed Todos shown with checkbox fill AND strike-through Description in ink-muted (AA-legible); never rely on color alone.
UX-DR11: List grouping & re-sort — Active group renders above Completed group, newest-first within each; toggling completion re-sorts the row into the correct group immediately on confirmed response.
UX-DR12: Accessibility floor (WCAG 2.1 AA) — semantic <ul>/<li> list; programmatic labels on add field and inline-edit fields; per-item labels ("Completed: {description}" / "{description}"); aria-live="polite" region announces list changes; role="alert" on failures; focus-trapped labeled delete dialog; visible focus ring (focus-ring + offset, double-ring on accent surfaces) on every interactive element; ≥44×44px hit areas; aria-describedby links validation messages to fields; text resizable to 200% via single-column reflow.
UX-DR13: Responsive layout — single centered column at container-max 640px with 16px page-margin; ≥md shows add input + button on one line and hover/focus-revealed row icons; <md fills width, always-visible row icons, 16px input font to prevent mobile zoom; same surface reflows (no desktop/mobile-exclusive layout).
UX-DR14: Voice & tone microcopy — exact user-facing strings: add placeholder "Add a todo…", empty "No todos yet. Add your first one above.", empty validation "Enter some text first.", load failure "Couldn't load your todos. Retry.", save/create failure "Couldn't save that change. Retry.", delete confirm "Delete this todo? This can't be undone.", completed a11y label "Completed: {description}". Plain, calm, never cute/celebratory/blaming. "todo" lowercase in copy.
UX-DR15: Interaction primitives & in-flight feedback — keyboard: Enter (add/save), Esc (cancel), Space/Enter (toggle focused checkbox), Tab/Shift+Tab reading order; delete dialog default focus on Cancel; confirm-on-response model with a subtle ~100–150ms busy/disabled affordance on in-flight controls (checkbox/Save/Delete) and debounce against double-submit; banned: optimistic UI diverging from persisted state, drag-reorder, multi-select, multiple edit modes, modal stacking.
```

### FR Coverage Map

```
FR-1 View list      → Epic 1 (loading/empty states) + Epic 2 (populated list)
FR-2 Create         → Epic 2 (AddTodoForm + POST /api/todos)
FR-3 Complete toggle→ Epic 2 (checkbox + PATCH /api/todos/:id)
FR-4 Edit           → Epic 2 (inline edit + PATCH /api/todos/:id)
FR-5 Delete         → Epic 2 (DeleteDialog + DELETE /api/todos/:id)
FR-6 Persistence    → Epic 1 (DB/volume/repo foundation) + Epic 3 (restart-survival verified)
FR-7 CRUD API       → Epic 1 (GET + health) + Epic 2 (POST/PATCH/DELETE)
```

## Epic List

### Epic 1: Runnable Foundation & Walking Skeleton
One-command-runnable full-stack app: scaffold repo + test harness/CI, backend foundation (DB schema, migration runner, repository, API skeleton), 3-container Docker Compose, design tokens, and an end-to-end empty-list slice. QA infrastructure established here so testing runs from the first commit. *(4 stories)*
**FRs covered:** FR-1 (loading/empty), FR-6 (foundation), FR-7 (GET + health) · **NFRs:** NFR-6, NFR-7

### Epic 2: The Complete Todo Experience
Full usable product: view populated list, create, update (complete/un-complete + edit), delete — each a vertical slice (route + service + repository + component) with UX states, accessibility semantics, error handling, and tests built into the story. *(5 stories)*
**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-7 · **NFRs:** NFR-1, NFR-2, NFR-3, NFR-4

### Epic 3: Quality, Accessibility & Reliability Verification
Prove the bar: ≥5 passing Playwright E2E tests + ≥70% coverage gate enforced in CI, WCAG 2.1 AA audit → zero critical violations, security review of baseline hardening. *(3 stories)*
**FRs covered:** verifies FR-1–FR-7, FR-6 (restart) · **NFRs:** NFR-2, NFR-3, NFR-5, NFR-7

### Epic 4: Deliverable Documentation & Reporting
Each hand-off artifact as a story: README, QA report + coverage evidence, accessibility + security reports, AI integration log. *(4 stories)*
**FRs covered:** none new (documents the whole product) · **Deliverables:** D-6 (README), D-7 (QA report + coverage), D-8 (accessibility report), D-9 (security review), D-10 (AI integration log)

---

## Epic 1: Runnable Foundation & Walking Skeleton

One-command-runnable full-stack app with QA infrastructure from the first commit, ending in an empty Todo List rendered end-to-end (browser → API → DB).

### Story 1.1: Scaffold repository + test harness & CI

As a developer, I want the repo scaffolded with test runners and CI from the start, so that all later work has a consistent home and QA runs from the first commit.

**Goal:** Two-package repo (Vite `react-ts` frontend + minimal Express 5 TS backend) + root files, with Vitest/RTL/Playwright, ESLint+Prettier, GitHub Actions CI, and `docker-compose.test.yml`.

**Acceptance Criteria:**
- **Given** a clean clone, **When** scaffold commands run, **Then** `frontend/` (Vite react-ts, TS strict) and `backend/` (Express 5, deps, strict tsconfig) exist with the folder skeleton + root placeholders (`docker-compose.yml`, `docker-compose.test.yml`, `.env.example`, `.gitignore`, `README.md`).
- **Given** each package, **When** `npm test` runs, **Then** Vitest executes (trivial passing test) and reports.
- **Given** a push/PR, **When** CI runs, **Then** lint + `tsc --noEmit` + unit/integration + e2e stages run and block on failure.
- **Given** integration/E2E tooling, **When** invoked, **Then** `docker-compose.test.yml` provides a fresh-migrated ephemeral Postgres and a sample Playwright test passes.
- **Given** the test-first discipline, **When** any subsequent story is implemented, **Then** its tests are written first (red) and the code makes them green, with tests and code landing in the same change (enforced via review of commit/PR history).

**Implementation tasks:**
- `npm create vite@latest frontend -- --template react-ts`; backend `npm init` + deps (`express pg zod cors helmet morgan dotenv` + dev `typescript tsx vitest supertest @types/*`); strict tsconfigs; folder skeleton + root placeholders.
- Vitest configs (backend; frontend jsdom+RTL); `e2e/` + `playwright.config.ts`; ESLint+Prettier; `.github/workflows/ci.yml`; `docker-compose.test.yml`; trivial passing test at each level.

**Test expectations:**
- `tsc --noEmit` clean in both packages; sample unit/component/e2e tests pass; CI green on the scaffold.

**QA evidence expected:**
- CI run log/URL with all stages green; typecheck/build logs (for the AI log).

**Definition of done:**
- Both packages build + typecheck clean; all four runners execute; CI green; structure matches architecture; committed.

### Story 1.2: Backend foundation (DB, migrations, repository, API skeleton)

As a developer, I want automatic schema setup, isolated data access, and a stable list/health API, so that the frontend and tests build on a durable base with a uniform error contract.

**Goal:** `migrations/001_create_todos.sql` + startup runner with `_migrations` ledger; shared `pg.Pool`; `todoRepository` (list + casing map); Zod fail-fast env; app middleware (helmet/cors/json-limit/morgan); error-envelope middleware; `GET /api/health`; `GET /api/todos`.

**Acceptance Criteria:**
- **Given** a fresh DB, **When** the backend starts, **Then** the runner applies `001` and records it (idempotent on re-run); `todos` has `id UUID gen_random_uuid()`, `description` 1–500 `CHECK`, `completed` bool default false, `created_at TIMESTAMPTZ`, and `idx_todos_created_at`.
- **Given** missing/invalid env, **When** the backend starts, **Then** it fails fast with a clear message.
- **Given** `GET /api/health`, **When** the DB is reachable, **Then** `200 {status:"ok",db:"up"}`; when down, `503`.
- **Given** `GET /api/todos`, **When** called, **Then** `200 Todo[]` (empty on fresh DB), `camelCase` (`createdAt`), newest-first; any thrown typed error → `{error:{code,message}}` with correct status and no stack leaked.

**Implementation tasks:**
- Migration SQL; `db/migrate.ts`; `db/pool.ts`; `repositories/todo.repository.ts` (list + mapping); `config/env.ts` (Zod); `app.ts`; `routes/health.routes.ts` + `routes/todo.routes.ts` (GET); `middleware/errorHandler.ts`; `errors/AppError.ts`; health `SELECT 1`.

**Test expectations:**
- Integration (ephemeral DB): migration idempotency, `list()` mapped + ordered, health 200/503, `GET /api/todos` `[]`, error-envelope shape. Unit: env fail-fast.

**QA evidence expected:**
- Supertest output; `_migrations` ledger query log; `curl` of health + todos.

**Definition of done:**
- Migrations idempotent; endpoints match the contract; error envelope consistent; tests green.

### Story 1.3: One-command Docker Compose bring-up

As a user/operator, I want `docker compose up` to start the whole stack, so that the app is usable with a single command.

**Goal:** Dockerfiles (backend multi-stage non-root; frontend multi-stage `vite build` → nginx serving static + reverse-proxying `/api`), `docker-compose.yml` (3 services, health-gated, named volume).

**Acceptance Criteria:**
- **Given** Docker installed, **When** I run `docker compose up`, **Then** db → backend → frontend start in health-gated order and the app is reachable at `http://localhost:8080`.
- **Given** the running stack, **When** the browser calls `/api/*`, **Then** nginx reverse-proxies to the backend (one origin, no runtime CORS).
- **Given** a db restart, **When** the backend reconnects, **Then** health returns to ok and data persists (named volume).
- **Given** the backend image, **When** inspected, **Then** it runs as non-root `node` with prod-only deps.

**Implementation tasks:**
- `backend/Dockerfile` + `.dockerignore`; `frontend/Dockerfile` + `nginx.conf` + `.dockerignore`; `docker-compose.yml` (services, healthchecks, `db-data` volume, `8080:80`); `.env` wiring.

**Test expectations:**
- Scripted bring-up smoke; poll `/api/health`; optional compose smoke in CI.

**QA evidence expected:**
- `docker compose up` log + screenshot of app at `:8080`; health `curl`.

**Definition of done:**
- One command brings up a usable, health-gated stack reachable at `:8080`.

### Story 1.4: Frontend skeleton — tokens, shell, useTodos, loading + empty states

As the end user, I want to open the app and see it load and show a clear empty state, so that it never feels broken even before I add anything.

**Goal:** `tokens.css` (DESIGN tokens as CSS vars), single-column `App` shell, `api.ts` typed fetch client, `useTodos` hook (list/loading/error), `LoadingSkeleton` + `EmptyState` from the real `GET`.

**Acceptance Criteria:**
- **Given** app load, **When** fetching, **Then** `LoadingSkeleton` (3–5 rows) shows, resolving to `EmptyState` ("No todos yet. Add your first one above.") when zero todos.
- **Given** `tokens.css`, **When** inspected, **Then** all DESIGN.md color/type/spacing/rounded tokens exist as `:root` vars and drive layout.
- **Given** `useTodos`, **When** GET succeeds/fails, **Then** it exposes `list`/`loading`/`error` correctly (no optimistic state).
- **Given** desktop & mobile widths, **When** rendered, **Then** a single centered column ≤640px, 16px gutters, 16px input font.

**Implementation tasks:**
- `styles/tokens.css` + `app.css`; `api/api.ts` (typed fetch, `ApiError`); `hooks/useTodos.ts`; `components/LoadingSkeleton.tsx`, `EmptyState.tsx`; `App.tsx`; Vite `/api` dev proxy.

**Test expectations:**
- Component (RTL): loading → empty transition; `useTodos` states. E2E: app loads empty state via compose.

**QA evidence expected:**
- RTL output; screenshots of loading + empty states.

**Definition of done:**
- Empty/loading render end-to-end from the API; tokens in place; tests green.

---

## Epic 2: The Complete Todo Experience

Full, usable, accessible product. Each story is a vertical slice (route + service + repository + component) with UX states, accessibility, error handling, and tests built in.

### Story 2.1: Render the populated Todo List

As the end user, I want to see all my todos grouped and ordered clearly, so that I can tell active from completed work at a glance.

**Goal:** `TodoList` + `TodoItem` display, Active-above-Completed grouping (newest-first within each), completed dual signal, semantic `<ul>/<li>`.

**Acceptance Criteria:**
- **Given** todos in the DB, **When** the list loads, **Then** the Active group renders above the Completed group, newest-first within each.
- **Given** a Completed Todo, **When** rendered, **Then** the checkbox is filled accent + white check **and** the description is strike-through `ink-muted` (never color alone).
- **Given** each row, **When** inspected, **Then** it is an `<li>` labeled (`"{description}"` / `"Completed: {description}"`) with a `created_at` meta line and edit/delete icons (revealed on hover/focus ≥md, always visible <md).
- **Given** the list, **When** structure inspected, **Then** it is a real `<ul>/<li>`.

**Implementation tasks:**
- `components/TodoList.tsx`, `TodoItem.tsx`; display-only checkbox + icon buttons (actions wired in 2.3–2.4); grouping/sort util; `created_at` meta; token-based CSS.

**Test expectations:**
- Component (RTL): grouping/order, completed dual signal, semantic list, per-item labels.

**QA evidence expected:**
- RTL output; screenshot of a populated list (active + completed).

**Definition of done:**
- List renders grouped/ordered with dual completed signal + semantics; tests green.

### Story 2.2: Create a Todo

As the end user, I want to add a todo quickly, so that I can capture tasks the moment I think of them.

**Goal:** `AddTodoForm` (input + Add, Enter submit), `POST /api/todos`, Zod validation, inline empty-rejection without clearing the field, prepend to list.

**Acceptance Criteria:**
- **Given** a non-empty description, **When** I submit, **Then** a Todo is created (`completed=false`, server `id`+`createdAt`), the field clears + refocuses, and it appears in the Active group newest-first without refresh.
- **Given** empty/whitespace, **When** I submit, **Then** no Todo is created, "Enter some text first." shows inline (danger border), and the typed text is preserved.
- **Given** a description > 500 chars, **When** submitted, **Then** it is rejected (`400 VALIDATION_ERROR`).
- **Given** the API, **When** `POST /api/todos {description}`, **Then** `201 Todo`; whitespace → `400` envelope.

**Implementation tasks:**
- `schemas/todo.schema.ts` (CreateTodoInput); `service.create`; `repository.create` (INSERT … RETURNING); POST route; `AddTodoForm.tsx`; `useTodos.addTodo` (immutable prepend); `aria-describedby` on the error.

**Test expectations:**
- Unit (service rejects empty/over-long); integration (POST 201/400); component (validation, success clears + refocus).

**QA evidence expected:**
- Supertest + RTL outputs; screenshot of create + validation error.

**Definition of done:**
- Create works end-to-end with validation + persistence; tests green.

### Story 2.3: Update a Todo — complete/un-complete & edit description

As the end user, I want to check off (and uncheck) a todo and fix its wording inline, so that I can keep my list accurate without recreating items.

**Goal:** `TodoItem` checkbox toggle (`PATCH {completed}`, re-sort) **and** inline edit (`PATCH {description}`), confirm-on-response busy state, one edit at a time, validation, persistence.

**Acceptance Criteria:**
- **Given** an Active/Completed Todo, **When** I toggle the checkbox, **Then** `PATCH {completed}` flips both directions; on confirmed response the row re-sorts into the correct group with the dual signal and persists across refresh.
- **Given** a toggle in flight, **When** awaiting the server, **Then** the checkbox shows a brief busy/disabled state, is debounced, and commits only on confirmed response (no optimistic flip).
- **Given** a Todo, **When** I activate edit, **Then** the description is replaced in place by a pre-filled input (`accent-subtle` tint) with Save + Cancel; Enter/Save commits a non-empty `PATCH {description}` preserving `id`/`createdAt`/`completed` and persists; Esc/Cancel discards unchanged; only one Todo is editable at a time.
- **Given** an empty/whitespace edit, **When** I Save, **Then** it is rejected inline and the original is preserved; **Given** an unknown id, **When** `PATCH`, **Then** `404`.

**Implementation tasks:**
- `UpdateTodoInput` schema (`description?`/`completed?`, ≥1 required); `service.update`; `repository.update`; PATCH route; `TodoItem` checkbox + inline edit modes; `useTodos.toggle`/`edit` (immutable, server object); busy state; single-edit guard; keyboard handlers.

**Test expectations:**
- Unit (service update + ≥1-field rule); integration (PATCH 200/400/404 for `completed` and `description`); component (toggle re-sort + busy; edit save/cancel/empty; single-edit guard).

**QA evidence expected:**
- Supertest + RTL outputs; screenshots of toggle + edit mode.

**Definition of done:**
- Toggle + edit persist with validation, re-sort, no optimistic divergence, single-edit; tests green.

### Story 2.4: Delete a Todo with confirmation

As the end user, I want a confirm step before deleting, so that I don't lose a todo by accident.

**Goal:** Delete icon → focus-trapped `DeleteDialog` (title + quoted description, Cancel default-focus + Delete), `DELETE /api/todos/:id`, row removed.

**Acceptance Criteria:**
- **Given** a Todo, **When** I click delete, **Then** a confirmation dialog opens (scrim, "Delete this todo? This can't be undone.", quotes the description), focus-trapped, default focus Cancel, `Esc` cancels.
- **Given** confirm, **When** Delete is clicked, **Then** `DELETE` returns `204`, the row is removed without refresh, and it stays gone after refresh (permanent).
- **Given** cancel, **When** chosen, **Then** the dialog closes with no change and focus returns to a sensible element.
- **Given** an unknown id, **When** `DELETE`, **Then** `404` envelope.

**Implementation tasks:**
- `components/DeleteDialog.tsx` (focus trap, labeled by title); `service.delete`; `repository.delete`; DELETE route; `useTodos.remove`; focus management.

**Test expectations:**
- Integration (DELETE 204/404); component (open/confirm/cancel, focus trap, default focus).

**QA evidence expected:**
- Supertest + RTL outputs; screenshot of the dialog.

**Definition of done:**
- Delete with confirm works + permanent; focus handled; tests green.

### Story 2.5: Error handling & in-flight reliability

As the end user, I want clear, recoverable errors that never lose my input, so that the app feels trustworthy even when something fails.

**Goal:** `ErrorBanner` (`role="alert"` + Retry), load/save/delete failure handling, backend-unreachable, input preservation, in-flight busy + debounce, `aria-live="polite"` for list changes.

**Acceptance Criteria:**
- **Given** a failed list load, **When** it errors, **Then** `ErrorBanner` shows "Couldn't load your todos. Retry." (`role="alert"`) and Retry re-fetches.
- **Given** a failed create/save/toggle/delete, **When** it errors, **Then** "Couldn't save that change. Retry." shows and the user's input/intent is never lost (failed create keeps typed text).
- **Given** the backend unreachable, **When** any action runs, **Then** a connection-flavored, non-destructive, retryable error shows (no silent loss).
- **Given** list changes (add/complete/delete), **When** they occur, **Then** they are announced via `aria-live="polite"`.

**Implementation tasks:**
- `components/ErrorBanner.tsx`; `useTodos` error/retry states; `api.ts` maps `ApiError` → EXPERIENCE copy; `aria-live` region; busy/debounce on controls.

**Test expectations:**
- Component (banner `role="alert"`, retry, input preserved); integration (error envelopes surfaced). Failure beat covered further by E2E (3.1).

**QA evidence expected:**
- RTL outputs; screenshot of error banner + retry.

**Definition of done:**
- All failure paths legible, non-destructive, retryable; announcements present; tests green.

---

## Epic 3: Quality, Accessibility & Reliability Verification

Prove the product meets the bar and produce the verification evidence.

### Story 3.1: E2E suite (≥5 Playwright) + coverage gate ≥70%

As a stakeholder, I want end-to-end tests of the real stack and an enforced coverage floor, so that I can trust the whole product works and meaningful testing can't silently regress.

**Goal:** ≥5 passing Playwright tests (full UJ-1 journey + persistence-across-restart + failure beat) against the compose stack in CI, plus an enforced ≥70% meaningful coverage gate with reports.

**Acceptance Criteria:**
- **Given** the running stack, **When** E2E runs, **Then** ≥5 Playwright tests pass, including: add, complete/uncomplete + re-sort, edit, delete-via-dialog, reload-persists, and backend-down → error banner + input preserved; CI waits on `/api/health` first.
- **Given** the test run, **When** coverage is computed, **Then** overall meaningful coverage is ≥70% and CI fails below threshold (Vitest thresholds set in both packages).
- **Given** gaps, **When** found, **Then** real-logic tests (services/repository/hooks/components) are added — not trivial padding.

**Implementation tasks:**
- `e2e/tests/*.spec.ts` (journey + persistence + failure); health-wait; CI e2e stage; stable selectors; Vitest v8 coverage + thresholds both packages; fill meaningful gaps; CI coverage stage + artifact upload.

**Test expectations:**
- ≥5 green deterministic Playwright tests; coverage ≥70% enforced in CI.

**QA evidence expected:**
- Playwright HTML report + CI showing ≥5 passing; coverage report (HTML/lcov) artifact + threshold pass (feeds 4.2).

**Definition of done:**
- ≥5 E2E tests pass in CI incl. persistence + failure beat; ≥70% enforced + green; reports archived.

### Story 3.2: Accessibility audit → zero critical WCAG 2.1 AA violations

As any user, including those using assistive tech, I want the app to be accessible, so that I can use every feature.

**Goal:** Automated `axe` scans + manual keyboard/screen-reader checks across all states; fix to zero critical violations.

**Acceptance Criteria:**
- **Given** each surface/state (list, empty, edit, error, delete dialog), **When** `axe` scans, **Then** zero critical/serious WCAG 2.1 AA violations.
- **Given** keyboard only, **When** navigating, **Then** all actions are reachable, focus is visible (ring + offset), the dialog is focus-trapped, and `Esc` works.
- **Given** a screen reader, **When** list changes/errors occur, **Then** `aria-live`/`role="alert"` announce them, and completion is conveyed by state + text (not color alone).
- **Given** 200% text zoom, **When** applied, **Then** no loss of function (single-column reflow).

**Implementation tasks:**
- Integrate `@axe-core/playwright` scans per state; manual keyboard + SR checklist; fix violations; document residual non-critical items.

**Test expectations:**
- Automated `axe` assertions in E2E (zero critical); documented manual checklist results.

**QA evidence expected:**
- `axe` output per state + manual checklist (feeds the accessibility report 4.3).

**Definition of done:**
- Zero critical violations; `axe` assertions in CI; evidence archived.

### Story 3.3: Security review of baseline hardening

As a stakeholder, I want the baseline security controls verified, so that there are no obvious footguns even in a local app.

**Goal:** Verify helmet headers, scoped CORS, body-size limit, parameterized SQL, no secret leakage, non-root container, error hygiene.

**Acceptance Criteria:**
- **Given** the running backend, **When** responses are inspected, **Then** helmet headers are present, `X-Powered-By` is off, and bodies > 16kb are rejected.
- **Given** the SQL paths, **When** reviewed, **Then** all queries are parameterized (no input string interpolation).
- **Given** errors, **When** triggered, **Then** no stack/internal details leak to the client (server logs only).
- **Given** the image, **When** inspected, **Then** it runs non-root with prod-only deps and no secrets committed (`.env.example` only).
- **Given** NFR-5 (extensibility), **When** reviewed, **Then** the review attests that the schema (UUID PK + reserved `user_id` path) and the routes→services→repositories layering admit a future `user` dimension (auth/multi-user) without reworking existing Todo columns or routes.

**Implementation tasks:**
- Review against AR-13; add tests for headers + body limit + error hygiene; verify Dockerfile user/deps; `npm audit`; attest the NFR-5 extensibility path against the architecture.

**Test expectations:**
- Integration tests for security headers + body limit + error hygiene; `npm audit` clean of high/critical.

**QA evidence expected:**
- Security checklist results + test output + `npm audit` (feeds the security review 4.3).

**Definition of done:**
- All baseline controls verified; tests green; evidence archived.

---

## Epic 4: Deliverable Documentation & Reporting

Each required hand-off artifact produced as a story.

### Story 4.1: README (D-6)

As a new user/operator, I want a clear README, so that I can run, test, and understand the app without help.

**Goal:** README covering run (`docker compose up`), test (all levels + coverage), architecture overview, and API summary.

**Acceptance Criteria:**
- **Given** a clean machine with Docker, **When** I follow the README, **Then** `docker compose up` brings up the app with no undocumented steps (SM-4).
- **Given** the README, **When** read, **Then** it documents how to run each test level + coverage, an architecture overview, and the `/api` endpoint table.
- **Given** prerequisites, **When** listed, **Then** tool/versions are accurate.

**Implementation tasks:**
- Write README sections: overview, prerequisites, run, test/coverage, architecture, API table, troubleshooting.

**Test expectations:**
- Doc-accuracy: README commands run verbatim succeed (manual/CI smoke).

**QA evidence expected:**
- Terminal log of a clean run following the README only.

**Definition of done:**
- README complete + commands verified; committed.

### Story 4.2: QA report + coverage evidence (D-7)

As a stakeholder, I want a consolidated QA report with coverage evidence, so that I can see what was tested, that it passed, and that the ≥70% claim is verifiable.

**Goal:** QA report (strategy, levels, results, FR/NFR traceability, defects) + coverage evidence artifact showing ≥70% meaningful coverage.

**Acceptance Criteria:**
- **Given** the test suites, **When** the report is compiled, **Then** each FR/NFR maps to its covering tests with pass/fail, plus unit/integration/component/E2E counts + outcomes; defects logged with status.
- **Given** the coverage run, **When** captured, **Then** the report shows ≥70% with a per-area breakdown reflecting meaningful logic (not padding); numbers match CI (3.1).
- **Given** SM-1 (unaided usability), **When** validated, **Then** the report records the result of an unaided walkthrough of the five core actions (create, view, complete, edit, delete) — target 5/5 completed without README/instructions.
- **Given** NFR-1 / SM-3 (responsiveness), **When** measured, **Then** the report records an observational check of UI reaction (~200ms) and typical API latency (<500ms) under normal local conditions — a dev-target observation, not a hard CI gate.

**Implementation tasks:**
- Build traceability matrix; summarize results; export coverage report + narrative; reference a11y (4.3) and security (4.3); archive artifacts.

**Test expectations:**
- Cross-checks against the actual CI run + coverage stage.

**QA evidence expected:**
- QA report doc + coverage report (HTML/lcov) linked to the CI run.

**Definition of done:**
- QA report + coverage evidence complete, traceable, ≥70%; committed.

### Story 4.3: Accessibility & security review reports (D-8 + D-9)

As a stakeholder, I want accessibility and security reports, so that the zero-critical-WCAG and security claims are documented with method and results.

**Goal:** Accessibility report (`axe` per state + manual keyboard/SR checklist + zero-critical attestation) and security review write-up (controls, method, results, residual risks).

**Acceptance Criteria:**
- **Given** the a11y audit (3.2), **When** documented, **Then** the report lists scans per surface/state with zero critical violations, plus manual results (keyboard, focus, announcements, contrast, 200% zoom).
- **Given** the security verification (3.3), **When** documented, **Then** each control (helmet, CORS, body limit, parameterized SQL, error hygiene, non-root, secrets) has method + result, and the v1 scope (local, no auth) + future hardening are noted.

**Implementation tasks:**
- Compile `axe` outputs + manual checklist into the accessibility report (note residual non-critical items); write the security review from 3.3 evidence + `npm audit`.

**Test expectations:**
- Match 3.2 and 3.3 evidence.

**QA evidence expected:**
- Accessibility report doc + security review doc.

**Definition of done:**
- Both reports complete (zero-critical attested); committed.

### Story 4.4: AI integration log (D-10)

As a stakeholder, I want a log of how AI was used, so that the BMAD lifecycle and human oversight are transparent.

**Goal:** Log of AI usage across planning + implementation — prompts/decisions, value, and human corrections.

**Acceptance Criteria:**
- **Given** the project work, **When** logged, **Then** it records AI usage per phase (PRD, UX, architecture, epics/stories, dev, QA), notable prompts/decisions, and human corrections.
- **Given** the log, **When** read, **Then** it is structured/chronological and reflects actual usage.

**Implementation tasks:**
- Compile the AI integration log doc; structure by phase; include key decisions + overrides.

**Test expectations:**
- N/A (documentation) — reviewed for completeness.

**QA evidence expected:**
- AI integration log doc.

**Definition of done:**
- Log complete + committed.
