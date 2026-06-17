---
baseline_commit: c723153
---

# Story 1.4: Frontend skeleton — tokens, shell, useTodos, loading + empty states

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the end user,
I want to open the app and watch it load and then show a clear empty state,
so that it never feels broken or half-built even before I have added a single todo.

This is the **final story of Epic 1** — it turns the throwaway Vite template into the real
frontend skeleton (design tokens, single-column shell, typed data layer, `useTodos` hook,
loading skeleton, empty state) and renders the **end-to-end empty-list slice** the epic exists
to deliver: browser → nginx → `GET /api/todos` → `[]` → polished empty state. Epic 2 then
fills this shell with the populated list, create, update, and delete slices.

## Acceptance Criteria

1. **Given** the app loads, **When** the list is being fetched, **Then** a `LoadingSkeleton`
   (3–5 `surface-sunken` placeholder rows matching the todo-row silhouette) is shown, which
   resolves to an `EmptyState` displaying the exact copy **"No todos yet."** (headline) +
   **"Add your first one above."** (subline) when the fetch returns zero todos. [Source: epics.md#Story 1.4; EXPERIENCE.md#Voice and Tone, #State Patterns]
2. **Given** `src/styles/tokens.css`, **When** inspected, **Then** the **full DESIGN.md token
   set** — every color, the typography ramp (display/title/body/label/meta), the spacing scale,
   the `rounded` scale, and the component tokens — exists as `:root` CSS custom properties, and
   these variables (not hard-coded literals) drive the shell + component layout. Light mode only. [Source: epics.md#UX-DR1; DESIGN.md frontmatter + §Colors/§Typography/§Layout & Spacing/§Shapes]
3. **Given** the `useTodos` hook, **When** the `GET /api/todos` call succeeds or fails, **Then**
   it exposes `list` (the returned `Todo[]`), `loading` (`true` only while the request is in
   flight), and `error` (set on failure, `null` on success) correctly — with **no optimistic
   state** and the server response as the only source of truth. [Source: epics.md#Story 1.4; architecture.md#Frontend Architecture, #State Management Patterns]
4. **Given** desktop and mobile viewport widths, **When** the app is rendered, **Then** the
   content is a **single centered column capped at 640px (`container-max`)**, with **16px
   (`page-margin`) gutters** on small viewports, and a global **16px input font** baseline
   (prevents mobile zoom-on-focus — applies to inputs landing in Epic 2). The same surface
   reflows; no layout is desktop- or mobile-exclusive. [Source: epics.md#UX-DR13; DESIGN.md#Layout & Spacing; EXPERIENCE.md#Responsive & Platform]
5. **Given** the Vite-template scaffolding (`App.tsx` counter/logos, `App.css`, `index.css`,
   `src/assets/*`, `public/icons.svg`), **When** this story is complete, **Then** the template
   demo UI and its now-unused assets are removed and replaced by the real shell, and `main.tsx`
   imports `styles/tokens.css` + `styles/app.css` (not the old template CSS). [Source: architecture.md#Complete Project Directory Structure]
6. **Given** the verification harness, **When** tests run, **Then** RTL component tests prove the
   **loading → empty** transition and the `useTodos` `list`/`loading`/`error` states, the
   frontend `lint`/`typecheck`/`test` jobs stay green, and the CI `compose-smoke` job
   additionally asserts the proxied `GET /api/todos` returns `[]` (the empty data path the empty
   state renders, end-to-end through the running stack). [Source: epics.md#Story 1.4 Test expectations; architecture.md#Testing Strategy]

> **Scope note — what this story IS / IS NOT.**
> **IS:** `src/styles/tokens.css` + `src/styles/app.css`, `src/types/todo.ts`, `src/api/api.ts`
> (typed fetch client + `ApiError`, with `getTodos()` implemented), `src/hooks/useTodos.ts`
> (read path only: `list`/`loading`/`error` + a `reload`), `src/components/LoadingSkeleton.tsx`,
> `src/components/EmptyState.tsx`, a rewritten `src/App.tsx` shell + `main.tsx` imports, template
> cleanup, the existing Vite `/api` dev proxy left in place, RTL tests, and one extra assertion
> in the CI `compose-smoke` job.
> **IS NOT:** `AddTodoForm`, `TodoList`, `TodoItem`, `DeleteDialog`, `ErrorBanner` (full banner +
> Retry UI), the `aria-live` announcement region, or any `POST`/`PATCH`/`DELETE` client method —
> those are Epic 2 (2.1, 2.2, 2.3, 2.4) and 2.5. No backend changes. No Playwright browser spec
> and no e2e `webServer`/`baseURL` wiring (that harness is Story 3.1). Do **not** build the
> add-input inside the empty state — the empty state shows headline + subline only for now; the
> add-input CTA is wired into the shell **and** the empty state when `AddTodoForm` lands in 2.2.

## Tasks / Subtasks

- [x] **Task 1: Design tokens — `src/styles/tokens.css`** (AC: #2)
  - [x] Create `src/styles/tokens.css` with a single `:root { … }` block declaring the **entire**
        DESIGN.md token set as CSS custom properties. Use a consistent prefix scheme:
        `--color-*` (e.g. `--color-accent: #2563EB;`), `--font-size-*` / `--font-weight-*` /
        `--line-height-* ` / `--font-family` for the type ramp, `--space-1 … --space-12` +
        `--container-max: 640px;` + `--page-margin: 16px;` for spacing, `--radius-sm|md|lg|full`
        for `rounded`, and `--<component>-*` for the component tokens (e.g.
        `--button-primary-bg: var(--color-accent);`). Component tokens MUST reference the base
        tokens (not re-hard-code hex), exactly as DESIGN.md frontmatter expresses them with
        `{colors.*}`/`{rounded.*}`/`{spacing.*}` placeholders.
  - [x] Copy every value verbatim from `DESIGN.md` frontmatter (see Dev Notes "Complete token
        inventory") — colors (20), type ramp (5 roles), rounded (4), spacing (9 steps +
        container-max + page-margin), and the component blocks (button-primary/secondary/danger,
        icon-button, input-text, todo-row, checkbox, empty-state, error-banner). Missing any
        color/type/spacing/rounded token fails AC #2.
  - [x] Light mode only. Structure for future dark mode is implicit (single `:root` block, no
        `prefers-color-scheme` override) — do **not** add a dark theme.

- [x] **Task 2: Global layout + component styles — `src/styles/app.css`** (AC: #1, #4)
  - [x] Reset/baseline: `*, *::before, *::after { box-sizing: border-box; }`, zero `body` margin,
        `body` background `var(--color-surface-base)`, text `var(--color-ink-primary)`, font
        `var(--font-family)` at body size (16px). Add a global `input, button, textarea, select
        { font: inherit; }` and ensure inputs render at ≥16px (AC #4 mobile-zoom guard).
  - [x] App shell layout: a centered column — `max-width: var(--container-max)` (640px),
        `margin-inline: auto`, horizontal padding `var(--page-margin)` (16px). Vertical stacking
        only; no nav/sidebar/multi-column (single surface).
  - [x] `LoadingSkeleton` styles: 3–5 rows using `var(--color-surface-sunken)`, the todo-row
        silhouette (height/padding/radius matching `--todo-row-*` / `--radius-md`), stacked with
        `--space-*` gaps. A subtle pulse animation is optional (respect
        `@media (prefers-reduced-motion: reduce)` if added).
  - [x] `EmptyState` styles: centered block — headline in the `display` ramp
        (`--font-size-display` 28px / weight 600), subline in the `body` ramp, foreground
        `var(--color-ink-secondary)`, generous vertical spacing (`--space-6`+).
  - [x] Remove the dark-mode `@media (prefers-color-scheme: dark)` behavior that lived in the old
        template `index.css` — v1 is light only.

- [x] **Task 3: Frontend `Todo` type — `src/types/todo.ts`** (AC: #3)
  - [x] Create `src/types/todo.ts` exporting the `Todo` interface matching the backend wire shape
        **exactly** (camelCase): `{ id: string; description: string; completed: boolean; createdAt: string }`.
        Mirror the comments/shape from `backend/src/types/todo.ts`. Do **not** add `CreateTodoInput`/
        `UpdateTodoInput` (Epic 2).

- [x] **Task 4: Typed fetch client — `src/api/api.ts`** (AC: #3)
  - [x] Implement `ApiError` — a class extending `Error` carrying `code: string`, `message:
        string`, and `status: number`, constructed from the backend error envelope
        `{ error: { code, message } }`.
  - [x] Implement `getTodos(): Promise<Todo[]>` — `fetch('/api/todos')`; on non-2xx, attempt to
        parse the `{ error: { code, message } }` envelope and `throw new ApiError(...)` (fall back
        to a generic message + the HTTP status if the body isn't the expected shape); on success,
        parse and return `Todo[]`. Use a relative `/api` path (nginx in prod, Vite dev proxy in
        dev — no base URL, no env var).
  - [x] Type-only imports MUST use `import type { Todo } from '../types/todo'` (the tsconfig sets
        `verbatimModuleSyntax: true`). Keep the client small but shaped so `createTodo`/
        `updateTodo`/`deleteTodo` slot in later (Epic 2) — do not build them now.

- [x] **Task 5: `useTodos` hook (read path) — `src/hooks/useTodos.ts`** (AC: #1, #3)
  - [x] Implement `useTodos()` returning `{ list: Todo[]; loading: boolean; error: ApiError |
        Error | null; reload: () => void }`. On mount, set `loading=true`, call
        `api.getTodos()`, then set `list` + `loading=false` on success, or `error` + `loading=false`
        on failure. `error` resets to `null` at the start of each fetch.
  - [x] Guard against setting state after unmount (e.g. an `ignore`/`AbortController` flag in the
        effect) so the loading→resolve transition is React-18/19-StrictMode-safe and test-clean.
  - [x] Immutable updates only; **no optimistic state**. The hook owns list/loading/error; the
        action methods (`addTodo`/`toggle`/`edit`/`remove`) are Epic 2 — do not add them.

- [x] **Task 6: Components — `LoadingSkeleton.tsx` + `EmptyState.tsx`** (AC: #1)
  - [x] `src/components/LoadingSkeleton.tsx`: renders 3–5 skeleton rows (the `--color-surface-sunken`
        silhouette). Mark it decorative for assistive tech (e.g. `aria-hidden="true"` on the purely
        visual rows) so a screen reader is not flooded with placeholder noise; the busy state is
        conveyed at the shell level (see Task 7).
  - [x] `src/components/EmptyState.tsx`: renders the headline **"No todos yet."** as a real heading
        element and the subline **"Add your first one above."** as body text. Exact strings from
        EXPERIENCE.md Voice & Tone — do not paraphrase. Do **not** include an add-input here (2.2).
  - [x] One component per file, `PascalCase` filename = export name (`export function EmptyState()`).

- [x] **Task 7: App shell — rewrite `src/App.tsx` + update `src/main.tsx`** (AC: #1, #4, #5)
  - [x] Replace the Vite-template `App.tsx` entirely. The shell wraps content in a `<main>`
        landmark centered column and consumes `useTodos()`:
        - `loading` → render `<LoadingSkeleton />`.
        - resolved + `list.length === 0` → render `<EmptyState />`.
        - resolved + `error` → render a **minimal** accessible fallback (e.g. a `role="alert"`
          line using the EXPERIENCE copy "Couldn't load your todos. Retry." with a plain Retry
          button calling `reload`). Keep it minimal — the polished `ErrorBanner` + full retry UX
          is Story 2.5. This only exists so an early load failure isn't a blank screen.
        - resolved + `list.length > 0` → this cannot happen against a fresh DB in Epic 1; render a
          minimal placeholder (the real `TodoList` is Story 2.1). Do not crash; do not build the list.
  - [x] Update `src/main.tsx`: remove `import './index.css'`; add `import './styles/tokens.css'`
        then `import './styles/app.css'` (tokens first so component CSS can reference the vars).
        Keep the `StrictMode` + `createRoot` wiring.
  - [x] Set a sensible `<title>` in `index.html` (e.g. `Todo`) replacing the template's `frontend`.

- [x] **Task 8: Remove dead Vite-template files** (AC: #5)
  - [x] Delete `src/App.css`, `src/index.css`, `src/assets/hero.png`, `src/assets/react.svg`,
        `src/assets/vite.svg`, and `public/icons.svg` (referenced only by the deleted template
        `App.tsx`). Keep `public/favicon.svg` (harmless). Ensure no remaining import references a
        deleted file (typecheck will catch dangling imports).

- [x] **Task 9: Tests (write first — red, then green)** (AC: #6)
  - [x] Replace `src/__tests__/smoke.test.tsx` with real tests (or add co-located tests and remove
        the smoke file). Use Vitest + RTL (jsdom env + `jest-dom` matchers already wired via
        `src/test/setup.ts`).
  - [x] **`useTodos` test** (`src/hooks/useTodos.test.tsx` or under `__tests__/`): stub
        `global.fetch` (via `vi.stubGlobal`/`vi.fn`). Assert: initial `loading === true`; after a
        resolved `[]` response, `loading === false` + `list === []` + `error === null`; after a
        rejected/non-2xx response, `loading === false` + `error` is set (an `ApiError`). Use
        `@testing-library/react`'s `renderHook` + `waitFor`.
  - [x] **App loading→empty test** (`src/App.test.tsx` or under `__tests__/`): mock the data path
        (mock `../api/api` with `vi.mock`, or stub `fetch`) to return `[]`. Assert the
        `LoadingSkeleton` is present initially (e.g. a stable test hook / role), then
        `await screen.findByText('No todos yet.')` and assert the subline
        `"Add your first one above."` is present. Prefer role/text queries; avoid brittle snapshots.
  - [x] `npm run lint`, `npm run typecheck`, and `npm test` all pass in `frontend/`.

- [x] **Task 10: CI compose-smoke — assert empty data path** (AC: #6)
  - [x] In `.github/workflows/ci.yml` `compose-smoke` job, after the existing `/api/health`
        assertions, add a step asserting `curl -fsS http://localhost:8080/api/todos` returns `200`
        with body `[]` (e.g. `body=$(curl -fsS .../api/todos); echo "$body" | grep -qx '\[\]'` or a
        tolerant `grep -q '^\[\]$'`). This proves the empty list path the `EmptyState` renders
        works end-to-end through nginx → backend → fresh db. Do **not** add a Playwright browser
        spec or `webServer`/`baseURL` wiring (Story 3.1 owns that). Keep the job failing-hard on
        any check (no `continue-on-error`).

- [x] **Task 11: Verify** (AC: #1–#6)
  - [x] Local: `npm run dev` in `frontend/` with the backend reachable (or the compose stack up)
        → confirm the loading skeleton flashes then the empty state renders; resize the viewport
        → column stays centered ≤640px with 16px gutters. **Docker is not available on this dev
        machine** (carried from 1.1/1.2/1.3) — do not fake a compose bring-up; the CI
        `compose-smoke` job is the authoritative end-to-end proof. State this honestly in
        Completion Notes.
  - [x] Capture RTL output + screenshots of the loading and empty states for QA evidence.

## Dev Notes

### What this story IS / IS NOT (read the Scope note above first)

- **IS:** the real frontend skeleton (tokens, shell, typed `api.ts` `getTodos`, `useTodos` read
  path, `LoadingSkeleton`, `EmptyState`), template cleanup, RTL tests, and one extra
  `compose-smoke` assertion.
- **IS NOT:** any Epic 2 component (`AddTodoForm`/`TodoList`/`TodoItem`/`DeleteDialog`), the full
  `ErrorBanner` + Retry + `aria-live` UX (Story 2.5), any write client method, any backend change,
  or any Playwright/e2e-harness work (Story 3.1).

### Current state of files this story changes (read before editing)

- `frontend/src/App.tsx` — the **untouched Vite template** (counter button, hero/react/vite logos,
  "Documentation"/"Connect" sections, references `./assets/*` + `/icons.svg`). **Replace entirely.**
- `frontend/src/main.tsx` — `StrictMode` + `createRoot`, imports `./index.css` and `App`. **Keep
  the mount wiring; swap the CSS import** to `styles/tokens.css` + `styles/app.css`.
- `frontend/src/index.css` + `frontend/src/App.css` — template styles (purple accent, dark-mode
  `@media`, 1126px `#root`, `.counter`/`.hero`/etc). **Delete both** — superseded by tokens.css +
  app.css. None of their tokens/classes carry over.
- `frontend/src/__tests__/smoke.test.tsx` — placeholder harness test ("harness ok"). **Replace**
  with the real `useTodos` + App tests.
- `frontend/src/test/setup.ts` — imports `@testing-library/jest-dom`. **Leave as-is** (matchers
  available in all tests).
- `frontend/vite.config.ts` — already proxies `/api → http://localhost:8080` for dev and sets the
  Vitest jsdom/globals/setup config. **Leave as-is** — the dev `/api` proxy task is already done;
  do not duplicate or change it.
- `frontend/src/types/todo.ts` — **does not exist yet** (only `backend/src/types/todo.ts` does).
  Create it mirroring the backend shape.
- `frontend/src/assets/` (`hero.png`, `react.svg`, `vite.svg`) + `frontend/public/icons.svg` —
  template assets used only by the old `App.tsx`. **Delete** once `App.tsx` is replaced. Keep
  `public/favicon.svg`.
- `.github/workflows/ci.yml` `compose-smoke` job — currently asserts `/`, `/api/health` (status ok
  + db up). **Add** the `/api/todos → []` assertion. Do not touch the `frontend`/`backend`/`e2e`
  jobs or `docker-compose.test.yml`.

### TypeScript / toolchain guardrails (hard — CI blocks on these)

- `frontend/tsconfig.app.json` sets **`verbatimModuleSyntax: true`** → all type-only imports MUST
  be `import type { … }` (e.g. `import type { Todo } from '../types/todo'`). A plain `import` of a
  type-only symbol fails the build.
- **`erasableSyntaxOnly: true`** → no `enum`, no `namespace`, no TS parameter-properties. Use
  plain types/interfaces and string-literal unions.
- **`noUnusedLocals` / `noUnusedParameters`** → no unused imports/vars (lint + tsc both fail).
- `strict: true`, `jsx: react-jsx` (no `import React` needed for JSX), `moduleResolution: bundler`,
  `allowImportingTsExtensions` — but **import without file extensions** for `.ts`/`.tsx` modules
  (e.g. `from './components/EmptyState'`) to match the existing template style.
- Frontend is `type: module`, React **19.2**, Vite **8**, Vitest **4.x**, TS **6.0**. Build is
  `tsc -b && vite build`; `npm run typecheck` = `tsc -b --noEmit`. Node ≥24.
- `@testing-library/react` (incl. `renderHook`), `@testing-library/jest-dom`,
  `@testing-library/user-event`, and `@vitest/coverage-v8` are already installed — no new deps.
  (No user interactions in 1.4, so `user-event` likely unused here.)

### Architecture rules this story MUST honor

- **No optimistic UI / confirm-on-response.** The hook reflects only what the server returned;
  `loading`/`error`/`list` are derived from the actual request lifecycle. [architecture.md#State Management Patterns, #Frontend Architecture]
- **Casing boundary:** camelCase everywhere on the frontend (`createdAt`, never `created_at`). The
  backend already maps in its repository; the frontend just consumes camelCase. [architecture.md#Naming Patterns]
- **Component boundary:** components are presentational; only the `useTodos` hook (via `api.ts`)
  talks to the network. Components never call `fetch` directly. [architecture.md#Component Boundaries]
- **Error contract:** `api.ts` throws a typed `ApiError` from the `{ error: { code, message } }`
  envelope; user-facing copy comes from EXPERIENCE.md Voice & Tone, never raw server text.
  (1.4 only needs this for the minimal load-error fallback; the full mapping table is 2.5.) [architecture.md#Error Handling Patterns]
- **Tokens, not literals:** all colors/spacing/radii/type in component CSS reference the
  `tokens.css` vars. No hex/px literals duplicated in `app.css` for tokenized values. [architecture.md#Styling Solution; epics.md#UX-DR1]
- **Single surface, single centered column ≤640px, 16px gutters, light mode only.** No router, no
  global store. [architecture.md#Frontend Architecture; DESIGN.md#Layout & Spacing]

### Complete token inventory (copy verbatim into `tokens.css`)

From `DESIGN.md` frontmatter — express each as a `:root` custom property; component tokens
reference the base tokens.

- **Colors (20):** surface-base `#F6F7F9`, surface-raised `#FFFFFF`, surface-sunken `#EEF0F3`,
  ink-primary `#1A1D21`, ink-secondary `#5B6470`, ink-muted `#6B7480`, ink-disabled `#A2AAB4`,
  accent `#2563EB`, accent-hover `#1D4ED8`, accent-foreground `#FFFFFF`, accent-subtle `#EAF0FE`,
  success `#16A34A`, danger `#DC2626`, danger-hover `#B91C1C`, danger-text `#B42318`,
  danger-foreground `#FFFFFF`, danger-subtle `#FDECEC`, border-hairline `#E4E7EC`,
  border-strong `#8B94A1`, focus-ring `#2563EB`, focus-ring-offset `#FFFFFF`.
- **Type ramp:** family `system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
  display 28px/600/lh1.2/ls-0.01em; title 20px/600/lh1.3; body 16px/400/lh1.5; label 14px/500/lh1.4;
  meta 13px/400/lh1.4.
- **Rounded:** sm 6px, md 10px, lg 14px, full 9999px.
- **Spacing:** 1=4, 2=8, 3=12, 4=16, 5=20, 6=24, 8=32, 10=40, 12=48 (px); container-max 640px;
  page-margin 16px.
- **Component tokens:** button-primary (bg accent / hover accent-hover / fg accent-foreground /
  radius md / padding `space-3 space-4`), button-secondary (bg surface-raised / fg ink-primary /
  border border-strong / radius md), button-danger (bg danger / hover danger-hover / fg
  danger-foreground / radius md), icon-button (fg ink-secondary / hover ink-primary / radius sm /
  size 36px), input-text (bg surface-raised / fg ink-primary / border border-strong / border-focus
  accent / radius md / padding `space-3 space-4`), todo-row (bg surface-raised / border
  border-hairline / radius md / padding `space-3 space-4` / gap `space-3`), checkbox (border
  border-strong / bg-checked accent / check-fg accent-foreground / radius sm / size 22px),
  empty-state (headline-type display / body-type body / fg ink-secondary), error-banner (bg
  danger-subtle / fg danger-text / border danger / radius md).

### Exact user-facing copy (EXPERIENCE.md Voice & Tone — do not paraphrase)

- Empty state headline + subline: **"No todos yet."** / **"Add your first one above."**
  (rendered as two lines; combined copy reads "No todos yet. Add your first one above.").
- Load failure (minimal fallback only): **"Couldn't load your todos. Retry."**
- "todo" is lowercase in copy. No emoji, never cute or blaming.

### Empty-state ↔ AddTodoForm seam (cross-story — important)

DESIGN/EXPERIENCE define the empty state as headline + subline **+ the add-Todo input as the
single call to action**. `AddTodoForm` is **Story 2.2**, so in 1.4 the empty state renders headline
+ subline only. When 2.2 lands it must wire the add-input into both the shell (pinned at the top)
and the empty state. Flag this explicitly so 2.2 picks it up; do not stub a fake input now.

### Testing approach (test-first)

- **Component/RTL is the primary artifact for this story** (the "tests land with code"
  discipline). Write the failing tests first, then implement.
- Mock the network at the boundary: stub `global.fetch` for `useTodos`/`api.ts` tests, or
  `vi.mock('../api/api')` for the App-level transition test. Do **not** hit a real server in unit
  tests.
- Assert the **loading → empty transition** explicitly: skeleton present first, then
  `findByText('No todos yet.')`. Use `waitFor`/`findBy*` (async state settle), not fixed timeouts.
- This is **not** an E2E story for the browser-rendered empty state — that Playwright assertion
  folds into Story 3.1's full suite. The 1.4 end-to-end proof is the `compose-smoke` `/api/todos →
  []` curl (the data path) plus the RTL transition (the render path).

### Previous story intelligence (1.1 → 1.3)

- **Docker is NOT installed on this dev machine** (carried through 1.1/1.2/1.3). Cannot run
  `docker compose up` locally — do not fake it. CI is the authoritative proof. A git remote exists
  (`origin → github.com/rs1986x/aine-bmad`) so pushing runs CI.
- **1.2** delivered the working backend: `GET /api/todos` returns `200 Todo[]` (camelCase
  `createdAt`, newest-first, `[]` on a fresh DB) with the `{ error: { code, message } }` envelope
  on failure. This is exactly the contract `api.ts`/`useTodos` consume. The backend `Todo` type
  (`backend/src/types/todo.ts`) is the shape to mirror on the frontend.
- **1.3** delivered the production compose stack: nginx serves the SPA and reverse-proxies
  `/api/*` → `backend:8080`, so in the running stack a relative `fetch('/api/todos')` just works
  (one origin, no CORS). The `compose-smoke` CI job already builds + brings up the stack and curls
  `/` and `/api/health` — Task 10 extends it with `/api/todos`.
- **CI gates are real and block:** `frontend` job runs `lint` + `typecheck` + `test`. The biggest
  risks are `verbatimModuleSyntax` (use `import type`) and unused-locals. Run all three locally
  before pushing.
- The full Playwright E2E suite, `webServer`/`baseURL` wiring, and the ≥70% coverage gate are
  **Story 3.1** — explicitly out of scope here (the e2e package today only has a self-contained
  smoke spec).

### Git intelligence (recent commits)

`c723153 feat(story-1.2)` (backend foundation) → `2a1136d`/`c3d69ca`/`009bde0 story-1.1`
(scaffold + review patches) → `ec90cf5 first commit`. Story 1.3's container/compose changes are in
the working tree (per git status) but not yet a separate commit on this baseline; this story builds
on the frontend scaffold from 1.1 untouched by 1.2/1.3. No prior frontend app code exists beyond
the Vite template — nothing to reuse, but nothing to break either.

### Project Structure Notes

New files land exactly where `architecture.md#Complete Project Directory Structure` places them:
`frontend/src/styles/tokens.css`, `frontend/src/styles/app.css`, `frontend/src/api/api.ts`,
`frontend/src/hooks/useTodos.ts`, `frontend/src/types/todo.ts`,
`frontend/src/components/LoadingSkeleton.tsx`, `frontend/src/components/EmptyState.tsx`, rewritten
`frontend/src/App.tsx`. Tests co-located (`*.test.tsx` next to the unit) per the architecture
testing convention, or under the existing `src/__tests__/` folder — either is acceptable; be
consistent and remove the old `smoke.test.tsx`. No new top-level structure; no backend changes.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4: Frontend skeleton — tokens, shell, useTodos, loading + empty states] — ACs, implementation tasks, test/QA expectations, DoD
- [Source: _bmad-output/planning-artifacts/epics.md#UX Design Requirements] — UX-DR1 (tokens), UX-DR7 (empty state), UX-DR9 (loading skeleton), UX-DR13 (responsive layout), UX-DR14 (microcopy)
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — `api.ts` + `useTodos`, no router/Redux, confirm-on-response, component shape
- [Source: _bmad-output/planning-artifacts/architecture.md#State Management Patterns] — immutable updates, server source of truth, no optimistic UI, hook owns loading/error
- [Source: _bmad-output/planning-artifacts/architecture.md#Error Handling Patterns] — `api.ts` throws `ApiError`; user copy from EXPERIENCE, not raw server text
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] — camelCase on the wire/TS, PascalCase components, `useX` hooks
- [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure] — exact file locations under `frontend/src/`
- [Source: _bmad-output/planning-artifacts/architecture.md#Testing Strategy] — component (RTL) layer scope; E2E owned later
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/DESIGN.md] — full token set (frontmatter), layout/spacing, typography, shapes, component visuals
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/EXPERIENCE.md] — Voice & Tone (exact copy), State Patterns (cold load/empty/error), Responsive & Platform, Accessibility Floor
- [Source: backend/src/types/todo.ts] — the `Todo` wire shape to mirror on the frontend
- [Source: frontend/vite.config.ts] — existing `/api` dev proxy + Vitest jsdom config (leave as-is)
- [Source: frontend/tsconfig.app.json] — `verbatimModuleSyntax`, `erasableSyntaxOnly`, `strict`, `noUnusedLocals`
- [Source: .github/workflows/ci.yml] — `frontend` job (lint/typecheck/test) + `compose-smoke` job to extend
- [Source: _bmad-output/implementation-artifacts/1-3-one-command-docker-compose-bring-up.md] — nginx `/api` proxy, compose-smoke pattern, Docker-not-local constraint

## Dev Agent Record

### Agent Model Used

Claude Opus 4.8 (Cursor)

### Debug Log References

- `frontend`: `npm run lint` → clean; `npm run typecheck` (`tsc -b --noEmit`) → clean;
  `npm test` (`vitest run`) → 2 files / 6 tests passing; `npm run build` (`tsc -b && vite build`) →
  succeeds (21 modules, dist emitted); `npm run format` applied (prettier).
- One lint fix during GREEN: `react-hooks/set-state-in-effect` (eslint-plugin-react-hooks v7)
  flagged the synchronous `setLoading(true)`/`setError(null)` in the `useEffect` body. Resolved by
  moving the request-state reset into the `reload` event callback; initial mount already starts
  `loading=true` / `error=null`, so behavior is unchanged and the lint passes.

### Completion Notes List

- **Tokens (AC #2):** `src/styles/tokens.css` declares the full DESIGN.md set in a single `:root`
  block — 21 color tokens, the 5-role type ramp (display/title/body/label/meta), 4 `rounded` steps,
  the spacing scale (`--space-1..12` + `--container-max: 640px` + `--page-margin: 16px`), and all
  component blocks (button-primary/secondary/danger, icon-button, input-text, todo-row, checkbox,
  empty-state, error-banner). Component tokens reference base tokens (no re-hard-coded hex). Light
  mode only — no `prefers-color-scheme` override.
- **Layout + states (AC #1, #4):** `src/styles/app.css` provides the box-sizing reset, body
  baseline, a `input/textarea/select` `font-size: max(16px, …)` mobile-zoom guard, the centered
  `.app-shell` column (`max-width: var(--container-max)`, `margin-inline: auto`, `--page-margin`
  gutters), the `LoadingSkeleton` (surface-sunken todo-row silhouette rows, pulse gated behind
  `prefers-reduced-motion: no-preference`), and the `EmptyState` block. All tokenized values come
  from `tokens.css`.
- **Data layer (AC #3):** `src/types/todo.ts` mirrors the backend wire shape exactly (camelCase
  `createdAt`). `src/api/api.ts` exports `ApiError` (`code`/`message`/`status`) parsed from the
  `{ error: { code, message } }` envelope and `getTodos()` against the relative `/api/todos`. Type
  import uses `import type` (verbatimModuleSyntax). `useTodos()` returns `list`/`loading`/`error`/
  `reload`, sets the server response as the only source of truth (no optimistic state), resets
  `error` at the start of each fetch, and guards against post-unmount state updates via an `ignore`
  flag (StrictMode-safe).
- **Shell + cleanup (AC #1, #4, #5):** `src/App.tsx` rewritten as a `<main>` landmark
  (`aria-busy={loading}`) that renders LoadingSkeleton → EmptyState, a minimal `role="alert"`
  load-error fallback ("Couldn't load your todos. Retry." + plain Retry calling `reload`; the
  polished ErrorBanner is Story 2.5), and a non-crashing placeholder for the can't-happen populated
  path (real TodoList is Story 2.1). `main.tsx` now imports `styles/tokens.css` then
  `styles/app.css`. `index.html` title set to `Todo`. Deleted `App.css`, `index.css`, the three
  `src/assets/*` files (+ empty `src/assets/` dir), and `public/icons.svg`; kept `public/favicon.svg`.
- **Tests + CI (AC #6):** test-first — `src/hooks/useTodos.test.tsx` (stubbed `fetch`: initial
  loading, resolved `[]`, populated list, non-2xx → `ApiError`) and `src/App.test.tsx` (mocked
  `getTodos`: skeleton-present → `findByText('No todos yet.')` + subline, plus the load-error
  fallback). Removed `src/__tests__/smoke.test.tsx`. The CI `compose-smoke` job now asserts
  `GET /api/todos` returns `200` with body `[]` (`grep -qx '\[\]'`) after the `/api/health` checks.
- **Honest constraints:** Docker is not installed on this dev machine (carried from 1.1–1.3), so the
  compose bring-up was **not** run locally — the CI `compose-smoke` job is the authoritative
  end-to-end proof for the `/api/todos → []` data path. QA evidence captured is the RTL run output
  (the render-path proof for loading → empty); browser screenshots of the running stack were not
  produced headlessly on this machine, by design (the browser E2E assertion is Story 3.1).
- **Cross-story flag for 2.2:** the empty state renders headline + subline only. When `AddTodoForm`
  lands in Story 2.2 it must wire the add-input into both the shell (pinned top) and the empty
  state per DESIGN/EXPERIENCE — do not stub a fake input before then.

### File List

- `frontend/src/styles/tokens.css` (new)
- `frontend/src/styles/app.css` (new)
- `frontend/src/types/todo.ts` (new)
- `frontend/src/api/api.ts` (new)
- `frontend/src/hooks/useTodos.ts` (new)
- `frontend/src/hooks/useTodos.test.tsx` (new)
- `frontend/src/components/LoadingSkeleton.tsx` (new)
- `frontend/src/components/EmptyState.tsx` (new)
- `frontend/src/App.tsx` (rewritten)
- `frontend/src/App.test.tsx` (new)
- `frontend/src/main.tsx` (modified — CSS imports swapped to tokens.css + app.css)
- `frontend/index.html` (modified — title → Todo)
- `frontend/src/App.css` (deleted)
- `frontend/src/index.css` (deleted)
- `frontend/src/assets/hero.png` (deleted)
- `frontend/src/assets/react.svg` (deleted)
- `frontend/src/assets/vite.svg` (deleted)
- `frontend/public/icons.svg` (deleted)
- `frontend/src/__tests__/smoke.test.tsx` (deleted)
- `.github/workflows/ci.yml` (modified — compose-smoke asserts /api/todos → [])

### Change Log

- 2026-06-17: Implemented Story 1.4 — frontend skeleton (design tokens, single-column shell,
  typed `api.ts` `getTodos` + `ApiError`, `useTodos` read path, `LoadingSkeleton`, `EmptyState`),
  removed Vite-template scaffolding, added RTL tests (loading→empty + hook states), and extended
  the CI `compose-smoke` job with the `/api/todos → []` assertion. lint/typecheck/test/build green.

### Review Findings

Adversarial code review (2026-06-17, three layers: Blind Hunter, Edge Case Hunter, Acceptance
Auditor). 2 decision-needed (both resolved → patch), 3 patch, 4 deferred, 8 dismissed as noise. No
review layers failed.

- [x] [Review][Patch] Empty-state headline ignores the `empty-state.foreground` token — `app.css`
      sets `.empty-state__headline { color: var(--color-ink-primary) }` (#1A1D21), but DESIGN.md
      defines `empty-state.foreground: ink-secondary` (#5B6470) as the component's only foreground.
      Resolution: honor the DESIGN token — set the headline to `var(--empty-state-fg)`. [frontend/src/styles/app.css:93]
      **APPLIED 2026-06-17.**
- [x] [Review][Patch] Load-error fallback duplicates "Retry" — the `role="alert"` span renders
      `"Couldn't load your todos. Retry."` immediately followed by a separate `<button>Retry</button>`,
      so it reads "…Retry. Retry". Resolution: drop the trailing "Retry." from the span (keep
      "Couldn't load your todos.") so the button is the only Retry affordance. [frontend/src/App.tsx:16-19]
      **APPLIED 2026-06-17** (App.test.tsx assertion updated to match the new copy + Retry button).
- [x] [Review][Patch] `getTodos()` casts the success body `as Todo[]` with no runtime guard — a 200
      response with `null` crashes the shell (`App.tsx` reads `list.length` → TypeError on null), and
      a non-array (object/string) silently renders the populated-placeholder ("undefined todos" / a
      bogus count) with no error set. Add an `Array.isArray` guard and throw an `ApiError` (or treat
      as a load error) on an unexpected shape. [frontend/src/api/api.ts:47]
      **APPLIED 2026-06-17** (throws `ApiError('malformed_response', …)` on a non-array body).
- [x] [Review][Defer] No `AbortController`/timeout — `useTodos` uses only an `ignore` flag; a hung or
      never-settling fetch leaves `loading=true` (skeleton) forever. [frontend/src/hooks/useTodos.ts:29-49] — deferred
- [x] [Review][Defer] `reload()` does not clear the stale `list` — a reload that fails after a prior
      success keeps the old todos in hook state (masked today because `App` renders the error branch
      first; latent for future consumers). [frontend/src/hooks/useTodos.ts:20-27] — deferred
- [x] [Review][Defer] Skeleton row height is a hard-coded `56px` literal rather than a token-derived
      value (AC #2 "variables, not hard-coded literals"; minor — no DESIGN token defines skeleton row
      height). [frontend/src/styles/app.css:54] — deferred
- [x] [Review][Defer] EmptyState `<h1>` is the page's only top-level heading and appears/disappears
      with data state, so the document outline has no stable heading (minor a11y; shell has no app
      title heading yet). [frontend/src/components/EmptyState.tsx:6] — deferred
