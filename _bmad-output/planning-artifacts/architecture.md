---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-aine-bmad-2026-06-15/prd.md
  - _bmad-output/planning-artifacts/prds/prd-aine-bmad-2026-06-15/addendum.md
  - _bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/EXPERIENCE.md
workflowType: 'architecture'
project_name: 'aine-bmad'
user_name: 'Riccardo'
date: '2026-06-16'
lastStep: 8
status: 'complete'
completedAt: '2026-06-16'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
Seven FRs across two groups. FR-1–FR-6 (Todo Management) are the user-facing
lifecycle: view, create, complete/un-complete, edit, delete, and durable
persistence. FR-7 (API Surface) is the backend CRUD contract that realizes them.
Architecturally this is a single entity (`Todo`) and a single collection (one
Todo List) — a deliberately minimal domain. There is no auth, no routing, no
multi-entity relationships in v1.

**Non-Functional Requirements:**
- NFR-1 Performance: single-user dev targets (~200ms UI reaction, <500ms API).
- NFR-2 Reliability: clear, non-destructive error states; never lose user input.
  Drives a consistent error-response contract.
- NFR-3 Usability: responsive desktop/mobile; empty/loading/error states; WCAG AA.
- NFR-4 Data integrity: server-side Postgres is authoritative and durable.
- NFR-5 Maintainability/Extensibility: data model + API must admit a future
  `user` dimension (auth/multi-user) without a rewrite.
- NFR-6 Deployability: full stack via `docker compose up`, one command.
- NFR-7 Testability: automated tests (unit, integration, E2E) from day one.

**Scale & Complexity:**
- Primary domain: full-stack web (React SPA + Node/Express REST API + Postgres).
- Complexity level: low (by design — a bounded scope to exercise full lifecycle).
- Estimated architectural components: 3 deployable services (frontend, backend,
  db) + within-backend layers (routes → service → data access).

### Technical Constraints & Dependencies

- Stack fixed by PRD addendum (starting decisions, revisitable here): React +
  TypeScript frontend; Node.js + Express + TypeScript backend; PostgreSQL.
- Docker Compose 3-container topology with a named volume for db durability.
- From-scratch CSS design tokens (no UI component library) per DESIGN.md.
- No client-side routing (single surface + one modal) per EXPERIENCE.md.
- Confirm-on-response model: no optimistic UI that can diverge from persisted
  state (PRD SM-C2, EXPERIENCE State Patterns).

### Cross-Cutting Concerns Identified

- Persistence & durability across refresh/session/backend restart (FR-6, NFR-4).
- Uniform error-handling contract shared by frontend and backend (NFR-2).
- Accessibility floor: WCAG 2.1 AA (semantic list, aria-live, role="alert",
  focus trap, visible focus rings) (NFR-3, EXPERIENCE Accessibility Floor).
- Environment-based configuration for dev/test (DB connection, ports, CORS).
- Containerization & health checks for reliable one-command bring-up (NFR-6).
- Testability across unit/integration/E2E layers (NFR-7).
- Future-proofing for a `user` dimension without rewrite (NFR-5).

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web: React SPA frontend + Node/Express REST API + PostgreSQL, deployed
via Docker Compose. Stack fixed by the PRD addendum and confirmed here.

### Starter Options Considered

- **Frontend — Vite `react-ts` template (SELECTED):** Official, actively
  maintained (`create-vite` 9.0.7, May 2026). Scaffolds React 19.2 + TypeScript
  6.0 with a fast dev server and HMR (Hot Module Replacement = code changes
  appear in the browser without a full reload). Minimal and unopinionated — fits
  the "from-scratch CSS tokens, no UI library" DESIGN.md constraint.
- **Frontend — Next.js / Remix (rejected):** Full-stack React frameworks. Add
  server-side rendering and routing the PRD explicitly does not need (single
  surface, no routing). Overkill for a training SPA.
- **Backend — hand-built Express 5 + TS (SELECTED):** ~6 explicit dependencies,
  nothing hidden. Express 5 natively handles async errors. Best learning value
  for a small 1-entity CRUD API.
- **Backend — NestJS (rejected):** Powerful but heavy (decorators, DI, modules);
  a steep concept load that dwarfs a single-entity API.
- **Backend — Express boilerplates (rejected):** Ship auth/logging/module
  scaffolding that would need removing — net more confusing than building minimal.

### Selected Foundation: Vite `react-ts` (frontend) + minimal Express 5 (backend)

**Rationale for Selection:**
Matches the fixed stack, honors the UX "no UI library" constraint, keeps the
backend transparent for learning, and supports a clean Docker Compose topology.
Repository is a simple two-folder layout (`frontend/`, `backend/`) plus a root
`docker-compose.yml` — no heavyweight monorepo tooling.

**Initialization Commands:**

