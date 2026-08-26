// Wire/TS shape (camelCase), mirroring backend/src/types/todo.ts exactly. The
// backend repository maps DB snake_case → camelCase; the frontend only ever
// consumes camelCase.
export interface Todo {
  id: string // UUID
  description: string // 1..500 chars
  completed: boolean
  createdAt: string // ISO-8601 UTC
}

// Mirrors the backend create-input shape (the frontend has no Zod). The server
// is authoritative for trimming/length; this is just the request body type.
export interface CreateTodoInput {
  description: string
}

export interface UpdateTodoInput {
  description?: string
  completed?: boolean
}
