# Spine Pair Review — Todo App (Training Exercise)

- **DESIGN.md:** `_bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/DESIGN.md`
- **EXPERIENCE.md:** `_bmad-output/planning-artifacts/ux-designs/ux-aine-bmad-2026-06-15/EXPERIENCE.md`
- **Source PRD:** `_bmad-output/planning-artifacts/prds/prd-aine-bmad-2026-06-15/prd.md`
- **Run at:** 2026-06-15 (rubric walker lens)

## Overall verdict

This is a disciplined, downstream-ready spine pair: DESIGN.md follows canonical section order, EXPERIENCE.md carries every required default, the single UJ and all FR/NFR/SM IDs are cited verbatim, and every token reference resolves. Coverage of flows, components, and states is genuinely strong for a scope this small — no invented enterprise gaps, no orphan surfaces. Two HIGH issues block a clean extract and should be fixed before architecture/story-dev consume it: an internal token-vs-prose contradiction on the empty-state headline role, and a load-bearing contrast claim (completed-todo text) that the chosen `ink-disabled` value does not actually meet despite the spine asserting AA for all text pairs. Everything else is low-severity polish.

## 1. Flow coverage — strong

Checked: the PRD has exactly one Key User Journey (UJ-1) and FR-1–FR-7. EXPERIENCE.md Flow 1 ("Sam clears the day's tasks") mirrors UJ-1 with a named protagonist (Sam), numbered steps (1–8), an explicit **Climax** (step 7) and **Resolution** (step 8), plus a labeled failure beat (backend unreachable on add). Flow 2 ("Recovering from a failed load") adds a second named-protagonist flow with numbered steps and a climax for the load-failure path. FR-1–FR-6 are each cited within Flow 1's steps; FR-7 is the backend CRUD contract with no user-facing journey, appropriately not modeled as a separate flow.

### Findings
- *(none)*

## 2. Token completeness — adequate

Checked: extracted all 18 color tokens (every one has a hex value), 5 typography roles (each with fontFamily/fontSize/fontWeight/lineHeight), `rounded` (sm/md/lg/full), `spacing` (numeric scale + `container-max`/`page-margin`), and all 9 `components` entries. Every `{path.to.token}` reference in both the frontmatter component objects and the prose (DESIGN Do's/Don'ts, EXPERIENCE body) resolves to a defined token. Light-mode-only is explicit, so no light/dark pairs are expected. The defects below are value contradictions and unstated contrast targets, not unresolved references.

### Findings
- **high** The `empty-state` component token sets `headline-type: '{typography.title}'` (20/600), but the DESIGN Typography section says "`display` (28/600) — the empty-state headline", the DESIGN Components prose says "centered `display` headline", and EXPERIENCE State Patterns says the Empty state uses a "`display` headline" (DESIGN.md frontmatter `components.empty-state`, lines ~111–114; vs DESIGN.md §Typography/§Components and EXPERIENCE.md §State Patterns). A downstream consumer extracting the machine-readable token gets `title`; everything human-readable says `display`. *Fix:* change `headline-type` to `{typography.display}` (or change all prose to `title`) so the token and prose agree.
- **medium** Contrast targets are asserted blanket-style ("AA+ contrast", "all text pairs meet WCAG AA") but not stated per load-bearing combination, and the completed-todo combo fails: `ink-disabled` `#A2AAB4` on `surface-raised` `#FFFFFF` is ≈2.3:1, well below the 4.5:1 AA threshold for normal text (DESIGN.md §Colors + Do's/Don'ts; EXPERIENCE.md §Accessibility Floor). See finding 7.1 — this is the contrast-target half of the same issue. *Fix:* state the ratio for each load-bearing pair (ink-primary, ink-secondary, accent-foreground/accent, danger text, ink-disabled completed text) and either darken the completed-text token to meet AA or explicitly scope it as exempt (de-emphasized + strike-through + checkbox already convey state non-color-only).
- **low** `success` `#16A34A` is defined but described as "not required, never a fill" with no component consuming it — a near-orphan token a downstream extractor must decide whether to wire up. *Fix:* either drop it from v1 or name the one micro-confirmation surface that uses it.

## 3. Component coverage — strong

Checked: every named component appears in BOTH DESIGN.md.Components (visual) and EXPERIENCE.md.Component Patterns (behavioral), with real rules on each side: Add-Todo input, Todo row, Checkbox, Inline edit (field), Delete-confirmation dialog, Empty state, Error banner, Loading skeleton. Button/icon primitives (`button-primary`, `button-secondary`, `button-danger`, `icon-button`, `input-text`) carry frontmatter visual tokens and are referenced inside the composite component specs — acceptable as sub-primitives rather than standalone behavioral rows.

