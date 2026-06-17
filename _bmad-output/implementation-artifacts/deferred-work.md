# Deferred Work

## Deferred from: code review of 1-1-scaffold-repository-test-harness-and-ci (2026-06-16)

- Prettier `format:check` is not enforced in CI — `format`/`format:check` scripts exist in both `frontend/` and `backend/`, but no CI stage runs them. Not required by AC#3's enumerated stages; add a format gate in a later hardening pass if desired. [.github/workflows/ci.yml]
- No Postgres service wired into the backend CI job — only needed once in-process integration tests exist (Story 1.2+). The e2e job already brings up the ephemeral test DB. [.github/workflows/ci.yml]

## Deferred from: code review of 1-1-scaffold-repository-test-harness-and-ci (2026-06-17)

- CI runs no `build` step for frontend/backend, so emit-only breakage (project-reference or asset-resolution errors) wouldn't fail the pipeline. Not required by AC#3's enumerated stages; add a build stage in a later hardening pass. [.github/workflows/ci.yml]
- Toolchain version drift across packages — `typescript` `~6.0.2` (frontend) vs `^6.0.3` (backend/e2e), `eslint` `^10.3.0` vs `^10.5.0`, `typescript-eslint` `^8.59.2` vs `^8.61.1`. Cosmetic; align ranges in a later tidy-up. [frontend/package.json, backend/package.json, e2e/package.json]
