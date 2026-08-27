---
title: 'Story 3.1: Real-stack E2E suite and 70% coverage gate'
type: 'feature'
created: '2026-08-27'
status: 'done'
review_loop_iteration: 0
baseline_commit: '73a80d3a2840b04082fbde22dc229355c038c2a2'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Playwright suite is still a one-test DOM scaffold, while frontend and backend coverage are neither measured nor enforced in CI. The completed Todo product therefore lacks real-stack regression proof and a guard against meaningful test coverage silently declining.

**Approach:** Exercise the nginx → Express → PostgreSQL Compose stack with deterministic Playwright scenarios for the full CRUD journey, reload and backend-restart durability, and backend-unavailable recovery. Enforce 70% line, function, branch, and statement coverage in both Vitest packages, filling genuine logic gaps and archiving reports in CI.

## Boundaries & Constraints

**Always:** Run browser tests against `http://localhost:8080` only after `/api/health` succeeds; use role/label-based selectors; keep stateful Compose control deterministic and non-parallel; preserve the named DB volume during restart checks; keep frontend and backend thresholds at 70% for lines, functions, branches, and statements; add tests for real service, repository, middleware, hook, or component behavior; retain test-first discipline.

**Ask First:** Any reduction or exclusion that makes the 70% gate less representative; changing production behavior solely to simplify a test; replacing the existing Compose topology or CI job structure; omitting a required journey, restart, or failure scenario because the environment cannot execute it.

**Never:** Use fixed sleeps as readiness checks, CSS implementation selectors, optimistic-state assumptions, trivial coverage padding, external services, authentication work, accessibility-audit scope from Story 3.2, or delete the database volume before persistence assertions complete.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| CRUD journey | Healthy fresh stack | Add, toggle both ways with re-sort, edit, and confirmed delete all persist | Await confirmed UI state after each API response |
| Reload durability | Created/edited todo | Browser reload retains the server-authoritative todo | Fail with the missing or changed item identified |
| Restart durability | Persisted todo; backend restarted | Health recovers and the todo remains unchanged | Poll health; never recreate the DB volume |
| Backend unavailable | Typed create text; backend stopped | Alert appears and input remains intact | Restart backend and verify health during cleanup |
| Coverage regression | Any package metric below 70% | CI test command fails | Publish available reports even on failure |

</frozen-after-approval>

## Code Map

- `e2e/playwright.config.ts:5-20` -- no `baseURL`; `fullyParallel: true`. Set `baseURL: 'http://localhost:8080'`. Do not add `webServer`. Serialise infra-mutating tests.
- `e2e/tests/smoke.spec.ts:6-8` -- synthetic `page.setContent` harness; replace it.
- `e2e/support/` -- missing. `e2e/tsconfig.json:17` includes only config + `tests`. Add health poll and `docker compose stop|start|restart backend`; restore `/api/health` in cleanup. `e2e/package.json:10` already runs `playwright test`.
- `docker-compose.yml` -- read-only. Services `db`/`backend`/`frontend`; host `8080:80`; volume `db-data` (L15-16, L71-72). Never `down -v` until persistence assertions finish. `docker-compose.test.yml` is backend Vitest Postgres only.
- Selectors (roles/names): textbox `"Add a todo"`, buttons `"Add"` / `"Edit todo"` / `"Delete todo"` / `"Save"` / `"Cancel"` / `"Delete"`; checkbox `"Completed"` / `"Not completed"`; dialog `"Delete this todo?"`; alert + `aria-label="Retry"`; heading `"No todos yet."`; copy `"Couldn't connect. Check your connection and retry."` (`useTodos.ts:62`). Active todos sort above completed (`groupTodos.ts:13-30`).
- `frontend/vite.config.ts:14-19`, `backend/vitest.config.ts:3-7` -- no coverage. `@vitest/coverage-v8` is already installed. Add v8, reporters `text`/`html`/`lcov`, thresholds 70 on all four metrics. `include: src/**` leaves `frontend/src/main.tsx` and `backend/src/index.ts` at 0% — exclude those bootstraps only (Ask First if more).
- `frontend/package.json:15`, `backend/package.json:10` -- add `test:coverage` (`vitest run --coverage`); keep `test` without coverage.
- If the include+threshold fails, fill real logic: `errorHandler.ts:26-39` (`headersSent`, 413), `app.ts:30-31` (404), `api.ts` abort/envelope fallthrough, `TodoList.tsx` post-delete focus. Executed-file coverage is already ~85–95%; do not pad.
- `.github/workflows/ci.yml` -- keep four jobs. Switch `frontend` L36 / `backend` L65 to `test:coverage` and upload HTML/lcov `if: always()`. Retarget `e2e` L71-105 from unused `docker-compose.test.yml` to production compose + the `compose-smoke` health poll (L119-130), Playwright, report upload, failure logs, `down -v` in `always()`. Leave `compose-smoke` as the curl bring-up proof.

## Tasks & Acceptance

