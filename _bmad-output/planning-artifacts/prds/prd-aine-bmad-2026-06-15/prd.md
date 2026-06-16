---
title: Todo App (Training Exercise)
status: final
created: 2026-06-15
updated: 2026-06-15
---

# PRD: Todo App (Training Exercise)
*Working title — confirm.*

## 0. Document Purpose

This PRD is the implementation-ready specification for a deliberately minimal full-stack Todo web application built as a **BMAD training exercise**. Its readers are the downstream BMAD workflows that consume it: UX design, solution architecture, epics & stories, test design, and QA. It is structured Glossary-first so every workflow uses the same vocabulary; features are grouped with globally-numbered Functional Requirements (FR-N) nested beneath them so downstream artifacts can cite stable IDs; non-functional requirements are gathered cross-cuttingly; and every inferred decision is tagged inline with `[ASSUMPTION]` and indexed in §13. Technology choices (stack, database, container topology) are intentionally **not** in this PRD — they live in the companion `addendum.md` so the architecture step owns them. This PRD builds on a user-supplied high-level prose PRD; it refines that source into testable requirements rather than duplicating it.

## 1. Vision

The Todo App lets a single person manage a personal list of tasks in a way that is clear, reliable, and immediately usable — no sign-up, no onboarding, no manual. A user opens the app and sees their tasks; they can add a task, mark it done, change its wording, or remove it, and every change sticks across refreshes and across sessions. The experience should feel instantaneous and polished, with completed tasks visually distinct from active ones, and with sensible empty, loading, and error states so nothing ever feels broken.

Beneath that simplicity sits a clean full-stack foundation: a frontend, a backend exposing a small well-defined API, and durable storage — all runnable with a single command via Docker Compose, covered by automated tests, and explained in documentation. The point of the exercise is not feature richness; it is to produce something that *feels like a complete, usable product* while exercising the full BMAD lifecycle end to end.

The product is intentionally small so the engineering discipline around it (requirements, UX, architecture, tests, containerization, QA) can be the real subject of study. It is built to be extended later — multi-user, auth, prioritization — without those concerns leaking into v1.

## 2. Target User

### 2.1 Jobs To Be Done

- **As the single end user:** "When I have tasks to remember, I want to capture, see, complete, and clean up a personal list quickly, so I can trust the app as my task memory without any setup."
- **As the builder/learner (Riccardo, DevOps engineer):** "When I'm running this BMAD training exercise, I want a small but *complete* full-stack product with tests, Docker Compose, and docs, so I can practice the whole delivery lifecycle on a realistic-but-bounded scope."

### 2.2 Non-Users (v1)

- Teams or multiple collaborators sharing a list — v1 is strictly single-user, no accounts.
- Anyone needing authenticated, private, or per-user data isolation — there is no auth and no user concept persisted.

### 2.3 Key User Journeys

- **UJ-1. Sam clears the day's tasks on the couch.**
  - **Persona + context:** Sam, an individual using the app to track personal errands; no account, just opens the app. Treats it as a lightweight personal list.
  - **Entry state:** Opens the app URL in a browser (desktop or phone). No login. The app loads the existing list (or an empty state on first ever use).
  - **Path:** (1) Types "Buy groceries" into the input and adds it — it appears instantly at the top/bottom of the list. (2) Adds two more tasks the same way. (3) Taps the checkbox on "Buy groceries" — it becomes visually marked as complete. (4) Realizes a task was mistyped, edits its text inline and saves. (5) Deletes a task that's no longer relevant.
  - **Climax:** Every action reflects immediately in the list; completed items are clearly distinguished from active ones at a glance.
  - **Resolution:** Sam closes the browser. Reopening later (refresh or new session) shows exactly the same list with the same completion states — nothing was lost.
  - **Edge case:** If the backend is unreachable when Sam adds a task, the app shows a clear, non-destructive error state and Sam's typed text is not silently lost.

  *Realized by FR-1 through FR-6. Persona context is inline here; no standalone persona section is warranted for a single-operator tool.*

## 3. Glossary

