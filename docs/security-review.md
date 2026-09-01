# D-9 — Security review report

Formal stakeholder deliverable for Story 4.3, based on the Story 3.3 baseline
review observed on **2026-08-28** against the source tree and a freshly built
production Compose stack. This report preserves that dated evidence; it does not
refresh the review or claim that dependencies or source remain unchanged.

## Executive conclusion

**Bounded conclusion:** Within the local, single-user v1 boundary, the verified
2026-08-28 evidence found the required baseline controls in place: Helmet
headers on the tested Express API responses, configured-origin CORS behavior, a
16 KB JSON-body limit, parameterized Todo SQL, generic unexpected-error
responses, a non-root production container with direct development dependencies
absent, tracked/runtime `.env*` filename checks, and zero findings from each of
the backend, frontend, and E2E dependency audits at that point in time.

This is **not** a public-deployment or production-readiness approval. The
application has no authentication, authorization, or per-user isolation. CORS
is not an authorization control. TLS, rate limiting, public-network hardening,
and container/OS image vulnerability scanning are excluded, and dependency
safety is not permanent. The reviewed deployment boundary is a single-user
instance intended for access from its host only; this is a scope statement, not
a guarantee of safety. Docker-published ports can be reachable from the local
network depending on host configuration, so port `8080` must not be exposed
beyond the intended host. Broader deployment requires the future hardening
described below and an independent review.

## Evidence labels

- **Verified (2026-08-28):** observed in the dated Story 3.3 source, test, audit,
  or production-style Compose inspection.
- **Historical:** preserved evidence from that review; it was not repeated for
  Story 4.3.
- **Point-in-time:** a registry or runtime result that may change after the
  observation date.
- **Attestation:** an inspected design property or future-hardening path, not an
  executed security control.
- **Excluded / unverified:** outside the local v1 review boundary; no security
  conclusion is inferred.
- **Reproducibility:** committed source, tests, Dockerfile, and CI commands that
  can produce a new result.

All observed results below are **Historical — verified on 2026-08-28** unless
explicitly labeled point-in-time, attestation, excluded, or reproducibility.
Methods identify the committed evidence that supports each result.

Generated CI evidence is retained for seven days. The exact source revision for
the 2026-08-28 review was not recorded, so its generated artifacts cannot be
tied to an immutable revision or assumed to remain downloadable. This archival
limitation does not alter the dated observed results, but it limits independent
verification of that historical review; the methods below produce new
point-in-time results.

## HTTP headers and CORS

- **Method — Reproducibility:** `backend/src/__tests__/security.api.test.ts`
  drives `createApp()` through Supertest. It checks successful registered
  `/api/health` responses,
  the 404 fallback, an unexpected 500 response, and JSON Todo write preflights.
- **Observed result — Verified (2026-08-28):** the tested Express API
  successful, not-found, and unexpected-error responses carried Helmet's
  Content Security Policy, `X-Content-Type-Options: nosniff`, and
  `X-Frame-Options: SAMEORIGIN`. `X-Powered-By` was absent. This evidence does
  not establish the headers returned by nginx for frontend or static-asset
  responses.
- **Observed result — Verified (2026-08-28):** a request from the configured
  origin received that exact value in `Access-Control-Allow-Origin` on a
  successful registered route. The
  tests derive an origin guaranteed to differ from the configured value; that
  origin was never reflected or granted, credentials remained disabled, and
  browsers therefore cannot grant it access.
- **Observed result — Verified (2026-08-28):** configured-origin and
  untrusted-origin `OPTIONS` preflights for `/api/todos` returned 204 and
  advertised the requested
  supported `POST`/`PATCH` methods and `content-type`/`idempotency-key` headers.
  The untrusted preflight still received only the configured ACAO value, never
  the untrusted origin, so the browser cannot grant it write access.

## Request limits, validation, and error hygiene

- **Method — Reproducibility:** the backend coverage suite exercises the 16 KB
  JSON parser limit, malformed JSON, route-level Zod validation, and an
  unexpected repository failure.
