import { pool } from '../db/pool'
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
}
