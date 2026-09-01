---
title: 'Story 4.3: Accessibility and security review reports (D-8 + D-9)'
type: 'feature'
created: '2026-09-01'
status: 'done'
review_loop_iteration: 0
baseline_commit: '9c31889dc613490c359b2ccf8fdbcd546c1f8ee6'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 3.2 and 3.3 evidence exists, but D-8 and D-9 are still presented as implementation audits rather than formal stakeholder deliverables, leaving their scope, confidence, and residual risks easy to overread.

**Approach:** Elevate the existing accessibility audit and security review in place with deliverable identity, evidence labels, bounded executive conclusions, reproducible methods, and cross-document closure. Preserve observed evidence rather than duplicating or rerunning it.

## Boundaries & Constraints

**Always:** Distinguish verified 2026-08-28 observations from historical evidence, attestations, exclusions, and point-in-time results. Keep every conclusion traceable to a committed test, source control, generated artifact path, or reproduce command. State all seven accessibility residuals and the local single-user security boundary prominently.

**Ask First:** Any product, test, CI, dependency, or generated-evidence change; renaming or adding report files instead of formalizing the existing canonical documents; rerunning audits and replacing their dated outcomes.

**Never:** Claim full WCAG conformance, live screen-reader or multi-browser validation, production/public-deployment security, authentication, TLS, rate limiting, container CVE scanning, or permanent dependency safety. Commit generated axe/audit artifacts, invent a baseline revision for the original audit, hide the one axe incomplete result, or absorb Story 4.4.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Formalize verified evidence | Existing Story 3.2/3.3 reports and tests | D-8/D-9 identify method, dated result, scope, and reproducibility | Preserve facts; do not silently refresh them |
| Bounded axe result | Five state files include one resolved incomplete result | Report states zero violations and separately explains the measured 6.00:1 resolution | Never count incomplete as an automatic pass |
| Unsupported claim | No live SR, Firefox/WebKit, public deployment, or image scan evidence | Report labels the claim unverified or out of scope | Do not infer compliance from adjacent tests |
| Point-in-time evidence | npm advisories or source may change after 2026-08-28 | Report dates the result and points to CI/reproduction | Do not imply continuing safety |

</frozen-after-approval>

## Code Map

- `docs/accessibility-audit.md:1-73,87-167,205-316` -- canonical D-8 source: scope, five-state axe results, resolved incomplete, keyboard/focus/reflow, accessibility tree, and seven residuals.
- `e2e/support/a11y.ts` and `e2e/tests/{a11y,keyboard,a11y-gate}.spec.ts` -- read-only evidence for tags, fail-closed scan gate, contrast measurement, five states, keyboard behavior, and reflow.
- `frontend/src/App.test.tsx`, `frontend/src/App.tsx`, `frontend/src/components/ErrorBanner.tsx` -- announcement evidence is RTL/DOM and accessibility-tree inspection, not a live screen-reader session.
- `docs/security-review.md:1-130` -- canonical D-9 source: controls, methods, observed results, extensibility, and residual risks.
- `backend/src/app.ts`, `backend/src/middleware/errorHandler.ts`, `backend/src/repositories/todo.repository.ts`, `backend/src/__tests__/{security.api,todo.api}.test.ts` -- read-only HTTP, error, SQL, and body-limit evidence.
- `backend/Dockerfile` and `.github/workflows/ci.yml` -- read-only non-root, production-dependency, secrets, audit, and artifact-retention evidence.
- `docs/qa-report.md:10-17,58-67,150-158` -- reuse evidence labels and close the statement that 4.3 remains backlog.
- `README.md:277-281` -- existing stakeholder discovery links; adjust wording only if needed.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- source for open accessibility/security residuals; do not alter existing entries.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- Story 4.3 lifecycle record.

## Tasks & Acceptance

**Execution:**
- [x] `docs/accessibility-audit.md` -- formalize as D-8 with evidence labels and a bounded executive attestation while preserving five-state results, manual/browser checks, incomplete-result resolution, and all residuals.
- [x] `docs/security-review.md` -- formalize as D-9 with evidence labels and a bounded executive conclusion; retain method/result for headers, CORS, 16 KB limit, SQL, errors, runtime dependencies/user, secrets, audits, future-user path, and residual risks.
- [x] `docs/qa-report.md` and `README.md` -- close the backlog wording and ensure both formal reports are directly discoverable without duplicating them.
- [x] `_bmad-output/implementation-artifacts/sprint-status.yaml` -- keep Story 4.3 status synchronized with the approved workflow lifecycle.

