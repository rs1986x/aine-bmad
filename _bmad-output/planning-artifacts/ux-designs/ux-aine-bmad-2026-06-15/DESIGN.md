---
name: Todo App (Training Exercise)
description: A deliberately minimal single-user Todo web app. Calm, neutral, polished. From-scratch CSS design tokens (no UI library), light mode only.
status: final
created: 2026-06-15
updated: 2026-06-15
colors:
  surface-base: '#F6F7F9'
  surface-raised: '#FFFFFF'
  surface-sunken: '#EEF0F3'
  ink-primary: '#1A1D21'
  ink-secondary: '#5B6470'
  ink-muted: '#6B7480'
  ink-disabled: '#A2AAB4'
  accent: '#2563EB'
  accent-hover: '#1D4ED8'
  accent-foreground: '#FFFFFF'
  accent-subtle: '#EAF0FE'
  success: '#16A34A'
  danger: '#DC2626'
  danger-hover: '#B91C1C'
  danger-text: '#B42318'
  danger-foreground: '#FFFFFF'
  danger-subtle: '#FDECEC'
  border-hairline: '#E4E7EC'
  border-strong: '#8B94A1'
  focus-ring: '#2563EB'
  focus-ring-offset: '#FFFFFF'
typography:
  display:
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  title:
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.3'
  body:
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label:
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
  meta:
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '8': 32px
  '10': 40px
  '12': 48px
  container-max: 640px
  page-margin: 16px
components:
  button-primary:
    background: '{colors.accent}'
    background-hover: '{colors.accent-hover}'
    foreground: '{colors.accent-foreground}'
    radius: '{rounded.md}'
    padding: '{spacing.3} {spacing.4}'
  button-secondary:
    background: '{colors.surface-raised}'
    foreground: '{colors.ink-primary}'
    border: '{colors.border-strong}'
    radius: '{rounded.md}'
  button-danger:
    background: '{colors.danger}'
    background-hover: '{colors.danger-hover}'
    foreground: '{colors.danger-foreground}'
    radius: '{rounded.md}'
  icon-button:
    foreground: '{colors.ink-secondary}'
    foreground-hover: '{colors.ink-primary}'
    radius: '{rounded.sm}'
    size: 36px
  input-text:
    background: '{colors.surface-raised}'
    foreground: '{colors.ink-primary}'
    border: '{colors.border-strong}'
    border-focus: '{colors.accent}'
    radius: '{rounded.md}'
    padding: '{spacing.3} {spacing.4}'
  todo-row:
    background: '{colors.surface-raised}'
    border: '{colors.border-hairline}'
    radius: '{rounded.md}'
    padding: '{spacing.3} {spacing.4}'
    gap: '{spacing.3}'
  checkbox:
    border: '{colors.border-strong}'
    background-checked: '{colors.accent}'
    check-foreground: '{colors.accent-foreground}'
    radius: '{rounded.sm}'
    size: 22px
  empty-state:
    headline-type: '{typography.display}'
    body-type: '{typography.body}'
    foreground: '{colors.ink-secondary}'
  error-banner:
    background: '{colors.danger-subtle}'
    foreground: '{colors.danger-text}'
    border: '{colors.danger}'
    radius: '{rounded.md}'
---

# Todo App — Design Spine

> Visual identity for a deliberately minimal single-user Todo web app (BMAD training exercise). This DESIGN.md owns *how it looks*; the paired `EXPERIENCE.md` owns *how it works* and references these tokens by name. Both spines win on conflict with any mock or import.

## Brand & Style

The Todo App is a quiet, trustworthy personal list. There is no brand to perform and nothing to sell — the whole point is that a person opens it, sees their tasks, acts, and trusts that the result stuck. So the visual language gets out of the way: a calm neutral surface, generous spacing, one accent color that means "this is the action" or "this is active," and clear, immediate feedback on every interaction. Polish here is *restraint plus responsiveness* — nothing decorative, but every state (empty, loading, error, completed) is handled with care so the product never feels broken or half-built.

