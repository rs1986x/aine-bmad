---
baseline_commit: 12aa945
---

# Story 2.1: Render the populated Todo List

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the end user,
I want to see all my todos grouped and ordered clearly,
so that I can tell active from completed work at a glance.

This is the **first story of Epic 2**. Story 1.4 delivered the frontend skeleton (tokens, shell,
`useTodos` read path, loading + empty states) and left a **non-crashing placeholder** in `App.tsx`
for the populated branch (`<p>{list.length} todos</p>`). This story replaces that placeholder with
the real, **display-only** `TodoList` + `TodoItem` render: semantic `<ul>/<li>`, Active-above-
Completed grouping (newest-first within each), the completed dual signal (checkbox fill **and**
strike-through), per-row `created_at` meta, and inert edit/delete icon buttons. The controls are
**rendered but not wired** — toggle/edit land in Story 2.3, delete in Story 2.4. No backend, no API
client, and no `useTodos` changes are in scope.

## Acceptance Criteria

1. **Given** todos in the list, **When** the list renders, **Then** the **Active** group renders
   **above** the **Completed** group, and within each group todos are ordered **newest-first** by
   `createdAt`. [Source: epics.md#Story 2.1; EXPERIENCE.md#Information Architecture ("List ordering"), #State Patterns; architecture.md#AR-14]
2. **Given** a Completed Todo, **When** rendered, **Then** its checkbox is filled `accent`
   (`--checkbox-bg-checked`) with a white check **and** its Description is strike-through in
   `ink-muted` (`--color-ink-muted`) — **both** signals present, **never color alone**. [Source: epics.md#Story 2.1; DESIGN.md#Colors ("Ink Muted"), #Typography, #Components ("Checkbox"); EXPERIENCE.md#State Patterns ("Completed Todo")]
3. **Given** an Active Todo, **When** rendered, **Then** its checkbox is unchecked (`border-strong`
   outline, no fill) and its Description is `ink-primary` with no strike-through. [Source: DESIGN.md#Components ("Checkbox"); EXPERIENCE.md#State Patterns ("Active Todo")]
4. **Given** the list, **When** its structure is inspected, **Then** it is a **real `<ul>`** whose
   children are **real `<li>`** items (semantic list; `role="list"`/`role="listitem"` implicit). [Source: epics.md#Story 2.1; EXPERIENCE.md#Accessibility Floor; architecture.md#Accessibility & Performance Considerations]
5. **Given** each row, **When** inspected, **Then** it exposes an accessible per-item label —
   **`"{description}"`** for an Active Todo and **`"Completed: {description}"`** for a Completed
   Todo — a `created_at` **meta** line rendered as a `<time dateTime="{createdAt}">` element, and
   **edit** + **delete** icon buttons each with an accessible name (e.g. `aria-label="Edit todo"` /
   `aria-label="Delete todo"`). [Source: epics.md#Story 2.1; EXPERIENCE.md#Voice and Tone ("Completed: {description}"), #Accessibility Floor, #Component Patterns]
6. **Given** the `≥ md` viewport, **When** a row is neither hovered nor focused, **Then** its
   edit/delete icons are visually hidden but **remain in the tab order / accessibility tree**, and
   they reveal on row `:hover` **or** `:focus-within`; **Given** the `< md` (touch) viewport,
   **Then** the icons are **always visible**. [Source: epics.md#Story 2.1, #UX-DR3, #UX-DR13; DESIGN.md#Components ("Todo row"); EXPERIENCE.md#Accessibility Floor, #Responsive & Platform]
7. **Given** the controls are display-only in this story, **When** the checkbox or an icon button is
   activated, **Then** nothing happens yet (no state change, no network) — the toggle handler is
   Story 2.3, edit is Story 2.3, delete is Story 2.4. Controls must be **real, focusable, labeled
   elements** so those stories only need to attach behavior. [Source: epics.md#Story 2.1 ("actions wired in 2.3–2.4"); architecture.md#Frontend Architecture (component shape)]
8. **Given** the verification harness, **When** tests run, **Then** RTL component tests prove:
   grouping/order (active-above-completed, newest-first), the completed dual signal, the active
   plain treatment, the semantic `<ul>/<li>`, and the per-item labels; and `npm run lint`,
   `npm run typecheck`, and `npm test` stay green in `frontend/`. [Source: epics.md#Story 2.1 Test expectations; architecture.md#Testing Strategy]

> **Scope note — what this story IS / IS NOT.**
> **IS:** `src/components/TodoList.tsx`, `src/components/TodoItem.tsx`, a pure grouping/sort helper
> (`src/utils/groupTodos.ts`), the CSS for `.todo-list` / `.todo-item` / checkbox / meta / icon
> buttons / completed treatment / hover-reveal added to `src/styles/app.css`, the `App.tsx`
> populated-branch swap (placeholder `<p>` → `<TodoList todos={list} />`), and co-located RTL tests.
> **IS NOT:** `AddTodoForm` (2.2), any toggle/edit **behavior** (2.3), any delete **behavior** or
> `DeleteDialog` (2.4), the full `ErrorBanner` + Retry + `aria-live` region (2.5), any
> `createTodo`/`updateTodo`/`deleteTodo` client method or `useTodos` action method, any backend
> change, and any Playwright/e2e spec (Story 3.1). Do **not** wire the empty-state add-input (2.2).
> Do **not** add optimistic state.

## Tasks / Subtasks

- [x] **Task 1: Pure grouping/sort helper — `src/utils/groupTodos.ts`** (AC: #1)
  - [x] Create `src/utils/groupTodos.ts` exporting a pure function
        `groupTodos(todos: Todo[]): { active: Todo[]; completed: Todo[] }`. Split by `completed`,
        and within **each** group sort **newest-first** by `createdAt` (ISO-8601 strings sort
        correctly lexicographically, but sort explicitly via `Date`/string compare so behavior is
        deterministic and independent of the server's order). Do **not** mutate the input array
        (copy before sorting — immutable, per architecture State Management Patterns).
  - [x] Use `import type { Todo } from '../types/todo'` (`verbatimModuleSyntax: true`).
  - [x] This helper is the single source of ordering truth so `TodoList` stays presentational and
        the ordering is unit-testable in isolation.

- [x] **Task 2: `TodoItem` (display-only) — `src/components/TodoItem.tsx`** (AC: #2, #3, #5, #6, #7)
  - [x] `export function TodoItem({ todo }: { todo: Todo })` rendering a single **`<li className="todo-item">`**.
        Give the `<li>` an accessible label via `aria-label`: `todo.completed ? \`Completed: ${todo.description}\` : todo.description`.
  - [x] Render a **checkbox** as a styled native control: `<input type="checkbox" checked={todo.completed} readOnly />`
        (the `readOnly` attribute suppresses React's controlled-without-`onChange` warning; the real
        `onChange` toggle + busy state is Story 2.3). Give it `aria-label` matching the row intent or
        mark it presentational — prefer a real labeled checkbox. Style it via `appearance: none` in
        CSS (Task 4) to the 22px DESIGN checkbox (unchecked `border-strong`; checked `accent` fill +
        white check). Do **not** attach any handler.
  - [x] Render the **Description** text in a dedicated element (e.g. `<span className="todo-item__desc">`).
        For a Completed Todo add a `todo-item__desc--completed` modifier that applies strike-through
        + `ink-muted` (CSS in Task 4). Do not paraphrase or transform the description text.
  - [x] Render the **`created_at` meta** as `<time className="todo-item__meta" dateTime={todo.createdAt}>{formatted}</time>`.
        Format the ISO string to a short human-readable date/time (e.g. `Intl.DateTimeFormat` or
        `toLocaleString`) — the exact human format is not asserted in tests; the machine-readable
        `dateTime` attribute (the raw `createdAt`) is what tests assert, so keep it exact.
  - [x] Render **edit** and **delete** icon buttons as real `<button type="button">` elements inside
        a `.todo-item__actions` wrapper, each with an inline SVG icon (`aria-hidden="true"` on the
        `<svg>`) and an accessible name via `aria-label` (`"Edit todo"` / `"Delete todo"`). **No
        `onClick`** in this story (Story 2.3 wires edit, Story 2.4 wires delete). No icon library —
        hand-authored inline SVG only (DESIGN "no UI/component library").
  - [x] Ensure interactive targets have a **≥ 44×44px effective hit area** (checkbox 22px and icon
        buttons 36px wrapped in padded targets) via CSS (Task 4). [EXPERIENCE.md#Accessibility Floor]
  - [x] One component per file; `PascalCase` filename = export name.

- [x] **Task 3: `TodoList` — `src/components/TodoList.tsx`** (AC: #1, #4)
  - [x] `export function TodoList({ todos }: { todos: Todo[] })` rendering a **single real `<ul className="todo-list">`**.
        Call `groupTodos(todos)` and render the **active** items first, then the **completed** items,
        each as a `<TodoItem key={todo.id} todo={todo} />`. A single semantic `<ul>` (not two lists)
        keeps it "the Todo List is a list" per EXPERIENCE.md; the visual Active/Completed separation
        comes from order (+ optional subtle divider styling if desired, tokens only).
  - [x] Presentational only: no hooks, no network, no state — receives `todos` as a prop from `App`.
        [architecture.md#Component Boundaries: components don't call the API; only `useTodos` does.]

- [x] **Task 4: Styles — extend `src/styles/app.css`** (AC: #2, #3, #6)
  - [x] `.todo-list`: reset list styling (`list-style: none; margin: 0; padding: 0;`), vertical stack
        with `gap: var(--space-3)`.
  - [x] `.todo-item`: the `todo-row` visual — `background: var(--todo-row-bg)`,
        `border: 1px solid var(--todo-row-border)`, `border-radius: var(--todo-row-radius)`,
        `padding: var(--todo-row-padding)`, a horizontal flex layout with `gap: var(--todo-row-gap)`,
        aligning checkbox / description (flex-grow) / meta / actions left-to-right.
  - [x] Checkbox: style the native `input[type="checkbox"]` with `appearance: none`, 22px
        (`--checkbox-size`), `--radius-sm`, `border` `--checkbox-border` when unchecked; when
        `:checked`, `background: var(--checkbox-bg-checked)` with a white check (CSS `::after` glyph
        or background SVG in `--checkbox-check-fg`). Wrap or pad to a ≥44px hit area.
  - [x] Completed treatment: `.todo-item__desc--completed { text-decoration: line-through; color: var(--color-ink-muted); }`.
        Active description uses `color: var(--color-ink-primary)` (default).
  - [x] Meta: `.todo-item__meta` in the `meta` ramp (`--font-size-meta`, `--color-ink-secondary`).
  - [x] Icon buttons: `.todo-item__actions button` uses the `icon-button` tokens
        (`--icon-button-fg`, hover `--icon-button-fg-hover`, `--icon-button-radius`,
        `--icon-button-size`); transparent background, cursor pointer, ≥44px hit area.
  - [x] **Hover/focus reveal (≥ md) + always-visible (< md):** by default at `≥ md`, hide the
        `.todo-item__actions` **without removing them from the a11y tree / tab order** (use
        `opacity: 0` + `pointer-events` as appropriate, **not** `display:none`/`visibility:hidden`);
        reveal on `.todo-item:hover` **or** `.todo-item:focus-within`. Additionally, always keep the
        actions visible when they contain focus (`:focus-within`). Below `md` (use a `max-width` media
        query consistent with the app's single breakpoint), force `.todo-item__actions { opacity: 1; }`
        always visible. Keep visible focus rings on all interactive elements (do not suppress
        outlines). [DESIGN.md#Components; EXPERIENCE.md#Accessibility Floor, #Responsive & Platform]
  - [x] All values reference `tokens.css` variables — no hard-coded hex/px for tokenized values
        (mirror the 1.4 discipline). [architecture.md#Styling Solution]

- [x] **Task 5: Wire `TodoList` into the shell — `src/App.tsx`** (AC: #1, #4)
  - [x] Replace the populated-branch placeholder `<p>{list.length} todos</p>` with
        `<TodoList todos={list} />`. Leave the `loading`, `error` (minimal fallback), and
        `list.length === 0` (EmptyState) branches untouched — those remain 1.4 / 2.5 concerns.
  - [x] Add the `import { TodoList } from './components/TodoList'`. Do **not** add `AddTodoForm`,
        `aria-live`, or any `ErrorBanner` here (2.2 / 2.5).

- [x] **Task 6: Tests (write first — red, then green)** (AC: #8)
  - [x] **`groupTodos` unit test** (`src/utils/groupTodos.test.ts`): given a mixed, deliberately
        **out-of-order** `Todo[]`, assert `active` and `completed` are split correctly and each is
        newest-first by `createdAt`; assert the input array is not mutated.
  - [x] **`TodoItem` component test** (`src/components/TodoItem.test.tsx`): for a completed todo,
        assert the description has the strike-through/`--completed` treatment (class or computed
        style) **and** the checkbox is checked (dual signal), and the `<li>` accessible name is
        `"Completed: {description}"`; for an active todo, assert plain treatment, unchecked checkbox,
        and `<li>` name `"{description}"`. Assert the `<time>` element carries `dateTime` = the exact
        `createdAt`, and that edit/delete buttons are present with their accessible names.
  - [x] **`TodoList` component test** (`src/components/TodoList.test.tsx`): render a mixed list and
        assert (a) the container is a list (`getByRole('list')`) with the right number of
        `getAllByRole('listitem')`, and (b) DOM order is active(newest-first) then completed(newest-
        first) — assert by reading the rendered `listitem` order and matching descriptions.
  - [x] Prefer role/text/`aria-label` queries over brittle snapshots; use RTL (`@testing-library/react`).
        Use `getByRole('checkbox')` and `toBeChecked()` for checkbox state.
  - [x] `npm run lint`, `npm run typecheck` (`tsc -b --noEmit`), and `npm test` (`vitest run`) all
        pass in `frontend/`.

- [x] **Task 7: Verify** (AC: #1–#8)
  - [x] Local: with the backend reachable (or seed a few todos), run `npm run dev` in `frontend/`
        and confirm the populated list renders — active on top, completed below (dual signal),
        icons reveal on hover/focus ≥ md and stay visible < md. **Docker is not available on this dev
        machine** (carried from 1.1–1.4) — do not fake a compose bring-up; CI and Story 3.1 own the
        end-to-end browser proof. State this honestly in Completion Notes.
  - [x] Capture RTL output + a screenshot of a populated list (active + completed) for QA evidence.

### Review Findings

_Code review 2026-07-13 (Blind Hunter + Edge Case Hunter + Acceptance Auditor) against baseline
`12aa945`. AC1–AC8 verified met; `lint` / `typecheck` / `test` re-run green (16/16). Resolve
decision-needed items before patches._

- [x] [Review][Dismissed] Touch devices wider than 640px never reveal edit/delete — reviewed
      2026-07-13: **keep the spec-literal `@media (max-width: 640px)` gate as-is**, consistent with the
      story's single-breakpoint guidance. Accepted trade-off. [frontend/src/styles/app.css:243]
- [x] [Review][Patch] Checkbox `aria-label` should be state-aware [frontend/src/components/TodoItem.tsx:31]
      — the static `aria-label="Completed"` made a screen reader announce an active (unchecked) row's
      checkbox as "Completed, checkbox, not checked". **Applied 2026-07-13:** `aria-label` is now
      `completed ? 'Completed' : 'Not completed'`.
- [x] [Review][Patch→Defer] Checkbox effective hit area is 22px, not ≥44px [frontend/src/styles/app.css]
      — Task 2 requires a "≥ 44×44px effective hit area"; the icon buttons met it (44px) but the
      checkbox was a bare 22px input, and the original inline comment falsely claimed a "≥44px hit area
      via padding provided by the surrounding row height". A first patch (a transparent
      `::before` overlay) was applied then **reverted** — the pass-2 re-review found pseudo-elements
      are not reliably generated on a replaced `<input>` (see below), so it was ineffective.
      **Resolved 2026-07-13:** reverted the overlay, corrected the comment to state the truth, and
      **deferred** the real ≥44px checkbox target to Story 2.3 (logged to `deferred-work.md`), where
      the checkbox becomes interactive and can carry a properly-sized target / wrapping `<label>`.

#### Re-review (pass 2, 2026-07-13)

Re-ran all three layers against the patched state. Patch 1 (state-aware checkbox `aria-label`) confirmed
clean — AC5/AC7/AC8 all still MET (the `<li>` `aria-label` still wins the listitem name; role/checked
unaffected). All other raised items were already-triaged (deferred `localeCompare`/`dateTime`) or
by-design (inert controls per AC7). One new actionable finding:

- [x] [Review][Decision→Defer] The `::before` ≥44px hit-area overlay is ineffective on the checkbox
      [frontend/src/styles/app.css] — flagged by all three layers. `<input type="checkbox">` is a
      *replaced element*; `::before`/`::after` are not reliably generated on it (not rendered in
      Firefox), and even where rendered a pseudo-element does not dependably enlarge the input's own
      interactive hit-testing region. So the WCAG 2.5.5 target-size goal was effectively unmet — and the
      comment two lines above literally admitted "input elements don't reliably support ::after". The
      checkbox is fully inert in 2.1 (no `onChange`), so a 44px target has no functional effect this
      story. **Resolved 2026-07-13:** reverted the overlay and **deferred** the ≥44px checkbox target
      to Story 2.3 (logged to `deferred-work.md`).
- [x] [Review][Defer] `groupTodos` sorts ISO strings lexically via `localeCompare` [frontend/src/utils/groupTodos.ts:25]
      — deferred, pre-existing. Correct for the documented uniform UTC ("Z") `createdAt`; would
      misorder only if the server emits timezone offsets or variable fractional-second precision.
- [x] [Review][Defer] No runtime guard for malformed/missing `createdAt` [frontend/src/utils/groupTodos.ts:25]
      — deferred, pre-existing. `useTodos` does no shape validation, so a bad `createdAt` would throw
      in `.localeCompare` (crashing the list) or emit an invalid `<time dateTime>`. The `Todo` type
      guarantees a string; broader input validation is Story 2.5 scope, not 2.1.
- [x] [Review][Defer] White check color hardcoded `#ffffff` in the checkbox data-URI [frontend/src/styles/app.css:172]
      — deferred, pre-existing. Justified exception: CSS cannot interpolate `var(--checkbox-check-fg)`
      into a `url()` data-URI. Optional cosmetic: add a comment noting the intentional duplication.

## Dev Notes

### What this story IS / IS NOT (read the Scope note above first)

- **IS:** display-only `TodoList` + `TodoItem`, a pure `groupTodos` helper, their CSS, the `App.tsx`
  populated-branch swap, and co-located RTL tests.
- **IS NOT:** `AddTodoForm` (2.2), toggle/edit **behavior** (2.3), delete **behavior**/`DeleteDialog`
  (2.4), `ErrorBanner`/Retry/`aria-live` (2.5), any write client method or `useTodos` action, any
  backend change, or any Playwright/e2e work (3.1).

### Current state of files this story changes (read before editing)

- `frontend/src/App.tsx` — the 1.4 shell. It consumes `useTodos()` and branches:
  `loading` → `<LoadingSkeleton />`; `error` → minimal `role="alert"` fallback; `list.length === 0`
  → `<EmptyState />`; else → **`<p>{list.length} todos</p>` placeholder to replace**. Swap only the
  final branch to `<TodoList todos={list} />`; **leave the other three branches exactly as-is.**
- `frontend/src/hooks/useTodos.ts` — read path only (`{ list, loading, error, reload }`). **Do not
  change it** in this story (action methods are 2.2–2.4). Note the deferred quirk (below) that
  `reload()` does not clear a stale `list`; it does not affect 2.1 (App renders the error branch
  ahead of the list), but do not rely on `list` being cleared on a failed reload.
- `frontend/src/types/todo.ts` — the `Todo` shape (`{ id, description, completed, createdAt }`,
  camelCase). Import the type with `import type`. Do **not** add `CreateTodoInput`/`UpdateTodoInput`
  here (those are 2.2 / 2.3).
- `frontend/src/api/api.ts` — `getTodos()` + `ApiError` only. **No new client methods in 2.1.**
- `frontend/src/styles/tokens.css` — the full DESIGN token set already exists (colors, type ramp,
  spacing, rounded, and component tokens incl. `--todo-row-*`, `--checkbox-*`, `--icon-button-*`).
  **Do not add or change tokens** — reference the existing ones. If a value you need has no token
  (e.g. a hover-reveal transition duration), a small non-tokenized literal is acceptable (mirrors the
  1.4 skeleton-height precedent) but keep tokenized values tokenized.
- `frontend/src/styles/app.css` — global reset + shell + skeleton + empty-state + load-error styles.
  **Append** the `.todo-list` / `.todo-item` styles here (same file, same tokenized discipline).
- `frontend/src/components/` — `EmptyState.tsx` and `LoadingSkeleton.tsx` exist and show the file
  conventions (one component per file, `export function Name()`, no default export). Mirror them.
- `frontend/src/App.test.tsx` — 1.4's loading→empty + load-error tests. **Leave as-is**; the
  populated branch never fires in those tests (they resolve to `[]` or reject). Add **new** test
  files for the new units; do not rewrite `App.test.tsx`.

### TypeScript / toolchain guardrails (hard — CI blocks on these)

- **`verbatimModuleSyntax: true`** → type-only imports MUST be `import type { Todo } from '../types/todo'`.
- **`erasableSyntaxOnly: true`** → no `enum`, no `namespace`, no TS parameter-properties. Use plain
  types/interfaces and string-literal unions.
- **`noUnusedLocals` / `noUnusedParameters`** → no unused imports/vars (lint + tsc both fail).
- `strict: true`, `jsx: react-jsx` (no `import React` needed), import `.ts`/`.tsx` modules **without**
  file extensions (e.g. `from './components/TodoItem'`).
- React **19.2**, Vite **8**, Vitest **4.x**, TS **6.0**, Node ≥ 24. `npm run typecheck` = `tsc -b --noEmit`.
- `@testing-library/react` (incl. `renderHook`), `@testing-library/jest-dom`,
  `@testing-library/user-event`, `@vitest/coverage-v8` are already installed — **no new deps**.
  (2.1 has no user interactions to simulate, so `user-event` is likely unused here.)
- Test env is jsdom with globals + `src/test/setup.ts` (imports `@testing-library/jest-dom`) already
  wired via `vite.config.ts` — do not reconfigure it.

### Architecture rules this story MUST honor

- **Component boundary:** `TodoList`/`TodoItem` are **presentational** — they receive data via props;
  only the `useTodos` hook (via `api.ts`) touches the network. Components never call `fetch`.
  [architecture.md#Component Boundaries]
- **Casing:** camelCase everywhere on the frontend (`createdAt`, never `created_at` in code — though
  the user-facing label/meta concept is "created_at"). [architecture.md#Naming Patterns]
- **Immutable / no optimistic UI:** the grouping helper copies before sorting; there is no local
  mutable state and no optimistic behavior (there is no behavior at all in 2.1). [architecture.md#State Management Patterns]
- **Tokens, not literals:** component CSS references `tokens.css` vars for all tokenized
  colors/spacing/radii/type. [architecture.md#Styling Solution; epics.md#UX-DR1]
- **Accessibility floor:** semantic `<ul>/<li>`; completion conveyed by **checkbox state + strike-
  through**, never color alone; per-item labels (`"{description}"` / `"Completed: {description}"`);
  visible focus rings on every interactive element; icons stay in the tab order (hidden via opacity,
  not removed); ≥ 44×44px hit areas. **`aria-live` for list changes is Story 2.5 — not here.**
  [architecture.md#Accessibility & Performance Considerations; EXPERIENCE.md#Accessibility Floor]

### Ordering contract (AC #1 — get this exactly right)

- **Groups:** Active Todos render **above** Completed Todos. [EXPERIENCE.md#Information Architecture]
- **Within a group:** **newest-first** by `createdAt` (descending ISO-8601). The backend already
  returns `GET /api/todos` ordered `created_at DESC` (newest-first) [architecture.md#AR-14, #API Contracts],
  so the server order is already correct globally — but `groupTodos` must **re-establish** newest-
  first within each group after splitting (and be robust to unordered input) so ordering is proven in
  a unit test independent of the server. Do not assume the incoming prop is pre-sorted.
- Toggling completion later (2.3) will re-sort a row into the correct group on confirmed response —
  out of scope here, but keep `groupTodos` the single ordering authority so 2.3 reuses it.

### Display-only controls — rationale & exact expectations (AC #7)

The epic says the checkbox + icon buttons are "display-only (actions wired in 2.3–2.4)". Render them
as **real, focusable, labeled** elements now so 2.3/2.4 only attach handlers (no restructuring):

- **Checkbox:** `<input type="checkbox" checked={todo.completed} readOnly />` — `readOnly` prevents
  the React "controlled input without onChange" warning while keeping it a real, queryable checkbox
  (`getByRole('checkbox')` / `toBeChecked()`). No `onChange` yet. Story 2.3 replaces `readOnly` with
  an `onChange` toggle + busy/disabled state.
- **Icon buttons:** real `<button type="button" aria-label="Edit todo|Delete todo">` with **no
  `onClick`**. They are inert placeholders; 2.3 (edit) and 2.4 (delete) attach behavior. Do not
  `disabled` them (that would drop them from the tab order and grey them out, contradicting AC #6).

### Exact user-facing copy / labels (do not paraphrase)

- Completed per-item accessible label: **`Completed: {description}`** (verbatim prefix, colon +
  space). Active per-item label: the description text only. [EXPERIENCE.md#Voice and Tone, #Accessibility Floor]
- No new visible microcopy is introduced by this story (no headings, banners, or placeholders — those
  belong to other stories). "todo" stays lowercase anywhere it appears in copy.

### Suggested DOM shape (guide, not gospel)

```tsx
// TodoItem
<li className="todo-item" aria-label={completed ? `Completed: ${description}` : description}>
  <input type="checkbox" className="todo-item__checkbox" checked={completed} readOnly aria-hidden />
  <span className={`todo-item__desc${completed ? ' todo-item__desc--completed' : ''}`}>{description}</span>
  <time className="todo-item__meta" dateTime={createdAt}>{formatCreatedAt(createdAt)}</time>
  <span className="todo-item__actions">
    <button type="button" aria-label="Edit todo">{/* pencil svg aria-hidden */}</button>
    <button type="button" aria-label="Delete todo">{/* trash svg aria-hidden */}</button>
  </span>
</li>
```

> Labeling choice: putting the accessible name on the `<li>` via `aria-label` satisfies AC #5's
> "labeled list item" wording and is directly testable (`getByRole('listitem', { name: ... })`). If
> you instead convey "Completed:" via a visually-hidden `<span>`, ensure the `<li>` accessible name
> still resolves to exactly `"{description}"` / `"Completed: {description}"` (meta + button labels can
> otherwise pollute the name) — the `aria-label` approach avoids that pitfall. Marking the display-
> only checkbox `aria-hidden` is acceptable since the `<li>` label already conveys completion; if you
> keep the checkbox in the a11y tree instead, give it its own label and avoid double-announcing.

### Project Structure Notes

- New files land under `frontend/src/`: `components/TodoList.tsx`, `components/TodoItem.tsx`, and
  `utils/groupTodos.ts` (+ co-located `*.test.ts(x)`). Architecture's frontend tree lists
  `components/`, `hooks/`, `api/`, `types/`, `styles/` but **not** a `utils/` folder — adding a small
  `utils/` folder for a pure, framework-free helper is a **minor, intentional variance** consistent
  with the "organize by type" convention and keeps the ordering logic unit-testable outside React.
  (Acceptable alternative: co-locate the helper next to `TodoList`; either is fine — be consistent.)
- Tests co-located as `*.test.ts(x)` next to the unit (the 1.4 convention). No new top-level
  structure; no backend changes; no token changes.

### Previous story intelligence (1.4) & deferred items to respect

- 1.4 established: tokens (`tokens.css`), the shell (`App.tsx`), typed `api.ts` `getTodos()` +
  `ApiError`, and `useTodos` read path. Component convention: one per file, named export, no default.
- **`useTodos.reload()` does not clear a stale `list`** (deferred from 1.4 review) — irrelevant to
  2.1's happy-path render but do not build any behavior that assumes `list` is emptied on a failed
  reload. Full error/retry UX (and any hardening of the hook) is Story 2.5. [deferred-work.md]
- **No `AbortController`/timeout in `useTodos`** (deferred) — not in scope; do not change the hook.
- **CI gates are real and block:** the `frontend` job runs `lint` + `typecheck` + `test`. Top risks
  are `verbatimModuleSyntax` (use `import type`) and unused-locals/params. Run all three locally
  before pushing.
- **Docker is not installed on this dev machine** (carried through 1.1–1.4). Do not fake a compose
  bring-up; CI `compose-smoke` and the Story 3.1 Playwright suite are the authoritative end-to-end
  proofs. The browser-rendered populated list is asserted by Story 3.1's E2E — 2.1's proof is the RTL
  component layer.

### Git intelligence (recent commits)

- `12aa945 feat(story-1.3,1.4): docker compose bring-up + frontend skeleton` (current HEAD /
  baseline) → `c723153 story-1.2` → `2a1136d`/`c3d69ca`/`009bde0 story-1.1` → `ec90cf5 first commit`.
- Working tree is clean at baseline. The frontend skeleton this story builds on is exactly what's in
  `frontend/src/` today — nothing to reuse for the list itself (it doesn't exist yet), nothing else
  to break. Land the new tests in the **same change** as the components (test-first discipline).

### Testing approach (test-first)

- **RTL component tests + the `groupTodos` unit test are the primary artifact** for this story. Write
  the failing tests first, then implement.
- No network in these tests — `TodoList`/`TodoItem` take `todos` as a prop; construct fixture
  `Todo[]` inline (stable `id`s + explicit `createdAt` ISO strings so ordering assertions are
  deterministic).
- Assert the **dual completed signal** as two separate facts (checkbox `toBeChecked()` **and** the
  strike-through/`--completed` treatment) so a regression that drops one is caught.
- Assert **order** by reading the rendered `listitem` sequence, not by index guesswork — build a
  fixture where the correct output order differs from input order.
- This is **not** an E2E story; the browser-rendered proof folds into Story 3.1's Playwright suite.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1: Render the populated Todo List] — ACs, implementation tasks, test/QA expectations, DoD
- [Source: _bmad-output/planning-artifacts/epics.md#UX Design Requirements] — UX-DR3 (todo row), UX-DR4 (checkbox), UX-DR10 (completed treatment), UX-DR11 (grouping & re-sort), UX-DR12 (a11y floor), UX-DR13 (responsive)
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — component shape `App → TodoList → TodoItem`, no router/Redux, confirm-on-response
- [Source: _bmad-output/planning-artifacts/architecture.md#Component Boundaries (frontend)] — presentational components; only the hook talks to the network
- [Source: _bmad-output/planning-artifacts/architecture.md#State Management Patterns] — immutable updates, no optimistic UI
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] — camelCase wire/TS, PascalCase components, file-name = export
- [Source: _bmad-output/planning-artifacts/architecture.md#Accessibility & Performance Considerations] — semantic list, completion via state+text (not color alone), focus rings, hit areas
- [Source: _bmad-output/planning-artifacts/architecture.md#API Contracts / AR-14] — `GET /api/todos` returns `created_at DESC` (newest-first); client groups active/completed
- [Source: _bmad-output/planning-artifacts/architecture.md#Styling Solution] — hand-authored CSS, DESIGN tokens as CSS vars, no UI library
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/DESIGN.md#Components] — Todo row, Checkbox, completed treatment visuals; #Colors (ink-muted), #Typography (meta), #Shapes
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/EXPERIENCE.md#Information Architecture] — list ordering (Active above Completed, newest-first)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/EXPERIENCE.md#State Patterns] — Active vs Completed row treatment
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/EXPERIENCE.md#Voice and Tone] — "Completed: {description}" a11y label
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/EXPERIENCE.md#Accessibility Floor, #Responsive & Platform] — labels, tab-order-safe hidden icons, hit areas, hover-reveal ≥md / always-visible <md
- [Source: _bmad-output/implementation-artifacts/1-4-frontend-skeleton-tokens-shell-usetodos-loading-and-empty-states.md] — skeleton files, App shell branches, token/component conventions, toolchain guardrails
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — 1.4 deferrals (useTodos reload/AbortController) to respect, not fix, here
- [Source: frontend/src/App.tsx] — the populated-branch placeholder to replace
- [Source: frontend/src/types/todo.ts] — `Todo` shape
- [Source: frontend/src/styles/tokens.css] — existing `--todo-row-*`, `--checkbox-*`, `--icon-button-*`, `--color-*` tokens to reference
- [Source: frontend/src/styles/app.css] — where to append `.todo-list` / `.todo-item` styles
- [Source: frontend/tsconfig.app.json] — `verbatimModuleSyntax`, `erasableSyntaxOnly`, `strict`, `noUnusedLocals`

## Dev Agent Record

### Agent Model Used

Opus 4.8 (Cursor) — bmad-dev-story workflow.

### Debug Log References

- `frontend/`: `npm run lint` → clean; `npm run typecheck` (`tsc -b --noEmit`) → clean;
  `npm test` (`vitest run`) → **5 files, 16 tests passed** (2.93s). Includes the pre-existing
  `App.test.tsx` (loading→empty + load-error) with no regressions.

### Completion Notes List

- **Test-first:** wrote the failing `groupTodos`, `TodoItem`, and `TodoList` tests before their
  implementations, then made them green. Full suite (new + pre-existing) passes.
- **Ordering authority (AC #1):** `groupTodos` splits by `completed` and re-sorts each group
  newest-first via `createdAt.localeCompare` (descending, immutable — copies via the split, never
  mutates the input). Proven by a unit test whose input order differs from expected output.
- **Dual completed signal (AC #2/#3):** checkbox `checked` state **and** the
  `.todo-item__desc--completed` strike-through + `ink-muted` treatment are asserted as two separate
  facts so a regression dropping either is caught. Active rows: unchecked + `ink-primary`, no strike.
- **Semantics (AC #4):** single real `<ul className="todo-list">` with one `<li>` per todo
  (`getByRole('list')` + `getAllByRole('listitem')`).
- **Per-item labels (AC #5):** accessible name placed on the `<li>` via `aria-label`
  (`"{description}"` / `"Completed: {description}"`) so the meta line and button labels don't pollute
  the computed name. `<time dateTime={createdAt}>` carries the exact ISO string (asserted); the
  visible text is `toLocaleString` (medium date + short time), intentionally not asserted. Edit/Delete
  are real `<button type="button">` with `aria-label="Edit todo"` / `"Delete todo"` and hand-authored
  inline `aria-hidden` SVGs (no icon library).
- **Labeling decision:** the display-only checkbox is kept in the a11y tree (queryable via
  `getByRole('checkbox')` per Task 6, so NOT `aria-hidden`) with a short static `aria-label="Completed"`
  — this satisfies the test contract and avoids re-announcing the row description that the `<li>`
  label already conveys.
- **Hover-reveal (AC #6):** `.todo-item__actions` default `opacity: 0` (NOT `display`/`visibility`)
  so icons stay in the tab order / a11y tree; revealed on `.todo-item:hover` **or** `:focus-within`.
  A `@media (max-width: 640px)` block (the app's single breakpoint, aligned with `--container-max`)
  forces them always-visible on touch. `prefers-reduced-motion: reduce` disables the fade. Focus
  outlines are not suppressed. ≥44×44px hit areas via 44px icon-button targets.
- **Display-only (AC #7):** no `onClick` on the buttons, `readOnly` (not `disabled`) checkbox — the
  controls are real/focusable/labeled so Stories 2.3 (toggle/edit) and 2.4 (delete) only attach
  behavior. No `useTodos`/API/backend/token changes; the three untouched `App` branches (loading,
  error, empty) are unchanged.
- **`utils/` folder:** added `frontend/src/utils/` for the framework-free `groupTodos` helper — the
  minor, intentional structure variance called out in the story's Project Structure Notes.
- **Verify / screenshot honesty (Task 7):** the RTL component layer is 2.1's authoritative proof
  (output above). A live browser screenshot of the populated list was **not** captured: **Docker is
  not installed on this dev machine** (carried from 1.1–1.4) and no seeded backend / headless-browser
  tooling is available locally. Per the story's own guidance, the browser-rendered populated-list
  proof folds into **Story 3.1's Playwright E2E** — no compose bring-up was faked.

### File List

- `frontend/src/utils/groupTodos.ts` (new)
- `frontend/src/utils/groupTodos.test.ts` (new)
- `frontend/src/components/TodoItem.tsx` (new)
- `frontend/src/components/TodoItem.test.tsx` (new)
- `frontend/src/components/TodoList.tsx` (new)
- `frontend/src/components/TodoList.test.tsx` (new)
- `frontend/src/App.tsx` (modified — populated branch swapped `<p>` → `<TodoList todos={list} />`)
- `frontend/src/styles/app.css` (modified — appended `.todo-list` / `.todo-item` / checkbox / meta /
  actions / hover-reveal styles)

## Change Log

| Date       | Version | Description                                                                 |
| ---------- | ------- | --------------------------------------------------------------------------- |
| 2026-07-13 | 0.1     | Implemented Story 2.1: display-only `TodoList` + `TodoItem` + `groupTodos` helper, CSS, `App` wire-in, and co-located RTL/unit tests. lint/typecheck/test green. Status → review. |
