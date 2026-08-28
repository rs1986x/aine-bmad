# Accessibility audit — WCAG 2.1 AA

Story 3.2. Records what was scanned, what was checked by hand, what axe could not
decide on its own, and what is still open. Story 4.3 turns this into the formal
report; nothing here is a projection — every line is an outcome that was observed.

## Scope and method

|            |                                                                                                                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Target     | WCAG 2.1, levels A and AA                                                                                                                                                                                                                        |
| axe tags   | `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`                                                                                                                                                                                                       |
| Tooling    | `@axe-core/playwright` 4.13.0 (axe-core 4.13.0), Playwright 1.61.0, Chromium                                                                                                                                                                     |
| Under test | `http://localhost:8080` — the Compose stack (nginx → Express → PostgreSQL), not a dev server                                                                                                                                                     |
| Run date   | 2026-08-28                                                                                                                                                                                                                                       |
| Harness    | `e2e/tests/a11y.spec.ts` (scans), `e2e/tests/keyboard.spec.ts` (keyboard, focus, hit areas, reflow), `e2e/tests/a11y-gate.spec.ts` (gate self-test), helper in `e2e/support/a11y.ts`                                                             |
| Gate       | Any `critical`, `serious`, or **unrated** violation fails the E2E job, as does any change to the pinned `incomplete` set or any undecided contrast check that measures below threshold. Per-state JSON is uploaded from CI on pass **and** fail. |
| Evidence   | `e2e/axe-results/{state}.json`, each holding `violations` **and** `incomplete`                                                                                                                                                                   |

The gate fails closed. A violation axe leaves without an impact rating blocks
exactly like a `critical` one, because "unrated" is the one case where treating
absence as safety would let a rule pass in silence. The `incomplete` set is
pinned per state on rule id, message keys, node count, and normalized target
identity. Generated React `useId` values are removed from that identity while the
element tag and stable attributes remain, so moving the same undecided result to
different content fails the run. Every `color-contrast` result axe leaves
undecided is then measured directly and held to the WCAG threshold, because an
undecided verdict carries no ratio and would otherwise pass on any colour at all.
Solid translucent backgrounds are composited; unsupported image, blend, opacity,
or shadow effects fail closed rather than yielding an invented ratio.
`e2e/tests/a11y-gate.spec.ts` pins the exact tag set and exercises impact,
incomplete-target, evidence-manifest, and unreadable-contrast failure paths.

Accessibility scan and gate files disable Playwright retries so a blocking result
cannot become a passing CI gate on a later attempt. Evidence naming still
preserves a retry suffix if retries are explicitly overridden. Global setup
clears `axe-results/` first, and CI teardown verifies that all five required state
files exist, so a renamed, removed, or skipped scan cannot masquerade as complete
evidence.

No axe rule, tag, or selector is disabled, excluded, or narrowed anywhere in the
harness. `best-practice`, WCAG 2.2, and AAA rules are out of scope for this story
and are simply not requested.

Reproduce with:

```bash
docker compose up -d --build --wait
cd e2e && npm test
```

## Automated scan results

Five DOM states, one scan each. Four of them — populated, empty, load failure,
and delete dialog — intercept the initial `GET /api/todos`, because the local
database is shared and `cleanupE2eTodos` only removes `e2e `-prefixed rows. The
populated scan starts from a deterministic empty response and then creates one
active and one completed todo through the real API; its mutation requests are
not stubbed. Only list reads needed to establish a fixed DOM are intercepted;
the app, nginx container, mutation API, and rendered DOM are real, while
`stack.spec.ts` still proves the backend-down path against the running
containers.

| State                                       | Evidence file             | Critical/serious | Other violations | Incomplete |
| ------------------------------------------- | ------------------------- | ---------------- | ---------------- | ---------- |
| Populated list (one active + one completed) | `populated-list.json`     | 0                | 0                | 0          |
| Empty state                                 | `empty-state.json`        | 0                | 0                | 0          |
| Inline editor open                          | `inline-edit-open.json`   | 0                | 0                | 0          |
| Delete dialog open                          | `delete-dialog-open.json` | 0                | 0                | 1          |
| Load failure                                | `load-failure.json`       | 0                | 0                | 0          |

Total across all five states: **zero violations at any impact level**, one
`incomplete` result, resolved below.

