// Wire/TS shape (camelCase), mirroring backend/src/types/todo.ts exactly. The
// backend repository maps DB snake_case → camelCase; the frontend only ever
// consumes camelCase.
export interface Todo {
  id: string // UUID
  description: string // 1..500 chars
  completed: boolean
  createdAt: string // ISO-8601 UTC
}

// CreateTodoInput / UpdateTodoInput are Epic 2 (Stories 2.2 / 2.3) —
// intentionally not defined here.
