---
name: Todo App (Training Exercise)
status: final
created: 2026-06-15
updated: 2026-06-15
sources:
  - _bmad-output/planning-artifacts/prds/prd-aine-bmad-2026-06-15/prd.md
---

# Todo App — Experience Spine

> How the single-user Todo App *works*: information architecture, behavior, states, interactions, accessibility, and journeys. Visual identity lives in `DESIGN.md`; this spine references its tokens by name (`{path.to.token}`). Both spines win on conflict with any mock or import. Glossary terms (**Todo**, **Todo List**, **Description**, **Completed status**, **Active Todo**, **Completed Todo**, `created_at`) are used verbatim from the PRD.

## Foundation

Single-surface responsive web app, built from-scratch in React + TypeScript with hand-authored CSS design tokens (no component library) — see `DESIGN.md` for the token set. One individual user, no authentication, no onboarding (PRD §2, §5). The entire product is one screen — the **Todo List** — plus a single transient confirmation dialog. The backend `API` is the source of truth; the frontend holds no authoritative state (PRD FR-6). The app is usable on desktop and mobile from the same responsive layout.

`DESIGN.md` is the visual-identity reference; this spine specifies behavior only. Where a behavior implies a visual, the visual spec lives in `DESIGN.md.Components`.

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| **Todo List** (Home) | App open (the only entry point; no nav, no URL routing in v1) | View the **Todo List**, create a **Todo**, toggle **Completed status**, edit a **Description**, initiate delete. Realizes UJ-1, FR-1–FR-5. |
| **Delete-confirmation dialog** | "Delete" action on a Todo row | Confirm or cancel permanent deletion of one **Todo** (FR-5). Modal overlay on the Todo List; never a separate page. |

There is exactly one surface and one modal. No tabs, no settings, no navigation. The add-Todo input is pinned to the top of the Todo List surface so the primary action is always immediately reachable.

→ Composition reference: [`mockups/todo-list.html`](mockups/todo-list.html) illustrates normal (Active/Completed groups), inline-edit, empty, error+loading, and the delete dialog. The spines win on conflict with the mock.

**List ordering (resolves PRD Open Question 1):** **Active Todos** render above **Completed Todos**; within each group, newest first by `created_at`. Completing a Todo moves it down into the completed group; un-completing moves it back up.

## Voice and Tone

Microcopy. Plain, calm, and human — never cute, never celebratory (no "🎉"), never blaming the user on errors.

| Context | Do | Don't |
|---|---|---|
| Add input placeholder | "Add a todo…" | "What needs doing today?! 🚀" |
| Empty state | "No todos yet. Add your first one above." | "You're all caught up, superstar!" |
| Empty validation | "Enter some text first." | "Error: description cannot be null." |
| Load failure | "Couldn't load your todos. Retry." | "Something went wrong." |
| Save/create failure | "Couldn't save that change. Retry." | "Oops! 😬" |
| Delete confirmation | "Delete this todo? This can't be undone." | "Are you absolutely sure???" |
| Completed (a11y label) | "Completed: {description}" | (no announcement) |

Use "todo" (lowercase) in user-facing copy; the term maps to the Glossary **Todo**. Counts read as "3 todos left" (Active count), optional and `meta`-styled.

## Component Patterns

Behavioral rules; visual specs live in `DESIGN.md.Components`.

