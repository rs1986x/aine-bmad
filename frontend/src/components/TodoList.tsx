import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { Todo } from '../types/todo'
import { groupTodos } from '../utils/groupTodos'
import { DeleteDialog } from './DeleteDialog'
import { TodoItem } from './TodoItem'

interface TodoListProps {
  todos: Todo[]
  onToggle: (todo: Todo) => Promise<Todo>
  onEdit: (id: string, description: string) => Promise<Todo>
  onDelete: (id: string) => Promise<void>
}

interface DeleteTarget {
  todo: Todo
  trigger: HTMLButtonElement
}

export function TodoList({ todos, onToggle, onEdit, onDelete }: TodoListProps) {
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const focusTimerRef = useRef<number | null>(null)
  const { active, completed } = groupTodos(todos)
  const orderedTodos = [...active, ...completed]

  useEffect(
    () => () => {
      if (focusTimerRef.current !== null) {
        window.clearTimeout(focusTimerRef.current)
      }
    },
    [],
  )

  const focusAfterRender = (todoIds: string[], fallback?: HTMLButtonElement) => {
    if (focusTimerRef.current !== null) {
      window.clearTimeout(focusTimerRef.current)
    }

    focusTimerRef.current = window.setTimeout(() => {
      focusTimerRef.current = null
      if (fallback?.isConnected && !fallback.disabled) {
        fallback.focus()
        return
      }

      const deleteControls = Array.from(
        listRef.current?.querySelectorAll<HTMLButtonElement>('[data-todo-delete-id]') ?? [],
      )
      for (const todoId of todoIds) {
        const deleteControl = deleteControls.find(
          (button) => button.dataset.todoDeleteId === todoId,
        )
        if (deleteControl?.isConnected && !deleteControl.disabled) {
          deleteControl.focus()
          return
        }
      }

      document.querySelector<HTMLInputElement>('.add-todo-form__input')?.focus()
    }, 0)
  }

  const cancelDelete = () => {
    if (!deleteTarget) return
    const trigger = deleteTarget.trigger
    setDeleteTarget(null)
    focusAfterRender([], trigger)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const targetIndex = orderedTodos.findIndex((todo) => todo.id === deleteTarget.todo.id)
    const remaining = orderedTodos.filter((todo) => todo.id !== deleteTarget.todo.id)
    const candidateIds: string[] = []
    const pivot = Math.max(targetIndex, 0)
    for (let offset = 0; offset < remaining.length; offset += 1) {
      const next = remaining[pivot + offset]
      const previous = remaining[pivot - 1 - offset]
      if (next) candidateIds.push(next.id)
      if (previous) candidateIds.push(previous.id)
    }

    await onDelete(deleteTarget.todo.id)
    if (candidateIds.length === 0) {
      flushSync(() => setDeleteTarget(null))
      document.querySelector<HTMLInputElement>('.add-todo-form__input')?.focus()
    } else {
      setDeleteTarget(null)
      focusAfterRender(candidateIds)
    }
  }

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
      onRequestDelete={(trigger) => {
        if (editingTodoId === null && deleteTarget === null) {
          setDeleteTarget({ todo, trigger })
        }
      }}
    />
  )

  return (
    <>
      <ul ref={listRef} className="todo-list">
        {active.map(renderTodo)}
        {completed.map(renderTodo)}
      </ul>
      {deleteTarget ? (
        <DeleteDialog
          todo={deleteTarget.todo}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
        />
      ) : null}
    </>
  )
}