```bash
# Frontend (run from repo root)
npm create vite@latest frontend -- --template react-ts

# Backend (run from repo root)
mkdir backend && cd backend && npm init -y
npm install express pg zod cors helmet morgan dotenv
npm install -D typescript tsx @types/node @types/express @types/cors \
  @types/morgan vitest supertest @types/supertest
npx tsc --init
```

**Architectural Decisions Provided by the Foundation:**

**Language & Runtime:**
- Frontend: React 19.2 + TypeScript 6.0 on Vite; Node 20.19+/22.12+ to build.
- Backend: Node 24 LTS + Express 5 + TypeScript; `tsx` for dev hot-reload,
  `tsc` to compile to `dist/` for the production container.

**Styling Solution:**
- Hand-authored CSS with the DESIGN.md tokens expressed as CSS custom properties
  (`:root { --accent: #2563EB; ... }`). No Tailwind, no component library.

**Build Tooling:**
- Frontend: `vite build` (with `tsc --noEmit` typecheck) → static assets.
- Backend: `tsc` → `dist/`, run with `node`.

**Testing Framework:**
- Vitest 4.x for backend unit + integration (with Supertest for HTTP-level API
  tests) and frontend component tests (with React Testing Library).
- Playwright 1.61 for end-to-end browser tests of the core user journey.

**Code Organization:**
- Two-folder repo: `frontend/`, `backend/`, plus root `docker-compose.yml`,
  `.env` files, and README.
- Backend uses a layered structure (routes → service → data-access) finalized in
  the next step.

**Development Experience:**
- Vite HMR for instant frontend feedback; `tsx watch` for backend auto-restart.
- TypeScript strict mode across both for compile-time safety.

**Note:** Scaffolding the repo with these commands should be the first
implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data access via raw `pg` driver with an isolated repository module (D1)
- Startup SQL migration runner with a `_migrations` ledger table (D2)
- UUID primary keys via `gen_random_uuid()` (D3)
- REST API under `/api` prefix with uniform JSON error contract (D5, D6)
- Frontend data layer: typed `fetch` client + `useTodos` hook, no server-state lib (D7)
- nginx serves static frontend and reverse-proxies `/api` to backend (D8)
- Zod-validated, fail-fast environment configuration (D9)

**Important Decisions (Shape Architecture):**
- Baseline security: helmet, scoped CORS, body-size limit, parameterized SQL (D4)
- Description capped at 500 chars in Zod + DB (D10)
- List ordering: server `ORDER BY created_at DESC`, client groups active/completed (D11)

**Deferred Decisions (Post-MVP):**
- Authentication / multi-user `user_id` dimension (enabled-for-later, not built)
- TanStack Query adoption (documented upgrade path if app grows)
- Dark mode (token structure already supports it)

### Data Architecture

- **Driver:** node-postgres `pg` 8.21.0. All SQL lives in a single
  `todoRepository` module using parameterized queries (`$1, $2 …`) — no string
  concatenation, so SQL injection is structurally prevented.
- **Connection pooling:** a single `pg.Pool` shared by the process (a pool keeps
  a few DB connections open and reuses them — faster and safer than reconnecting
  per request).
- **Migrations:** versioned files in `backend/migrations/NNN_*.sql`, applied at
  backend startup by a small runner that records applied files in a
  `_migrations` table. Idempotent and reproducible across restarts/volumes.
- **Primary key:** `id UUID DEFAULT gen_random_uuid()`. Non-enumerable; eases the
  future `user` dimension (NFR-5).
- **Validation:** Zod schema on input; `description` non-empty, trimmed, ≤ 500
  chars, mirrored by the DB column type/constraint.

### Authentication & Security

- No authentication in v1 (PRD §5). Instance assumed not publicly exposed (§11).
- Baseline hardening: `helmet` (security headers), `cors` restricted to the
  configured frontend origin, `express.json({ limit: '16kb' })` body cap,
  Zod validation on all writes, parameterized SQL throughout.
- Extensibility: schema/API shaped to admit a `user_id` column + auth middleware
  later without reworking existing Todo columns or routes (NFR-5).

### API & Communication Patterns

- REST, JSON, all under `/api`:
  - `GET /api/todos` — list (ordered newest-first)
  - `POST /api/todos` — create from `{ description }`
  - `PATCH /api/todos/:id` — update `description` and/or `completed`
  - `DELETE /api/todos/:id` — delete
  - `GET /api/health` — liveness/readiness probe
- Uniform error body: `{ "error": { "code": string, "message": string } }`.
  Status mapping: 400 validation, 404 unknown id, 500 unexpected. A single
  Express 5 error-handling middleware (last in the chain) formats all errors.
- Timestamps serialized as ISO-8601 UTC strings.
- Layering: route (HTTP + Zod parse) → service (orchestration) → repository (SQL).

### Frontend Architecture

- React 19.2 + TypeScript 6.0 (Vite). No router (single surface), no Redux.
- Data layer: `api.ts` typed `fetch` wrappers + a `useTodos()` hook owning the
  list, `loading`, and `error` state. Confirm-on-response model — UI commits only
  after the server confirms (PRD SM-C2; EXPERIENCE State Patterns).
