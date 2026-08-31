# Epic 4 Context: Deliverable Documentation & Reporting

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Produce the complete, evidence-backed hand-off package for the Todo App training exercise so a new operator can run and understand the system unaided, and stakeholders can verify its quality, accessibility, security, coverage, and use of AI. The documents must describe the product as actually delivered and make every material claim traceable to commands, test results, audit evidence, or lifecycle records.

## Stories

- Story 4.1: README (D-6)
- Story 4.2: QA report + coverage evidence (D-7)
- Story 4.3: Accessibility & security review reports (D-8 + D-9)
- Story 4.4: AI integration log (D-10)

## Requirements & Constraints

- The README must accurately list prerequisites and versions, provide a no-hidden-step `docker compose up` path, explain how to run every test level and coverage, summarize the architecture, document the `/api` endpoints, and include troubleshooting. Its commands must be verified verbatim on a clean setup.
- The QA report must consolidate strategy, unit/integration/component/E2E counts and outcomes, defects and statuses, and traceability from every functional and non-functional requirement to covering tests. Reported results and coverage numbers must match the actual CI run.
- Coverage evidence must demonstrate at least 70% meaningful coverage with a per-area breakdown; the enforced CI threshold and archived HTML/lcov evidence are authoritative, and trivial padding does not qualify.
- QA evidence must include an unaided walkthrough in which a first-time user attempts all five core actions—create, view, complete, edit, and delete—with a target of 5/5 completed without instructions or the README.
- QA evidence must record observational checks under normal local conditions for UI reaction at roughly 200ms after server response and typical API latency below 500ms. These are development targets, not hard CI gates.
- The accessibility report must cover automated `axe` scans for the list, empty, edit, error, and delete-dialog states, with zero critical or serious WCAG 2.1 AA violations. It must also record keyboard access, visible focus and dialog focus trapping, announcements, contrast, and 200% text reflow, including any residual non-critical findings.
- The security report must state the method and result for security headers, scoped CORS, the 16kb request-body limit, parameterized SQL, client error hygiene, non-root production containers, production-only dependencies, secret handling, and dependency audit results. It must clearly state the local, single-user, no-auth scope and identify residual risks and future hardening.
- The AI integration log must be chronological and reflect actual usage across PRD, UX, architecture, epics/stories, development, and QA. Record notable prompts and decisions, value delivered, human review, corrections, and overrides; do not reconstruct or invent activity that was not recorded.
- All reports must distinguish verified facts from targets, assumptions, and attestations. Evidence must be archived or linked well enough for another reviewer to reproduce the claim.

## Technical Decisions

- Document the deployed system as a React/TypeScript SPA served by nginx, an Express/TypeScript REST API, and PostgreSQL, running as three health-gated Docker Compose services. The browser enters through `http://localhost:8080`; nginx proxies `/api` to the backend; PostgreSQL uses a named volume.
- The README API summary must cover `GET /api/health`, `GET /api/todos`, `POST /api/todos`, `PATCH /api/todos/:id`, and `DELETE /api/todos/:id`, including the direct success payloads, uniform `{ error: { code, message } }` failures, and relevant 200/201/204/400/404/500/503 statuses.
- Describe the backend boundary as routes for HTTP and Zod parsing, services for logic, and repositories for all SQL. Note that PostgreSQL uses `snake_case`, while API and TypeScript data use `camelCase`, with mapping confined to the repository.
- Explain that PostgreSQL is authoritative, writes are reflected only after confirmed server responses, migrations run at startup through an idempotent ledger, and the named volume preserves data across backend restarts.
- Test documentation must preserve the established levels: Vitest unit tests, Vitest/Supertest integration tests against an isolated test database, React Testing Library component tests, and Playwright full-stack E2E tests. CI blocks on lint, strict type checking, tests, E2E, and the coverage threshold.
- Security conclusions must remain bounded to the baseline local deployment. No authentication or user isolation exists in v1; future multi-user extensibility is supported by UUID identifiers, the reserved `user_id` path, and the routes-to-services-to-repositories layering.

## Cross-Story Dependencies

- All Epic 4 documents depend on the implemented product and evidence produced by earlier epics; documentation must not claim planned behavior as completed behavior.
- Story 4.1 depends on the final run commands, package versions, Compose topology, test scripts, architecture, and API contract being stable and verified.
- Story 4.2 depends on the green CI, Playwright, coverage, persistence, usability, and responsiveness evidence produced during quality verification, and should reference the accessibility and security reports without duplicating them.
- Story 4.3 depends on the completed accessibility audit and security verification, including `axe`, keyboard/reflow checks, HTTP and container checks, and dependency-audit output.
- Story 4.4 depends on preserved records from every planning and implementation phase plus human corrections; incomplete source records must be reported as gaps rather than filled by inference.
