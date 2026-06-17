import { todoRepository } from '../repositories/todo.repository'
import type { Todo } from '../types/todo'

// Thin service layer: business logic lives here, never SQL or req/res. Epic 2
// adds create/update/delete alongside list.
export const todoService = {
  list(): Promise<Todo[]> {
    return todoRepository.list()
  },
}