- Styling: hand-authored CSS; DESIGN.md tokens as `:root` CSS custom properties.
- Component shape: `App` → `AddTodoForm`, `TodoList` → `TodoItem` (+ inline edit),
  `DeleteDialog`, `ErrorBanner`, `EmptyState`, `LoadingSkeleton`.
- Documented upgrade path: adopt TanStack Query 5.x if/when caching, background
  refetch, or shared server-state across many components becomes warranted.

### Infrastructure & Deployment

- Three containers (frontend, backend, db); see Docker topology section.
- **frontend** container: multi-stage build → `vite build` static assets served
  by nginx `stable-alpine` (1.30.2). nginx reverse-proxies `/api/*` to `backend`,
  so the browser sees one origin (no runtime CORS).
- **Local dev:** Vite dev server proxies `/api` to backend; backend CORS enabled
  as fallback for non-proxied setups.
- **Config:** `dotenv` + Zod env schema validated at startup (fail-fast). Vars:
  `NODE_ENV`, `PORT`, `DATABASE_URL`, `CORS_ORIGIN`. Separate `.env` (dev/compose)
  and `.env.test` (integration tests). No secrets committed; `.env.example` shipped.

### Decision Impact Analysis

**Implementation Sequence:**
1. Scaffold repo (frontend Vite app, backend Express skeleton, compose files).
2. DB schema + migration runner; `pg` pool + repository.
3. Backend service + routes + Zod validation + error middleware + `/api/health`.
4. Frontend api client + `useTodos` + components + CSS tokens + states.
5. nginx config + Dockerfiles + docker-compose wiring + health checks.
6. Tests across unit/integration/E2E (see Testing strategy section).

**Cross-Component Dependencies:**
- API error contract (D6) is consumed by the frontend error states (NFR-2).
- `/api` prefix (D5) is required by the nginx proxy (D8) and Vite dev proxy.
- UUID + reserved `user` dimension (D3, D4) underpin the NFR-5 extensibility goal.
- Env schema (D9) gates startup for both backend and the migration runner.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** naming (DB, API, code), project/file
structure, API response & error formats, JSON casing, state-update style, error
handling, and loading/async patterns — all locked below.

### Naming Patterns

**Database Naming Conventions:**
- Tables: plural, `snake_case` → `todos`, `_migrations`.
  (`snake_case` = lowercase words joined by underscores — the SQL norm.)
- Columns: `snake_case` → `id`, `description`, `completed`, `created_at`.
- Primary key: always `id` (UUID). Future foreign keys: `<entity>_id` → `user_id`.
- Indexes: `idx_<table>_<column>` → `idx_todos_created_at`.

**API Naming Conventions:**
- Resource paths: plural nouns under `/api` → `/api/todos`, `/api/todos/:id`.
- Route params: Express `:id` style.
- JSON body fields: `camelCase` → `description`, `completed`, `createdAt`.
  (`camelCase` = first word lowercase, later words capitalized — the JS/TS norm.)
- **Casing boundary rule:** the DB uses `snake_case`; the API/JSON uses
  `camelCase`. The repository layer is the single place that maps between them
  (`created_at` ⇄ `createdAt`). No `snake_case` ever leaks into frontend code.

**Code Naming Conventions:**
- React components: `PascalCase` files and names → `TodoItem.tsx` exports `TodoItem`.
  (`PascalCase` = every word capitalized.)
- Hooks: `camelCase` starting with `use` → `useTodos.ts`.
- Non-component TS files: `camelCase` → `api.ts`, `todoService.ts`, `env.ts`.
- Functions/variables: `camelCase`; types/interfaces: `PascalCase` (`Todo`,
  `CreateTodoInput`); constants: `UPPER_SNAKE_CASE`.

### Structure Patterns

**Project Organization:**
- Two-package repo: `frontend/` and `backend/`, root holds compose + docs.
- Backend layered by responsibility: `routes/ → services/ → repositories/`,
  plus `db/`, `config/`, `middleware/`, `schemas/` (Zod), `types/`.
- Frontend organized by type for this small app: `components/`, `hooks/`,
  `api/`, `types/`, `styles/`.

**File Structure Patterns:**
- Tests co-located as `*.test.ts(x)` next to the unit under test; E2E tests in a
  top-level `e2e/` folder. (Co-located = test sits beside the file it tests.)
- One React component per file; the component name matches the file name.
- Env files at each package root: `.env`, `.env.test`, committed `.env.example`.

### Format Patterns

**API Response Formats:**
- Success returns the resource directly (no envelope): a `Todo` object, or an
  array of `Todo` for the list. (An "envelope" = wrapping data in `{ data: ... }`;
  we skip it for simplicity.)
- Errors always use one envelope: `{ "error": { "code": string, "message": string } }`.
- Status codes: 200 read/update, 201 create, 204 delete (empty body), 400
  validation, 404 not found, 500 unexpected.