### Findings
- *(none beyond the naming drift noted in §7)*

## 4. State coverage — strong

Checked both IA surfaces. **Todo List:** cold-load (skeleton), empty, normal/populated, Active Todo, Completed Todo, create-validation error, edit-validation error, action-in-flight, load failure, save/create/toggle/delete failure, and backend-unreachable are all covered in State Patterns. **Delete-confirmation dialog:** focus-trap / Esc / default-focus behavior is specified, and delete-failure rolls up into the failure row. No-auth means permission-denied is correctly N/A; "offline" is folded into backend-unreachable. The cold-load → list/empty/error fork is explicit (FR-1).

### Findings
- *(none)*

## 5. Visual reference coverage — n/a (noted)

There are currently **no** `mockups/`, `wireframes/`, or `imports/` directories or files in the workspace. The spines correctly do not link to any nonexistent mock (neither file carries a "→ Composition reference" line), so there are no orphan or broken visual references. "Both spines win on conflict with any mock or import" is stated once in each file's header, pre-establishing the precedence rule for when mocks arrive.

### Findings
- **low** No visual references exist yet. Not a defect at draft stage, but key surfaces (populated Todo List, completed/active grouping, inline-edit state, delete dialog, empty/loading/error states) should get at least lightweight mocks or wireframes linked inline before this pair is treated as final. *Fix:* add `mockups/` and link each at the relevant section when produced.

## 6. Bloat & overspecification — strong

DESIGN.md prose carries the editorial voice it is permitted (Brand & Style, per-color stories) and stays tied to design decisions. EXPERIENCE.md is behavioral throughout — no editorial drift — and its FR/NFR parentheticals are traceability, not restatement. Pixel values appear only where a token genuinely doesn't cover them (busy-affordance timing, 16px-prevents-zoom rationale). No sections a downstream consumer would skip.

### Findings
- **low** EXPERIENCE.md Open Questions (1, 3) and the Assumptions Index restate the same two `[ASSUMPTION]`s (confirm-on-response; delete default-focus Cancel) already inline in State Patterns / Interaction Primitives. Mild triplication. *Fix:* keep the inline assumption + one index entry; let Open Questions cross-reference rather than re-describe.

## 7. Inheritance discipline — adequate

`sources` frontmatter in EXPERIENCE.md resolves to the real PRD path. UJ-1, FR-1–FR-7, NFR-1/2/3, SM-C2, and the §5 no-undo decision are cited verbatim. Glossary terms (**Todo**, **Todo List**, **Description**, **Completed status**, **Active Todo**, **Completed Todo**, `created_at`, `API`, **Persistence**) are used identically across both spines and the PRD, and the EXPERIENCE header explicitly declares the verbatim-glossary contract. All EXPERIENCE token references resolve to DESIGN tokens by name.

### Findings
- **low** Component names drift slightly between spines: "Inline edit field" (DESIGN) vs "Inline edit" (EXPERIENCE); "Delete-confirmation dialog" (DESIGN) vs "Delete + confirmation dialog" (EXPERIENCE). Resolvable by a human, but a strict name-matching extractor could treat them as distinct. *Fix:* pick one label per component and use it verbatim in both files.

## 8. Shape fit — strong

DESIGN.md sections are in exact canonical order: Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts. EXPERIENCE.md carries all required defaults (Foundation, Information Architecture, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows). Responsive & Platform is present and justified (two breakpoints). Inspiration & Anti-patterns is omitted — defensible, since the PRD lists deferred non-goals rather than reference products or rejected design patterns, so the trigger isn't really met. The invented Open Questions and Assumptions Index sections earn their place on a draft contract by surfacing the decisions architecture must confirm.

### Findings
- *(none)*

## Mechanical notes

- **Name inconsistencies:** "Inline edit field"/"Inline edit" and "Delete-confirmation dialog"/"Delete + confirmation dialog" differ across the two files (see §7).
- **Token/prose conflict:** `components.empty-state.headline-type` = `{typography.title}` contradicts every prose mention of a `display` empty-state headline (see §2, the one true broken-resolution-class issue).
- **Frontmatter completeness:** EXPERIENCE.md has `sources`; DESIGN.md frontmatter has `name`/`description`/`status`/`created`/`updated` and (correctly, per spec) no `sources`. Both `status: draft`.
- **Cross-refs:** all `{path.to.token}` references in both files resolve; no dangling paths.
- **Contrast:** spot-checked load-bearing pairs — ink-secondary/surface-base ≈5.3:1 (pass), accent-foreground/accent ≈5:1 (pass), ink-disabled/surface-raised ≈2.3:1 (**fail** for completed-todo text; see §2).
- **Mermaid:** none present; N/A.
- No mockups/wireframes/imports directories exist at review time.
