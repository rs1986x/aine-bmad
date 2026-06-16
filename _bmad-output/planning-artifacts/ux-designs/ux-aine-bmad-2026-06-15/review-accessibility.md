# Accessibility Audit — Todo App UX Spine Pair

> Reviewer: Accessibility audit (WCAG 2.1 AA basics). Scope: `DESIGN.md` + `EXPERIENCE.md` for the minimal single-user Todo web app. Light mode only.
> Date: 2026-06-15

## Verdict

**Conditional pass — not ship-ready as specified.** The behavioral accessibility model (keyboard, focus management, screen-reader semantics, non-color signaling) is genuinely strong and largely complete. However, the `EXPERIENCE.md` claim that *"visual contrast is guaranteed by `DESIGN.md` tokens (all text pairs meet WCAG AA)"* is **incorrect**: three token pairings fall below their WCAG AA thresholds, and one focus-visibility token collision can render the focus ring invisible. Because downstream code will mirror these tokens verbatim, the contrast issues must be fixed at the token level before implementation.

**Two of the failing pairs are the kind that will be copied straight into CSS variables**, so they are flagged High.

## Contrast Analysis (computed, approximate sRGB ratios)

Method: WCAG relative-luminance formula; ratios rounded. Thresholds: 4.5:1 normal text, 3:1 large text / non-text UI components.

| Pair | Foreground | Background | Ratio | Threshold | Result |
|---|---|---|---|---|---|
| ink-primary on surface-base | `#1A1D21` | `#F6F7F9` | ~15.8:1 | 4.5 | ✅ Pass |
| ink-primary on surface-raised | `#1A1D21` | `#FFFFFF` | ~16.9:1 | 4.5 | ✅ Pass |
| ink-secondary on surface-raised | `#5B6470` | `#FFFFFF` | ~6.0:1 | 4.5 | ✅ Pass |
| ink-secondary on surface-base | `#5B6470` | `#F6F7F9` | ~5.6:1 | 4.5 | ✅ Pass |
| ink-disabled on surface-raised (completed-todo text) | `#A2AAB4` | `#FFFFFF` | ~2.35:1 | 4.5 | ❌ **Fail** |
| ink-disabled on surface-base | `#A2AAB4` | `#F6F7F9` | ~2.2:1 | 4.5 | ❌ **Fail** |
| accent-foreground on accent (Add / primary btn) | `#FFFFFF` | `#2563EB` | ~5.2:1 | 4.5 | ✅ Pass |
| danger-foreground on danger (Delete btn) | `#FFFFFF` | `#DC2626` | ~4.8:1 | 4.5 | ✅ Pass |
| danger text on danger-subtle (error banner) | `#DC2626` | `#FDECEC` | ~4.23:1 | 4.5 | ❌ **Fail** |
| danger text on surface-raised (inline validation helper) | `#DC2626` | `#FFFFFF` | ~4.8:1 | 4.5 | ✅ Pass (marginal) |
| ink-primary on accent-subtle (edit-mode row) | `#1A1D21` | `#EAF0FE` | ~14.8:1 | 4.5 | ✅ Pass |
| focus-ring vs surface-base (non-text) | `#2563EB` | `#F6F7F9` | ~4.8:1 | 3 | ✅ Pass |
| focus-ring vs white (non-text) | `#2563EB` | `#FFFFFF` | ~5.2:1 | 3 | ✅ Pass |
| focus-ring vs accent (ring on primary btn / checked checkbox) | `#2563EB` | `#2563EB` | ~1.0:1 | 3 | ❌ **Fail** |
| border-strong vs surface-raised (input / checkbox / 2° btn boundary) | `#CBD2DA` | `#FFFFFF` | ~1.53:1 | 3 | ❌ **Fail** |
| border-hairline vs surface-raised (row dividers — decorative) | `#E4E7EC` | `#FFFFFF` | ~1.2:1 | (exempt) | ⚠️ Decorative |

### Non-color signaling (item 2) — CONFIRMED ✅

Completion is conveyed by **checkbox fill + strike-through text**, explicitly and repeatedly (DESIGN.md §Colors/Components/Do's-Don'ts; EXPERIENCE.md State Patterns "**both** signals, never color alone", and the a11y label "Completed: {description}"). This satisfies WCAG 1.4.1 (Use of Color). No finding.

## Findings

### CRITICAL — none

### HIGH

**H1 — Error-banner text fails normal-text contrast (1.4.3).**
- Location: `DESIGN.md` `components.error-banner` (`foreground: danger #DC2626` on `background: danger-subtle #FDECEC`); EXPERIENCE.md State Patterns "Load failure" / error banner copy.
- Detail: ~**4.23:1**, below the 4.5:1 normal-text floor. Error messaging is exactly the content that must be readable, so this is not a minor miss.
- Fix: Darken the banner text to `danger-hover #B91C1C` on `danger-subtle` (~5.9:1), or use `ink-primary` for the message body and reserve `danger` for the icon/border. Re-verify ≥4.5:1.

**H2 — `border-strong` fails non-text contrast for essential control boundaries (1.4.11).**
- Location: `DESIGN.md` `colors.border-strong #CBD2DA` as used by `input-text.border`, `button-secondary.border`, and `checkbox.border` (unchecked) on white/`surface-base`.
- Detail: ~**1.53:1**, far below the 3:1 required for the visual boundary of active form controls. The unchecked checkbox is the *primary* affordance for marking complete, and the text input is nearly indistinguishable from the page (surface-raised vs surface-base is only ~1.07:1), so the control is effectively identified by a border users may not perceive.
- Fix: Introduce a darker control-boundary token (e.g. ~`#9AA4B2` or darker) reaching ≥3:1 on white for the unchecked checkbox border and input/secondary-button outlines. `border-hairline` may remain for purely decorative row dividers.