- **Todo** — A single task the user wants to track. Has exactly one `description`, one `completed` status, and one `created_at` timestamp, identified by a unique `id`. The atomic unit of the app. (A Todo is sometimes called a "task" in user-facing copy, but downstream artifacts must use **Todo**.)
- **Todo List** — The complete, ordered collection of all Todos. There is exactly one Todo List in v1 (single user, no accounts).
- **Description** — The short, free-text label of a Todo. Required and non-empty.
- **Completed status** — Boolean state of a Todo: either active (not completed) or completed. Toggleable.
- **Active Todo** — A Todo whose Completed status is false.
- **Completed Todo** — A Todo whose Completed status is true.
- **Created-at** (canonical field form: `created_at`) — The timestamp recording when a Todo was first created. Immutable after creation.
- **API** — The backend HTTP interface that persists and retrieves Todos. The single source of truth for Todo data.
- **Persistence** — Durable storage of the Todo List such that all Todos and their states survive page refreshes, browser restarts, and backend restarts.

## 4. Features

### 4.1 Todo Management

**Description:** The core of the product. The user views their Todo List and performs the full lifecycle of a Todo — create, view, complete/un-complete, edit, and delete — through a fast, responsive interface. Every mutating action is sent to the API and reflected in the UI. Completed Todos are visually distinguishable from Active Todos. The list is the home screen; there is no navigation, onboarding, or auth. Realizes UJ-1.

**Functional Requirements:**

#### FR-1: View the Todo List

The user can view all existing Todos immediately upon opening the app, with no login or onboarding step. Realizes UJ-1.

**Consequences (testable):**
- On load, the app requests the full Todo List from the API and renders every Todo with its Description and Completed status.
- Active Todos and Completed Todos are visually distinguishable (e.g. strike-through / styling for Completed).
- When the Todo List is empty, a clear empty state is shown (not a blank screen).
- While the list is loading, a loading state is shown.

#### FR-2: Create a Todo

The user can create a new Todo by entering a Description and confirming. Realizes UJ-1.

**Consequences (testable):**
- Submitting a non-empty Description creates a Todo with that Description, `completed = false`, and a server-assigned `id` and `created_at`.
- The new Todo appears in the rendered Todo List without requiring a manual page refresh.
- Submitting an empty or whitespace-only Description does not create a Todo; the user is shown a clear validation message. `[ASSUMPTION: empty descriptions are rejected rather than silently accepted.]`
- The created Todo persists (see NFR Persistence) and is present after a refresh.

#### FR-3: Complete / un-complete a Todo

The user can toggle a Todo's Completed status. Realizes UJ-1.

**Consequences (testable):**
- Toggling an Active Todo sets its Completed status to true; toggling a Completed Todo sets it back to false. `[ASSUMPTION: completion is a reversible toggle, not a one-way action.]`
- The visual state updates immediately to reflect the new status.
- The new status persists across refresh and session.

#### FR-4: Edit a Todo's Description

The user can change the Description text of an existing Todo. Realizes UJ-1.

**Consequences (testable):**
- The user can enter an edit mode for a Todo, change its Description, and save.
- Saving a non-empty Description updates that Todo's Description while preserving its `id`, `created_at`, and Completed status.
- Saving an empty/whitespace-only Description is rejected with a clear message and leaves the original Description unchanged.
- The user can cancel an edit, leaving the Todo unchanged.
- The updated Description persists across refresh and session.

*Note: editing was added during PRD discovery as an intentional expansion beyond the original source (which listed only create/view/complete/delete). See §13.*

#### FR-5: Delete a Todo

The user can permanently remove a Todo from the Todo List. Realizes UJ-1.

**Consequences (testable):**
- Deleting a Todo removes it from the rendered list without a manual refresh.
- The deleted Todo is gone from Persistence and does not reappear after refresh or session restart.
- `[ASSUMPTION: deletion is immediate and permanent; no undo and no soft-delete/trash in v1.]`

#### FR-6: Persist Todos across refreshes and sessions

All Todos and their states are durably stored so the Todo List is identical after a refresh, a browser restart, or a backend restart. Realizes UJ-1.

**Consequences (testable):**
- After creating/editing/completing/deleting Todos and refreshing the page, the rendered list matches the last committed state.
- After restarting the backend service, the previously stored Todos are still retrievable via the API.
- Persistence is server-side and authoritative; the frontend holds no source-of-truth state that would be lost on reload.

