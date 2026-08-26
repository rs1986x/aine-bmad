import { useState } from 'react'
import type { Todo } from '../types/todo'
import { groupTodos } from '../utils/groupTodos'
import { TodoItem } from './TodoItem'

interface TodoListProps {
  todos: Todo[]
  onToggle: (todo: Todo) => Promise<Todo>
  onEdit: (id: string, description: string) => Promise<Todo>
}

export function TodoList({ todos, onToggle, onEdit }: TodoListProps) {
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null)
  const { active, completed } = groupTodos(todos)

  const renderTodo = (todo: Todo) => (
    <TodoItem
      key={todo.id}
      todo={todo}
      isEditing={editingTodoId === todo.id}
      editDisabled={editingTodoId !== null && editingTodoId !== todo.id}
      onToggle={onToggle}
      onStartEdit={() => {
        if (editingTodoId === null) setEditingTodoId(todo.id)
      }}
      onCancelEdit={() => setEditingTodoId(null)}
      onSaveEdit={async (description) => {
        const updated = await onEdit(todo.id, description)
        setEditingTodoId(null)
        return updated
      }}
    />
  )

  return (
    <ul className="todo-list">
      {active.map(renderTodo)}
      {completed.map(renderTodo)}
    </ul>
  )
}
