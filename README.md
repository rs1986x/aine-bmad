# aine-bmad

A full-stack Todo application (React + Express + Postgres).

This is a minimal placeholder. Full setup, architecture, and usage
documentation are delivered in Story 4.1 (D-6).

## Run the full stack

With Docker installed, bring up the whole stack (db → backend → frontend) with a
single command from the repo root:

```bash
docker compose up --build
```

Then open <http://localhost:8080> in a browser. nginx serves the app and
reverse-proxies `/api/*` to the backend, so everything is one origin.

Stop the stack with `docker compose down`. To also wipe the database volume
(`db-data`), use `docker compose down -v`.

> **Upgrading an existing checkout:** the `db-data` volume now mounts at
> `/var/lib/postgresql` instead of `/var/lib/postgresql/data`, because
> postgres 18 keeps its data in a major-version subdirectory. A volume created
> before this change holds its data at the old location, where the new container
> will not look for it, so the app comes up empty. Run `docker compose down -v`
> once to recreate the volume.

## Running the tests locally

Each package has its own suite. `npm test` runs the tests; `npm run test:coverage`
runs them with coverage and **fails below 70%** on lines, functions, branches,
and statements — the same gate CI enforces. Reports land in `<package>/coverage/`
(open `index.html`; `lcov.info` is there for tooling).

```bash
cd frontend && npm run test:coverage
cd backend  && npm run test:coverage   # needs the test database, see below
```

### End-to-end tests (Playwright)

The E2E suite drives a real browser against the running production stack and
controls containers itself (it stops and restarts the `backend` service to prove
persistence and failure handling), so Docker must be running and the stack must
be up first:

```bash
docker compose up -d --build --wait
cd e2e && npm test
```

The tests talk to `http://localhost:8080` only, and every todo they create is
prefixed `e2e `. Playwright's teardown restores the backend and deletes those
rows, so repeated runs do not accumulate data in the persistent volume. To reset
completely, use `docker compose down -v`.

## Running the backend integration tests locally

The backend integration tests (`backend/src/__tests__/todo.api.test.ts`) run
against a real Postgres. They are wired into CI, which brings up an ephemeral
database automatically. To run them locally:

1. Start the ephemeral test database (requires Docker):

   ```bash
   docker compose -f docker-compose.test.yml up -d --wait
   ```

2. Create `backend/.env.test` (git-ignored) matching `docker-compose.test.yml`:

   ```env
   NODE_ENV=test
   PORT=8080
   DATABASE_URL=postgres://todo:todo@localhost:5432/todo
   CORS_ORIGIN=http://localhost:5173
   ```

3. Run the tests, then tear the database down:

   ```bash
   cd backend && npm test
   docker compose -f docker-compose.test.yml down -v
   ```

This stack declares its own compose project name (`aine-bmad-test`), so it is
safe to run alongside the production stack even though both define a service
called `db`. The DB-free tests (`src/config/env.test.ts`,
`src/__tests__/errorHandler.test.ts`) run anywhere via `npm test`.