The aesthetic target is *clear, intuitive, instantaneous, and polished* (the experience qualities carried from the PRD). That translates visually into: high text contrast, obvious tap targets, a single unambiguous primary action at any moment, and completed work that is visibly settled rather than shouting. Light mode only in v1; the token structure is built so a dark theme could be added later by mirroring the color tokens.

## Colors

A neutral grayscale canvas with exactly one chromatic accent plus a reserved danger color. Discipline: color is information, not decoration.

- **Surface Base (`#F6F7F9`)** — the page background. Slightly cool-neutral so the white Todo rows lift off it without shadows.
- **Surface Raised (`#FFFFFF`)** — Todo rows, the add-Todo input, dialogs. The "things you act on" sit on raised surface.
- **Surface Sunken (`#EEF0F3`)** — loading skeletons and subtle insets.
- **Ink Primary (`#1A1D21`)** — primary text (Todo Descriptions, headings). ~16:1 on raised, ~15:1 on base.
- **Ink Secondary (`#5B6470`)** — metadata (timestamps), helper text, secondary labels. ~6:1 on raised.
- **Ink Muted (`#6B7480`)** — the Description text of a **Completed Todo** (combined with strike-through). ~4.9:1 on white — chosen over `ink-disabled` so completed text the user still reads stays AA-legible.
- **Ink Disabled (`#A2AAB4`)** — genuinely disabled/non-interactive controls only (WCAG-exempt). **Not** used for completed-Todo text.
- **Accent (`#2563EB`, hover `#1D4ED8`)** — the single brand/action color. Used for the primary "Add" action, the checked checkbox of a Completed Todo, focus rings, and the inline-edit save action. Never used decoratively. White-on-accent ≈5.2:1 (AA).
- **Accent Subtle (`#EAF0FE`)** — low-emphasis accent wash (e.g. the background of a row in edit mode).
- **Success (`#16A34A`)** — reserved for the optional "marked complete" micro-confirmation only; not required, never a fill.
- **Danger (`#DC2626`, hover `#B91C1C`)** — destructive delete-button fill and error borders. White-on-danger ≈4.8:1 (AA).
- **Danger Text (`#B42318`)** — error-banner and danger message *text* on `danger-subtle`/white (≈6:1 on the banner background) — darker than `danger` so error copy clears AA.
- **Danger Subtle (`#FDECEC`)** — error-banner background.
- **Border Hairline (`#E4E7EC`)** — decorative Todo-row dividers only (exempt from non-text contrast).
- **Border Strong (`#8B94A1`)** — input borders, unchecked-checkbox border, and secondary-button outlines. ≥3:1 on white so these essential control boundaries meet WCAG 1.4.11.
- **Focus Ring (`#2563EB`) + Focus Ring Offset (`#FFFFFF`)** — focus is drawn as a 2px `focus-ring` outline separated from the element by a 2px `focus-ring-offset` gap (a double-ring on accent surfaces). The offset guarantees the ring stays visible even on the accent-filled Add button and checked checkbox, where a same-color ring would vanish.

**Verified contrast (load-bearing combos):** all text pairs above meet WCAG AA (≥4.5:1 normal text); accent/danger button fills and the strong-border control boundaries meet the 3:1 non-text threshold. The only intentionally sub-threshold token is `border-hairline`, used solely for decorative dividers.

Avoid: gradients, multiple accent hues, color-coding Todos by category (no categories exist), using Danger for anything but destruction/errors, using Accent as a decorative background.

## Typography

One system-font ramp (no web-font download — keeps load instantaneous, which serves the "instantaneous" quality). Roles:

- **`display` (28/600)** — the empty-state headline and, optionally, the app title.
- **`title` (20/600)** — dialog titles, section headings.
- **`body` (16/400)** — Todo Description text and the add-Todo input. 16px minimum so mobile browsers never zoom on focus.
- **`label` (14/500)** — button text, field labels, helper copy.
- **`meta` (13/400)** — `created_at` timestamps and counts.