The populated-list scan deliberately reveals a row's action buttons first — one
row by hover, one by focus — because `.todo-item__actions` sits at `opacity: 0`
until then and axe's paint-sensitive rules skip what is not drawn. Measured with
the actions revealed, seven rules evaluate those buttons and all pass:
`button-name`, `nested-interactive`, `aria-allowed-attr`, `aria-conditional-attr`,
`aria-prohibited-attr`, `aria-valid-attr`, and `aria-valid-attr-value`.
`color-contrast` is **not** among them, and revealing the buttons does not change
that: it evaluated 14 nodes, none of them an action button, because the buttons
contain no text — only an `aria-hidden` SVG. Icon contrast is therefore outside
what any requested rule can see, and is covered by measurement in the residual
items instead.

## Incomplete axe results and their resolution

An `incomplete` is a check axe could not decide on its own. It is never counted
as a pass; each one below was resolved by measurement.

### `color-contrast` on `p.delete-dialog__description` (delete dialog open)

- **What axe reported:** impact `serious`, message _"Element's background color
  could not be determined because it partially overlaps other elements"_
  (`messageKey: elmPartiallyObscuring`, `contrastRatio: 0`).
- **Why it is undecidable for axe:** the dialog is painted inside a
  `position: fixed` scrim that covers the page, so the paragraph's ancestor stack
  includes the translucent scrim and the todo rows behind it. axe stops rather
  than guess which layer supplies the background.
- **How it was resolved:** measured in Chromium against the running stack. At the
  centre of the paragraph, `document.elementsFromPoint` returns
  `p.delete-dialog__description` → `div.delete-dialog` → `div.delete-dialog__scrim`
  → the page below. The nearest non-transparent background is `div.delete-dialog`
  at `rgb(255, 255, 255)` with alpha `1`, so the scrim never shows through the
  text. Foreground is `rgb(91, 100, 112)` (`--color-ink-secondary`).
- **Computed ratio:** **6.00:1** against the 4.5:1 threshold for normal text.
- **Verdict:** pass. No code change made or needed.
- **Now enforced, not just recorded.** That measurement used to live only in this
  document. `scanState` now performs it on every run: for each `color-contrast`
  result axe leaves `incomplete`, it resolves the node, walks to the first fully
  opaque ancestor background, and asserts the WCAG ratio against 4.5:1 (3:1 for
  large text). Verified by injecting `rgb(170, 170, 170)` on this paragraph — the
  run fails with `Received: 2.32`.

**Pinning this entry alone would not have been enough**, and it is worth being
precise about why, because it is counter-intuitive. axe reports this result with
`contrastRatio: 0` — it has not measured anything. Injecting a 2.32:1 colour and
re-scanning produces **zero violations and a byte-identical `incomplete` shape**:
same rule id, same `elmPartiallyObscuring` message key, same single node. So a
pin keyed on those fields passes an unreadable dialog exactly as happily as a
readable one. The pin is real drift detection for the _set_ of undecided checks;
the direct measurement above is what actually decides the colours.

**This entry is also layout-dependent, which is why the state is now fixture-backed.**
It appears only when a `li.todo-item` is painted behind the vertically centred
dialog. Measured against the running app: with two rows of realistic
(UUID-stamped, wrapping) length the list is too short, the paragraph sits over
bare page background, axe resolves it and reports **no** incomplete — and, tellingly,
a 2.32:1 colour is then caught as a normal `serious` violation. With six or more
such rows a row is behind the dialog and the check goes undecided again. Left to
whatever the shared database happened to hold, the state's `incomplete` set
flipped between one entry and none between runs. The scan therefore serves a
fixed eight-row list, and asserts before scanning that a row really is behind the
description — so if the layout ever changes, the test reports that cause instead
of a mystifying pin mismatch.

## Keyboard, focus, dialog, and reflow checks

These run as real browser assertions in `e2e/tests/keyboard.spec.ts`, so they are
re-checked on every CI run rather than being a one-off manual note.

