# Epic 2 Context: The Complete Todo Experience

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Deliver the complete single-user Todo experience on top of the runnable foundation: users can view a populated list, create Todos, toggle completion, edit descriptions, and permanently delete items through an accessible, responsive interface. Every action must round-trip through the server-authoritative API, persist durably, handle failure without losing user input, and feel clear and responsive on desktop and mobile.

## Stories

- Story 2.1: Render the populated Todo List
- Story 2.2: Create a Todo
- Story 2.3: Update a Todo — complete/un-complete & edit description
- Story 2.4: Delete a Todo with confirmation
- Story 2.5: Error handling & in-flight reliability

## Requirements & Constraints

- Support the full Todo lifecycle without login, onboarding, navigation, or manual refresh: list, create, complete/un-complete, edit, and delete.
- A Todo contains a server-assigned UUID `id`, a required `description`, a boolean `completed` value, and an immutable `createdAt` timestamp. Do not add `updatedAt` or other task-management fields.
- Trim descriptions and enforce a length of 1–500 characters on create and edit. Reject empty, whitespace-only, over-long, and fieldless update requests without persisting changes.
- New Todos start incomplete. Editing must preserve identity, creation time, and completion state. Completion is reversible. Deletion is permanent; there is no undo, trash, or soft delete.
- Unknown Todo IDs return a not-found response; invalid input returns a validation response. Failures must never corrupt persisted state, crash the service, expose internal details, or silently discard typed input.
- The server is authoritative. Commit frontend state only after a successful response and use the returned Todo object; do not use optimistic updates that can diverge from persistence.
- Active Todos appear above Completed Todos, newest-first within each group. A confirmed completion change immediately re-sorts the affected row.
- Under normal local conditions, typical API responses should remain well below roughly 500 ms and the UI should reflect a confirmed response within roughly 200 ms.
- Keep v1 strictly single-user: no authentication, user accounts, sharing, priorities, due dates, tags, search, bulk actions, drag reordering, offline sync, or other deferred features.
- Each implementation slice includes automated tests alongside its code. Cover service logic, real HTTP and database behavior, component interactions, validation, accessibility semantics, ordering, busy states, and failure recovery using the established unit, integration, and component test layers.

## Technical Decisions

- Expose JSON REST operations under `/api`: `GET /api/todos`, `POST /api/todos`, `PATCH /api/todos/:id`, and `DELETE /api/todos/:id`. Return `200` for reads and updates, `201` for creation, and `204` with no body for deletion.
- Return successful resources directly. All errors use `{ error: { code, message } }`, with `400` for validation, `404` for unknown IDs, and safe generic handling for unexpected failures.
- Keep backend boundaries strict: routes handle HTTP and Zod parsing, services own business logic and typed errors, repositories own all SQL, and the single error middleware converts errors to HTTP responses.
- Use parameterized PostgreSQL queries through the shared pool. Keep database names in `snake_case` and API/TypeScript fields in `camelCase`; perform `created_at` to `createdAt` mapping only in the repository.
- Use the existing `Todo` wire shape with ISO-8601 UTC timestamps and real JSON booleans. Database constraints remain the defense-in-depth backstop for validated writes.
- Frontend components do not call the API directly. `App` owns `useTodos`, which calls the typed `api.ts` client and supplies immutable list state, async state, errors, and actions to components.
- Use synchronous request/response only. Do not introduce a router, global store, server-state library, event layer, websocket, or component library.
- In-flight checkbox, Save, and Delete controls must expose a brief busy/disabled state and prevent duplicate submissions while waiting for confirmation.
- Preserve the established security baseline on all new routes: Zod validation, parameterized SQL, scoped error disclosure, body-size limits, and the uniform error contract.

## UX & Interaction Patterns

- Use one centered responsive column, no wider than 640 px with 16 px mobile gutters. Keep the add control above the list; use hand-authored CSS and the established design tokens.
- Render the Todo List as semantic `<ul>/<li>` content. Each row contains a checkbox, description, creation metadata, edit action, and delete action, with a programmatic label that includes `"Completed: {description}"` when applicable.
- Convey completion with both the checked accent-filled checkbox and strike-through `ink-muted` text; never rely on color alone.
- Add submits by button or Enter. Empty input shows `"Enter some text first."` inline through an associated validation message and retains the entered value; successful creation clears and refocuses the field.
- Edit in place with a pre-filled field, accent-subtle row treatment, Save and Cancel controls, Enter to save, and Escape to cancel. Preserve the original value after cancellation or rejected input, and allow only one row in edit mode.
- Require a focus-trapped, title-labeled confirmation dialog before deletion. Quote the Todo description, default focus to Cancel, allow Escape to dismiss, and return focus sensibly when the dialog closes.
- Show clear, non-destructive failures above the list using `role="alert"` and a Retry action. Use `"Couldn't load your todos. Retry."` for load failures and `"Couldn't save that change. Retry."` for mutation failures.
- Announce successful list changes through an `aria-live="polite"` region. Associate field errors with `aria-describedby`, keep visible focus indicators on every control, and provide effective hit areas of at least 44×44 px.
- At desktop widths, place the add input and button on one line and reveal row actions on hover or focus. On touch/mobile, keep row actions visible, retain a 16 px input font, and reflow without losing function at 200% text size.

## Cross-Story Dependencies

- Epic 2 assumes the runnable foundation already supplies the Todo schema and migrations, shared database pool and repository, list and health endpoints, typed frontend API client, `useTodos` loading flow, design tokens, error middleware, and test harnesses.
- Populated-list grouping and row semantics establish the shared `TodoList`/`TodoItem` surface used by create, update, delete, and error-recovery behavior.
- Create, update, and delete all depend on the same validation, service/repository layering, error envelope, immutable hook state, confirm-on-response rule, and retry model; reliability behavior must remain consistent across every mutation.
- The completed Epic 2 flows become the functional surfaces exercised by later end-to-end, accessibility, persistence, and security verification.
