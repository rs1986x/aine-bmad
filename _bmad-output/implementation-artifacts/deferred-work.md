# Deferred Work

## Deferred from: code review of 1-1-scaffold-repository-test-harness-and-ci (2026-06-16)

- Prettier `format:check` is not enforced in CI — `format`/`format:check` scripts exist in both `frontend/` and `backend/`, but no CI stage runs them. Not required by AC#3's enumerated stages; add a format gate in a later hardening pass if desired. [.github/workflows/ci.yml]
- ~~No Postgres service wired into the backend CI job — only needed once in-process integration tests exist (Story 1.2+). The e2e job already brings up the ephemeral test DB. [.github/workflows/ci.yml]~~ **RESOLVED in Story 1.2:** the backend CI job now brings up `docker-compose.test.yml` (`up -d --wait` / `down -v` with `if: always()`) and passes `NODE_ENV/PORT/DATABASE_URL/CORS_ORIGIN` to the test step.

## Deferred from: code review of 1-1-scaffold-repository-test-harness-and-ci (2026-06-17)

- CI runs no `build` step for frontend/backend, so emit-only breakage (project-reference or asset-resolution errors) wouldn't fail the pipeline. Not required by AC#3's enumerated stages; add a build stage in a later hardening pass. [.github/workflows/ci.yml]
- Toolchain version drift across packages — `typescript` `~6.0.2` (frontend) vs `^6.0.3` (backend/e2e), `eslint` `^10.3.0` vs `^10.5.0`, `typescript-eslint` `^8.59.2` vs `^8.61.1`. Cosmetic; align ranges in a later tidy-up. [frontend/package.json, backend/package.json, e2e/package.json]

## Deferred from: code review of 1-2-backend-foundation-db-migrations-repository-api-skeleton (2026-06-17)

- No graceful shutdown — no `SIGTERM`/`SIGINT` handler calling `pool.end()`, so in-flight requests/connections are dropped on container stop. Foundation scope; add when deployment topology is finalized. [backend/src/index.ts]
- `GET /api/todos` is unbounded (no `LIMIT`/pagination) — full-table load and serialization as the table grows. Pagination is Epic 2 scope and not in this story's API contract. [backend/src/repositories/todo.repository.ts]
- Env validation is non-empty only — `DATABASE_URL`/`CORS_ORIGIN` use `z.string().min(1)`; a malformed connection string or origin passes the fail-fast check and fails later at connect/CORS time. Stricter format checks risk rejecting valid configs, so deferred to a hardening pass. [backend/src/config/env.ts]
- Health route swallows the underlying DB error without logging — a real DB outage leaves no server-side diagnostic trail. Intentional quiet probe today; revisit for observability (rate-limited log). [backend/src/routes/health.routes.ts]
- `env.ts` validates `process.env` at module load (`export const env = parseEnv(process.env)`), so importing the pure helpers in `env.test.ts` triggers validation and can fail at import time if the ambient env is invalid. Works in CI and with local `.env.test`; refactor (lazy singleton / split pure module) deferred as the approach is not clear-cut. [backend/src/config/env.ts]