| Component | Use | Behavioral rules |
|---|---|---|
| Add-Todo input | Top of Todo List | `Enter` or "Add" button submits. Trims whitespace; empty/whitespace-only is rejected inline without clearing the field (FR-2). On success, field clears, refocuses, and the new Todo appears in the Active group, newest-first, without a manual refresh. |
| Todo row | Todo List | Contains checkbox, Description, `created_at`, edit + delete actions. Toggling the checkbox flips **Completed status** (FR-3) and re-sorts the row into the correct group. The row is a labeled group for assistive tech. |
| Checkbox | Todo row | Toggles **Completed status** both directions (reversible, FR-3). Reflects state immediately on confirmed server response; see State Patterns for the in-flight rule. |
| Inline edit | Todo row | Edit action replaces the Description with a pre-filled field in place (no modal, per UJ-1). `Enter`/Save commits a non-empty Description (FR-4); `Esc`/Cancel discards. Empty save is rejected inline, original preserved. Only one Todo is in edit mode at a time. |
| Delete + confirmation dialog | Todo row → dialog | Delete opens the confirmation dialog (deletion is permanent, no undo — PRD §5). Confirm deletes and removes the row (FR-5); Cancel closes with no change. Focus returns to a sensible row after either outcome. |
| Empty state | Todo List | Shown when the Todo List has zero Todos and loading has resolved. Headline + subline + the add-Todo input as the only call to action. |
| Error banner | Above the list | Shown on load/save/delete failure; includes a Retry that re-attempts the failed operation. Non-blocking for unaffected content. |
| Loading skeleton | Todo List | Placeholder rows during the initial list fetch. |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Cold load (fetching list) | Todo List | Loading skeleton (3–5 rows). Resolves to list, empty state, or error (FR-1). |
| Empty | Todo List | `display` headline "No todos yet." + subline + add input. Not a blank screen (FR-1). |
| Normal (has Todos) | Todo List | Active group on top, Completed group below; newest-first within each. Optional "{n} todos left" count. |
| Active Todo | Todo row | `ink-primary` Description, unchecked checkbox. |
| Completed Todo | Todo row | Checkbox filled `{colors.accent}` with check, Description strike-through in `{colors.ink-muted}` (AA-legible) — **both** signals, never color alone (FR-1, a11y). |
| Create validation error | Add input | `{colors.danger}` border + helper "Enter some text first." Typed text preserved (FR-2). |
| Edit validation error | Todo row (edit mode) | Same inline danger treatment; original Description unchanged on rejected save (FR-4). |
| Action in flight | Affected control | The control (checkbox / Save / Delete) shows a brief busy/disabled state and is debounced against double-submit. UI commits only on confirmed server response — no optimistic state that could diverge from Persistence (PRD SM-C2, FR-6). `[ASSUMPTION: given the local single-user target and NFR-1 latency budget, a confirm-on-response model is acceptable; a subtle 100–150ms busy affordance covers the wait.]` |
| Load failure | Error banner | "Couldn't load your todos. Retry." Banner uses `role="alert"` so the failure is announced; Retry re-fetches (NFR-2). |
| Save/create/toggle/delete failure | Error banner / inline | "Couldn't save that change. Retry." Banner uses `role="alert"`. The user's input/intent is never silently lost (NFR-2). For a failed create, the typed Description stays in the input. |
| Backend unreachable | Error banner | Same as load/save failure with a connection-flavored message; non-destructive, retryable (UJ-1 edge case, NFR-2). |

## Interaction Primitives

**Keyboard:**
- `Enter` in the add-Todo input — create the Todo.
- `Enter` in an inline-edit field — save; `Esc` — cancel.
- `Space`/`Enter` on a focused checkbox — toggle Completed status.
- `Tab`/`Shift+Tab` — move through add input → each row's controls in reading order.
- In the delete dialog: focus is trapped; `Esc` cancels; `Enter` activates the focused button (default focus on Cancel to avoid accidental destructive confirm). `[ASSUMPTION: default focus is Cancel, not Delete.]`

**Pointer / touch:**
- Click/tap the checkbox to toggle; click/tap edit or delete icons to act.
- Row action icons are hover/focus-revealed on `≥ md`, always visible on touch viewports (no hover-only affordances on small screens).
- All interactive targets are ≥ 44×44px effective hit area.

**Banned:** optimistic UI that diverges from persisted state; drag-to-reorder (out of scope); multi-select/bulk actions (out of scope); more than one Todo in edit mode at once; modal stacking beyond the single confirmation dialog.

## Accessibility Floor

Behavioral accessibility; visual contrast is carried by `DESIGN.md` tokens, whose load-bearing text and control-boundary combinations were verified ≥ AA (see DESIGN.md §Colors "Verified contrast"). The only sub-threshold token is `border-hairline`, used solely for decorative row dividers.

