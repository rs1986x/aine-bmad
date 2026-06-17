# aine-bmad

A full-stack Todo application (React + Express + Postgres).

This is a minimal placeholder. Full setup, architecture, and usage
documentation are delivered in Story 4.1 (D-6).

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