- **Observed result — Verified (2026-08-28):** a body over 16 KB returned HTTP
  413 with
  `{ "error": { "code": "PAYLOAD_TOO_LARGE", "message": "Request payload too large." } }`
  and persisted nothing. Covered invalid-write cases—missing, empty,
  whitespace-only, overlong, wrong-type, malformed-JSON, and invalid UUID
  inputs—returned the uniform validation or bad-request envelope and did not
  mutate data. This does not include every possible invalid string; the NUL case
  is an explicit residual risk below.
- **Observed result — Verified (2026-08-28):** a forced database failure
  returned only the generic HTTP 500 envelope
  `{ "error": { "code": "INTERNAL", "message": "Something went wrong." } }`.
  The thrown database detail and stack were absent from the response; the error
  handler logs the original error server-side.

## SQL parameterization and ownership

- **Method — Reproducibility:** every runtime `pool.query` and `client.query`
  call under `backend/src` was inspected, together with all migration SQL and
  repository
  bind-argument tests.
- **Observed result — Verified (2026-08-28):** route and service modules contain
  no SQL. Todo SQL is owned by `todo.repository.ts`; create binds description
  and idempotency key,
  update binds description, completion, and UUID, and delete binds UUID. The
  repository tests assert the placeholders and argument arrays for all
  user-controlled write values.
- **Observed result — Verified (2026-08-28):** the health query, transaction
  commands, migration ledger DDL, and repository list query are constant SQL.
  Migration filenames are
  bound in ledger reads and writes. SQL loaded from `backend/migrations/*.sql`
  is trusted static application input and contains no user-controlled values.

## Dependency audits — Point-in-time

- **Method — Reproducibility:** `npm audit --audit-level=high` was run
  independently against the backend, frontend, and E2E lockfiles after
  compatible transitive dependency
  updates. CI repeats each audit with JSON output and uploads one artifact per
  package whether the audit passes or fails.
- **Observed result — Verified point-in-time (2026-08-28):** all three audits
  exited zero and reported zero vulnerabilities, including zero high and zero
  critical findings. No forced
  upgrade or declared dependency compatibility change was used.

## Secrets boundary

- **Method — Reproducibility:** CI enumerates tracked `.env*` files at any depth
  and rejects every result except the root `.env.example`. It also recursively
  scans
  application-owned paths under `/app` in the built backend image for every
  filename beginning with `.env`; third-party `node_modules` internals are not
  treated as application configuration.
- **Observed result — Verified (2026-08-28):** `.env.example` is the only
  tracked `.env*` file and no `.env*` file exists in the built backend
  application's runtime filesystem. CI
  audit JSON contains package metadata only and is uploaded rather than
  committed.
- **Scope limitation — Excluded / unverified:** these checks inspect `.env*`
  filenames in tracked files and the application-owned runtime filesystem. No
  general source-content, Git-history, log, build-argument, credential, or
  secret-value scanner was performed.

## Runtime container posture

- **Method — Reproducibility:** the production images were rebuilt with
  `docker compose up -d --build --wait`. The running backend container was
  queried with `id -u`; every direct key in `package.json`'s `devDependencies`
  was checked against runtime `node_modules`; application-owned `/app` paths
  were recursively checked for `.env*` files. CI performs these assertions in
  the existing Compose smoke lifecycle.
- **Observed result — Verified point-in-time (2026-08-28):** the stack became
  healthy, `/api/health` returned `{"status":"ok","db":"up"}`, the backend UID
  was non-zero, every direct
  development dependency was absent from runtime `node_modules`, and no
  `.env*` application file was present. The runtime build uses
  `npm ci --omit=dev` and `USER node`. The verification stack and volume were
  removed after inspection.

## NFR-5 future-user extensibility — Attestation and hardening path

The current Todo identifier is a UUID, so it remains stable when user ownership
is introduced and does not encode single-user ordering or identity. A future
migration can first add a nullable `user_id`, its foreign key, and an ownership
index. During the mixed state, new writes must receive ownership while existing
rows are backfilled in phases; reads and writes must handle the nullable column
until the backfill is verified. Only then should the migration validate
ownership and enforce `NOT NULL`, without changing existing Todo columns or UUID
values.