**Feature-specific NFRs:**
- Mutating actions (create, toggle, edit, delete) should reflect in the UI within the responsiveness budget in §8 (NFR-1) under normal local conditions.

### 4.2 API Surface (Backend Contract)

**Description:** The backend exposes a small, well-defined HTTP API that is the single source of truth for Todo data and supports the full Todo lifecycle (list, create, update, delete). The exact transport details, paths, and payload shapes are an architecture/UX-spec concern and are sketched in `addendum.md`; this PRD fixes only the *capabilities and behaviors* the API must guarantee.

**Functional Requirements:**

#### FR-7: Provide CRUD operations over Todos

The API can list all Todos, create a Todo, update a Todo (Description and/or Completed status), and delete a Todo. Realizes FR-1 through FR-6.

**Consequences (testable):**
- There is an operation to retrieve the full Todo List.
- There is an operation to create a Todo from a Description, returning the created Todo including its server-assigned `id` and `created_at`.
- There is an operation to update an existing Todo's Description and/or Completed status by `id`.
- There is an operation to delete a Todo by `id`.
- Requests referencing a non-existent Todo `id` return a clear not-found error rather than failing silently or corrupting data. `[ASSUMPTION: a standard HTTP 404 is returned for unknown ids.]`
- Invalid input (e.g. empty Description) returns a clear validation error rather than persisting bad data. `[ASSUMPTION: validation failures return HTTP 400.]`

**Feature-specific NFRs:**
- The API contract must remain stable enough for the frontend and automated tests to depend on it (see §8 NFR-5, Maintainability).

## 5. Non-Goals (Explicit)

- **No authentication or user accounts.** There is no login, signup, password, session identity, or per-user data partitioning.
- **No multi-user or collaboration.** A single shared Todo List; no sharing, assignment, or real-time co-editing.
- **No task organization features.** No priorities, due dates/deadlines, reminders, notifications, tags, categories, sub-tasks, or search/filter beyond the single list. `[NON-GOAL for MVP]`
- **No undo / trash / archival.** Deletion is permanent.
- **We are not building a productivity suite** — the app does not aim to grow into a calendar, project manager, or note-taking tool in v1.
- **No analytics, telemetry, or accounts-based personalization.**

These are deferred capabilities, not rejected ideas — the architecture must not *prevent* adding auth/multi-user later (see §8 NFR-5), but v1 must not include them.

## 6. MVP Scope

### 6.1 In Scope

- View, create, complete/un-complete, edit, and delete Todos (FR-1–FR-5).
- Server-side durable Persistence across refreshes, sessions, and backend restarts (FR-6).
- A small well-defined CRUD API as the single source of truth (FR-7).
- Responsive UI working on desktop and mobile, with empty, loading, and error states.
- **Training deliverables (required, see §10):** frontend, backend, automated tests, Docker Compose for one-command run, and documentation.

### 6.2 Out of Scope for MVP

- Authentication, accounts, multi-user — *deferred; explicitly enabled-for-later but not built.* `[NOTE FOR PM: this is the most likely "v2" and the architecture should leave room for it.]`
- Priorities, deadlines, reminders, notifications, tags, sub-tasks — *deferred to a future iteration.*
- Undo/soft-delete, bulk actions, drag-to-reorder — *deferred; not needed to prove the core experience.*
- Offline mode / optimistic-offline sync — *out of scope; the API is authoritative and assumed reachable.*

## 7. Success Metrics

*Moderate rigor — appropriate to a training exercise. Each SM cross-references the FR(s) it validates.*

**Primary**
- **SM-1**: Unaided task completion — a first-time user, given no README or instructions, can complete all five core actions (create, view, complete, edit, delete). Target: 5/5 core actions completed unaided. Validates FR-1–FR-5.
- **SM-2**: Persistence reliability — Todo state survives refreshes, browser restarts, and backend restarts. Target: 0 data-loss occurrences across the persistence test suite. Validates FR-6, FR-7.

