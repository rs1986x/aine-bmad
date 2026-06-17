---
baseline_commit: c723153
---

# Story 1.3: One-command Docker Compose bring-up

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user/operator,
I want `docker compose up` to start the whole stack (db → backend → frontend) in health-gated order,
so that the app is usable at `http://localhost:8080` with a single command on any clean machine with Docker — no manual wiring, no per-service setup (NFR-6, D-5).

## Acceptance Criteria

1. **Given** Docker installed, **When** I run `docker compose up` from the repo root, **Then** `db` → `backend` → `frontend` start in health-gated order (`depends_on: condition: service_healthy`) and the app is reachable in a browser at `http://localhost:8080`.
2. **Given** the running stack, **When** the browser calls `/api/*` (e.g. `/api/health`, `/api/todos`), **Then** nginx in the frontend container reverse-proxies the request to the `backend` service — one browser origin (`localhost:8080`), so no runtime CORS is involved.
3. **Given** the `db` container is restarted while the stack runs, **When** the backend reconnects, **Then** `/api/health` returns to `200 {status:"ok",db:"up"}` and previously written data is still present (Postgres writes to a **named volume** `db-data`).
4. **Given** the backend image, **When** inspected, **Then** it runs as the **non-root `node` user** with **production-only dependencies** (`npm ci --omit=dev`), compiled `dist/` (no `tsx`/TypeScript at runtime), and the `migrations/` directory present so the startup runner finds `001_create_todos.sql`.
5. **Given** the frontend image, **When** built, **Then** it is a multi-stage build (`vite build` → static assets served by `nginx:stable-alpine`); only the `frontend` host port is published (`8080:80`); the `backend` and `db` ports are **not** published to the host.
6. **Given** the verification harness, **When** CI runs the compose-smoke job, **Then** it builds all images, brings the stack up health-gated, polls `/api/health` until `200`, fetches `http://localhost:8080/` (nginx serves the SPA) and `http://localhost:8080/api/health` (proxied), asserts both succeed, then tears the stack down (`down -v`, `if: always()`).

> Scope note: This story delivers **only the containerization + one-command bring-up**: `backend/Dockerfile` + `backend/.dockerignore`, `frontend/Dockerfile` + `frontend/nginx.conf` + `frontend/.dockerignore`, the real `docker-compose.yml` (replacing the empty placeholder), and a CI compose-smoke job. Do **NOT** add new app features, routes, components, or migrations. The frontend has **no real UI yet** (Story 1.4 builds `tokens.css`/`App`/`useTodos`); `vite build` compiles the current Vite-template `App.tsx`, which is sufficient to prove nginx serves static assets and proxies `/api`. Do **NOT** touch `docker-compose.test.yml` (it is the integration-test DB, owned by 1.1/1.2 and used by the backend/e2e CI jobs).

## Tasks / Subtasks