| Check                | Observed outcome                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tab order            | From the add input: **Add button → row checkbox → row Edit → row Delete**, in row order. Asserted with `toBeFocused` at each step.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Visible focus        | Ten controls, each checked while keyboard-focused: add input, Add, row checkbox, row Edit, row Delete, editor Save, editor Cancel, dialog Cancel, dialog Delete, banner Retry. Each must report a computed `outlineWidth` above 0, a style other than `none`, non-transparent colour, and at least **3:1 contrast** against its composited ancestor background. Focus is driven with real `Tab` presses so `:focus-visible` actually applies; the editor and dialog are likewise opened by `Enter` so Chromium's keyboard modality holds for the controls they focus themselves. |
| Dialog initial focus | Opening the delete dialog puts focus on **Cancel**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Dialog focus trap    | `Tab` from Cancel → Delete; `Tab` from Delete → back to Cancel; `Shift+Tab` from Cancel → Delete. Focus never escapes the dialog.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `Esc` dismissal      | `Esc` closes the dialog without deleting; the todo is still present afterwards.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Focus return         | After `Esc`, focus returns to the exact Delete button that opened the dialog.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Reflow               | 1280×720 applied, then halved to 640×360 (what 200% browser page zoom does to a px-based layout) plus `:root { font-size: 200% }`. The populated list, open inline editor, and open delete dialog each have no horizontal scrollbar and no element crossing **either** edge. Add, edit, and delete are all driven to completion at that size.                                                                                                                                                                                                                                    |

### Note on `:root { font-size: 200% }`

Measured: the root computed font-size moves from `16px` to `32px`, while `body`
stays at `16px`. Every type token in `frontend/src/styles/tokens.css` is an
absolute `px` value, so a root font-size change does not cascade into rendered
text. The meaningful 200%-zoom signal in that test is therefore the halved
viewport, which is what Chrome's page zoom actually does to px-sized layouts.
Recorded as a residual item below rather than treated as a passing text-resize
proof.

## Non-color completion cue

Asserted in `e2e/tests/a11y.spec.ts` before the populated-list scan: a completed
row's checkbox is `checked` **and** its description computes
`text-decoration-line: line-through`. Its list item is additionally named
`Completed: {description}`. Completion is never conveyed by color alone.

## Effective hit areas

Measured from the rendered page (width × height, CSS px):

| Control              | Default viewport (1280×720) | Halved viewport (640×360) |
| -------------------- | --------------------------- | ------------------------- |
| Add input            | 535 × 50                    | —                         |
| Add submit           | 61 × 48                     | 61 × 48                   |
| Retry (error banner) | 66 × 48                     | —                         |
| Row checkbox target  | 44 × 44                     | 44 × 44                   |
| Row Edit / Delete    | 44 × 44                     | 44 × 44                   |
| Editor Save          | 59 × 44                     | —                         |
| Editor Cancel        | 76 × 44                     | —                         |
| Dialog Cancel        | 84 × 50                     | —                         |
| Dialog Delete        | 79 × 50                     | —                         |

Every control clears 44 × 44. The add-submit and Retry buttons previously met the
floor only incidentally through padding; this story pinned `min-height: 44px` on
both so a token change cannot silently drop them below it.

These are enforced two ways, because neither alone is sufficient.
`frontend/src/styles/app.test.ts` matches the `min-height` declarations in the
stylesheet source — jsdom lays nothing out, so a unit test can never observe a
rendered box and can only confirm the rule is written. `e2e/tests/keyboard.spec.ts`
therefore asserts `boundingBox()` in Chromium for every control in the table
above, which is the box a pointer actually has to hit. The checkbox is measured
at its wrapping `<label>`: the 22px input is deliberately nested inside a 44px
label, and the label is what takes the click.

## Accessibility tree

Captured from Chromium against the running stack. This records the roles, names,
states, headings, live regions, and alerts exposed through the browser's
accessibility API.

Populated list:

```
- main:
  - heading "Todo" [level=1]
  - textbox "Add a todo"
  - button "Add"
  - list:
    - listitem "audit …6eb9":
      - checkbox "audit …6eb9"
      - time: Aug 27, 2026, 3:57 PM
      - button "Edit todo: audit …6eb9"
      - button "Delete todo: audit …6eb9"
    - listitem "Completed: audit-done …a57e":
      - checkbox "audit-done …a57e" [checked]
      - button "Edit todo: audit-done …a57e"
      - button "Delete todo: audit-done …a57e"
  - paragraph: "Todo added: audit …6eb9."
```

Delete dialog:

```
- dialog "Delete this todo?":
  - heading "Delete this todo?" [level=2]
  - paragraph: “audit …6eb9” — this can't be undone.
  - button "Cancel"
  - button "Delete"
```

Load failure:

```
- main:
  - heading "Todo" [level=1]
  - alert:
    - text: Couldn't connect. Check your connection and
    - button "Retry"
```

