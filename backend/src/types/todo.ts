// Wire/TS shape (camelCase). The DB stores snake_case; mapping happens only in
// the repository.
export interface Todo {
  id: string // UUID
  description: string // 1..500 chars
  completed: boolean
  createdAt: string // ISO-8601 UTC
}

// Reserved for Epic 2 — CreateTodoInput / UpdateTodoInput land alongside their
// Zod schemas in Stories 2.2 / 2.3. Intentionally not defined here.