**Data Exchange Formats:**
- JSON field casing: `camelCase` everywhere on the wire.
- Dates: ISO-8601 UTC strings (e.g. `2026-06-16T12:00:00.000Z`).
- Booleans: real JSON `true`/`false` (never `1`/`0`).
- `id` is always a UUID string.

### Communication Patterns

**Event System Patterns:**
- None in v1 — no message bus, queue, or websockets. All interaction is
  synchronous request/response over the REST API. (Recorded so no agent invents
  an event layer.)

**State Management Patterns:**
- Frontend state is **immutable**: always produce new arrays/objects
  (`setTodos(prev => prev.map(...))`), never mutate in place. (Immutable update =
  replace rather than edit existing state, so React reliably re-renders.)
- Server is the source of truth; after any successful mutation the UI uses the
  server's returned object. No optimistic updates (PRD SM-C2).
- Loading/error state lives in the `useTodos` hook; components receive it as props
  or via the hook — no global store.

### Process Patterns

**Error Handling Patterns:**
- Backend: services throw typed errors (`ValidationError`, `NotFoundError`); the
  single Express error middleware maps them to the status + error envelope. Route
  handlers never format errors themselves.
- Frontend: the `api.ts` client throws a typed `ApiError` on non-2xx; `useTodos`
  catches it and sets user-facing error state. User messages come from
  EXPERIENCE.md Voice & Tone (e.g. "Couldn't save that change. Retry."), never
  raw server text.
- Logging: backend uses `morgan` for HTTP request logs; unexpected 500s are
  logged server-side with the real cause, but the client only sees a generic
  safe message (no internal details leaked).

**Loading State Patterns:**
- Three explicit UI states everywhere data is fetched: loading, error, success
  (plus empty as a success sub-state). No silent blank screens (NFR-3).
- In-flight controls (checkbox/Save/Delete) show a brief busy/disabled state and
  are debounced against double-submit. (Debounce = ignore rapid repeat clicks.)

### Enforcement Guidelines

**All AI Agents (and developers) MUST:**
- Use `snake_case` in SQL/DB and `camelCase` in API/JSON & TS; map only in the
  repository layer.
- Return errors only via the `{ error: { code, message } }` envelope with correct
  status codes.
- Keep the layer boundaries: routes do HTTP + Zod parsing, services do logic,
  repositories do SQL. No SQL outside repositories; no `req`/`res` inside services.
- Validate all writes with Zod before they reach a service.
- Never use optimistic UI; commit only on confirmed server response.
- Use parameterized SQL exclusively (no string interpolation of user input).

**Pattern Enforcement:**
- ESLint + Prettier (formatting/lint) and `tsc --noEmit` (type check) run in CI
  and block on violation. TypeScript strict mode is on in both packages.
- Pattern changes are made here in the architecture doc first, then in code.

### Pattern Examples

**Good Examples:**
- Repository maps casing: `SELECT id, description, completed, created_at ...` →
  returns `{ id, description, completed, createdAt }`.
- Error: `404` → `{ "error": { "code": "NOT_FOUND", "message": "Todo not found" } }`.
- Component file `TodoItem.tsx` exporting `export function TodoItem(props) {...}`.

**Anti-Patterns (do NOT do):**
- `{ "createdAt": 1718539200 }` (numeric timestamp) — use ISO strings.
- `res.status(500).json({ msg: err.stack })` — leaks internals; use the envelope.
- Building SQL with `` `... WHERE id = '${id}'` `` — injection risk; use `$1`.
- `todos.push(newTodo)` on React state — mutates; use immutable update.
- Optimistically flipping a checkbox before the server confirms.

## Project Structure & Boundaries

### Complete Project Directory Structure

