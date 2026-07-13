import type { Todo } from '../types/todo'
import { groupTodos } from '../utils/groupTodos'
import { TodoItem } from './TodoItem'

// Presentational only: receives todos as a prop from App (no hooks, no network,
// no state). A single semantic <ul> keeps "the Todo List is a list"; the
// Active/Completed separation is conveyed by order (groupTodos is the single
// ordering authority).
export function TodoList({ todos }: { todos: Todo[] }) {
  const { active, completed } = groupTodos(todos)

  return (
    <ul className="todo-list">
      {active.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
      {completed.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  )
}
