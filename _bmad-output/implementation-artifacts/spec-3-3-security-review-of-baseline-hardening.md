---
title: 'Story 3.3: Security review of baseline hardening'
type: 'feature'
created: '2026-08-28'
status: 'done'
review_loop_iteration: 0
baseline_commit: '986a98f1984ab8c460f537cb12783e41dc9bb4b8'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The baseline controls exist, but Helmet and CORS have no regression tests, container and secrets checks are inspection-only, dependency audits currently report high findings, and no durable security or NFR-5 evidence exists.

**Approach:** Add focused integration and CI verification, remediate high/critical dependency findings, inspect every SQL path and the built backend image, and record observed results plus the future-user extensibility attestation for Story 4.3.

## Boundaries & Constraints

**Always:** Work test-first; keep `16kb`, configured-origin CORS, Helmet, the uniform error envelope, parameterized repository SQL, and the non-root production image as fail-closed gates; test the built runtime image rather than only reading its Dockerfile; audit all three npm packages; keep generated evidence free of credentials.

**Ask First:** Changing a security control or API response, accepting any high/critical audit finding, adding a security dependency or scanner, changing the Todo schema, or modifying container exposure.

**Never:** Implement authentication, authorization, `user_id`, rate limiting, TLS, or public-deployment hardening; move SQL outside repositories; weaken or suppress an audit/test to pass; commit real `.env` files, credentials, or generated evidence containing secrets; alter frontend behavior.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| HTTP baseline | Any backend response | Helmet headers present; `X-Powered-By` absent | Missing header fails tests |
| CORS | Allowed and untrusted `Origin` values | ACAO remains the configured origin; an untrusted origin is never echoed or granted | No reflected untrusted origin |
| Parser limit | JSON body over 16 KB | `413 PAYLOAD_TOO_LARGE` envelope | No stack/internal detail |
| Unexpected server error | Forced repository failure | Generic `500 INTERNAL` envelope | Log server-side only |
| Runtime image | Built backend container | Non-root UID; production dependencies only | CI fails on root/dev dependency |
| Dependency audit | Backend, frontend, and E2E lockfiles | Zero high/critical findings | Evidence uploaded even on failure |

</frozen-after-approval>

## Code Map

- `backend/src/app.ts:15-37` -- `createApp()` mounts Helmet, configured-origin CORS, the 16 KB parser, routes, and final error middleware.
- `backend/src/middleware/errorHandler.ts:8-46` -- maps parser failures and unknown errors to safe envelopes; unknown details remain server-side.
- `backend/src/__tests__/todo.api.test.ts:212-224,350-371,415-428` -- existing body-limit, malformed-JSON, and generic-500 integration evidence; reuse rather than duplicate.
- `backend/src/repositories/todo.repository.ts:25-66` and `backend/src/repositories/todo.repository.test.ts` -- sole runtime SQL gateway and existing placeholder/bind assertions.
- `backend/src/db/migrate.ts:28,50-57` -- migration ledger uses binds; migration file SQL is trusted static input.
- `backend/Dockerfile:13-23` -- runtime uses `npm ci --omit=dev` and `USER node`; verify the resulting image in CI.
- `.gitignore:14-17`, `backend/.dockerignore:1-12`, `.env.example` -- secret-file boundary; only the placeholder template may be tracked.
- `.github/workflows/ci.yml` -- existing package and Compose jobs; add audit evidence and runtime-image checks without a second stack lifecycle.
- `backend/migrations/001_create_todos.sql:1-7`, `backend/src/routes/todo.routes.ts:10-70`, `backend/src/services/todo.service.ts:8-38` -- UUID schema and route→service→repository seams used by the NFR-5 attestation.
- `docs/accessibility-audit.md` -- evidence-document precedent; Story 3.3 produces the equivalent security checklist at `docs/security-review.md`.

## Tasks & Acceptance

**Execution:**
- [x] `backend/src/__tests__/security.api.test.ts` -- add Supertest coverage for Helmet, disabled `X-Powered-By`, and allowed/untrusted CORS while retaining existing body-limit and error-hygiene tests as cited evidence.
- [x] `backend/package*.json`, `frontend/package*.json`, `e2e/package*.json` -- remediate dependency trees until each audit has no high/critical findings; do not use force upgrades that break declared compatibility.
- [x] `.github/workflows/ci.yml` -- gate all three package audits, upload per-package JSON on pass or failure, assert the built backend runs non-root with dev dependencies absent, and verify no real env file is tracked.
- [x] `docs/security-review.md` -- record method and observed result for headers, CORS, body limit, SQL parameterization, error hygiene, dependency audits, secrets, and container posture; state local/no-auth residual risk and attest the UUID/layering path to future auth and `user_id`.
- [x] `_bmad-output/implementation-artifacts/sprint-status.yaml` -- move Story 3.3 through implementation/review only when the evidence and gates pass.

