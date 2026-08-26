import { pool } from '../db/pool'
import type { CreateTodoInput, UpdateTodoInput } from '../schemas/todo.schema'
import type { Todo } from '../types/todo'

// Raw DB row shape (snake_case). `pg` returns a JS Date for TIMESTAMPTZ.
interface TodoRow {
  id: string
  description: string
  completed: boolean
  created_at: Date
}

// The single boundary where snake_case <-> camelCase and Date -> ISO mapping
// lives. Nothing snake_case leaves this file.
function toTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    description: row.description,
    completed: row.completed,
    createdAt: row.created_at.toISOString(),
  }
}

export const todoRepository = {
  async list(): Promise<Todo[]> {
    const { rows } = await pool.query<TodoRow>(
      'SELECT id, description, completed, created_at FROM todos ORDER BY created_at DESC',
    )
    return rows.map(toTodo)
  },

  async create(input: CreateTodoInput): Promise<Todo> {
    // Parameterized insert (never interpolate input). id/completed/created_at
    // all default in the DB (gen_random_uuid(), false, now()).
    const { rows } = await pool.query<TodoRow>(
      `INSERT INTO todos (description) VALUES ($1)
       RETURNING id, description, completed, created_at`,
      [input.description],
    )
    return toTodo(rows[0])
  },

  async update(id: string, input: UpdateTodoInput): Promise<Todo | null> {
    const { rows } = await pool.query<TodoRow>(
      `UPDATE todos
       SET description = COALESCE($1, description),
           completed = COALESCE($2, completed)
       WHERE id = $3
       RETURNING id, description, completed, created_at`,
      [input.description ?? null, input.completed ?? null, id],
    )

    return rows.length === 0 ? null : toTodo(rows[0])
  },
}
