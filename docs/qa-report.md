# QA report and coverage evidence

Story 4.2 / deliverable D-7. Results were collected on 2026-09-01 from
baseline revision `9eed5e8bd5f42fa23c0c8361e3e3937919e52284` on macOS 26.6
(arm64), with Node 26.8.1, npm 11.19.0, Docker 29.7.2 / Compose 5.4.0,
PostgreSQL 18.4, Playwright 1.61.0, and Chromium 149. Product and test source
matched the baseline; the working tree also contained the uncommitted Story
4.2 spec/tracking changes and this report.

## Evidence labels and strategy

- **Verified** means the command or observation was performed during this QA
  pass against the local checkout and disposable PostgreSQL/Compose stacks.
- **Historical** means an earlier, linked audit is cited and was not repeated.
- **Attestation** means an operator observation, not an automated gate or a
  first-time-user study.
- **Target** means a development objective, not a CI service-level gate.

The strategy layers pure frontend and backend unit tests, React Testing Library
component/hook tests, Supertest/PostgreSQL integration tests, and Chromium
full-stack E2E tests. Vitest v8 coverage enforces 70% package-wide for
statements, branches, functions, and lines. HTML and LCOV are regenerated into
ignored `frontend/coverage/` and `backend/coverage/`; narrative results are
committed here.

## Test levels and outcomes

Evidence paths are repository-relative. Frontend unit and RTL tests live under
`frontend/src/`, backend unit/integration tests under `backend/src/`, and E2E
specs under `e2e/tests/`. Basenames in the traceability matrix resolve within
those roots.

| Level | Files | Tests | Result | Primary scope |
| --- | ---: | ---: | --- | --- |
| Frontend unit | 3 | 46 | Pass | `frontend/src/{utils/groupTodos,api/api,styles/app}.test.ts` |
| Frontend component/hook (RTL) | 7 | 111 | Pass | `frontend/src/App.test.tsx`, `frontend/src/hooks/useTodos.test.tsx`, `frontend/src/components/*.test.tsx` |
| Backend unit | 5 | 48 | Pass | `backend/src/config/env.test.ts`, `backend/src/schemas/todo.schema.test.ts`, `backend/src/__tests__/{todo.service,errorHandler}.test.ts`, `backend/src/repositories/todo.repository.test.ts` |
| Backend integration (Supertest/PostgreSQL) | 2 | 47 | Pass | `backend/src/__tests__/{todo.api,security.api}.test.ts` |
| E2E (Playwright/Chromium) | 5 | 30 | Pass on clean rerun | `e2e/tests/{crud,stack,a11y,keyboard,a11y-gate}.spec.ts` |

Verified total: **282 tests passed**. The final E2E run passed 30/30 in 40.2s.
An immediately preceding run exposed an open selector flake (24 passed, 5
failed, 1 did not run); it is recorded in the defect log rather than hidden by
the successful clean rerun.

## Requirement traceability