Rules: Completed Todo Descriptions render in `body` with strike-through and `ink-muted` (AA-legible). No all-caps, no letter-spaced labels, no font sizes below 13px.

## Layout & Spacing

A single centered column, `container-max` 640px, with `page-margin` 16px gutters on small viewports. The 4-based spacing scale (4/8/12/16/20/24/32/40/48) drives all rhythm: `spacing.3`–`spacing.4` inside rows and controls, `spacing.4`–`spacing.6` between major blocks (input → list, list → empty state). The add-Todo input sits at the top of the column, pinned above the list so the primary action is always the first thing reached.

The app is intentionally one surface — there is no nav, sidebar, or multi-column layout. Vertical stacking only; the same column simply gets more horizontal breathing room on desktop.

## Elevation & Depth

Near-flat. Hierarchy comes from surface tone (base vs. raised) and the hairline borders, not shadows. The only elevated element is the delete-confirmation dialog, which gets a single soft overlay shadow plus a scrim over the page to focus attention. Todo rows do **not** use shadow for hover; hover is a subtle `surface-sunken`-tinted background change.

## Shapes

Soft, friendly-but-serious corners: `rounded.sm` (6px) for the checkbox and icon buttons, `rounded.md` (10px) for Todo rows, inputs, buttons, and the error banner, `rounded.lg` (14px) for the confirmation dialog. No fully-rounded surfaces; `rounded.full` is reserved only if a count badge is ever introduced.

## Components

- **Add-Todo input (`input-text` + `button-primary`)** — a single-line text field with a primary "Add" button (or Enter-to-submit). Full width of the column. Placeholder uses `ink-secondary`. Focus shows the `accent` border + focus ring. On validation error (empty Description), border turns `danger` and a `meta`/`label` helper line in `danger` appears beneath.
- **Todo row (`todo-row`)** — left-to-right: `checkbox`, Description (`body`), `created_at` (`meta`, `ink-secondary`), then edit and delete `icon-button`s. On `≥ md` the action buttons appear on hover/focus; on touch they are always visible. The whole row is one accessible group.
- **Checkbox (`checkbox`)** — 22px, `border-strong` when unchecked, `accent` fill with a white check when the Todo is a Completed Todo. This is the primary "completed vs active" signal, reinforced by the Description's strike-through.
- **Inline edit field** — when a Todo enters edit mode, its Description is replaced in place by an `input-text` pre-filled with the current Description, row background tinted `accent-subtle`, with Save (`button-primary`, compact) and Cancel (`button-secondary`/ghost) affordances. No modal.
- **Delete-confirmation dialog** — centered `rounded.lg` card on a scrim: `title` ("Delete this todo?"), a `body` line quoting the Description, then `button-secondary` Cancel + `button-danger` Delete.
- **Empty state (`empty-state`)** — centered `display` headline + `body` subline + the add-Todo input as the single call to action.
- **Error banner (`error-banner`)** — full-column-width banner above the list for load/save failures, with a retry affordance.
- **Loading skeleton** — 3–5 `surface-sunken` rows matching the Todo-row silhouette.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Use `{colors.accent}` only for primary action, active/checked, focus, and save | Use accent decoratively or for more than one "primary" at a time |
| Signal completion with checkbox fill **and** strike-through + `{colors.ink-muted}` | Rely on color alone to show completion (fails AA / colorblind users) |
| Keep one centered column inside `{spacing.container-max}` | Add nav, sidebars, or multi-column layouts |
| Handle every state (empty/loading/error/completed) visibly | Leave blank screens or silent failures |
| Use `{colors.danger}` only for delete and errors | Use red for emphasis or chrome |
| Body text at `{typography.body}` (16px) minimum | Drop below 13px or rely on tiny tap targets (<44px) |