**Secondary**
- **SM-3**: Perceived responsiveness — under normal local conditions, mutating actions reflect in the UI within the NFR-1 budget. Validates FR-1–FR-5.
- **SM-4**: One-command bring-up — `docker compose up` starts the full stack and the app is usable, with no manual post-steps beyond what the README states. Validates §10 deliverables.

**Counter-metrics (do not optimize)**
- **SM-C1**: Feature count / scope — do **not** add features to look more complete. Counterbalances SM-1; a clean minimal scope is the goal, not breadth.
- **SM-C2**: Perceived-speed hacks that hide data loss — do **not** fake responsiveness with optimistic UI that diverges from persisted state. Counterbalances SM-3; correctness of persisted state (SM-2) wins over apparent snappiness.

## 8. Cross-Cutting NFRs

#### NFR-1: Performance / Responsiveness
Under normal local/dev conditions, interactions feel instantaneous: user actions (add, complete, edit, delete, list load) should reflect in the UI within roughly 200ms of the server response, and typical API responses should return well under ~500ms. `[ASSUMPTION: these are dev-environment targets for a single user, not production SLAs.]`

#### NFR-2: Reliability / Error handling
Both client and server handle failures gracefully without disrupting the user flow: client shows clear, non-destructive error states (e.g. API unreachable) and never silently loses the user's typed input; server validates input and returns clear error responses rather than corrupting data or crashing.

#### NFR-3: Usability / UX states
The UI is responsive across desktop and mobile, distinguishes Completed from Active Todos at a glance, and provides sensible empty, loading, and error states. No onboarding required. **Experience qualities (intent, carried from source):** the product should feel *clear, intuitive, instantaneous, and polished* — these are the qualitative bar the UX workflow should design toward, beyond the measurable budgets in NFR-1.

#### NFR-4: Data integrity / Durability
Persistence is durable and authoritative on the server side. No accepted write is lost on refresh, session change, or backend restart. Stored data remains consistent (no partial/corrupt Todos).

#### NFR-5: Maintainability / Extensibility
**Testable core:** the architecture must not preclude later addition of authentication and multi-user support — a `user` dimension can be added to the data model and API without a rewrite of existing Todo behavior. *Intent (not acceptance):* the solution should be simple to understand, deploy, and extend by future developers, with clear, conventional code organization and API contract.

#### NFR-6: Deployability
The entire stack (frontend, backend, database) runs via Docker Compose with a single command, reproducibly, on a clean machine with Docker installed. `[ASSUMPTION: target is local/dev deployment, not a hardened production deploy.]`

#### NFR-7: Testability
The system is covered by automated tests (see §10) at a level sufficient to validate the FRs and persistence behavior; tests are runnable in a documented, repeatable way.

## 9. Acceptance Criteria (MVP "Done")

The MVP is complete when all of the following hold (these aggregate the per-FR testable consequences above):

1. **Core actions work end-to-end:** a user can view, create, complete/un-complete, edit, and delete Todos through the UI, each backed by the API (FR-1–FR-5, FR-7).
2. **Validation:** empty/whitespace-only Descriptions are rejected on both create and edit, with a clear message; no invalid Todo is persisted (FR-2, FR-4, FR-7).
3. **Persistence:** after any sequence of actions, a page refresh, a browser restart, and a backend container restart all yield the same Todo List and states; zero data loss (FR-6, NFR-4).
4. **UX states:** empty, loading, and error states are present and correct; Completed vs Active Todos are visually distinct; layout is usable on desktop and mobile (NFR-3).
5. **Error handling:** with the backend unreachable, the UI shows a clear error and does not lose the user's input; the server returns clear errors for not-found and invalid requests (NFR-2).
6. **One-command run:** `docker compose up` brings up frontend + backend + database and the app is usable per the README (NFR-6, §10).
7. **Tests pass:** the automated test suite covers the FRs and persistence and passes in a documented way (NFR-7, §10).
8. **Docs:** documentation explains how to run, test, and understand the app (§10).

## 10. Training Deliverables

*This product carries a concern the standard template does not name: it exists to produce a defined set of BMAD training artifacts. These are required outputs, tracked here so downstream workflows treat them as first-class.*