Heading outline in every state — loading, load failure, empty, populated: exactly
one `heading "Todo" [level=1]`, with the empty state's "No todos yet." at level 2
and the delete dialog's title at level 2. No level is skipped and no state is
without a top-level heading. Pinned by tests in `frontend/src/App.test.tsx`.

Live region content immediately after an add, read from the
`aria-live="polite"` region: `Todo added: audit …6eb9.` Failures render inside a
`role="alert"` container instead, as shown in the load-failure tree above.

## Defects found and fixed in this story

Both were standing entries in the deferred ledger; both are now closed.

1. **Duplicate control names per row.** Every row's checkbox, Edit, and Delete
   shared one name (`Completed`/`Not completed`, `Edit todo`, `Delete todo`), so
   an assistive-technology control list could not tell rows apart. Each control
   is now named after its own todo — `{description}`, `Edit todo: {description}`,
   `Delete todo: {description}` — with completion left to the checkbox's
   `checked` state. If descriptions repeat, duplicate-only position text is
   appended (`Buy milk, item 1 of 2`) so every name remains distinguishable
   without adding noise to ordinary rows. Both paths are asserted in
   `frontend/src/components/TodoList.test.tsx`.
2. **No stable heading across states.** The only `<h1>` lived in `EmptyState`, so
   it appeared and vanished with the data. A persistent `<h1>Todo</h1>` now sits
   in the shell above the loading / failure / content branches, and the empty
   state's headline is an `<h2>`. The `<h1>` is visually hidden (`.sr-only`)
   because the design carries no visible page title; it is fully exposed to
   assistive technology.

## Residual items

None are critical or serious. Each is a real, observed limitation.

1. **Text-only resize is untested and probably unsupported.** All type tokens are
   absolute `px`, so a browser text-only zoom (Firefox's "Zoom text only", or a
   user stylesheet raising the root font size) does not enlarge the UI — measured
   above. Full-page zoom, which is what Chrome offers and what WCAG 1.4.4 is
   normally satisfied against, works and is covered by the reflow test. Moving the
   type ramp to `rem` would close the gap; it is a design-token change beyond this
   story's scope.
2. **One browser engine.** Every scan and keyboard assertion ran in Chromium
   only — the Playwright project list has a single `chromium` entry. Firefox and
   WebKit differences (notably `:focus-visible` heuristics and checkbox rendering)
   are unverified.
3. **Reflow is tested at one size.** The reflow test uses 640×360. The WCAG 1.4.10
   reference condition, 320 CSS px wide, is not exercised, nor is a real mobile
   device.
4. **The pinned `incomplete` set is version- and layout-sensitive.** Drift now
   fails the run, which is the point. The pin uses axe's `messageKey` values,
   normalized target identity, and, for the delete dialog, a fixed eight-row
   fixture whose height puts a row behind the dialog. An axe-core upgrade that
   renames a message key, or a spacing change that alters where the dialog lands,
   will fail these scans for a reason that is not an accessibility regression.
   That failure is intentional — it forces the new set to be resolved here before
   the expectation moves — but it is maintenance the next person will have to do.
5. **Grouping has no structural semantics.** Active and completed todos render as
   two runs inside one `<ul>` with no group headings or labels — carried over from
   the UX accessibility review's low-severity L3 finding. The per-row
   `Completed: {description}` label is the current mitigation.
6. **Row actions are `opacity: 0` until hover or focus-within** above the 640px
   breakpoint. They stay in the tab order and the accessibility tree (confirmed by
   the tab-order test and the trees above), and the seven rules that do evaluate
   them once revealed all pass, but sighted mouse users only see them on hover.
7. **Icon-only control contrast is not covered by any requested axe rule.** The
   Edit and Delete buttons hold an `aria-hidden` SVG and no text, so
   `color-contrast` — which measures text — never applies to them, revealed or
   not. Measured by hand instead: the icon stroke is `rgb(91, 100, 112)`
   (`--color-ink-secondary`) on the `rgb(255, 255, 255)` row surface, the same
   **6.00:1** pair as the dialog description, comfortably past the 3:1 that WCAG
   2.1 AA 1.4.11 Non-text Contrast asks of a control's graphical parts. axe ships
   no rule for 1.4.11, so nothing in CI re-checks this figure; a token change to
   `--color-ink-secondary` would need it re-measured.
