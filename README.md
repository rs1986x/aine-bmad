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

> Note: Docker is not installed on the current dev machine, so these integration
> tests are proven by CI rather than locally. The DB-free tests
> (`src/config/env.test.ts`, `src/__tests__/errorHandler.test.ts`) run anywhere
> via `npm test`.