- **D-1 Frontend** — the responsive Todo UI implementing FR-1–FR-5 with all UX states (NFR-3).
- **D-2 Backend** — the API implementing FR-7 and owning Persistence (FR-6).
- **D-3 Persistence layer** — durable storage service (NFR-4). *(Mechanism in `addendum.md`.)*
- **D-4 Automated tests** — covering FRs and persistence (NFR-7). *(Scope/levels — unit vs integration vs e2e — to be set by the test-design workflow.)* `[ASSUMPTION: at minimum backend API/integration tests plus a smoke-level frontend test; exact mix deferred to bmad-testarch.]`
- **D-5 Docker Compose** — one-command bring-up of the full stack (NFR-6).
- **D-6 Documentation** — README covering run, test, architecture overview, and API summary.
- **D-7 QA report + coverage evidence** — consolidated QA report (strategy, levels, FR/NFR traceability, results, defects) plus coverage evidence demonstrating the ≥70% target (NFR-7). *(Realized by Epic 4.)*
- **D-8 Accessibility report** — `axe`-per-state results + manual keyboard/screen-reader checklist attesting zero critical WCAG 2.1 AA violations (NFR-3). *(Realized by Epic 4.)*
- **D-9 Security review** — write-up of the baseline controls (helmet, scoped CORS, body-size limit, parameterized SQL, error hygiene, non-root container, secrets handling), method, results, and residual risks (§11). *(Realized by Epic 4.)*
- **D-10 AI integration log** — record of AI usage across the BMAD lifecycle (planning + implementation), notable prompts/decisions, value, and human corrections. *(Realized by Epic 4.)*

## 11. Constraints and Guardrails

- **Single user, no auth:** no credentials are stored or transmitted; there is no private data isolation because there are no accounts. Anyone with access to the running instance has full access to the one Todo List — acceptable because this is a local training exercise. `[ASSUMPTION: not exposed to the public internet; no security hardening beyond basic input validation is required for v1.]`
- **Scope guardrail:** new task-management features are out of bounds for v1 (see §5); proposals belong in a future iteration, not this delivery.

## 12. Open Questions

1. **Ordering of the Todo List** — should Todos be ordered by `created_at` (newest first or oldest first), or by Completed status (active on top)? *Default assumed: stable order by `created_at`; confirm direction.* `[ASSUMPTION]`
2. **Description length limits** — is there a maximum Description length the API should enforce? *Default assumed: a generous cap (e.g. ~500 chars); confirm.* `[ASSUMPTION]`
3. **Edit timestamp** — should an `updated_at` be tracked given editing is in scope? *Currently excluded per the "minimal fields" decision; flag if QA/UX needs it.*
4. **Concurrency** — single user is assumed, but should the API tolerate two open tabs editing the same Todo? *Default assumed: last-write-wins, no conflict handling in v1.* `[ASSUMPTION]`
5. **Test coverage targets / levels** — exact unit/integration/e2e split and any coverage threshold are deferred to the test-design workflow (D-4).

## 13. Assumptions Index

*Every `[ASSUMPTION]` and notable inferred decision, surfaced for explicit confirmation:*

- §4.1 FR-2 — Empty/whitespace-only Descriptions are rejected (not silently accepted).
- §4.1 FR-3 — Completion is a reversible toggle, not one-way.
- §4.1 FR-5 — Deletion is immediate and permanent; no undo/soft-delete in v1.
- §4.2 FR-7 — Unknown Todo `id` returns HTTP 404; invalid input returns HTTP 400.
- §8 NFR-1 — Performance numbers are single-user dev-environment targets, not production SLAs.
- §8 NFR-6 — Deployment target is local/dev via Docker Compose, not a hardened production deploy.
- §10 D-4 — Minimum test scope is backend API/integration tests plus a frontend smoke test; full mix deferred to bmad-testarch.
- §11 — Instance is not publicly exposed; no auth/security hardening beyond input validation in v1.
- §12 — Defaults assumed for list ordering, Description length cap, and last-write-wins concurrency.
- **Scope expansion (confirmed, not an assumption):** editing a Todo's Description (FR-4) was added beyond the original source's create/view/complete/delete list, per the user's Fast-path decision.
- **Decision (not an assumption):** Todo fields are minimal — `id`, `description`, `completed`, `created_at` (no `updated_at`).
