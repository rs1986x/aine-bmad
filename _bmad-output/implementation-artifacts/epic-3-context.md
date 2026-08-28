# Epic 3 Context: Quality, Accessibility & Reliability Verification

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Prove that the completed Todo product meets its reliability, accessibility, test-quality, and baseline-security bar, and produce repeatable evidence for those claims. The full user journey and restart durability must pass end to end, coverage cannot silently regress below 70%, WCAG 2.1 AA checks must find no critical or serious violations, and the architecture's security and future-extensibility decisions must be verified.

## Stories

- Story 3.1: E2E suite (≥5 Playwright) + coverage gate ≥70%
- Story 3.2: Accessibility audit → zero critical WCAG 2.1 AA violations
- Story 3.3: Security review of baseline hardening

## Requirements & Constraints

- Run at least five deterministic Playwright tests against the real Compose stack, covering create; complete and un-complete with re-sorting; inline edit; confirmed permanent delete; persistence after reload and backend restart; and the backend-unavailable failure path with an error banner and preserved input.
- CI must wait for `/api/health` before E2E execution. The test suite must report zero data-loss occurrences across refresh, browser-session, and backend-restart checks.
- Enforce at least 70% meaningful coverage in both frontend and backend Vitest configurations. CI must fail below the threshold, and coverage gaps must be filled with tests of real service, repository, hook, and component logic rather than padding. Archive Playwright and coverage reports as evidence.
- Automated `axe` checks must cover the populated list, empty state, inline edit, error state, and delete dialog, with zero critical or serious WCAG 2.1 AA violations. Browser checks must verify keyboard-only use, visible focus, dialog trapping and `Esc`, non-color completion cues, and full functionality at 200% text zoom.
- Verify security headers, disabled `X-Powered-By`, configured-origin CORS, rejection of request bodies above 16 KB, write validation, parameterized SQL, safe client errors without stack or internal detail leakage, non-root runtime containers, production-only runtime dependencies, and absence of committed secrets. Dependency audits must contain no high or critical findings.
- Keep the v1 boundary: this is a local, single-user app with no authentication and is not intended for public exposure. The review must still verify that UUID identifiers, the Todo schema, and route-to-service-to-repository boundaries permit a later `user_id` and authentication middleware without rewriting existing Todo behavior.

## Technical Decisions

- Playwright exercises the browser against the complete nginx → Express → PostgreSQL stack. Tests use stable selectors and health-based readiness, not timing assumptions or external network dependencies.
- Integration tests use an ephemeral PostgreSQL service, apply migrations from a clean state, and truncate data between tests. Persistence verification must reconnect or restart the relevant service while retaining the named database volume.
- Vitest supplies backend unit/integration coverage and frontend component coverage; Supertest verifies HTTP behavior. Coverage thresholds belong in both package configurations and run as a blocking CI stage.
- Accessibility automation uses `@axe-core/playwright` in the E2E suite. Automated scans complement the browser-driven keyboard, focus, contrast, and zoom checks.
- The server remains authoritative: UI state changes only after confirmed API responses. Failure tests must assert non-destructive recovery and retained user intent.
- Security verification must respect the architecture boundaries: routes perform HTTP handling and Zod parsing, services own logic and typed errors, repositories own all SQL and use placeholders, and one error middleware emits the uniform `{ error: { code, message } }` envelope.
- The hardening baseline is Helmet, scoped CORS, `express.json({ limit: "16kb" })`, Zod validation, database constraints, parameterized `pg` queries, generic client-facing failures, environment-based secrets, and a non-root backend image installed with production dependencies only.

## UX & Interaction Patterns

- Test both desktop and mobile reflow of the single-column interface. At 200% text size, controls and content must remain available without loss of function.
- Completion must be exposed through checkbox state and strike-through text, never color alone. Todo items remain semantic list items with descriptive accessible labels.
- Every interactive element needs a visible focus indicator and an effective hit area of at least 44×44 px. Add and edit fields require programmatic labels, with validation linked through `aria-describedby`.
- List changes are announced through an `aria-live="polite"` region; failures use `role="alert"`. The delete dialog is title-labeled, traps focus, defaults focus to Cancel, closes with `Esc`, and returns focus sensibly.
- Failure coverage must verify the prescribed clear, retryable states: load failure offers Retry, while failed create or save preserves the entered text or original value.

## Cross-Story Dependencies

- Story 3.1 depends on the Compose health checks, CI/test harness, durable PostgreSQL volume, and complete CRUD experience delivered by Epics 1 and 2.
- Story 3.2 extends the Playwright harness from Story 3.1 with `axe` scans and audits the interaction states delivered by Epic 2.
- Story 3.3 verifies the backend, SQL, configuration, and container hardening established in earlier epics; it does not introduce authentication.
- Playwright, coverage, accessibility, and security evidence produced here is consumed by Epic 4's QA, accessibility, and security reports.