- **WCAG 2.1 AA** across desktop and mobile (PRD NFR-3 requirement: "WCAG AA basics").
- Completion is conveyed by **checkbox state + strike-through text**, never color alone.
- The add-Todo input and every inline-edit field have programmatic labels; the Todo List is a list with each Todo as a labeled list item ("Completed: {description}" / "{description}").
- List changes (add, complete, delete) announce via an `aria-live="polite"` region; **error/failure** messages use `role="alert"` (assertive) so actionable failures are announced promptly (WCAG 4.1.3).
- The delete-confirmation dialog uses a focus trap, is labeled by its title, returns focus to a sensible element on close, and is dismissible with `Esc`.
- Visible focus indicator on every interactive element: a `{colors.focus-ring}` outline with a `{colors.focus-ring-offset}` gap (double-ring on accent surfaces) so focus stays visible even on the accent-filled Add button and checked checkbox.
- Row action icons reveal on `:focus-within` as well as hover, and never leave the accessibility tree / tab order (they are visually hidden, not removed).
- Validation errors are associated with their field (`aria-describedby`) so they are announced, not just shown.
- Interactive targets have a ≥ 44×44px effective hit area (the 22px checkbox and 36px icon buttons are wrapped in padded targets); text resizable to 200% without loss of function via the single-column reflow.

## Responsive & Platform

| Breakpoint | Behavior |
|---|---|
| `≥ md` (≈768px+) | Centered single column at `{spacing.container-max}` (640px). Row action icons reveal on hover/focus. Add input + button sit on one line. |
| `< md` (mobile) | Column fills width minus `{spacing.page-margin}`. Row action icons always visible (no hover). Add input is full-width; button stacks beneath or becomes an inline icon if space is tight. 16px input font prevents mobile zoom-on-focus. |

Responsive web only — no native app. The same single surface reflows; no layout is desktop- or mobile-exclusive.

## Key Flows

### Flow 1 — Sam clears the day's tasks (mirrors PRD UJ-1)

1. Sam opens the app URL on a phone. The Todo List shows a brief loading skeleton, then the existing list (or the empty state on first ever use). No login.
2. Sam types "Buy groceries" in the add input and presses Enter. The field clears and refocuses; the new **Active Todo** appears at the top of the Active group.
3. Sam adds two more todos the same way.
4. Sam taps the checkbox on "Buy groceries." It fills `{colors.accent}`, the Description gets strike-through `{colors.ink-muted}`, and the row sinks into the Completed group below.
5. Sam notices a typo in another todo, taps edit, the Description becomes an inline field tinted `{colors.accent-subtle}`, fixes the text, and presses Enter to save.
6. Sam taps delete on an obsolete todo; the confirmation dialog appears; Sam confirms and the row disappears.
7. **Climax:** every action reflected immediately and unmistakably — completed work visibly settled at the bottom, active work on top. The screen always matches reality.
8. **Resolution:** Sam closes the browser. Reopening later shows the identical list and completion states — nothing lost (FR-6).

**Failure beat (UJ-1 edge case):** if the backend is unreachable when Sam adds a todo, an error banner appears ("Couldn't save that change. Retry."), Sam's typed text stays in the input, and Retry re-attempts — nothing is silently dropped (NFR-2).

### Flow 2 — Recovering from a failed load (Sam, flaky connection)

1. Sam opens the app; the list fetch fails.
2. Instead of a blank screen, an error banner reads "Couldn't load your todos. Retry."
3. Sam taps Retry; the skeleton reappears, the fetch succeeds, and the Todo List renders.
4. **Climax:** the failure was legible and recoverable in one tap — the app never felt broken (NFR-2, experience-quality "polished").

## Open Questions

1. **In-flight feedback fidelity** — confirm the confirm-on-response model (no optimistic UI) with the chosen ~100–150ms busy affordance is acceptable, or whether optimistic-with-rollback is wanted for toggles. *Default: confirm-on-response (see State Patterns).* `[ASSUMPTION]`
2. **Active count display** — show "{n} todos left"? *Default: optional, off unless desired.*
3. **Delete dialog default focus** — confirm default focus on Cancel. `[ASSUMPTION]`
4. **Dark mode** — deferred (light only in v1); token structure supports adding it later.

## Assumptions Index

- State Patterns / Flow — Confirm-on-response (no optimistic UI), with a subtle ~100–150ms busy affordance, given local single-user target and NFR-1 latency.
- Interaction Primitives — Delete dialog defaults focus to Cancel to avoid accidental destructive confirm.
- Decision (not assumption) — List ordering: Active on top, Completed below, newest-first within each group (resolves PRD Open Question 1).
- Decision (not assumption) — Delete requires a confirmation dialog (deletion is permanent, no undo).
- Decision (not assumption) — Light mode only in v1.