**Acceptance Criteria:**
- Given the Story 3.2 evidence, when D-8 is read, then all five states show zero critical/serious violations, the single incomplete contrast result has its measured resolution, and keyboard, focus, dialog, announcements, contrast, 200% reflow, and residual limitations are explicit.
- Given announcement evidence, when D-8 states its method, then it identifies RTL/DOM and Chromium accessibility-tree verification without claiming live screen-reader validation.
- Given the Story 3.3 evidence, when D-9 is read, then every required baseline control has a method and observed result, including all three point-in-time dependency audits.
- Given the v1 boundary, when D-9 concludes, then it states local/single-user/no-auth scope, public-deployment exclusions, residual risks, and concrete future hardening without claiming production readiness.
- Given completed D-8/D-9, when a stakeholder follows README or QA-report links, then both formal reports are reachable without reading implementation specs.

## Spec Change Log

## Design Notes

Formalize the two existing documents in place. Their detailed technical evidence is stronger than a thin duplicate report; executive framing and evidence labels should make that evidence legible while retaining one canonical source per deliverable.

## Verification

**Commands:**
- `cd frontend && npm test -- --run src/App.test.tsx src/components/TodoList.test.tsx` -- expected: announcement, heading, and accessible-name evidence passes.
- `cd backend && npm test -- --run src/__tests__/security.api.test.ts src/__tests__/todo.api.test.ts` -- expected: security headers, CORS, body-limit, and error-hygiene evidence passes against the configured test database.
- `rg -n "D-8|Verified|Historical|Attestation|critical|serious|incomplete|screen reader|Chromium|200%|Residual" docs/accessibility-audit.md` -- expected: formal identity, bounded result, and limitations are locatable.
- `rg -n "D-9|Verified|point-in-time|Helmet|CORS|16 KB|parameter|non-root|devDependencies|secret|audit|authentication|Residual" docs/security-review.md` -- expected: every required control and boundary is locatable.
- `rg -n "accessibility-audit.md|security-review.md" README.md docs/qa-report.md` -- expected: stakeholder links exist and no text says Story 4.3 remains backlog.

**Manual checks:**
- Original audit outcomes remain dated 2026-08-28; no current-baseline claim is invented.
- Accessibility conclusion does not overstate axe, reflow, contrast, browser, or assistive-technology coverage.
- Security conclusion does not overstate CORS, audits, runtime inspection, or public-deployment readiness.

## Suggested Review Order

**Bounded stakeholder conclusions**

- Start with D-8's dated attestation, incomplete contrast, and non-conformance boundary.
  [`accessibility-audit.md:7`](../../docs/accessibility-audit.md#L7)

- Compare D-9's local-only conclusion and excluded public-deployment controls.
  [`security-review.md:8`](../../docs/security-review.md#L8)

**Evidence classification and residual risk**

- Check accessibility labels before reading the preserved 2026-08-28 technical detail.
  [`accessibility-audit.md:29`](../../docs/accessibility-audit.md#L29)

- Confirm announcements use DOM and Chromium-tree evidence, not a live screen reader.
  [`accessibility-audit.md:326`](../../docs/accessibility-audit.md#L326)

- Review all seven accessibility residuals, now attributed to Story 3.2.
  [`accessibility-audit.md:354`](../../docs/accessibility-audit.md#L354)

- Check security labels, point-in-time audits, and the future-user hardening path.
  [`security-review.md:29`](../../docs/security-review.md#L29)

- Review the remaining security boundary, including nginx and secret-scan exclusions.
  [`security-review.md:238`](../../docs/security-review.md#L238)

**Reproduce isolation**

- Confirm the D-8 script forces its own Compose project and requires free host ports.
  [`accessibility-audit.md:98`](../../docs/accessibility-audit.md#L98)

- Confirm the D-9 script isolates the test stack and re-runs SQL repository tests.
  [`security-review.md:187`](../../docs/security-review.md#L187)

**Stakeholder discovery**

- Confirm QA closes backlog wording and links both canonical reports.
  [`qa-report.md:65`](../../docs/qa-report.md#L65)

- Confirm README exposes D-8 and D-9 directly.
  [`README.md:279`](../../README.md#L279)