**Execution:**
- [x] `e2e/playwright.config.ts`, `e2e/support/`, `e2e/tsconfig.json` -- point the runner at the Compose origin, add health/lifecycle helpers, and include `support` in TypeScript.
- [x] `e2e/tests/*.spec.ts` -- replace the synthetic smoke with ≥5 deterministic real-stack tests covering the I/O matrix (CRUD + re-sort, reload, backend restart, backend-down input preservation). Test-first: red against the running stack, then helpers/config to green.
- [x] `frontend/vite.config.ts`, `backend/vitest.config.ts`, `frontend/package.json`, `backend/package.json` -- add coverage commands and blocking 70% thresholds for all four metrics, with bootstrap exclusions only.
- [x] `backend/src/**/*.test.ts`, `frontend/src/**/*.test.{ts,tsx}` -- run coverage against `src/**`; add focused tests for uncovered real logic only until both packages pass.
- [x] `.github/workflows/ci.yml` -- run `test:coverage` in package jobs and upload reports; retarget the existing `e2e` job at the production stack with health gate, Playwright, report upload, failure logs, and always-teardown.

**Acceptance Criteria:**
- Given the health-gated Compose stack, when Playwright runs in CI, then at least five deterministic tests pass and collectively prove create, bidirectional completion with re-sort, edit, confirmed delete, reload persistence, backend-restart persistence, and backend-down error/input preservation.
- Given either package's tests, when coverage is computed, then lines, functions, branches, and statements are each at least 70%, and dropping any metric below 70% fails CI.
- Given a CI run whether successful or failed, when evidence is collected, then available Playwright HTML and frontend/backend HTML/lcov coverage reports are uploaded, with Compose diagnostics retained on E2E failure.
- Given the implementation diff, when reviewed, then added coverage exercises meaningful application logic and production behavior has not been weakened or distorted for testing.

## Spec Change Log

- 2026-08-27: Production `db-data` volume now mounts at `/var/lib/postgresql`. Postgres 18.4 rejects `/var/lib/postgresql/data` as an unused mount, so the named volume, services, and host port are unchanged but the mount parent matches `docker-compose.test.yml`.

## Design Notes

CI owns stack start/stop; Playwright only talks to `http://localhost:8080`. Helpers wrap `docker compose stop|start|restart backend` and poll `/api/health` — never `sleep`. Restart/unavailable tests restore backend health in `finally`. Use unique todo text per test so a shared DB cannot cross-contaminate. Keep `compose-smoke`; do not fold it into Playwright.

## Verification

**Commands:**
- `cd frontend && npm run lint && npm run typecheck && npm run test:coverage` -- expected: checks pass and every coverage metric is ≥70%.
- `docker compose -f docker-compose.test.yml up -d --wait && cd backend && npm run lint && npm run typecheck && npm run test:coverage` -- expected: backend checks and coverage gate pass against test PostgreSQL.
- `docker compose up -d --build --wait && curl -fsS http://localhost:8080/api/health && cd e2e && npm run lint && npm run typecheck && npm test` -- expected: health succeeds and ≥5 real-stack Playwright tests pass.
- `docker compose down -v` -- expected: local verification stack and volume are removed after all persistence assertions.

## Suggested Review Order

**Real-stack Playwright**

- Point the runner at Compose and serialise infrastructure-mutating tests.
  [`playwright.config.ts:12`](../../e2e/playwright.config.ts#L12)

- Poll `/api/health` with timeouts; stop/start/restart backend without sleeps.
  [`compose.ts:23`](../../e2e/support/compose.ts#L23)

- Use exact role/label names so completed items do not match active ones.
  [`app.ts:11`](../../e2e/support/app.ts#L11)

- Cover create, bidirectional complete with re-sort, edit, delete, and reload.
  [`crud.spec.ts:19`](../../e2e/tests/crud.spec.ts#L19)

- Prove backend-restart persistence and backend-down input preservation.
  [`stack.spec.ts:14`](../../e2e/tests/stack.spec.ts#L14)

**Coverage gate**

- Enforce 70% on all four metrics; exclude only the frontend bootstrap.
  [`vite.config.ts:19`](../../frontend/vite.config.ts#L19)

- Mirror the same gate for backend `src/**` excluding `index.ts`.
  [`vitest.config.ts:7`](../../backend/vitest.config.ts#L7)

**CI**

- Run package coverage and upload HTML/lcov even when the job fails.
  [`ci.yml:36`](../../.github/workflows/ci.yml#L36)

- Retarget E2E at the production stack with health gate, logs, and teardown.
  [`ci.yml:111`](../../.github/workflows/ci.yml#L111)

**Compose runtime fixes**

- Mount postgres 18 data at `/var/lib/postgresql` so the named volume is used.
  [`docker-compose.yml:19`](../../docker-compose.yml#L19)

- Probe nginx on IPv4 so `--wait` does not fail on `localhost` → `::1`.
  [`docker-compose.yml:68`](../../docker-compose.yml#L68)