### MEDIUM

**M1 — Completed-todo Description text fails normal-text contrast (1.4.3).**
- Location: `DESIGN.md` §Typography/§Colors and EXPERIENCE.md "Completed Todo" — `ink-disabled #A2AAB4` strike-through on white.
- Detail: ~**2.35:1**. This is *content the user still reads*, not a truly inactive/disabled control, so the 1.4.3 disabled-element exception does not cleanly apply. Mitigated (but not excused) by strike-through + checkbox carrying the state signal.
- Fix: Use a darker "muted" ink for completed text (≥4.5:1, e.g. around `#6B7480`+) while keeping the strike-through. Reserve `ink-disabled` only for genuinely disabled/non-interactive controls (which are exempt).

**M2 — Focus ring can be invisible against accent-colored elements (2.4.7 / 1.4.11).**
- Location: `DESIGN.md` `focus-ring = accent #2563EB`, applied to the primary "Add" button (accent bg) and the checked checkbox (accent fill).
- Detail: ring vs accent ≈ **1:1**. On white/base surfaces the ring is fine (~4.8–5.2:1), but a same-color ring directly on an accent surface disappears.
- Fix: Specify a focus *offset* (transparent gap + outline) or a contrasting ring (e.g. dark ink ring, or white inner + accent outer "double ring") so focus is visible on accent surfaces. Add this to the token/spec explicitly.

**M3 — Error banner announcement role not specified.**
- Location: EXPERIENCE.md Accessibility Floor / State Patterns. The `aria-live="polite"` region is specified for add/complete/delete list changes, but load/save/delete *failures* (error banner) have no stated announcement mechanism.
- Detail: Errors should be programmatically announced (4.1.3 Status Messages). A polite region may be too quiet for an actionable failure.
- Fix: Give the error banner `role="alert"` (or `aria-live="assertive"`) so failures are announced, and ensure the Retry control is reachable/labeled.

### LOW

**L1 — Visual target sizes are below 44px; rely on padded hit area.**
- Location: `DESIGN.md` `checkbox.size: 22px`, `icon-button.size: 36px`; EXPERIENCE.md "≥ 44×44px effective hit area."
- Detail: The intent is correct, but 22px/36px visuals must be wrapped in ≥44px padded hit targets. (Note: 44px target size is WCAG 2.2 / best practice, not a strict 2.1 AA SC — informational, but worth enforcing in code.)
- Fix: Verify padding/`min-height`/`min-width` yields ≥44px effective targets; add to component acceptance checks.

**L2 — Hover/focus-revealed row actions must remain keyboard-focusable.**
- Location: EXPERIENCE.md Component Patterns / Responsive ("action buttons appear on hover/focus on ≥ md").
- Detail: Acceptable per spec, but if implemented with `display:none`/`visibility:hidden` the edit/delete buttons would drop out of the tab order. Spec says "hover/**focus**-revealed," which is correct — flagging to ensure focus reveal (not hover-only) survives implementation.
- Fix: Reveal on `:focus-within` as well as hover; never remove from accessibility tree; confirm tab order.

**L3 — Active/Completed grouping lacks stated structural semantics.**
- Location: EXPERIENCE.md IA "Active above Completed" + list semantics.
- Detail: The list is specified as list/listitems with per-item labels (good), but the two visual groups have no stated headings/group labels. Minor for SR orientation.
- Fix (optional): Expose group boundaries via headings or `aria-label`ed groups ("Active", "Completed"), or rely on the per-item "Completed: …" label (already present) as the minimum.

## Behavioral Checklist (items 3–5)

| Area | Spec coverage | Status |
|---|---|---|
| Add input: Enter/button submit, trim, reject empty without clearing, refocus | EXPERIENCE.md Component/State | ✅ |
| Checkbox toggle via Space/Enter, both directions | Interaction Primitives | ✅ |
| Inline edit: Enter saves / Esc cancels, one-at-a-time, original preserved on reject | Component/State | ✅ |
| Delete dialog: focus trap, Esc, return focus, default focus on Cancel | Interaction Primitives / a11y | ✅ |
| Tab order matches reading order | Interaction Primitives / a11y | ✅ |
| list/listitem + per-item labels ("Completed: {desc}" / "{desc}") | a11y Floor | ✅ |
| aria-live for add/complete/delete | a11y Floor | ✅ (see M3 for errors) |
| Labeled inputs (add + each inline edit) | a11y Floor | ✅ |
| Validation errors via aria-describedby | a11y Floor | ✅ |
| Dialog labeled by title | a11y Floor | ✅ |
| 16px input prevents mobile zoom | DESIGN typography / Responsive | ✅ |
| 200% text resize without loss of function | a11y Floor | ✅ (verify single-column reflow) |
| 44px effective targets | Interaction Primitives | ⚠️ see L1 |

## Required actions before implementation
1. Fix **H1** and **H2** token values (error text + control-boundary border) — these will be mirrored into code CSS variables.
2. Resolve **M1** (completed-text color) and **M2** (focus-ring visibility on accent) at the token/spec level.
3. Correct the EXPERIENCE.md assertion that "all text pairs meet WCAG AA" — three pairs do not.
4. Address **M3** error announcement and the Low items during component build.