**Acceptance Criteria:**
- Given every runtime SQL call and its tests, when the review is recorded, then user-controlled values are bound parameters and no route or service owns SQL.
- Given the built backend image, when CI inspects it, then its UID is non-zero, development dependencies are absent, and no real env file is tracked or copied.
- Given the three package lockfiles, when CI runs npm audit at high severity, then no high/critical finding passes and all JSON results survive as artifacts.
- Given the security review, when NFR-5 is assessed, then it explains how UUID IDs, additive `user_id`, pre-route auth middleware, and repository scoping extend the system without changing existing Todo columns or route paths.
- Given all controls pass, when `docs/security-review.md` is read, then every claim names an observed method/result and residual risks without placeholders.

## Spec Change Log

- 2026-08-28: Implemented security integration coverage, dependency remediation,
  CI audit/runtime gates, and the durable security review evidence.
- 2026-08-28: Held in implementation pending approval to align the existing
  `INTERNAL` error code with the matrix-required `INTERNAL_ERROR` API response.
- 2026-08-28: Human kept the established `INTERNAL` contract and corrected the
  matrix, avoiding an unnecessary API response change.
- 2026-08-28: Review strengthened successful-route headers, JSON-write CORS
  preflights, all direct runtime dev-dependency checks, and `.env*` exclusion.
- 2026-08-28: Review patches guaranteed a distinct untrusted origin, covered
  security headers across 200/404/500 responses, documented user-scoped
  idempotency and phased ownership migration, and aligned verification commands
  with the comprehensive CI gates.

## Design Notes

This story verifies the local v1 baseline; it does not claim production readiness. SQL parameterization is established by complete path inspection plus repository bind assertions, avoiding a brittle source regex. Audit JSON is generated in CI and uploaded, not committed. The review document is the durable evidence consumed by Story 4.3.

## Verification

**Commands:**
- `cd backend && npm run lint && npm run typecheck && npm run test:coverage` -- expected: security integration tests and existing error/SQL coverage pass.
- `cd backend && npm audit --audit-level=high && cd ../frontend && npm audit --audit-level=high && cd ../e2e && npm audit --audit-level=high` -- expected: all audits exit zero.
- `docker compose up -d --build --wait && test "$(docker compose exec -T backend id -u)" -ne 0` -- expected: healthy stack and non-root backend.
- `docker compose exec -T backend node -e 'const {existsSync}=require("node:fs"); const {join}=require("node:path"); const {devDependencies={}}=require("/app/package.json"); const present=Object.keys(devDependencies).filter((name)=>existsSync(join("/app/node_modules",name))); if(present.length){console.error(present.join(","));process.exit(1)}'` -- expected: every direct development dependency is absent from the runtime image.
- `docker compose exec -T backend node -e 'const {readdirSync}=require("node:fs"); const {join}=require("node:path"); const found=[]; const scan=(directory)=>{for(const entry of readdirSync(directory,{withFileTypes:true})){const path=join(directory,entry.name); if(entry.isDirectory()&&entry.name!=="node_modules")scan(path); if(!entry.isDirectory()&&entry.name.startsWith(".env"))found.push(path)}}; scan("/app"); if(found.length){console.error(found.join(","));process.exit(1)}'` -- expected: no `.env*` application file exists in the runtime image.
- `test -z "$(git ls-files '.env*' '**/.env*' | while IFS= read -r file; do case "$file" in .env.example) ;; *) printf '%s\n' "$file" ;; esac; done)"` -- expected: no tracked `.env*` file other than the root `.env.example`, including `.env.local` or `.env.production`.
- `docker compose down -v` -- expected: verification stack removed.

## Suggested Review Order

**Security evidence**

- Start with the durable review, observed results, extensibility attestation, and residual risks.
  [`security-review.md:1`](../../docs/security-review.md#L1)

**Fail-closed CI gates**

- Review audit evidence retention and built-runtime posture in the existing stack lifecycle.
  [`ci.yml:35`](../../.github/workflows/ci.yml#L35)

- Inspect non-root, dev-dependency, and comprehensive environment-file assertions.
  [`ci.yml:233`](../../.github/workflows/ci.yml#L233)

**Regression coverage**

- Verify successful-route Helmet checks and allowed/untrusted CORS preflight behavior.
  [`security.api.test.ts:14`](../../backend/src/__tests__/security.api.test.ts#L14)

**Dependency remediation and tracking**

- Confirm compatible backend transitive updates remove audit findings.
  [`package-lock.json:1880`](../../backend/package-lock.json#L1880)

- Confirm the story advances only after every security gate passes.
  [`sprint-status.yaml:74`](sprint-status.yaml#L74)