| Requirement | Covering tests/evidence | Result |
| --- | --- | --- |
| FR-1 View list and states | `App.test.tsx`, `TodoList.test.tsx`, `groupTodos.test.ts`, `crud.spec.ts`, `a11y.spec.ts` | Pass |
| FR-2 Create | `AddTodoForm.test.tsx`, `api.test.ts`, `useTodos.test.tsx`, `todo.schema.test.ts`, `todo.service.test.ts`, `todo.api.test.ts`, `crud.spec.ts` | Pass |
| FR-3 Complete/un-complete | `TodoItem.test.tsx`, `useTodos.test.tsx`, `todo.service.test.ts`, `todo.api.test.ts`, `crud.spec.ts` | Pass |
| FR-4 Edit | `TodoItem.test.tsx`, `api.test.ts`, `useTodos.test.tsx`, `todo.schema.test.ts`, `todo.api.test.ts`, `crud.spec.ts` | Pass |
| FR-5 Delete | `DeleteDialog.test.tsx`, `TodoItem.test.tsx`, `useTodos.test.tsx`, `todo.api.test.ts`, `crud.spec.ts` | Pass |
| FR-6 Persistence | `todo.repository.test.ts`, `todo.api.test.ts`, `crud.spec.ts` (reload/new browser context), `stack.spec.ts` (backend restart) | Pass; named-volume remount remains unproven |
| FR-7 CRUD API | `todo.schema.test.ts`, `todo.service.test.ts`, `todo.repository.test.ts`, `todo.api.test.ts`, `security.api.test.ts` | **Partial** — CRUD paths pass, but a NUL description returns 500 instead of required validation 400 |
| NFR-1 Responsiveness | Timed curl and operator observation below; `crud.spec.ts` proves behavior but contains no timing assertions | **Partial / limited observation** — two GET endpoints and one create UI reaction measured |
| NFR-2 Reliability/error handling | `api.test.ts`, `useTodos.test.tsx`, `ErrorBanner.test.tsx`, `errorHandler.test.ts`, `todo.api.test.ts`, `security.api.test.ts`, `stack.spec.ts` | **Partial** — covered paths pass; NUL returns 500 and failed reload retains stale internal list state |
| NFR-3 Usability/UX states | `App.test.tsx`, component tests, `a11y.spec.ts`, `keyboard.spec.ts`; [D-8 accessibility review](accessibility-audit.md) | **Partial** — covered states pass with documented responsive/accessibility residuals |
| NFR-4 Data integrity/durability | `todo.repository.test.ts`, `todo.api.test.ts`, `crud.spec.ts`, `stack.spec.ts` | Pass for refresh, browser session, and backend restart; remount gap open |
| NFR-5 Maintainability/extensibility | Layering documented in README; [D-9 security review](security-review.md) NFR-5 attestation; unit boundaries above | Pass by reviewed architecture attestation |
| NFR-6 Deployability | Fresh health-gated Compose starts during E2E and responsiveness checks; `stack.spec.ts`; README smoke evidence | **Partial** — configured-machine Compose run passed; clean-machine reproducibility was not evaluated |
| NFR-7 Testability | All five levels above plus fresh frontend/backend coverage runs | Pass |

Story 4.3 formalized the preserved Story 3.2/3.3 evidence as the canonical
[D-8 accessibility review](accessibility-audit.md) and
[D-9 security review](security-review.md). This report links those stakeholder
deliverables without duplicating their methods, conclusions, or residual risks.

The chronological AI-usage record is the
[D-10 AI integration log](ai-integration-log.md).

## Coverage evidence

Fresh local runs passed the configured 70% package-wide gate for every metric:
the exact thresholds and v8 reporters are in `frontend/vite.config.ts` and
`backend/vitest.config.ts`.

| Package | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| Frontend total | 92.71% (624/673) | 86.15% (361/419) | 95.06% (154/162) | 95.69% (556/581) |
| Backend total | 97.33% (146/150) | 89.18% (66/74) | 96.77% (30/31) | 97.31% (145/149) |

Area breakdown from the generated HTML reports:

| Area | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| Frontend root (`App`) | 100% | 100% | 100% | 100% |
| Frontend API | 93.10% | 91.08% | 95.65% | 97.16% |
| Frontend components | 90.62% | 82.98% | 98.41% | 93.54% |
| Frontend hooks | 94.78% | 84.00% | 91.17% | 97.70% |
| Frontend utilities | 100% | 100% | 100% | 100% |
| Backend root (`app`) | 91.66% | 50.00% | 100% | 91.66% |
| Backend config | 100% | 66.66% | 100% | 100% |
| Backend database/migrations | 88.88% | 100% | 80.00% | 88.46% |
| Backend errors | 100% | 100% | 100% | 100% |
| Backend middleware | 100% | 95.23% | 100% | 100% |
| Backend repositories | 100% | 100% | 100% | 100% |
| Backend routes | 100% | 83.33% | 100% | 100% |
| Backend schemas | 100% | 100% | 100% | 100% |
| Backend services | 100% | 100% | 100% | 100% |

The threshold is configured and enforced at package level. The area table is
deliberately not rounded into a stronger claim: backend root/config branch
coverage is below 70%, while all four enforced package totals exceed 70%.
Type-only directories contain no executable statements and are omitted.

## SM-1 operator walkthrough

**Attestation, not a first-time-user result.** No first-time volunteer was used,
so this does not claim SM-1's target of an unaided first-time user scoring 5/5.
An operator drove Chromium against a fresh production-style Compose stack:

| Action | Observed result |
| --- | --- |
| Create | Pass — new active Todo appeared after the POST response |
| View | Pass — exact description and active state were visible |
| Complete | Pass — checkbox and completed list-item state updated |
| Edit | Pass — saved text replaced the original description |
| Delete | Pass — confirmed deletion removed the Todo |

Operator walkthrough outcome: **5/5 actions completed**, labeled attestation.

## NFR-1 / SM-3 responsiveness observation

**Target:** UI reaction roughly within 200ms after the server response and
typical local API responses below 500ms. These are development targets, not CI
gates or production SLAs.

**Verified local observation:** five warm proxied `GET /api/health` samples
were 6.736, 4.798, 4.845, 5.611, and 4.600ms (median 4.845ms); five warm
`GET /api/todos` samples were 4.926, 4.521, 4.508, 3.888, and 4.204ms
(median 4.508ms). No load was applied. Three review measurements placed the
create Todo's visible DOM mutation **24.8ms, 4.0ms, and 3.2ms after** the
browser's Resource Timing `responseEnd` for the matching POST. These
single-machine observations do not establish production performance.

This is a **partial, operator-observed** NFR-1/SM-3 result. It did not measure
POST/PATCH/DELETE API latency, list-render reaction after its GET response, or
the post-response UI reaction for complete, edit, and delete. The E2E CRUD
spec asserts confirmed state changes only; it has no latency assertions.

The measurements use one browser clock for both boundaries: before clicking
Add, a `MutationObserver` records `performance.now()` when the matching list
item first becomes visible; after the POST, the script subtracts that request's
browser Resource Timing `responseEnd`. This avoids comparing a Playwright
protocol event in Node with a later browser render. The reproducible operator
script below performs the same measurement and verifies cleanup.

## Defect log

This is a curated list of defects relevant to this QA report, not an exhaustive
copy of `_bmad-output/implementation-artifacts/deferred-work.md`.

| Status | Defect / residual | Source or evidence |
| --- | --- | --- |
| Open | NUL in a description reaches PostgreSQL and returns generic 500 instead of validation 400 | `deferred-work.md`, Story 2.2 |
| Open | Named-volume remount durability is not proven by the backend-restart E2E | `deferred-work.md`, Story 3.1 |
| Open | `reload()` retains a stale internal list if a later reload fails | `deferred-work.md`, Story 1.4 |
| Open | `GET /api/todos` is unbounded (no pagination/limit) | `deferred-work.md`, Story 1.2 |
| Open | Accessibility residuals: unscanned combinations, 320px/text-only resize gap, Chromium-only checks, non-text contrast not automated, and grouping/action visibility limitations | [D-8 accessibility review](accessibility-audit.md) and `deferred-work.md` |
| Open | E2E Add actions use non-exact `"Add"` role locators; a generated description containing “add” caused strict-mode matches against Edit/Delete names. A clean rerun passed, demonstrating intermittent suite behavior; it does not prove the defect harmless. | Fresh 2026-09-01 run; `e2e/support/app.ts:67`, `e2e/tests/stack.spec.ts:42`; test change requires approval |
| Resolved | Requests now use AbortController/supersession and a 10s timeout | Story 2.5, recorded in `deferred-work.md` |
| Resolved | Stable heading exists across app states | Story 3.2, `App.test.tsx` |
| Resolved | Per-row and duplicate-description accessible names are distinguishable | Story 3.2, `TodoList.test.tsx` |

## Reproduce

Run every block from the repository root. Each Compose block removes a stale
named project before starting and installs a trap so containers and disposable
volumes are removed on success, failure, or interruption. These are local-only
commands; they do not invoke CI/CD.

Frontend coverage:

```bash
(
  set -eu
  cd frontend
  npm ci
  npm run test:coverage
)
```

Backend coverage (the teardown destroys the isolated test database):

```bash
(
  set -eu
  ROOT=$(pwd)
  cleanup() {
    (cd "$ROOT" && docker compose -f docker-compose.test.yml down -v --remove-orphans)
  }
  trap cleanup EXIT
  trap 'exit 129' HUP
  trap 'exit 130' INT
  trap 'exit 143' TERM
  cleanup
  docker compose -f docker-compose.test.yml up -d --wait
  cd backend
  npm ci
  NODE_ENV=test PORT=8080 \
    DATABASE_URL=postgres://todo:todo@localhost:5432/todo \
    CORS_ORIGIN=http://localhost:5173 \
    npm run test:coverage
)
```

