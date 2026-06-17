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

## Deferred from: code review of 1-3-one-command-docker-compose-bring-up (2026-06-17)

- nginx resolves the `backend` upstream once at config load with no `resolver` directive, so if the backend container is recreated with a new compose-network IP, nginx keeps proxying to the stale address (persistent 502) until reloaded. Out of this story's AC scope (AC3 restarts only `db`; the backend stays up) and the spec explicitly chose the literal `proxy_pass http://backend:8080;` over the variable+`resolver` pattern. Revisit if/when backend recreation becomes a real scenario. [frontend/nginx.conf]

## Deferred from: code review of 1-4-frontend-skeleton-tokens-shell-usetodos-loading-and-empty-states (2026-06-17)

- No `AbortController`/timeout in `useTodos` — only an `ignore` flag suppresses post-unmount state writes; the underlying fetch is never cancelled and there is no timeout, so a hung/never-settling request leaves `loading=true` (the skeleton) indefinitely. Full error/retry UX is Story 2.5; revisit then. [frontend/src/hooks/useTodos.ts]
- `reload()` does not clear the stale `list` — it resets `loading`/`error` but leaves the previously loaded todos in state, so a reload that fails after a prior success keeps stale data. Masked today because `App` renders the error branch ahead of the list; latent for future consumers (Story 2.1 `TodoList`). [frontend/src/hooks/useTodos.ts]
- LoadingSkeleton row height is a hard-coded `56px` literal rather than a token-derived value (AC #2 prefers tokens over literals). Minor — no DESIGN.md token defines a skeleton/todo-row height, so there is no canonical token to reference; tidy up if a row-height token is introduced. [frontend/src/styles/app.css]
- EmptyState `<h1>` is the document's only top-level heading and appears/disappears with data state, leaving no stable heading in the outline across loading/error/empty/populated. Minor a11y; the shell has no persistent app-title heading yet (Epic 2). [frontend/src/components/EmptyState.tsx]