The current partial unique index makes each non-null `idempotency_key` globally
unique. Before multi-user writes are enabled, that index must be replaced with
user-scoped uniqueness such as `(user_id, idempotency_key)` so different users
can safely reuse a key while retries remain unique within one user's scope.

Authentication middleware can be mounted before `/api` Todo routes and attach
the authenticated user identity to the request. The existing route paths and
request bodies do not need to change. Routes continue to parse HTTP input,
services continue to own application behavior, and repository methods gain the
user identifier as an additional argument. Repository queries then scope every
list, create, update, and delete by `user_id`, keeping SQL in the repository and
preventing cross-user access without rewriting current Todo behavior.

## Reproduce a new point-in-time review

These commands produce current results in an isolated Compose project; they do
not replace or extend the dated 2026-08-28 observations. The script forces its
own project name and compose file so an inherited `COMPOSE_PROJECT_NAME` or
`COMPOSE_FILE` cannot target another stack. Host port `5432` must be free.

```bash
(
  set -eu
  ROOT=$(git rev-parse --show-toplevel)
  cd "$ROOT"
  COMPOSE_PROJECT_NAME="aine-bmad-security-review-$(date +%Y%m%d%H%M%S)-$$"
  export COMPOSE_PROJECT_NAME
  unset COMPOSE_FILE
  cleanup() {
    (cd "$ROOT" && docker compose -f docker-compose.test.yml --project-directory "$ROOT" down -v --remove-orphans)
  }
  trap cleanup EXIT
  trap 'exit 129' HUP
  trap 'exit 130' INT
  trap 'exit 143' TERM
  cleanup
  (cd backend && npm ci)
  docker compose -f docker-compose.test.yml --project-directory "$ROOT" up -d --wait --wait-timeout 180
  (
    cd backend
    NODE_ENV=test PORT=8080 \
      DATABASE_URL=postgres://todo:todo@localhost:5432/todo \
      CORS_ORIGIN=http://localhost:5173 \
      npm test -- --run \
        src/__tests__/security.api.test.ts \
        src/__tests__/todo.api.test.ts \
        src/__tests__/todo.repository.test.ts
  )
)
```

Run the three independent lockfile audits:

```bash
(cd backend && npm audit --audit-level=high)
(cd frontend && npm audit --audit-level=high)
(cd e2e && npm audit --audit-level=high)
```

The non-root user, production-only direct dependencies, tracked `.env*`
allowlist, runtime secret-file exclusion, and healthy production stack are
reproduced by the `compose-smoke` job in `.github/workflows/ci.yml`, using
`backend/Dockerfile` as the image definition.

## Residual risks

- **Reviewed deployment boundary:** The application intentionally has no
  authentication or authorization. The review covers a single-user instance
  intended for host-only access; it does not guarantee safety even within that
  boundary. CORS is a browser control, not an authorization mechanism.
- **Published-port exposure:** Compose publishes port `8080`. Depending on Docker
  and host firewall configuration, other devices on the LAN may be able to reach
  the unauthenticated application. Do not expose the port beyond the intended
  host.
- **Invalid NUL input:** A description containing `\u0000` passes the current
  Zod string checks, reaches PostgreSQL, and returns the generic HTTP 500
  envelope instead of the intended 400 validation response. Internals remain
  hidden and the write is not persisted, but the input contract is inconsistent.
- **Excluded controls:** TLS, rate limiting, public-network exposure hardening,
  and per-user data isolation are not implemented. The stack must not be exposed
  as a public
  service in this state.
- **Point-in-time risk:** Dependency audit results are registry evidence. New
  advisories can change the result, which is why CI reruns and preserves all
  three reports.
- **Excluded scan:** The runtime check proves non-root execution,
  production-only npm installation, and secret-file exclusion. It is not an
  operating-system package or container image vulnerability scan.
- **Frontend/static headers:** Helmet evidence covers the tested Express API
  responses only. Headers returned by nginx for frontend or static-asset
  responses were not reviewed.
- **Secret-value scanning:** `.env*` filename checks do not include a general
  source-content, Git-history, log, build-argument, credential, or secret-value
  scanner.
