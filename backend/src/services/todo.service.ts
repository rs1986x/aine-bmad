import { NotFoundError } from '../errors/AppError'
import { todoRepository } from '../repositories/todo.repository'
import type { CreateTodoInput, UpdateTodoInput } from '../schemas/todo.schema'
import type { Todo } from '../types/todo'

// Thin service layer: business logic lives here, never SQL or req/res. Epic 2
// adds create/update/delete alongside list.
export const todoService = {
  list(): Promise<Todo[]> {
    return todoRepository.list()
  },

  // Thin delegate — the route's Zod parse is the validation boundary, so the
  // service does not re-validate.
  create(input: CreateTodoInput): Promise<Todo> {
    return todoRepository.create(input)
  },

  async update(id: string, input: UpdateTodoInput): Promise<Todo> {
    const todo = await todoRepository.update(id, input)

    if (todo === null) {
      throw new NotFoundError('Todo not found')
    }

    return todo
  },

  async remove(id: string): Promise<void> {
    const removed = await todoRepository.remove(id)

    if (!removed) {
      throw new NotFoundError('Todo not found')
    }
  },
}
