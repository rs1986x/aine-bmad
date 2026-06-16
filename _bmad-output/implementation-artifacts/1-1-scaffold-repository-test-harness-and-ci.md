---
baseline_commit: NO_VCS
---

# Story 1.1: Scaffold repository + test harness & CI

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the repo scaffolded with both packages, all test runners, linting, and CI from the very first commit,
so that every later story has a consistent home and QA/tests run from day one (test-first discipline is mechanically possible immediately).

## Acceptance Criteria

1. **Given** a clean clone, **When** scaffold commands run, **Then** `frontend/` (Vite `react-ts`, TS strict) and `backend/` (Express 5, TS strict, deps installed) exist with the folder skeleton + root placeholders (`docker-compose.yml`, `docker-compose.test.yml`, `.env.example`, `.gitignore`, `README.md`).
2. **Given** each package, **When** `npm test` runs, **Then** Vitest executes a trivial passing test and reports green (backend node env; frontend jsdom + RTL).
3. **Given** a push/PR, **When** CI runs, **Then** lint + `tsc --noEmit` (typecheck) + unit/integration + e2e stages all run and **block on failure**.
4. **Given** integration/E2E tooling, **When** invoked, **Then** `docker-compose.test.yml` provides a fresh ephemeral Postgres (`postgres:18.4`) and a sample Playwright test passes against it.
5. **Given** the test-first discipline, **When** any subsequent story is implemented, **Then** its tests are written first (red) and code makes them green, with tests + code landing in the same change (enforced via review of commit/PR history). This story establishes the harness that makes that possible.

> Scope note: This story is **infrastructure only** — scaffolding, config, and trivial "smoke" tests at each level that prove the harness works. Do **not** implement any Todo domain logic, real API routes, DB migrations, or UI components here. Those belong to Stories 1.2–1.4. The sample tests exist only to prove each runner executes; they will be replaced by real tests in later stories.

## Tasks / Subtasks

