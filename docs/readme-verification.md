# README Verification Evidence

Verified on 2026-08-31 from the repository root on macOS 26.6 (arm64).
The reviewed baseline was commit
`ebdeb1a247b1ae9e45237ef0859f810952639acf`.

## Environment

- Node.js: `v26.8.1` (satisfies the documented Node 24+ requirement)
- npm: `11.19.0`
- Docker: `29.7.2`
- Docker Compose: `v5.4.0`
- Browser engine: Playwright Chromium 149

## Results

### Dependencies and static checks

The README's three independent `npm ci` commands completed successfully with
zero reported vulnerabilities. Frontend, backend, and E2E lint and strict
type-check commands all exited successfully.

```bash
(cd frontend && npm ci)
(cd backend && npm ci)
(cd e2e && npm ci)
(cd frontend && npm run lint && npm run typecheck)
(cd backend && npm run lint && npm run typecheck)
(cd e2e && npm run lint && npm run typecheck)
```

### Frontend unit, component, and coverage tests

Both `npm test` and `npm run test:coverage` completed successfully:

- 10 test files passed
- 157 tests passed
- Statements: 92.71%
- Branches: 86.15%
- Functions: 95.06%
- Lines: 95.69%

The generated HTML and LCOV evidence is under `frontend/coverage/`.

```bash
(cd frontend && npm test)
(cd frontend && npm run test:coverage)
```

### Backend unit, integration, and coverage tests

The documented `docker-compose.test.yml` setup became healthy and both backend
commands completed successfully against PostgreSQL 18.4:

- 7 test files passed
- 95 tests passed
- Statements: 97.33%
- Branches: 89.18%
- Functions: 96.77%
- Lines: 97.31%

The generated HTML and LCOV evidence is under `backend/coverage/`. The isolated
test database was removed successfully with its documented teardown command.

```bash
docker compose -f docker-compose.test.yml up -d --wait
(cd backend && NODE_ENV=test PORT=8080 DATABASE_URL=postgres://todo:todo@localhost:5432/todo CORS_ORIGIN=http://localhost:5173 npm test)
(cd backend && NODE_ENV=test PORT=8080 DATABASE_URL=postgres://todo:todo@localhost:5432/todo CORS_ORIGIN=http://localhost:5173 npm run test:coverage)
docker compose -f docker-compose.test.yml down -v
```

### Production Compose and API smoke test

`docker compose up -d --build --wait --wait-timeout 180` built both application
images and health-gated all three services successfully. A transient Docker Hub
timeout occurred while initially resolving `docker/dockerfile:1`; retrying the
registry download and the same Compose command succeeded without repository
changes.

The smoke checks returned:

```text
GET /             200, non-empty SPA response
GET /api/health   200 {"status":"ok","db":"up"}
GET /api/todos    200 []
```

`docker compose down` also completed successfully without deleting the named
database volume.

### Local development

The documented test database and non-overwriting environment setup succeeded.
The backend started on port `8080`, Vite started on port `5173`, and a request
through Vite's `/api` proxy returned
`200 {"status":"ok","db":"up"}`. Both development servers were then stopped,
the test database removed, and the generated ignored `backend/.env` deleted.

### Full-stack E2E

The documented commands built a dedicated `aine-bmad-e2e` Compose project and
volume. `npx playwright install chromium` installed Chromium, then `npm test`
completed successfully:

- 30 Playwright tests passed
- CRUD, persistence, backend failure handling, keyboard, reflow, and automated
  WCAG 2.1 A/AA checks all ran
- Runtime: 40.2 seconds

The generated browser report is under `e2e/playwright-report/`; axe evidence is
under `e2e/axe-results/`. The dedicated stack and volume were removed
successfully afterward, leaving Quick Start data untouched.

```bash
COMPOSE_PROJECT_NAME=aine-bmad-e2e docker compose up -d --build --wait --wait-timeout 180
(cd e2e && npx playwright install chromium && COMPOSE_PROJECT_NAME=aine-bmad-e2e npm test)
COMPOSE_PROJECT_NAME=aine-bmad-e2e docker compose down -v
```

## Reproducibility Notes

- Docker image downloads require network access; a registry timeout is an
  external transient failure, not an undocumented setup step.
- npm emitted a local warning for an unknown user-level `devdir` setting. It did
  not affect installation, linting, type checking, or tests and is not a
  repository requirement.
- `docker compose down -v` is intentionally documented as destructive. It
  permanently deletes the application's named PostgreSQL volume and should be
  used only when a full data reset is intended.
