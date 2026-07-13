// Wire/TS shape (camelCase). The DB stores snake_case; mapping happens only in
// the repository.
export interface Todo {
  id: string // UUID
  description: string // 1..500 chars
  completed: boolean
  createdAt: string // ISO-8601 UTC
}

// CreateTodoInput is defined (via z.infer) in schemas/todo.schema.ts — do not
// duplicate it here. UpdateTodoInput lands alongside its Zod schema in Story 2.3.