- [x] **Task 1: Backend production image** (AC: #4)
  - [x] Create `backend/.dockerignore` excluding `node_modules`, `dist`, `coverage`, `.env`, `.env.test`, `*.local`, `.git`, `**/*.test.ts`, `src/__tests__`, `vitest.config.ts`, `eslint.config.mjs` (keep the image lean; never bake secrets).
  - [x] Create `backend/Dockerfile` as a **multi-stage** build on `node:24-alpine` (matches `engines.node >=24` and the locked Node 24 LTS):
    - **build stage:** `WORKDIR /app`; `COPY package.json package-lock.json ./`; `RUN npm ci`; `COPY tsconfig.json tsconfig.build.json ./`; `COPY src ./src`; `COPY migrations ./migrations`; `RUN npm run build` (→ `dist/`, uses `tsconfig.build.json` which excludes test files).
    - **runtime stage:** `node:24-alpine`; `WORKDIR /app`; `COPY package.json package-lock.json ./`; `RUN npm ci --omit=dev`; `COPY --from=build /app/dist ./dist`; `COPY --from=build /app/migrations ./migrations`; `ENV NODE_ENV=production`; `USER node`; `EXPOSE 8080`; `CMD ["node", "dist/index.js"]`.
  - [x] **Critical:** `migrations/` MUST sit at `/app/migrations` in the runtime image. The runner resolves the dir as `__dirname/../../migrations`; at runtime `dist/db/migrate.js` → `../../` → `/app`, so `/app/migrations` is where it looks. If migrations are missing the boot crashes on `readdirSync`.
  - [x] Confirm `node dist/index.js` is the entrypoint (the compiled `src/index.ts`), and that the runtime stage has **no** `tsx`/`typescript`/`@types/*` (they are devDeps, omitted by `--omit=dev`).
- [x] **Task 2: Frontend production image (nginx static + reverse proxy)** (AC: #2, #5)
  - [x] Create `frontend/.dockerignore` excluding `node_modules`, `dist`, `coverage`, `.env*`, `*.local`, `.git`, `playwright-report`, `test-results`.
  - [x] Create `frontend/nginx.conf` (server block): listen `80`; `root /usr/share/nginx/html`; SPA fallback `location / { try_files $uri $uri/ /index.html; }`; reverse proxy `location /api/ { proxy_pass http://backend:8080; }` with `proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme;`. **Do not** put a path/trailing slash on `proxy_pass` — `proxy_pass http://backend:8080;` (no URI) forwards the full original path unchanged, so `/api/health` → `backend:8080/api/health` (the backend mounts routes under `/api`).
  - [x] Create `frontend/Dockerfile` as a **multi-stage** build:
    - **build stage:** `node:24-alpine`; `WORKDIR /app`; `COPY package.json package-lock.json ./`; `RUN npm ci`; `COPY . .`; `RUN npm run build` (`tsc -b && vite build` → `dist/`).
    - **runtime stage:** `nginx:stable-alpine`; `COPY --from=build /app/dist /usr/share/nginx/html`; `COPY nginx.conf /etc/nginx/conf.d/default.conf`; `EXPOSE 80` (nginx's default `CMD` runs the server).
- [x] **Task 3: Real `docker-compose.yml` (replace the placeholder)** (AC: #1, #3, #5)
  - [x] Replace the `services: {}` placeholder with the 3-service topology from the architecture's "Docker Compose Topology":
    - `db`: `image: postgres:18.4`; `environment: POSTGRES_USER/PASSWORD/DB = todo`; `volumes: - db-data:/var/lib/postgresql/data`; `healthcheck: pg_isready -U todo -d todo` (interval 5s, timeout 3s, retries 10). **No `ports:`** (not published to host).
    - `backend`: `build: ./backend`; `environment: NODE_ENV=production, PORT=8080, DATABASE_URL=postgres://todo:todo@db:5432/todo, CORS_ORIGIN=http://localhost:8080`; `depends_on: db: { condition: service_healthy }`; `healthcheck` using Node global `fetch` (see Dev Notes for the exact one-liner). **No `ports:`** (only reachable via nginx).
    - `frontend`: `build: ./frontend`; `ports: - "8080:80"` (the only published port); `depends_on: backend: { condition: service_healthy }`; optionally a `healthcheck` (`wget -qO- http://localhost/ || exit 1`) so `docker compose up --wait` also gates on the frontend.
    - top-level `volumes: db-data:`.
  - [x] **CORS_ORIGIN must be `http://localhost:8080`** here (the browser's origin in the compose stack), NOT `:5173` (that's the Vite dev value in `.env.example`). In the running stack everything is same-origin via nginx, so CORS isn't actually exercised — but set the correct value anyway.
  - [x] Env is set **inline** in compose (`environment:` blocks) so `docker compose up` needs no `.env` file — that is what makes it truly one-command. (`backend/src/config/env.ts` calls `dotenv.config({path:'.env'})`, which harmlessly no-ops when no file exists; the real values come from `process.env` injected by compose.)
- [x] **Task 4: CI compose-smoke verification** (AC: #6)
  - [x] Add a `compose-smoke` job to `.github/workflows/ci.yml` that: `docker compose up -d --build --wait` (or `up -d --build` then poll), polls `http://localhost:8080/api/health` until `200` (bounded retry loop with timeout), asserts `curl -fsS http://localhost:8080/` succeeds (SPA served) and `curl -fsS http://localhost:8080/api/health` returns `{"status":"ok","db":"up"}` (proxy works), then `docker compose down -v` with `if: always()`. Also dump `docker compose logs` on failure for diagnosis.
  - [x] Keep this job independent of the existing `frontend`/`backend`/`e2e` jobs; it must **fail the build** if bring-up or the health/proxy checks fail (no `continue-on-error`).
  - [x] **Do not** modify `docker-compose.test.yml` or the existing jobs' Postgres wiring.
- [x] **Task 5: Docs + dev workflow note** (AC: #1)
  - [x] Add a short "Run the full stack" note to `README.md` (`docker compose up --build`, then open `http://localhost:8080`; stop with `docker compose down`, wipe data with `down -v`). Keep it brief — the full README is Story 4.1.
  - [x] (Optional, recommended) Clarify in `.env.example` that `CORS_ORIGIN=http://localhost:5173` is the **local Vite-dev** value, while the **compose** stack uses `http://localhost:8080` (set inline in `docker-compose.yml`). Do not commit any real `.env`.
- [x] **Task 6: Verify** (AC: #1–#6)
  - [x] **If Docker is available locally:** `docker compose up --build` → wait for all healthy → open `http://localhost:8080` (SPA loads) → `curl localhost:8080/api/health` → `200 {status:"ok",db:"up"}` → `curl localhost:8080/api/todos` → `200 []` → restart db (`docker compose restart db`), confirm health recovers and data persists → `docker image inspect` / `docker compose exec backend whoami` shows non-root `node`. Capture logs + screenshot for QA evidence. _(Docker NOT available locally — performed static verification instead; see Completion Notes.)_
  - [x] **If Docker is NOT available locally (current dev machine — see Previous Story Intelligence):** do NOT fake the bring-up. Verify what you can statically (Dockerfile/compose/nginx syntax via `docker compose config` if the CLI is present even without a daemon, or careful manual review), and rely on the CI `compose-smoke` job (Task 4) as the authoritative proof. State this honestly in Completion Notes.
  - [x] `docker compose config` (if available) parses the compose file without errors; YAML is valid. _(Docker CLI absent; validated YAML parses via a YAML parser and reviewed the compose semantics — see Completion Notes.)_

## Dev Notes

### What this story IS / IS NOT

- **IS:** `backend/Dockerfile` (multi-stage, non-root, prod-only deps, migrations bundled), `frontend/Dockerfile` (multi-stage `vite build` → nginx), `frontend/nginx.conf` (static + `/api` reverse proxy), `frontend/.dockerignore`, `backend/.dockerignore`, the real `docker-compose.yml` (3 services, health-gated, named volume, single published port), a CI `compose-smoke` job, and a README run note.
- **IS NOT:** any new app code, routes, services, repositories, schemas, components, hooks, or migrations. No changes to `docker-compose.test.yml`, the backend/frontend/e2e CI jobs, or the existing app source. No `POST/PATCH/DELETE` (Epic 2), no real frontend UI (Story 1.4). The Vite-template `App.tsx` is fine to ship for this story — it only needs to prove nginx serves static + proxies `/api`.

### Current state of files this story changes (read before editing)

- `docker-compose.yml` — **placeholder** with literally `services: {}` and a comment saying full topology is Story 1.3. **Replace it entirely** with the real topology.
- `docker-compose.test.yml` — the ephemeral integration-test DB (single `db`, `postgres:18.4`, host `5432:5432`, `tmpfs`). **Leave untouched** — it's a different file with a different purpose (CI test DB), not the production stack.
- `backend/` — has the full working app from Story 1.2: `src/index.ts` (entrypoint: env → `runMigrations(pool)` → `createApp().listen(env.PORT)`), `src/app.ts` (`createApp()` factory, helmet/cors/json-limit/morgan + routes + error envelope), `src/routes/health.routes.ts` (`GET /api/health` → `SELECT 1` → `200 {status:"ok",db:"up"}` / `503`), `migrations/001_create_todos.sql`, `tsconfig.json` + `tsconfig.build.json`. **No Dockerfile yet.** `build` script = `tsc -p tsconfig.build.json`.
- `frontend/` — Vite `react-ts` app (React 19.2 / TS 6.0 / Vite 8). `build` = `tsc -b && vite build` (outputs to `dist/` by default). `vite.config.ts` already proxies `/api → http://localhost:8080` **for local dev only** (irrelevant in the compose stack — nginx does the proxying there). **No Dockerfile / nginx.conf yet.** App is the untouched Vite template.
- `.github/workflows/ci.yml` — three jobs (frontend, backend, e2e). The backend + e2e jobs already use `docker compose -f docker-compose.test.yml up -d --wait` / `down -v` — copy that pattern for the new `compose-smoke` job, but against the **production** `docker-compose.yml`.
- `.env.example` — root file: `NODE_ENV`, `PORT=8080`, `DATABASE_URL=postgres://todo:todo@localhost:5432/todo`, `CORS_ORIGIN=http://localhost:5173`. The compose stack overrides these inline (notably `DATABASE_URL` host `db` not `localhost`, and `CORS_ORIGIN` `:8080`).

### Architecture rules this story MUST honor (hard guardrails)

- **3-service topology, health-gated ordering** db → backend → frontend via `depends_on: condition: service_healthy`. This is what makes one `docker compose up` reliable (NFR-6). [architecture: Docker Compose Topology]
- **Single published port:** only `frontend` publishes `8080:80`. `backend` and `db` are reachable only on the private compose network by service name (`backend`, `db`). The DB is never reachable from the browser. [architecture: Architectural Boundaries, Docker Compose Topology]
- **nginx reverse-proxies `/api/*` → `backend:8080`** so the browser sees one origin (no runtime CORS). [architecture: Infrastructure & Deployment]
- **Backend container hardening:** non-root `node` user, `npm ci --omit=dev` (prod-only deps), multi-stage build (compile TS → run `dist/` on node). [architecture: Security Considerations, Infrastructure & Deployment; AR-10, AR-13]
- **Named volume `db-data`** for Postgres durability — survives container restart/recreation (FR-6, NFR-4). [architecture: Persistence Strategy]
- **Images & versions (locked):** `postgres:18.4`, `nginx:stable-alpine` (1.30.2), Node 24 (`node:24-alpine`). Do not substitute. [architecture: Infrastructure & Deployment, Coherence Validation]

### Exact compose shape (from architecture — adapt, keep values)

```yaml
services:
  db:
    image: postgres:18.4
    environment:
      POSTGRES_USER: todo
      POSTGRES_PASSWORD: todo
      POSTGRES_DB: todo
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U todo -d todo"]
      interval: 5s
      timeout: 3s
      retries: 10

  backend:
    build: ./backend
    environment:
      NODE_ENV: production
      PORT: 8080
      DATABASE_URL: postgres://todo:todo@db:5432/todo
      CORS_ORIGIN: http://localhost:8080
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "node -e \"fetch('http://localhost:8080/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""]
      interval: 10s
      timeout: 3s
      retries: 5

  frontend:
    build: ./frontend
    ports:
      - "8080:80"
    depends_on:
      backend:
        condition: service_healthy

volumes:
  db-data:
```

- The backend healthcheck uses Node's **global `fetch`** (Node 18+, so fine on Node 24) — no `curl`/`wget` needed in the slim node image. `/api/health` already does `SELECT 1`, so a `200` means the DB is up too (readiness, not just liveness).
- An optional `frontend` healthcheck (`["CMD-SHELL", "wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1"]`) lets `docker compose up --wait` also wait for nginx; `wget` is available via busybox in `nginx:stable-alpine`.

### Backend Dockerfile — critical details

- **Runtime port:** the app listens on `env.PORT` (compose sets `PORT=8080`). `EXPOSE 8080` is documentation; the value comes from the env var, so don't hardcode a different port in the app.
- **Migrations bundling:** copy `migrations/` into BOTH the build stage (so nothing is needed at build) and, more importantly, the runtime stage at `/app/migrations`. The runner does `join(__dirname, '..', '..', 'migrations')` → from `/app/dist/db/migrate.js` that's `/app/migrations`. Missing migrations = boot crash.
- **`dotenv` at runtime:** `env.ts` runs `dotenv.config({ path: '.env' })` unconditionally. In the container there is no `.env` (don't add one) — dotenv silently no-ops and the compose-injected `process.env` is used. This is expected and was confirmed harmless in the 1.2 review.
- **Build uses `tsconfig.build.json`** (already the `build` script) which excludes `**/*.test.ts` + `src/__tests__`, so no test files land in `dist/`. Don't run `tsc` directly.
- **Don't COPY `.env`/`.env.test`** into the image (the `.dockerignore` blocks them) — no secrets in images (AR-13).

### Frontend Dockerfile / nginx — critical details

- `npm run build` is `tsc -b && vite build`; Vite emits to `frontend/dist/`. The nginx stage serves that from `/usr/share/nginx/html`.
- **SPA fallback** (`try_files $uri $uri/ /index.html`) is needed so client-side paths resolve — though v1 has no router, it's the correct nginx pattern and harmless.
- **`proxy_pass http://backend:8080;`** (no trailing URI) forwards the unmodified request path. nginx resolves `backend` via Docker's embedded DNS; because `frontend` `depends_on` a healthy `backend`, the name resolves at nginx startup. (Avoid the variable-`proxy_pass` + `resolver` pattern — unnecessary here and a common foot-gun.)
- Map only `location /api/` to the proxy; everything else serves static. The backend mounts routes under `/api` (`/api/health`, `/api/todos`), so the proxied path must keep the `/api` prefix.

### Verification & test-first note (AC #6)

This is an **infrastructure** story: there is no red/green unit-test cycle and **no unit tests to write** — do not invent trivial tests to satisfy a discipline that doesn't apply here. The verification artifact is the **scripted bring-up smoke** (CI `compose-smoke` job): build → health-gated up → poll `/api/health` → assert SPA + proxied API respond → tear down. That job is the executable proof and must be added in the same change as the Dockerfiles/compose (the equivalent of "tests land with code"). The existing `frontend`/`backend`/`e2e` unit/integration/e2e suites are unaffected and must stay green.

### Previous story intelligence (1.1, 1.2)

- **Docker is NOT installed on this dev machine** (carried from 1.1 and 1.2 — `docker`/`docker compose` not found). So `docker compose up` cannot be run locally; the stack is proven by the CI `compose-smoke` job. **Do not fake a successful bring-up.** If the `docker` CLI is present without a daemon, `docker compose config` can still validate the file syntax.
- A git remote exists (`origin` → `github.com/rs1986x/aine-bmad`), so pushing actually runs CI (1.1 had none initially).
- 1.2 delivered the working backend (`createApp()`, `/api/health` with `SELECT 1`, migration runner with advisory lock + `_migrations` ledger, `pg.Pool` with an `error` listener). The health endpoint and migration-on-boot are exactly what the compose healthcheck and startup ordering rely on — no backend changes needed.
- 1.2 wired `docker-compose.test.yml` into the backend CI job. That's the **test** DB; this story's `docker-compose.yml` is the **production** stack — keep them separate.
- Toolchain is `type: commonjs` + NodeNext on the backend (`build` → `tsc -p tsconfig.build.json`), `engines.node >=24` everywhere. Frontend is `type: module`, Vite 8. Honor these in the Dockerfiles (`node:24-alpine`).
- Lint/typecheck gates must stay clean — but Dockerfiles/compose/nginx are not linted by the existing ESLint/tsc jobs, so the main risk is the new CI job itself being correct.

### Project Structure Notes

- New files land exactly where the architecture's directory tree places them: `backend/Dockerfile`, `backend/.dockerignore`, `frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/.dockerignore`, and the root `docker-compose.yml` (replaced). No new top-level structure. No changes under `backend/src`, `frontend/src`, or `e2e/`.
- `.env.example` already lists the four env vars; the per-package `backend/.env.example`/`frontend/.env.example` shown in the architecture tree were never created (root `.env.example` covers them) — do not add them unless needed.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3: One-command Docker Compose bring-up] — ACs, implementation tasks, test/QA expectations
- [Source: _bmad-output/planning-artifacts/epics.md#Additional Requirements] — AR-10 (containerization topology), AR-11 (one-command bring-up), AR-13 (security baseline: non-root, prod-only deps), AR-12 (CI)
- [Source: _bmad-output/planning-artifacts/architecture.md#Docker Compose Topology] — exact 3-service shape, healthchecks, depends_on ordering, single published port, named volume
- [Source: _bmad-output/planning-artifacts/architecture.md#Infrastructure & Deployment] — multi-stage builds, nginx static + `/api` reverse proxy, env config, image versions
- [Source: _bmad-output/planning-artifacts/architecture.md#Persistence Strategy] — named volume durability, startup migration runner
- [Source: _bmad-output/planning-artifacts/architecture.md#Health Checks] — db `pg_isready`, backend `/api/health` 200/503, frontend healthy once nginx serves
- [Source: _bmad-output/planning-artifacts/architecture.md#Security Considerations] — non-root `node` user, `npm ci --omit=dev`, no secrets in images
- [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure] — Dockerfile/nginx.conf/.dockerignore locations
- [Source: _bmad-output/implementation-artifacts/1-2-backend-foundation-db-migrations-repository-api-skeleton.md] — backend entrypoint, `createApp()`, health route, migration runner path resolution, Docker-not-local constraint
- [Source: _bmad-output/implementation-artifacts/1-1-scaffold-repository-test-harness-and-ci.md] — CI structure, compose patterns, Docker-not-local constraint
- [Source: backend/src/db/migrate.ts] — `migrationsDir()` resolves `__dirname/../../migrations` (drives the runtime COPY location)
- [Source: backend/src/index.ts] — env → migrate → `app.listen(env.PORT)` entrypoint
- [Source: backend/src/routes/health.routes.ts] — `/api/health` `SELECT 1` → 200/503 (backend healthcheck target)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.8 (Cursor) — dev-story workflow.

### Debug Log References

- `node test` (frontend, vitest): 2 passed — no regression from infra-only changes.
- YAML validation (pyyaml): `docker-compose.yml`, `.github/workflows/ci.yml`, and untouched `docker-compose.test.yml` all parse OK. Confirmed: services `db`/`backend`/`frontend`; only `frontend` publishes `8080:80`; `backend` and `db` have no host ports; `db-data` named volume present; backend healthcheck resolves to `node -e "fetch('http://localhost:8080/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"`; CI jobs now include `compose-smoke`.

### Completion Notes List

- **Infrastructure story — no unit tests added** (per Dev Notes "Verification & test-first note"). The executable proof is the CI `compose-smoke` job (build → health-gated up → poll `/api/health` → assert SPA + proxied API → tear down), which lands in the same change as the Dockerfiles/compose.
- **Docker is NOT installed on this dev machine** (`docker`/`docker compose` not found — carried from 1.1/1.2). The bring-up was **not** run or faked locally. Verification was done statically: YAML parses cleanly, port/volume/healthcheck topology asserted via parser, and Dockerfile/nginx semantics reviewed against the architecture guardrails. The CI `compose-smoke` job is the authoritative proof of a working one-command bring-up.
- **Backend image:** multi-stage `node:24-alpine`; runtime runs as non-root `node`, `npm ci --omit=dev` (no `tsx`/`typescript`/`@types` at runtime), compiled `dist/`, and `migrations/` bundled at `/app/migrations` (matches the runner's `__dirname/../../migrations` resolution → boot migration runner finds `001_create_todos.sql`). Entrypoint `node dist/index.js`.
- **Frontend image:** multi-stage `vite build` → `nginx:stable-alpine`; nginx serves static assets with SPA fallback and reverse-proxies `/api/*` to `backend:8080` using `proxy_pass http://backend:8080;` (no trailing URI, so the `/api` prefix is preserved). Ships the current Vite-template `App.tsx` (real UI is Story 1.4) — sufficient to prove nginx serves static + proxies `/api`.
- **Compose:** 3 services health-gated db → backend → frontend via `depends_on: condition: service_healthy`. Only `frontend` publishes `8080:80`; `backend`/`db` are private. Named volume `db-data` for Postgres durability (AC #3). Env set inline (no `.env` needed → truly one-command). `CORS_ORIGIN=http://localhost:8080` (the compose-stack browser origin), distinct from the `:5173` Vite-dev value.
- **`docker-compose.test.yml` left untouched** and existing `frontend`/`backend`/`e2e` CI jobs unmodified; `compose-smoke` is an independent job with no `continue-on-error` so it fails the build on any bring-up/health/proxy failure, dumps `docker compose logs` on failure, and tears down with `down -v` `if: always()`.

### File List

- `backend/.dockerignore` (new)
- `backend/Dockerfile` (new)
- `frontend/.dockerignore` (new)
- `frontend/nginx.conf` (new)
- `frontend/Dockerfile` (new)
- `docker-compose.yml` (modified — replaced `services: {}` placeholder with real 3-service topology)
- `.github/workflows/ci.yml` (modified — added `compose-smoke` job)
- `README.md` (modified — added "Run the full stack" note)
- `.env.example` (modified — clarified Vite-dev vs compose `CORS_ORIGIN`)

## Change Log

| Date       | Version | Description                                                                                          | Author |
|------------|---------|------------------------------------------------------------------------------------------------------|--------|
| 2026-06-17 | 0.1     | Story drafted: Dockerfiles (backend non-root multi-stage; frontend vite→nginx), real docker-compose.yml (3 services, health-gated, named volume, single published port), nginx /api reverse proxy, CI compose-smoke. Status → ready-for-dev. | Bob (SM) |
| 2026-06-17 | 1.0     | Implemented containerization + one-command bring-up: backend/frontend Dockerfiles + .dockerignores, frontend nginx.conf, real 3-service docker-compose.yml, CI compose-smoke job, README run note, .env.example CORS clarification. Static verification only (Docker absent locally; CI compose-smoke is the proof). Status → review. | Amelia (Dev) |

## Review Findings

_Code review (adversarial: Blind Hunter + Edge Case Hunter + Acceptance Auditor) — 2026-06-17. All 6 ACs and all architecture guardrails verified satisfied. 3 patches recommended (reliability/CI robustness), 1 deferred, 10 dismissed as noise/by-design._

- [x] [Review][Patch] No `restart:` policy on any service — a transient crash (or the Postgres first-init race) leaves the service down permanently, undermining the one-command bring-up. **FIXED:** added `restart: unless-stopped` to db/backend/frontend. Also mitigates the boot race since `index.ts` does a single `pool.connect()` then `process.exit(1)` with no retry. [docker-compose.yml: db/backend/frontend]
- [x] [Review][Patch] Backend healthcheck has no `start_period` — first probe at 10s with `retries: 5` (~50s budget) counts the legitimate boot window (migrations + listen) against retries, a classic source of flaky `--wait` failures. **FIXED:** added `start_period: 30s` to backend healthcheck and `start_period: 10s` to frontend. [docker-compose.yml: backend/frontend healthcheck]
- [x] [Review][Patch] CI `docker compose up --wait` has no `--wait-timeout` — a container stuck `starting`/unhealthy-but-alive can block until the GitHub job timeout instead of failing fast. **FIXED:** added `--wait-timeout 180`. [.github/workflows/ci.yml: compose-smoke]
- [x] [Review][Defer] nginx resolves `backend` upstream once at config load with no `resolver` — if the backend container is recreated with a new compose-network IP, nginx keeps proxying to the stale address (persistent 502) until reloaded. Out of this story's AC scope (AC3 restarts only `db`; backend stays up) and the spec explicitly chose the literal `proxy_pass` over the variable+`resolver` pattern. Deferred to a future story. [frontend/nginx.conf:7]
