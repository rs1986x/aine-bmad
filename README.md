# aine-bmad

A small, single-user Todo application for creating, viewing, completing,
editing, and deleting persistent todos. It is a React/TypeScript SPA backed by
an Express/TypeScript API and PostgreSQL. Version 1 is a local deployment with
no authentication or user isolation.

## Quick Start

### Prerequisites

- Docker with the Docker Compose v2 command (`docker compose`). The repository
  does not encode a minimum Docker or npm version, so none is claimed here.
- Network access on the first run so Docker can download the declared images.
- A browser.
- Port `8080` available on the host.

The Compose images are `postgres:18.4`, `node:24-alpine`, and
`nginx:stable-alpine`. The `node:24-alpine` and `nginx:stable-alpine` tags
are floating; they do not identify a fixed Node or nginx patch version.

### Run

From the repository root:

```bash
docker compose up --build
```

Compose builds the application images, starts PostgreSQL, runs backend
migrations, and starts nginx only after the database and API are healthy. When
the `frontend` service reports healthy in the logs, open
<http://localhost:8080>. nginx serves the SPA and proxies `/api` on the same
origin. No `.env` file or local Node installation is needed for this path.
This foreground command keeps its terminal occupied; use another terminal for
later commands. Ctrl+C stops the containers but leaves them created;
`docker compose down` (below) removes them without deleting todos.

> **Local-only security boundary:** Compose publishes port `8080` on the Docker
> host. On systems that expose published ports to the local network, other
> machines may reach this unauthenticated app. Use it only on a trusted network
> or restrict host/firewall access.

Stop the stack without deleting todos:

```bash
docker compose down
```

Reset the application and permanently delete its database volume:

```bash
docker compose down -v
```

## Architecture

The production Compose stack contains three health-gated services:

```text
Browser :8080
    |
    v
frontend (nginx:stable-alpine) -- /api --> backend (Node 24 + Express)
                                                |
                                                v
                                      db (PostgreSQL 18.4)
                                      named volume: db-data
```

Only nginx publishes a host port (`8080:80`). The backend and database stay on
the private Compose network. nginx serves the built React SPA and forwards the
original `/api/*` path to the backend. The database health check gates the
backend; the backend readiness check executes `SELECT 1` before nginx starts.

On every backend start, the migration runner takes a PostgreSQL advisory lock,
applies pending numbered SQL files transactionally, and records them in the
idempotent `_migrations` ledger. PostgreSQL is authoritative: the UI changes
only after a write is confirmed by the server. The `db-data` named volume
preserves todos across container and backend restarts; only `down -v` removes
it.

Backend code is layered as:

- **Routes:** HTTP handling and Zod request parsing.
- **Services:** application logic and typed errors.
- **Repositories:** all parameterized SQL and database mapping.

PostgreSQL names are `snake_case`; API and TypeScript values are `camelCase`.
That conversion is confined to the repository layer.

## API Reference

All endpoints are under `/api`. A Todo has this JSON shape:

```json
{
  "id": "0a91ef69-faf4-48d6-9374-29982a7c59af",
  "description": "Read the operator guide",
  "completed": false,
  "createdAt": "2026-08-31T07:00:00.000Z"
}
```

Descriptions are trimmed and must contain 1–500 characters. IDs and optional
`Idempotency-Key` request headers are UUIDs.

| Method | Path | Request | Success |
| --- | --- | --- | --- |
| `GET` | `/api/health` | — | `200 {"status":"ok","db":"up"}` |
| `GET` | `/api/todos` | — | `200 Todo[]`, newest first |
| `POST` | `/api/todos` | `{"description":"…"}` | `201 Todo` |
| `PATCH` | `/api/todos/:id` | any non-empty subset of `description` and `completed` (`true` or `false`); omitted fields stay unchanged | `200 Todo` |
| `DELETE` | `/api/todos/:id` | — | `204`, no body |

`POST` accepts an optional `Idempotency-Key` UUID. Repeating the same key and
description returns `201` with the original Todo; reusing it for another
description returns `409`.