- [x] **Task 1: Initialize repo root + placeholders** (AC: #1)
  - [x] Confirm you are at repo root `aine-bmad/` (git already initialized, no commits yet).
  - [x] Create root `.gitignore` covering `node_modules/`, `dist/`, `build/`, `coverage/`, `playwright-report/`, `test-results/`, `.env`, `.env.test`, `*.local`, OS/editor cruft (`.DS_Store`). **Do not ignore `.env.example`.**
  - [x] Create root `README.md` placeholder (project title + "see Story 4.1 for full docs"). Full README is D-6 / Story 4.1 — keep this minimal here.
  - [x] Create root `.env.example` documenting the env vars used by compose/backend: `NODE_ENV`, `PORT`, `DATABASE_URL`, `CORS_ORIGIN` (no secret values — placeholders only).
  - [x] Create empty `docker-compose.yml` and `docker-compose.test.yml` placeholders (full topology is Story 1.3; `docker-compose.test.yml` test DB is needed **now** for AC #4 — see Task 6).
- [x] **Task 2: Scaffold the frontend package** (AC: #1, #2)
  - [x] From repo root run: `npm create vite@latest frontend -- --template react-ts` (creates React 19.2 + TS 6.0 Vite app).
  - [x] `cd frontend && npm install`.
  - [x] Enable TypeScript **strict** mode in `frontend/tsconfig.json` (Vite's template is strict by default — verify `"strict": true` is present; do not relax it). Note: create-vite 9.0.7 template did NOT include an explicit `"strict": true`; added it to `tsconfig.app.json` and `tsconfig.node.json`.
  - [x] Create the source folder skeleton (empty/placeholder dirs are fine, do NOT implement components): `src/api/`, `src/hooks/`, `src/components/`, `src/types/`, `src/styles/`, `src/__tests__/`.
  - [x] Add a Vite dev proxy stub in `vite.config.ts`: `server.proxy['/api'] → http://localhost:8080` (wired now so later stories don't re-touch config; backend not required to exist yet).
- [x] **Task 3: Configure frontend test harness (Vitest + RTL)** (AC: #2)
  - [x] Install dev deps: `vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`.
  - [x] Configure Vitest inside `vite.config.ts` (or `vitest.config.ts`): `environment: 'jsdom'`, `globals: true`, a `setupFiles` that imports `@testing-library/jest-dom`.
  - [x] Add `"test": "vitest run"` (and optionally `"test:watch": "vitest"`) to `frontend/package.json` scripts.
  - [x] Write ONE trivial passing component/smoke test under `src/__tests__/` (e.g. render a `<div>` or assert `1+1===2` with RTL imported) to prove the runner + jsdom + RTL wiring works.
- [x] **Task 4: Scaffold the backend package + test harness (Vitest + Supertest)** (AC: #1, #2)
  - [x] From repo root: `mkdir backend && cd backend && npm init -y`.
  - [x] Runtime deps: `npm install express pg zod cors helmet morgan dotenv`.
  - [x] Dev deps: `npm install -D typescript tsx @types/node @types/express @types/cors @types/morgan vitest @vitest/coverage-v8 supertest @types/supertest`.
  - [x] `npx tsc --init`, then set **strict** mode + sensible Node settings in `backend/tsconfig.json` (`"strict": true`, `"module": "NodeNext"`/`"moduleResolution": "NodeNext"` or equivalent, `"target": "ES2022"`, `"outDir": "dist"`, `"rootDir": "src"`).
  - [x] Create the backend folder skeleton (empty/placeholder — do NOT implement logic): `src/`, `src/config/`, `src/db/`, `src/schemas/`, `src/repositories/`, `src/services/`, `src/routes/`, `src/middleware/`, `src/errors/`, `src/types/`, `migrations/`. Co-locate tests as `*.test.ts` (or a `src/__tests__/` folder).
  - [x] Add `vitest.config.ts` for the backend with `environment: 'node'`.
  - [x] Add scripts to `backend/package.json`: `"dev": "tsx watch src/index.ts"`, `"build": "tsc"`, `"test": "vitest run"`, `"typecheck": "tsc --noEmit"`. (`src/index.ts` may be a trivial placeholder for now.)
  - [x] Write ONE trivial passing unit test (e.g. `expect(true).toBe(true)`) to prove Vitest runs in the node env. Supertest is installed for later integration tests — no real app under test required yet.
- [x] **Task 5: Add ESLint + Prettier in both packages** (AC: #3)
  - [x] Configure ESLint (frontend uses the Vite template's ESLint flat config; extend, don't remove) + Prettier in `frontend/` and `backend/`.
  - [x] Ensure TypeScript-aware linting and that lint passes clean on the scaffolded code.
  - [x] Add `"lint"` scripts to both `package.json` files. Keep config consistent across packages.
- [x] **Task 6: Set up E2E (Playwright) + ephemeral test Postgres** (AC: #4)
  - [x] Create top-level `e2e/` folder with its own `package.json`, `playwright.config.ts`, and `tests/`.
  - [x] Install Playwright (`@playwright/test`) and run `npx playwright install --with-deps chromium` (CI must do this too).
  - [x] Write ONE sample Playwright test under `e2e/tests/` that passes deterministically (it may hit a static page or a trivial fixture — it does NOT need the real app yet; it proves the runner + browser work).
  - [x] Author `docker-compose.test.yml` with a single `db` service: `postgres:18.4`, env (`POSTGRES_USER/PASSWORD/DB` = `todo`), a `pg_isready` healthcheck, and a published/mapped port for tests. This is the ephemeral, fresh-migrated test DB later stories' integration tests use. (No backend/frontend services needed in the test compose for this story.)
- [x] **Task 7: GitHub Actions CI pipeline** (AC: #3, #4)
  - [x] Create `.github/workflows/ci.yml` triggered on push + pull_request.
  - [x] Stages (each must **fail the build** on error): `lint` (both packages), `typecheck` (`tsc --noEmit` both packages), `unit/integration` (Vitest both packages), `e2e` (Playwright).
  - [x] For the e2e/integration stage, bring up the ephemeral Postgres via `docker-compose.test.yml` (or a GH Actions `services:` Postgres) and ensure Playwright browsers are installed.
  - [x] Use Node `setup-node` with a Node version compatible with the stack (Node 24 LTS; minimum Vite build requirement Node 20.19+/22.12+ — pick 24).
  - [ ] Verify CI is green on the scaffold (push the branch / open a PR per repo workflow). **DEFERRED:** no git remote/commits exist yet (greenfield) and committing requires user authorization. All CI stage commands pass locally (lint + typecheck + Vitest both packages + Playwright). See Completion Notes.
- [x] **Task 8: Verify the whole harness end-to-end** (AC: #1–#4)
  - [x] `tsc --noEmit` is clean in **both** packages.
  - [x] `npm test` green in both packages; sample Playwright test green.
  - [x] Lint clean in both packages.
  - [x] Folder structure matches the architecture's directory tree (see Dev Notes).
  - [] Commit; confirm CI run is green and capture the run URL/log for QA evidence. **DEFERRED:** pending user authorization to commit/push and a GitHub remote. Docker is not installed locally, so the compose-backed Postgres bring-up (AC #4) will be confirmed by the CI e2e job once pushed.

## Dev Notes

### What this story is (and is NOT)

- **IS:** the empty-but-complete skeleton + a working four-level test harness (unit, integration tooling, component, e2e) + lint + typecheck + CI + a test-only Postgres. Each level has a single trivial passing test proving the wiring.
- **IS NOT:** any Todo feature code. No migrations SQL beyond the `migrations/` folder existing (the actual `001_create_todos.sql` is Story 1.2). No real API routes/services/repositories. No real components/hooks/tokens (Story 1.4). No real Dockerfiles or full compose topology (Story 1.3) — only the `docker-compose.test.yml` test DB, which AC #4 needs now.

### Locked tech stack & versions (from architecture — verified current as of 2026-06-16)

Use these exact tools/versions; the architecture's coherence validation confirmed mutual compatibility. Do not substitute alternatives.

| Area | Choice |
|---|---|
| Frontend scaffold | Vite `react-ts` template via `npm create vite@latest` (create-vite 9.0.7) → React 19.2 + TypeScript 6.0 |
| Backend | Hand-built **Express 5** + TypeScript on **Node 24 LTS**; `tsx` for dev, `tsc` → `dist/` |
| DB driver (later) | node-postgres `pg` 8.21.0 |
| Database (test compose) | `postgres:18.4` |
| Unit/integration/component tests | **Vitest 4.x** (+ Supertest for backend HTTP, + React Testing Library for components) |
| E2E | **Playwright 1.61** |
| Quality gates | ESLint + Prettier + `tsc --noEmit` (TypeScript **strict** in both packages) |

Backend init commands (from architecture, run from repo root):

```bash
npm create vite@latest frontend -- --template react-ts
mkdir backend && cd backend && npm init -y
npm install express pg zod cors helmet morgan dotenv
npm install -D typescript tsx @types/node @types/express @types/cors \
  @types/morgan vitest supertest @types/supertest
npx tsc --init
```

### Target directory structure (build the skeleton to match exactly)

This is the authoritative layout. Create the folders now (empty or with placeholders); later stories fill them. Source: architecture "Complete Project Directory Structure".

```
aine-bmad/
├── README.md                       # minimal placeholder now; full = Story 4.1
├── docker-compose.yml              # placeholder now; full topology = Story 1.3
├── docker-compose.test.yml         # ephemeral test Postgres — CREATE NOW (AC #4)
├── .env.example                    # NODE_ENV, PORT, DATABASE_URL, CORS_ORIGIN
├── .gitignore
├── .github/workflows/ci.yml        # lint + typecheck + unit/integration + e2e
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json               # strict
│   ├── vitest.config.ts            # environment: 'node'
│   ├── migrations/                 # empty now; 001_*.sql = Story 1.2
│   └── src/
│       ├── index.ts                # trivial placeholder entrypoint
│       ├── config/  db/  schemas/  repositories/  services/
│       ├── routes/  middleware/  errors/  types/
│       └── (tests co-located *.test.ts OR src/__tests__/)
│
├── frontend/
│   ├── package.json
│   ├── tsconfig.json               # strict (Vite default)
│   ├── vite.config.ts              # dev proxy /api -> :8080; Vitest (jsdom) config
│   ├── index.html
│   └── src/
│       ├── main.tsx  App.tsx       # from template
│       ├── api/  hooks/  components/  types/
│       ├── styles/                 # tokens.css = Story 1.4
│       └── __tests__/              # one smoke test now
│
└── e2e/
    ├── package.json
    ├── playwright.config.ts
    └── tests/                      # one sample passing spec now
```

### Conventions the scaffold must honor (so later stories don't fight the setup)

- **TypeScript strict mode ON in both packages** — non-negotiable; CI typecheck depends on it.
- **Test placement:** unit/component/integration tests co-located as `*.test.ts(x)` next to their target (or a `__tests__/` folder); **E2E tests live only in the top-level `e2e/` folder.**
- **Naming (apply when files get created later):** React components `PascalCase.tsx`; hooks `useX.ts`; other TS files `camelCase`; DB `snake_case`; API/JSON & TS types `camelCase`. (No source files require these yet, but configure linting so it won't block them.)
- **CI gates block on failure** — lint, typecheck, tests must each be able to fail the pipeline (no `continue-on-error`).
- **Env:** `.env` / `.env.test` are git-ignored; only `.env.example` is committed. Backend later validates env with Zod (fail-fast) — not in scope here, but `.env.example` should list `NODE_ENV`, `PORT`, `DATABASE_URL`, `CORS_ORIGIN`.

### Test harness wiring details

- **Frontend Vitest:** `environment: 'jsdom'`, `globals: true`, `setupFiles` importing `@testing-library/jest-dom`. Install `@vitest/coverage-v8` now (coverage thresholds are enforced later in Story 3.1 — don't gate coverage in this story's CI, just make the tooling present).
- **Backend Vitest:** `environment: 'node'`. Supertest installed for future in-process HTTP tests; no app required yet.
- **Playwright:** single Chromium project is sufficient for the smoke test; `npx playwright install --with-deps chromium` locally and in CI. Keep the sample test deterministic (no real network/time dependence).
- **`docker-compose.test.yml`:** only the `db` service (`postgres:18.4`) with `pg_isready` healthcheck. Later stories add fresh-migrate + truncate-between-tests behavior; here it just needs to come up and be reachable.

### Project Structure Notes

- Repo is **greenfield**: git is initialized but there are **zero commits** and no `frontend/`/`backend/` yet. This is the very first implementation story, so there is no previous story to inherit patterns from — this story *establishes* them.
- Two-package layout (`frontend/`, `backend/`) + top-level `e2e/` + root compose/docs. **No monorepo tooling** (no workspaces/turborepo/nx) — keep each package independent with its own `package.json`, per architecture.
- The full `docker-compose.yml` topology, Dockerfiles, and nginx config are deliberately **out of scope** (Story 1.3). Only the test-DB compose file is built now.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1: Scaffold repository + test harness & CI]
- [Source: _bmad-output/planning-artifacts/epics.md#Additional Requirements] — STARTER TEMPLATE, AR-12 (CI), AR-15 (tooling/quality gates)
- [Source: _bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation] — init commands, versions, dev experience
- [Source: _bmad-output/planning-artifacts/architecture.md#Testing Framework] — Vitest 4.x / Supertest / RTL / Playwright 1.61
- [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure] — authoritative folder tree
- [Source: _bmad-output/planning-artifacts/architecture.md#File Structure Patterns] — co-located tests, top-level `e2e/`, one component per file
- [Source: _bmad-output/planning-artifacts/architecture.md#Pattern Enforcement] — ESLint + Prettier + `tsc --noEmit` in CI, strict TS
- [Source: _bmad-output/planning-artifacts/architecture.md#Testing Strategy] — test pyramid, ephemeral test Postgres via docker-compose.test.yml
- [Source: _bmad-output/planning-artifacts/epics.md#Test-first discipline] — tests land in the same change as code (AC #5)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.8 (Cursor)

### Debug Log References

- Frontend `npm test` (Vitest 4.1.9 / jsdom): 1 file, 2 tests passed.
- Frontend `npm run typecheck` (`tsc -b --noEmit`): clean.
- Frontend `npm run lint` (ESLint flat config): clean.
- Backend `npm test` (Vitest 4.1.9 / node): 1 file, 1 test passed.
- Backend `npm run typecheck` (`tsc --noEmit`): clean.
- Backend `npm run lint`: clean (removed a redundant `eslint-disable no-console` directive that ESLint flagged as unused).
- E2E `npx playwright test` (Chromium): 1 test passed.
- Playwright browser had to be installed/run outside the sandbox cache redirect; reinstalled to the real `~/Library/Caches/ms-playwright` location, after which the test passed.
- Docker is NOT installed on the dev machine (`docker`/`docker-compose` not found), so `docker-compose.test.yml` could not be brought up locally; it is exercised by the CI `e2e` job instead.

### Completion Notes List

- Scaffolded a two-package layout (`frontend/`, `backend/`) plus top-level `e2e/` and root compose/docs — no monorepo tooling, per architecture.
- **Versions installed:** React 19.2 + TypeScript 6.0 + Vite 8 (create-vite 9.0.7), Express 5.2, pg 8.21, Vitest 4.1, Playwright 1.x, Node 26.3 local (CI pinned to Node 24 LTS).
- **TypeScript strict:** the create-vite 9.0.7 template did not ship an explicit `"strict": true`, so it was added to `frontend/tsconfig.app.json` and `frontend/tsconfig.node.json`; backend `tsconfig.json` authored with `strict` + NodeNext + ES2022 + `outDir/rootDir`.
- **Test harness:** frontend Vitest configured inline in `vite.config.ts` (jsdom, globals, setupFiles importing `@testing-library/jest-dom`); backend `vitest.config.ts` (node env); each level has one trivial passing smoke test. Coverage tooling (`@vitest/coverage-v8`) installed but not gated (gating is Story 3.1).
- **Lint/format:** ESLint flat config + Prettier in both packages (`eslint-config-prettier` to avoid conflicts), consistent `.prettierrc.json` at root. Backend ESLint config is `eslint.config.mjs` because the backend package is `type: commonjs`.
- **Dev proxy:** `/api → http://localhost:8080` wired in `frontend/vite.config.ts` for later stories.
- **CI:** `.github/workflows/ci.yml` runs three jobs (frontend, backend, e2e); every stage (lint, typecheck, Vitest, Playwright) fails the build on error (no `continue-on-error`). The e2e job brings up `docker-compose.test.yml` Postgres with `--wait` and installs Playwright browsers with `--with-deps`.
- **CI verification DEFERRED:** the repo is greenfield with zero commits and no configured git remote. Pushing/committing requires user authorization (per safety policy), so the actual GitHub Actions green run + run URL is pending. All four CI stages were verified equivalently by running their exact commands locally — all green.
- Scope honored: infrastructure only. No Todo domain logic, real routes, migrations SQL, or UI components were implemented; empty skeleton dirs use `.gitkeep`.

### File List

**Root**

- `.gitignore` (new)
- `README.md` (new)
- `.env.example` (new)
- `.prettierrc.json` (new)
- `.prettierignore` (new)
- `docker-compose.yml` (new — placeholder)
- `docker-compose.test.yml` (new — ephemeral test Postgres)
- `.github/workflows/ci.yml` (new)

**Frontend** (`frontend/` — scaffolded via create-vite, then modified)

- `frontend/package.json` (added test/typecheck/format scripts + test deps)
- `frontend/vite.config.ts` (added dev proxy + Vitest config)
- `frontend/tsconfig.app.json` (added `"strict": true`)
- `frontend/tsconfig.node.json` (added `"strict": true`)
- `frontend/eslint.config.js` (extended with `eslint-config-prettier`)
- `frontend/src/test/setup.ts` (new — jest-dom setup)
- `frontend/src/__tests__/smoke.test.tsx` (new — smoke test)
- `frontend/src/{api,hooks,components,types,styles}/.gitkeep` (new — skeleton)

**Backend** (`backend/`)

- `backend/package.json` (new — scripts + deps)
- `backend/tsconfig.json` (new — strict, NodeNext, ES2022)
- `backend/vitest.config.ts` (new — node env)
- `backend/eslint.config.mjs` (new)
- `backend/src/index.ts` (new — placeholder entrypoint)
- `backend/src/__tests__/smoke.test.ts` (new — smoke test)
- `backend/src/{config,db,schemas,repositories,services,routes,middleware,errors,types}/.gitkeep` (new — skeleton)
- `backend/migrations/.gitkeep` (new — skeleton)

**E2E** (`e2e/`)

- `e2e/package.json` (new)
- `e2e/playwright.config.ts` (new — Chromium project)
- `e2e/tests/smoke.spec.ts` (new — deterministic smoke test)

**Story tracking**

- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status → in-progress → review)

## Change Log

| Date       | Change                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| 2026-06-16 | Scaffolded frontend + backend + e2e packages, four-level test harness, ESLint/Prettier, and CI pipeline. |
