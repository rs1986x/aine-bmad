# PRD Addendum — Todo App (Training Exercise)

Technical-how, mechanism, and downstream-depth content that earned a place but does not belong in the capability-focused PRD. The architecture workflow owns and refines everything here.

## Tech stack (decided during PRD discovery, Fast path)

- **Frontend:** React + TypeScript. Rationale: common, well-documented, good training value for a DevOps engineer building app-dev familiarity.
- **Backend:** Node.js + Express + TypeScript. Single small HTTP service exposing the CRUD API (PRD FR-7).
- **Persistence:** Dedicated **PostgreSQL** service running as its own Docker Compose container. Rationale: chosen over embedded SQLite specifically for DevOps/Docker training value (multi-container topology, service networking, volumes for durability).

*These are starting decisions, not constraints on the architect — they may be revisited in `bmad-create-architecture`. They are recorded here, not in the PRD, to keep the PRD capability-focused.*

## Suggested container topology (for the architecture step)

- `frontend` — serves the React app.
- `backend` — Node/Express API; depends on `db`.
- `db` — Postgres with a named volume for durable storage (satisfies PRD NFR-4 / FR-6 across backend restarts).
- One-command bring-up via `docker compose up` (PRD NFR-6 / deliverable D-5).

## API shape sketch (non-binding — architecture/UX-spec to finalize)

The PRD fixes capabilities (FR-7), not transport. A conventional REST mapping the team can start from:

- `GET /todos` — list all Todos (FR-1).
- `POST /todos` — create from `{ description }`; returns created Todo with `id`, `created_at`, `completed=false` (FR-2).
- `PATCH /todos/:id` — update `description` and/or `completed` (FR-3, FR-4).
- `DELETE /todos/:id` — delete (FR-5).
- Errors: `400` for validation failures (e.g. empty description), `404` for unknown `id`.

## Data model sketch

`Todo`: `id` (server-assigned), `description` (non-empty text), `completed` (boolean, default false), `created_at` (timestamp, immutable). No `updated_at` per the minimal-fields decision — revisit if QA/UX needs edit history (PRD Open Question 3).

## Testing notes (for bmad-testarch)

- Likely levels: backend API/integration tests (CRUD + validation + persistence-across-restart), plus a frontend smoke/e2e test for the core user journey UJ-1.
- Exact unit/integration/e2e split and coverage thresholds deferred to the test-design workflow (PRD D-4, Open Question 5).

## Deferred-but-enabled-later (architecture should not preclude)

- Authentication + multi-user (the most likely v2 per PRD §6.2). Data model and API should be shaped so a `user` dimension can be added without a rewrite (PRD NFR-5).