Except for health probes, failures use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Description must not be empty."
  }
}
```

Implemented statuses are:

- `400` for invalid UUIDs, bodies, or Todo values.
- `404` for an unknown Todo or route.
- `409` for conflicting reuse of an idempotency key.
- `413` when the JSON body exceeds the `16kb` limit.
- `500` for an unexpected API failure, with internals hidden.
- `503 {"status":"error","db":"down"}` from `/api/health` when PostgreSQL is
  unavailable. Health responses intentionally do not use the error envelope.

## Local Development

### Prerequisites

- Node.js `24` or newer (required by all three independent packages).
- npm (no minimum version is encoded by the repository).
- Docker with Compose v2 for PostgreSQL.
- Ports `5173`, `8080`, and `5432` available.

There is no root npm workspace. Install each package independently:

```bash
(cd frontend && npm ci)
(cd backend && npm ci)
(cd e2e && npm ci)
```

Commands in this section use POSIX shell syntax as available in macOS, Linux,
WSL, and Git Bash.

Start the isolated PostgreSQL service and prepare backend configuration.
This is the same `aine-bmad-test` Compose project used by backend tests: tmpfs
storage (todos vanish when that container stops), not the production `db-data`
volume. The backend-test `down -v` commands below also destroy this database
if local development is still using it.

```bash
docker compose -f docker-compose.test.yml up -d --wait
[ -e backend/.env ] || cp .env.example backend/.env
```

Then run each development server in its own terminal:

```bash
cd backend && npm run dev
```

```bash
cd frontend && npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api` to the backend on port `8080`.
When finished, stop both development servers and remove the isolated database:

```bash
docker compose -f docker-compose.test.yml down -v
```

`backend/.env` is ignored by Git. The production Compose stack instead supplies
its environment inline and does not read this file.

## Tests and Quality Checks

Run the install commands under [Local Development](#local-development) first.
The frontend and backend coverage configurations enforce **70% minimum lines,
functions, branches, and statements**. Falling below any metric fails the run
and CI. HTML and LCOV reports are written to `frontend/coverage/` and
`backend/coverage/` (`index.html` and `lcov.info`).

### Lint and strict type checking

```bash
(cd frontend && npm run lint && npm run typecheck)
(cd backend && npm run lint && npm run typecheck)
(cd e2e && npm run lint && npm run typecheck)
```

### Frontend unit and component tests

Vitest runs pure unit tests and React Testing Library component/hook tests in
jsdom:

```bash
cd frontend && npm test
```

Run the same suite with its enforced coverage gate:

```bash
cd frontend && npm run test:coverage
```

### Backend unit and PostgreSQL integration tests

The backend Vitest suite combines unit tests with Supertest API and repository
integration tests against an isolated PostgreSQL database. The test Compose
project is named `aine-bmad-test`, publishes port `5432`, and uses tmpfs rather
than the production volume.

```bash
docker compose -f docker-compose.test.yml up -d --wait
cd backend && NODE_ENV=test PORT=8080 DATABASE_URL=postgres://todo:todo@localhost:5432/todo CORS_ORIGIN=http://localhost:5173 npm test
cd ..
docker compose -f docker-compose.test.yml down -v
```

For the enforced backend coverage run:

```bash
docker compose -f docker-compose.test.yml up -d --wait
cd backend && NODE_ENV=test PORT=8080 DATABASE_URL=postgres://todo:todo@localhost:5432/todo CORS_ORIGIN=http://localhost:5173 npm run test:coverage
cd ..
docker compose -f docker-compose.test.yml down -v
```

### Full-stack end-to-end tests

Playwright drives Chromium against the production-style Compose stack at
<http://localhost:8080>. The suite may stop and restart the backend to verify
persistence and failure handling. Its global teardown restores the backend and
removes todos prefixed `e2e `.

Run it in the dedicated `aine-bmad-e2e` Compose project so its container
controls, cleanup, and disposable database volume cannot affect Quick Start
data. Port `8080` must be free, so stop any regular project stack first.

```bash
COMPOSE_PROJECT_NAME=aine-bmad-e2e docker compose up -d --build --wait --wait-timeout 180
cd e2e && npx playwright install chromium && COMPOSE_PROJECT_NAME=aine-bmad-e2e npm test
cd ..
COMPOSE_PROJECT_NAME=aine-bmad-e2e docker compose down -v
```

The HTML report is written to `e2e/playwright-report/`.

## Continuous Integration

GitHub Actions runs four blocking jobs on pushes and pull requests:

- frontend lint, strict type checking, dependency audit, tests, and coverage;
- backend lint, strict type checking, dependency audit, and tests/coverage
  against the ephemeral PostgreSQL service;
- Playwright/Chromium E2E tests against the health-gated production stack;
- a clean Compose smoke test of the SPA, proxied API, health payload, empty
  list, runtime image, and environment-file posture.

Coverage, Playwright, dependency-audit, accessibility, and failure-log artifacts
are retained by CI for seven days. Detailed accessibility and security evidence
lives in `docs/accessibility-audit.md` and `docs/security-review.md`.
The consolidated test strategy, traceability, defects, and reproducible coverage
evidence live in `docs/qa-report.md`.

## Troubleshooting

- **Port already allocated:** stop the process using `8080` (production/backend),
  `5173` (Vite), or `5432` (test PostgreSQL). Do not run the local backend and
  production stack together because both use `8080`.
- **A service is unhealthy:** inspect the matching Compose project. Quick Start
  uses the default project (`docker compose ps` and
  `docker compose logs db backend frontend`). The E2E stack needs
  `COMPOSE_PROJECT_NAME=aine-bmad-e2e` on those same commands. The test
  database uses `docker compose -f docker-compose.test.yml ps` and `logs`.
  `/api/health` returns `503` while PostgreSQL cannot answer `SELECT 1`.
- **Backend exits before listening:** local development requires
  `NODE_ENV`, `PORT`, `DATABASE_URL`, and `CORS_ORIGIN`. Recreate
  `backend/.env` from `.env.example`; Compose supplies these values itself.
- **Backend tests cannot connect:** ensure the test Compose service is healthy
  and host port `5432` is free. Run the test command with all four inline
  environment variables exactly as shown above.
- **Playwright cannot launch Chromium:** rerun
  `cd e2e && npx playwright install chromium`. On Linux, also install OS
  dependencies with `cd e2e && npx playwright install --with-deps chromium`
  (CI uses the same command).
- **An upgraded checkout starts with an empty database:** PostgreSQL 18 stores
  data below `/var/lib/postgresql/<major>/docker`, while older project volumes
  may have used `/var/lib/postgresql/data`. If old data is disposable, run
  `docker compose down -v` once to recreate the volume. This permanently
  deletes that volume; back up needed data first.
