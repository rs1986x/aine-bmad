import { ConflictError, NotFoundError } from '../errors/AppError'
import { todoRepository } from '../repositories/todo.repository'
import type { CreateTodoInput, UpdateTodoInput } from '../schemas/todo.schema'
import type { Todo } from '../types/todo'

// Thin service layer: business logic lives here, never SQL or req/res. Epic 2
// adds create/update/delete alongside list.
export const todoService = {
  list(): Promise<Todo[]> {
    return todoRepository.list()
  },

  async create(input: CreateTodoInput, idempotencyKey: string): Promise<Todo> {
    const todo = await todoRepository.create(input, idempotencyKey)
    if (todo === null) {
      throw new ConflictError('Idempotency key was already used for a different create')
    }
    return todo
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