Full-stack E2E:

```bash
(
  set -eu
  ROOT=$(pwd)
  export COMPOSE_PROJECT_NAME=aine-bmad-e2e
  cleanup() { (cd "$ROOT" && docker compose down -v --remove-orphans); }
  trap cleanup EXIT
  trap 'exit 129' HUP
  trap 'exit 130' INT
  trap 'exit 143' TERM
  cleanup
  (cd e2e && npm ci && npx playwright install chromium)
  docker compose up -d --build --wait --wait-timeout 180
  (cd e2e && npm test)
)
```

Proxied API latency samples against a disposable health-gated stack:

```bash
(
  set -eu
  ROOT=$(pwd)
  export COMPOSE_PROJECT_NAME=aine-bmad-observation
  cleanup() { (cd "$ROOT" && docker compose down -v --remove-orphans); }
  trap cleanup EXIT
  trap 'exit 129' HUP
  trap 'exit 130' INT
  trap 'exit 143' TERM
  cleanup
  docker compose up -d --build --wait --wait-timeout 180
  for endpoint in health todos; do
    for sample in 1 2 3 4 5; do
      curl -fsS -o /dev/null \
        -w "$endpoint sample $sample: %{time_total}s\n" \
        "http://localhost:8080/api/$endpoint"
    done
  done
)
```

Operator create-reaction measurement against a disposable stack:

```bash
(
  set -eu
  ROOT=$(pwd)
  export COMPOSE_PROJECT_NAME=aine-bmad-operator
  cleanup() { (cd "$ROOT" && docker compose down -v --remove-orphans); }
  trap cleanup EXIT
  trap 'exit 129' HUP
  trap 'exit 130' INT
  trap 'exit 143' TERM
  cleanup
  (cd e2e && npm ci && npx playwright install chromium)
  docker compose up -d --build --wait --wait-timeout 180
  cd e2e
  node --input-type=module <<'NODE'
import { chromium } from 'playwright'
import { randomUUID } from 'node:crypto'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
const description = `qa operator ${randomUUID()}`

try {
  await page.goto('http://localhost:8080')
  await page.getByRole('textbox', { name: 'Add a todo' }).fill(description)
  await page.evaluate((label) => {
    globalThis.__qaVisibleAt = new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Todo did not become visible')),
        15_000,
      )
      const observe = () => {
        const item = [...document.querySelectorAll('li')].find((element) =>
          element.textContent?.includes(label),
        )
        if (item && item.getClientRects().length > 0) {
          clearTimeout(timeout)
          observer.disconnect()
          resolve(performance.now())
        }
      }
      const observer = new MutationObserver(observe)
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
      })
      observe()
    })
  }, description)
  const post = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().endsWith('/api/todos'),
  )
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  const response = await post
  const visibleAt = await page.evaluate(() => globalThis.__qaVisibleAt)
  const reactionMs = await page.evaluate(({ visibleAt }) => {
    const url = new URL('/api/todos', location.href).href
    const entry = performance.getEntriesByName(url).at(-1)
    if (!(entry instanceof PerformanceResourceTiming) || entry.responseEnd <= 0) {
      throw new Error('POST resource timing entry is unavailable')
    }
    return visibleAt - entry.responseEnd
  }, { visibleAt })
  if (reactionMs < 0) throw new Error(`Negative reaction interval: ${reactionMs}`)
  console.log(`create UI reaction after POST responseEnd: ${reactionMs.toFixed(1)}ms`)
  const todo = await response.json()
  const deletion = await fetch(`http://localhost:8080/api/todos/${todo.id}`, {
    method: 'DELETE',
  })
  if (!deletion.ok) throw new Error(`Cleanup DELETE failed: ${deletion.status}`)
} finally {
  await browser.close()
}
NODE
)
```

Coverage HTML/LCOV, Playwright HTML, test results, and axe JSON remain
gitignored by design. Regenerate them with the commands above; do not commit
the generated trees.
