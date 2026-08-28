# Security review — baseline hardening

Story 3.3 records the security controls observed in the local v1 Todo stack. The
review was run on 2026-08-28 against the source tree and a freshly built
production Compose stack. It is evidence for the existing baseline, not a claim
that the application is ready for public deployment.

## HTTP headers and CORS

- **Method:** `backend/src/__tests__/security.api.test.ts` drives `createApp()`
  through Supertest. It checks successful registered `/api/health` responses,
  the 404 fallback, an unexpected 500 response, and JSON Todo write preflights.
- **Observed result:** successful, not-found, and unexpected-error responses
  carried Helmet's Content Security Policy, `X-Content-Type-Options: nosniff`,
  and `X-Frame-Options: SAMEORIGIN`. `X-Powered-By` was absent.
- **Observed result:** a request from the configured origin received that exact
  value in `Access-Control-Allow-Origin` on a successful registered route. The
  tests derive an origin guaranteed to differ from the configured value; that
  origin was never reflected or granted, credentials remained disabled, and
  browsers therefore cannot grant it access.
- **Observed result:** configured-origin and untrusted-origin `OPTIONS`
  preflights for `/api/todos` returned 204 and advertised the requested
  supported `POST`/`PATCH` methods and `content-type`/`idempotency-key` headers.
  The untrusted preflight still received only the configured ACAO value, never
  the untrusted origin, so the browser cannot grant it write access.

## Request limits, validation, and error hygiene

- **Method:** the backend coverage suite exercises the 16 KB JSON parser limit,
  malformed JSON, route-level Zod validation, and an unexpected repository
  failure.
- **Observed result:** a body over 16 KB returned HTTP 413 with
  `{ "error": { "code": "PAYLOAD_TOO_LARGE", "message": "Request payload too large." } }`
  and persisted nothing. Invalid writes returned the uniform validation or bad
  request envelope and did not mutate data.
- **Observed result:** a forced database failure returned only the generic HTTP
  500 envelope
  `{ "error": { "code": "INTERNAL", "message": "Something went wrong." } }`.
  The thrown database detail and stack were absent from the response; the error
  handler logs the original error server-side.

## SQL parameterization and ownership

- **Method:** every runtime `pool.query` and `client.query` call under
  `backend/src` was inspected, together with all migration SQL and repository
  bind-argument tests.
- **Observed result:** route and service modules contain no SQL. Todo SQL is
  owned by `todo.repository.ts`; create binds description and idempotency key,
  update binds description, completion, and UUID, and delete binds UUID. The
  repository tests assert the placeholders and argument arrays for all
  user-controlled write values.
- **Observed result:** the health query, transaction commands, migration ledger
  DDL, and repository list query are constant SQL. Migration filenames are
  bound in ledger reads and writes. SQL loaded from `backend/migrations/*.sql`
  is trusted static application input and contains no user-controlled values.

## Dependency audits

- **Method:** `npm audit --audit-level=high` was run independently against the
  backend, frontend, and E2E lockfiles after compatible transitive dependency
  updates. CI repeats each audit with JSON output and uploads one artifact per
  package whether the audit passes or fails.
- **Observed result:** all three audits exited zero and reported zero
  vulnerabilities, including zero high and zero critical findings. No forced
  upgrade or declared dependency compatibility change was used.

## Secrets boundary

- **Method:** CI enumerates tracked `.env*` files at any depth and rejects every
  result except the root `.env.example`. It also recursively scans
  application-owned paths under `/app` in the built backend image for every
  filename beginning with `.env`; third-party `node_modules` internals are not
  treated as application configuration.
- **Observed result:** `.env.example` is the only tracked `.env*` file and no
  `.env*` file exists in the built backend application's runtime filesystem. CI
  audit JSON contains package metadata only and is uploaded rather than
  committed.

## Runtime container posture

- **Method:** the production images were rebuilt with
  `docker compose up -d --build --wait`. The running backend container was
  queried with `id -u`; every direct key in `package.json`'s `devDependencies`
  was checked against runtime `node_modules`; application-owned `/app` paths
  were recursively checked for `.env*` files. CI performs these assertions in
  the existing Compose smoke lifecycle.
- **Observed result:** the stack became healthy, `/api/health` returned
  `{"status":"ok","db":"up"}`, the backend UID was non-zero, every direct
  development dependency was absent from runtime `node_modules`, and no
  `.env*` application file was present. The runtime build uses
  `npm ci --omit=dev` and `USER node`. The verification stack and volume were
  removed after inspection.

## NFR-5 future-user extensibility attestation

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

## Residual risks

- The application intentionally has no authentication or authorization and is
  safe only for its local, single-user boundary. CORS is a browser control, not
  an authorization mechanism.
- TLS, rate limiting, public-network exposure hardening, and per-user data
  isolation are not implemented. The stack must not be exposed as a public
  service in this state.
- Dependency audit results are point-in-time registry evidence. New advisories
  can change the result, which is why CI reruns and preserves all three reports.
- The runtime check proves non-root execution, production-only npm installation,
  and secret-file exclusion. It is not an operating-system package or container
  image vulnerability scan.