```
aine-bmad/                          # repo root (one-command bring-up here)
├── README.md                       # D-6: run, test, architecture + API summary
├── docker-compose.yml              # D-5: frontend + backend + db topology
├── docker-compose.test.yml         # CI/integration override (ephemeral test DB)
├── .env.example                    # documented env vars (no secrets committed)
├── .gitignore
├── .github/
│   └── workflows/
│       └── ci.yml                  # lint + typecheck + unit/integration + e2e
│
├── backend/                        # D-2: Node 24 + Express 5 + TS API
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile                  # multi-stage: build TS -> run dist on node
│   ├── .dockerignore
│   ├── .env.example
│   ├── vitest.config.ts
│   ├── migrations/
│   │   └── 001_create_todos.sql    # schema (todos + _migrations ledger)
│   └── src/
│       ├── index.ts                # entrypoint: load+validate env, run migrations, start server
│       ├── app.ts                  # builds Express app (middleware + routes); exported for tests
│       ├── config/
│       │   └── env.ts              # Zod-validated env (fail-fast)
│       ├── db/
│       │   ├── pool.ts             # shared pg.Pool
│       │   └── migrate.ts          # startup migration runner
│       ├── schemas/
│       │   └── todo.schema.ts      # Zod: CreateTodoInput, UpdateTodoInput
│       ├── repositories/
│       │   └── todo.repository.ts  # ALL SQL; snake_case <-> camelCase mapping
│       ├── services/
│       │   └── todo.service.ts     # business logic; throws typed errors
│       ├── routes/
│       │   ├── todo.routes.ts      # /api/todos CRUD (HTTP + Zod parse)
│       │   └── health.routes.ts    # /api/health
│       ├── middleware/
│       │   └── errorHandler.ts     # maps typed errors -> error envelope
│       ├── errors/
│       │   └── AppError.ts         # ValidationError, NotFoundError, etc.
│       ├── types/
│       │   └── todo.ts             # Todo, CreateTodoInput, UpdateTodoInput
│       └── __tests__/              # (or co-located *.test.ts)
│           ├── todo.service.test.ts        # unit (mocked repo)
│           └── todo.api.test.ts            # integration (Supertest + test DB)
│
├── frontend/                       # D-1: React 19 + TS (Vite) SPA
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts              # dev proxy /api -> backend; Vitest config
│   ├── index.html
│   ├── Dockerfile                  # multi-stage: vite build -> nginx serves
│   ├── nginx.conf                  # serve static + reverse-proxy /api -> backend
│   ├── .dockerignore
│   ├── .env.example
│   └── src/
│       ├── main.tsx                # React root mount
│       ├── App.tsx                 # composes the single surface
│       ├── api/
│       │   └── api.ts              # typed fetch client; throws ApiError
│       ├── hooks/
│       │   └── useTodos.ts         # list + loading + error + actions
│       ├── components/
│       │   ├── AddTodoForm.tsx
│       │   ├── TodoList.tsx
│       │   ├── TodoItem.tsx        # display + inline edit
│       │   ├── DeleteDialog.tsx    # focus-trapped confirm modal
│       │   ├── ErrorBanner.tsx     # role="alert" + retry
│       │   ├── EmptyState.tsx
│       │   └── LoadingSkeleton.tsx
│       ├── types/
│       │   └── todo.ts             # Todo, shared with API shape
│       ├── styles/
│       │   ├── tokens.css          # DESIGN.md tokens as CSS variables
│       │   └── app.css
│       └── __tests__/
│           └── *.test.tsx          # component tests (RTL + Vitest)
│
└── e2e/                            # Playwright end-to-end tests
    ├── package.json
    ├── playwright.config.ts
    └── tests/
        └── todo-journey.spec.ts    # UJ-1 full journey + failure beats
```

### Architectural Boundaries

**API Boundaries:**
- The browser's only contract with the server is the `/api` REST surface
  (`/api/todos`, `/api/todos/:id`, `/api/health`). Nothing else is exposed.
- In the running stack, the browser talks only to nginx (one origin); nginx
  forwards `/api/*` to the backend container. The DB is never reachable from the
  browser.

**Component Boundaries (frontend):**
- `App` owns the `useTodos` hook and passes data + callbacks down to presentational
  components. Components do not call the API directly — only the hook does (via
  `api.ts`). This keeps data flow one-directional and testable.

**Service Boundaries (backend):**
- Strict layering: `routes` (HTTP + Zod) → `services` (logic) → `repositories`
  (SQL). Dependencies point downward only. Services never see `req`/`res`;
  repositories never see HTTP. The error middleware is the only place errors
  become HTTP responses.

**Data Boundaries:**
- The `repositories` layer is the sole gateway to Postgres and the only place
  `snake_case`↔`camelCase` mapping happens. No SQL anywhere else.

### Data Model

The single entity, `Todo`. Minimal fields per PRD decision (no `updated_at`),
with a `user_id` deliberately *omitted but easy to add later* (NFR-5).

`migrations/001_create_todos.sql`:

```sql
CREATE TABLE IF NOT EXISTS todos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 500),
  completed   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos (created_at DESC);
```

- `UUID` + `gen_random_uuid()` — built into Postgres (pgcrypto in core). Non-guessable id.
- `TIMESTAMPTZ` — timestamp *with time zone*, stored as UTC; serialized to ISO-8601.
- `CHECK` constraint mirrors the Zod 1–500 char rule, so the DB is a backstop even
  if a bad write slips past validation (defense in depth).
- Future extension: add `user_id UUID` + index; existing columns unchanged.

TypeScript shape (wire/`camelCase`):

```ts
interface Todo {
  id: string;            // UUID
  description: string;   // 1..500 chars
  completed: boolean;
  createdAt: string;     // ISO-8601 UTC
}
```

### API Contracts

Base URL: `/api`. All bodies JSON, `camelCase`. Errors use
`{ "error": { "code", "message" } }`.

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| GET | `/api/todos` | — | `200` `Todo[]` (newest-first) | `500` |
| POST | `/api/todos` | `{ "description": string }` | `201` `Todo` | `400` invalid |
| PATCH | `/api/todos/:id` | `{ "description"?: string, "completed"?: boolean }` | `200` `Todo` | `400`, `404` |
| DELETE | `/api/todos/:id` | — | `204` (no body) | `404` |
| GET | `/api/health` | — | `200` `{ "status": "ok", "db": "up" }` | `503` if DB down |

