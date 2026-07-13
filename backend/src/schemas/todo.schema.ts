import { z } from 'zod'

// Validation boundary for creating a Todo. `.trim()` runs before the length
// checks, so a whitespace-only string trims to '' and fails `.min(1)`, and the
// value the route hands to the service/repository is already trimmed. The DB
// CHECK (1..500) is a defense-in-depth backstop, not the primary guard.
export const createTodoSchema = z.object({
  description: z.string().trim().min(1).max(500),
})

// Inferred input type ({ description: string }). Defined here (not in
// types/todo.ts) so the Zod schema stays the single source of truth.
export type CreateTodoInput = z.infer<typeof createTodoSchema>
