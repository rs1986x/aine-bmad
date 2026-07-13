import type { Todo } from '../types/todo'

export interface GroupedTodos {
  active: Todo[]
  completed: Todo[]
}

// Single source of ordering truth: split by `completed`, then sort each group
// newest-first by `createdAt`. Copies before sorting so the input prop is never
// mutated (immutable — architecture State Management Patterns). Sorting is
// explicit (not reliant on the server's order) so ordering is deterministic and
// unit-testable in isolation.
export function groupTodos(todos: Todo[]): GroupedTodos {
  const active: Todo[] = []
  const completed: Todo[] = []

  for (const todo of todos) {
    if (todo.completed) {
      completed.push(todo)
    } else {
      active.push(todo)
    }
  }

  const newestFirst = (a: Todo, b: Todo): number => b.createdAt.localeCompare(a.createdAt)

  return {
    active: active.sort(newestFirst),
    completed: completed.sort(newestFirst),
  }
}