Examples:

```http
POST /api/todos
{ "description": "Buy groceries" }

201 Created
{ "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "description": "Buy groceries", "completed": false,
  "createdAt": "2026-06-16T10:15:00.000Z" }
```

```http
POST /api/todos
{ "description": "   " }

400 Bad Request
{ "error": { "code": "VALIDATION_ERROR", "message": "Description must not be empty." } }
```

Validation rules (Zod, `schemas/todo.schema.ts`):
- `description`: trimmed, non-empty, ≤ 500 chars (create requires it; update optional).
- `completed`: boolean (update only).
- PATCH must include at least one of `description`/`completed`, else `400`.
- Unknown `:id` → `404 { code: "NOT_FOUND" }`.

### Persistence Strategy

- **Authority:** Postgres is the single source of truth (FR-6, NFR-4). The frontend
  holds no authoritative state — every change round-trips to the API and the UI
  reflects the server's confirmed result.
- **Durability:** the `db` container writes to a **named Docker volume**, so data
  survives container restarts/recreations (a *named volume* is Docker-managed disk
  storage that outlives the container). This satisfies "survives backend restart."
- **Schema lifecycle:** the startup migration runner applies any unapplied
  `migrations/*.sql` and records them in `_migrations`. Idempotent: safe to run on
  every boot (already-applied files are skipped).
- **Connection management:** one shared `pg.Pool`; the backend waits for the DB to
  be reachable (compose health gating) before serving.

### Docker Compose Topology

Three services (D-5). A *service* in compose = one container definition.

```
┌─────────────┐      /api/*        ┌─────────────┐     SQL      ┌──────────┐
│  frontend   │  ───────────────▶  │   backend   │  ─────────▶  │    db    │
│ nginx:80    │   (reverse proxy)  │ node:8080   │   (pg pool)  │ pg:5432  │
│ static SPA  │ ◀───────────────   │ Express API │ ◀─────────   │ + volume │
└─────────────┘   browser origin   └─────────────┘              └──────────┘
       ▲
       │ http://localhost:8080  (host port published by frontend)
     browser
```

`docker-compose.yml` (shape):

```yaml
services:
  db:
    image: postgres:18.4
    environment:
      POSTGRES_USER: todo
      POSTGRES_PASSWORD: todo
      POSTGRES_DB: todo
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U todo -d todo"]
      interval: 5s
      timeout: 3s
      retries: 10

  backend:
    build: ./backend
    environment:
      NODE_ENV: production
      PORT: 8080
      DATABASE_URL: postgres://todo:todo@db:5432/todo
      CORS_ORIGIN: http://localhost:8080
    depends_on:
      db:
        condition: service_healthy        # wait until pg_isready passes
    healthcheck:
      test: ["CMD-SHELL", "node -e \"fetch('http://localhost:8080/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""]
      interval: 10s
      timeout: 3s
      retries: 5

  frontend:
    build: ./frontend
    ports:
      - "8080:80"                          # browser entrypoint
    depends_on:
      backend:
        condition: service_healthy

volumes:
  db-data:
```

- `depends_on: condition: service_healthy` makes startup ordered: db → backend →
  frontend, each waiting for the previous to be healthy. This is what makes a single
  `docker compose up` reliably work (NFR-6).
- Networking: compose puts all three on a private network; services reach each other
  by name (`db`, `backend`). Only `frontend`'s port 80 is published to the host.

### Health Checks

Health checks let Docker (and humans) know a service is actually ready, not just
"process started."

- **db:** `pg_isready` — Postgres's built-in readiness probe.
- **backend:** `GET /api/health` returns `200 { status: "ok", db: "up" }` only after
  a successful `SELECT 1` against the pool; returns `503` if the DB query fails.
  This is both a *liveness* (process up) and *readiness* (dependencies up) signal.
- **frontend:** healthy once nginx serves; depends on a healthy backend.
- Compose gates dependents on these checks; CI can poll `/api/health` before E2E.

### Testing Strategy

The classic **test pyramid** (many fast unit tests at the base, fewer integration
tests, fewest slow E2E at the top) — from day one (NFR-7, D-4).

| Level | Tooling | Scope | Examples |
|---|---|---|---|
| Unit | Vitest | Pure logic in isolation (repo mocked) | `todo.service`: rejects empty description; maps not-found to `NotFoundError` |
| Integration | Vitest + Supertest | Real Express app + real test Postgres | full CRUD over HTTP; 400/404 contracts; **persistence-across-restart** (write, reconnect pool, read) |
| Component | Vitest + React Testing Library | React components against jsdom | AddTodoForm validation; TodoItem toggle/edit; ErrorBanner role="alert" |
| E2E | Playwright | Whole stack in browser | UJ-1 journey: add → complete → edit → delete → reload persists; failure beat (backend down → error banner, input preserved) |

