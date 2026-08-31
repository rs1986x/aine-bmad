---
title: 'Story 4.1: README (D-6)'
type: 'feature'
created: '2026-08-31'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'ebdeb1a247b1ae9e45237ef0859f810952639acf'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The root README is a partial placeholder: a new operator cannot yet discover exact prerequisites, understand the deployed architecture and API, or run every test level without consulting the repository.

**Approach:** Replace it with the canonical operator guide, grounded in implemented Compose, package, API, and CI behavior. Verify every documented command and preserve reproducible evidence of the verification.

## Boundaries & Constraints

**Always:** Prefer implemented code, lockfiles, Compose, and CI over stale planning claims; document Docker Compose v2, Node 24+, the three independent npm packages, the single-user/no-auth scope, persistence semantics, all implemented API statuses, and the 70% frontend/backend coverage gates. Make the primary app path work from a clean Docker-capable machine with no hidden environment setup.

**Ask First:** Any dependency, application code, API contract, Compose, CI, or environment-template change discovered to be necessary while validating the README.

**Never:** Invent minimum Docker/npm versions not encoded by the repository; describe floating image tags as fixed versions; claim unverified commands work; change `frontend/README.md`; or absorb the QA, accessibility/security, and AI-log deliverables assigned to Stories 4.2–4.4.

</frozen-after-approval>

## Code Map

- `README.md` -- D-6 target; retain its valid Compose, PostgreSQL 18 volume, coverage, E2E, and integration-test guidance while replacing the placeholder.
- `docker-compose.yml` -- authoritative three-service topology, ports, health gates, inline production environment, and `db-data` persistence.
- `docker-compose.test.yml` -- isolated PostgreSQL test service on port 5432 with tmpfs storage.
- `frontend/package.json`, `backend/package.json`, `e2e/package.json` -- Node requirement and exact user-facing npm scripts; there is no root workspace.
- `frontend/vite.config.ts`, `backend/vitest.config.ts`, `e2e/playwright.config.ts` -- test environments, proxy/base URL, and enforced coverage thresholds.
- `backend/src/routes/{health,todo}.routes.ts`, `backend/src/schemas/todo.schema.ts`, `backend/src/types/todo.ts` -- implemented endpoint methods, validation, payloads, and Todo wire shape.
- `backend/src/app.ts`, `backend/src/middleware/errorHandler.ts` -- CORS/body limit and uniform API error behavior; health responses are the documented exception.
- `backend/src/index.ts`, `backend/src/db/migrate.ts`, `backend/src/repositories/todo.repository.ts` -- startup migrations, layering, persistence authority, and snake_case/camelCase boundary.
- `.github/workflows/ci.yml` -- authoritative quality gates, clean Compose smoke sequence, and artifact behavior.
- `.env.example` -- local backend/test configuration source; production Compose requires no `.env`.
- `_bmad-output/planning-artifacts/epics.md` and `_bmad-output/implementation-artifacts/epic-4-context.md` -- read-only Story 4.1 requirements and documentation constraints.

## Tasks & Acceptance

**Execution:**
- [x] `README.md` -- author overview, accurate prerequisites, one-command run/stop/reset, architecture, API reference, local development, all test/coverage levels, CI summary, and code-backed troubleshooting.
- [x] `docs/readme-verification.md` -- archive environment, verbatim README commands, outcomes, and any bounded caveats so later QA reporting can reproduce D-6 claims.

**Acceptance Criteria:**
- Given a clean Docker-capable machine, when an operator follows only the Quick Start, then `docker compose up --build` health-gates the stack and serves the SPA plus healthy `/api` endpoints at `http://localhost:8080` without undocumented setup.
- Given Node 24+ and Docker Compose v2, when each documented lint, typecheck, Vitest/RTL, Supertest/PostgreSQL integration, coverage, and Playwright command is followed verbatim, then it succeeds and the README identifies the 70% frontend/backend coverage gates and report locations.
- Given the README is read without source-code inspection, when an operator reviews architecture and API sections, then they can identify service topology, startup migrations, persistence, code layers, all five `/api` routes, request/response shapes, and relevant success/error statuses.
- Given tool and image versions are listed, when compared with package engines, lockfiles, Dockerfiles, and Compose, then each is accurate and floating tags are clearly labeled.
- Given verification is complete, when `docs/readme-verification.md` is inspected, then it records the tested environment, exact commands, successful outcomes, and reproducible troubleshooting observations.

## Spec Change Log

## Design Notes

Treat runtime configuration and tests as the contract when planning artifacts disagree. Keep the README task-oriented: Quick Start first, conceptual architecture and API next, then development/testing and troubleshooting. Link to detailed accessibility and security evidence instead of duplicating those reports.

## Verification

**Commands:**
- `docker compose up -d --build --wait --wait-timeout 180` plus `curl -fsS` checks for `/`, `/api/health`, and `/api/todos` -- expected: all services healthy and implemented payloads returned.
- Per-package `npm ci`, `npm run lint`, and `npm run typecheck` -- expected: clean installation and zero diagnostics.
- Frontend and backend `npm run test:coverage` with the documented isolated test database setup -- expected: suites pass and every configured metric remains at or above 70%.
- `cd e2e && npx playwright install chromium && npm test` with the stack running -- expected: the full Playwright suite passes.
- Re-run the README commands exactly in documented order -- expected: no missing prerequisite, environment, directory, or teardown step.

## Suggested Review Order

**Operator path**

- Start with the no-hidden-step run path, prerequisites, and local security boundary.
  [`README.md:8`](../../README.md#L8)

- Review service topology, migration lifecycle, persistence, and backend layering.
  [`README.md:54`](../../README.md#L54)

- Confirm API payloads, idempotency, error envelope, and implemented statuses.
  [`README.md:90`](../../README.md#L90)

**Development and quality**

- Check independent package setup and the verified local development workflow.
  [`README.md:139`](../../README.md#L139)

- Review coverage gates and commands for every non-browser test level.
  [`README.md:186`](../../README.md#L186)

- Confirm E2E isolation prevents test cleanup from touching Quick Start data.
  [`README.md:240`](../../README.md#L240)

**Evidence and lifecycle**

- Trace documented claims to environment details, commands, results, and caveats.
  [`readme-verification.md:1`](../../docs/readme-verification.md#L1)

- Confirm Epic 4 constraints used to bound this documentation deliverable.
  [`epic-4-context.md:1`](epic-4-context.md#L1)

- Verify Story 4.1 and its parent epic advanced together.
  [`sprint-status.yaml:79`](sprint-status.yaml#L79)
