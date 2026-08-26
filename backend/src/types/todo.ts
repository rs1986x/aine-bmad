// Wire/TS shape (camelCase). The DB stores snake_case; mapping happens only in
// the repository.
export interface Todo {
  id: string // UUID
  description: string // 1..500 chars
  completed: boolean
  createdAt: string // ISO-8601 UTC
}

// CreateTodoInput and UpdateTodoInput are defined (via z.infer) in
// schemas/todo.schema.ts — do not duplicate them here.