- **Supertest** = library that fires HTTP requests at the Express app in-process (no
  real network) for fast, realistic API tests.
- **Test DB isolation:** integration tests run against an ephemeral Postgres
  (`docker-compose.test.yml`), migrated fresh and truncated between tests, so they
  never touch dev data.
- **Determinism:** no reliance on real time/network; E2E waits on `/api/health`
  before starting. Exact coverage thresholds deferred to bmad-testarch (PRD OQ5).

### Security Considerations

Baseline for a local, single-user training app (PRD §11) — no auth, but no obvious
footguns either:

- **Input validation:** Zod on every write; DB `CHECK` as backstop (defense in depth).
- **SQL injection:** parameterized queries only (`$1, $2`); never interpolate input.
- **HTTP hardening:** `helmet` sets safe headers (e.g. disables `X-Powered-By`,
  sets `X-Content-Type-Options`); `express.json({ limit: '16kb' })` caps body size.
- **CORS:** restricted to the configured origin; in the compose stack the proxy
  makes it same-origin, so CORS isn't a runtime dependency.
- **Error hygiene:** clients get generic messages; stack traces/causes stay in
  server logs only (no internal leakage).
- **Containers:** backend image runs as the non-root `node` user; production images
  install prod-only deps (`npm ci --omit=dev`); secrets via env, never committed
  (`.env.example` documents them).
- **Extensibility:** when auth lands later, it's an Express middleware + `user_id`
  column; the boundaries above already isolate where it plugs in (NFR-5).

### Accessibility & Performance Considerations

**Accessibility (WCAG 2.1 AA — from EXPERIENCE.md, NFR-3):**
- Semantic markup: the Todo List is a real `<ul>`/`<li>`; the add field and each
  inline-edit field have programmatic labels.
- Completion conveyed by **checkbox state + strike-through text**, never color alone.
- `aria-live="polite"` region announces list changes; `role="alert"` on the error
  banner announces failures.
- Delete dialog: focus trap, labeled by title, `Esc` to dismiss, focus returns to a
  sensible element, default focus on Cancel (avoid accidental destructive confirm).
- Visible focus ring (token `focus-ring` + offset) on every interactive element;
  ≥ 44×44px hit areas; 16px input font (prevents mobile zoom); text resizes to 200%.

**Performance (NFR-1 dev targets, single user):**
- System-font stack (no web-font download) + small dependency surface → fast first paint.
- Vite production build: minified, code-split, hashed assets; nginx serves static
  with caching headers and gzip.
- Confirm-on-response with a subtle ~100–150ms busy affordance keeps perceived
  latency honest (no fake optimism that can diverge from persisted state, SM-C2).
- `idx_todos_created_at` keeps the list query fast and correctly ordered.

### Requirements to Structure Mapping

| Requirement | Lives in |
|---|---|
| FR-1 View list | `frontend` `useTodos`/`TodoList`/`EmptyState`/`LoadingSkeleton`; backend `GET /api/todos` |
| FR-2 Create | `AddTodoForm` + `useTodos`; `POST /api/todos`; `todo.schema` |
| FR-3 Complete toggle | `TodoItem` checkbox; `PATCH /api/todos/:id` |
| FR-4 Edit | `TodoItem` inline edit; `PATCH /api/todos/:id` |
| FR-5 Delete | `DeleteDialog`; `DELETE /api/todos/:id` |
| FR-6 Persistence | `db` volume + `repositories` + migrations |
| FR-7 CRUD API | `routes` + `services` + `repositories` |

**Cross-Cutting Concerns:**
- Error contract → `middleware/errorHandler.ts` (backend) + `api.ts`/`ErrorBanner` (frontend).
- Config → `config/env.ts` + `.env*` files.
- Health/deploy → Dockerfiles + `docker-compose*.yml` + `health.routes.ts`.

### Integration Points & Data Flow

**Internal Communication:** browser → nginx (`/api/*`) → Express → service →
repository → `pg.Pool` → Postgres, and back. Synchronous request/response only.

**External Integrations:** none in v1 (no third-party services).

**Data Flow (create example):** user submits text → `AddTodoForm` calls
`useTodos.addTodo` → `api.ts` `POST /api/todos` → route Zod-parses → service →
repository `INSERT ... RETURNING` → row mapped to `Todo` → `201` → hook prepends to
state immutably → list re-renders with the server's object.

### Development Workflow Integration

- **Dev:** run `db` via compose; `backend` with `tsx watch` (auto-restart on save);
  `frontend` with `vite` dev server (HMR) proxying `/api` to the backend. Fast loop.
- **Build:** backend `tsc` → `dist/`; frontend `vite build` → static assets.
  Both wrapped in multi-stage Dockerfiles (build stage + slim runtime stage).
- **Deploy (local/training):** `docker compose up --build` brings up db → backend →
  frontend, gated by health checks; app reachable at `http://localhost:8080`.

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are mutually compatible at verified current versions:
React 19.2 + TS 6.0 on Vite (frontend), Node 24 LTS + Express 5 + TS + `pg` 8.21
(backend), Postgres 18.4, nginx stable-alpine 1.30.2, Vitest 4.1 / Playwright 1.61
(tests). No version conflicts. The `/api` prefix, nginx reverse-proxy, and Vite dev
proxy all agree on the same routing contract. No contradictory decisions found.

**Pattern Consistency:**
Naming (snake_case DB / camelCase wire+TS, mapped only in the repository),
layering (routes→services→repositories), and the single error envelope are
consistent across backend and frontend. The confirm-on-response rule in patterns
matches the UX State Patterns and PRD SM-C2. No conflicting conventions.

**Structure Alignment:**
The directory tree implements every decision: repository isolates SQL, middleware
owns error formatting, `config/env.ts` enforces fail-fast config, Dockerfiles +
compose realize the 3-container topology with health gating. Boundaries map 1:1 to
folders.

### Requirements Coverage Validation ✅

**Functional Requirements Coverage:**
- FR-1 View → `GET /api/todos` + `TodoList`/`Empty`/`Loading`/`Error` states. ✅
- FR-2 Create → `POST /api/todos` + Zod validation + `AddTodoForm`. ✅
- FR-3 Toggle → `PATCH /api/todos/:id { completed }`. ✅
- FR-4 Edit → `PATCH /api/todos/:id { description }` + inline edit. ✅
- FR-5 Delete → `DELETE /api/todos/:id` + confirm dialog. ✅
- FR-6 Persistence → Postgres + named volume + repository. ✅
- FR-7 CRUD API → routes/services/repositories with 400/404 contracts. ✅

**Non-Functional Requirements Coverage:**
- NFR-1 Performance → confirm-on-response budget, indexed query, static nginx. ✅
- NFR-2 Reliability → uniform error envelope, error banner, retry, input preserved. ✅
- NFR-3 Usability/a11y → all UX states + WCAG 2.1 AA measures. ✅
- NFR-4 Data integrity → server-authoritative, DB CHECK, durable volume. ✅
- NFR-5 Maintainability/Extensibility → UUID + reserved `user_id` path, layering. ✅
- NFR-6 Deployability → `docker compose up`, health-gated ordering. ✅
- NFR-7 Testability → unit/integration/component/E2E pyramid from day one. ✅

**Training Deliverables (D-1…D-6):** frontend, backend, persistence layer,
automated tests, Docker Compose, and README documentation are all represented in
the structure and sections. ✅

### Implementation Readiness Validation ✅

**Decision Completeness:** all critical decisions documented with verified versions
and rationale; upgrade paths (TanStack Query, auth) noted as deferred.

**Structure Completeness:** complete file-level tree, explicit boundaries, data
model DDL, API contract table, and requirements→structure map provided.

**Pattern Completeness:** naming, structure, format, communication, and process
(error/loading) patterns all defined with good/anti-pattern examples.

### Gap Analysis Results

**Critical Gaps:** none.

**Important Gaps:** none blocking. Two PRD open questions are intentionally deferred,
not gaps: exact test coverage thresholds (PRD OQ5 → bmad-testarch) and the precise
in-flight busy-affordance fidelity (EXPERIENCE OQ1 → defaulted to confirm-on-response).

**Nice-to-Have (future):** request-id correlation in logs; OpenAPI spec generation;
rate limiting (only relevant if ever exposed publicly); dark-mode token set.

### Validation Issues Addressed

No coherence or coverage issues required resolution. Concurrency (two-tab edits)
follows the PRD's last-write-wins assumption (PRD OQ4) — acceptable for a
single-user training app; noted for future hardening if multi-user is added.

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION (all 16 checklist items `[x]`, no critical gaps)

**Confidence Level:** high — small, bounded scope; verified-current stack;
every FR/NFR traced to a concrete component.

**Key Strengths:**
- Tight requirements traceability (every FR/NFR maps to a file/section).
- Clean, teachable layering with strict boundaries — ideal for a DevOps learner.
- Realistic DevOps surface (multi-container, volumes, health checks, CI) at minimal complexity.
- Extensibility for auth/multi-user designed in without building it (NFR-5).

**Areas for Future Enhancement:**
- Auth + `user_id` multi-user (the likely v2).
- TanStack Query if server-state needs grow; OpenAPI docs; rate limiting; dark mode.

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented.
- Use the implementation patterns consistently across all components.
- Respect project structure and layer boundaries (no SQL outside repositories; no
  HTTP objects inside services; map casing only in repositories).
- Refer to this document for all architectural questions.

**First Implementation Priority:**
Scaffold the repo as the first story:
`npm create vite@latest frontend -- --template react-ts`, then the minimal Express
backend (`backend/`) and root `docker-compose.yml`, before implementing FR slices.
