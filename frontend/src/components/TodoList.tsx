import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { Todo } from '../types/todo'
import { groupTodos } from '../utils/groupTodos'
import { DeleteDialog } from './DeleteDialog'
import { TodoItem } from './TodoItem'

interface TodoListProps {
  todos: Todo[]
  onToggle: (todo: Todo, owner?: symbol) => Promise<Todo>
  onEdit: (id: string, description: string, owner?: symbol) => Promise<Todo>
  onDelete: (id: string, description: string) => Promise<void>
  onFocusAdd: () => void
  onFailure?: (owner: symbol, error: unknown, retry: () => Promise<void>) => void
  onClearFailure?: (owner: symbol) => void
  onReleaseOwner?: (owner: symbol) => void
}

interface DeleteTarget {
  todo: Todo
  trigger: HTMLButtonElement
}

function controlNamesByTodo(todos: Todo[]): Map<string, string> {
  const keyOf = (description: string) => description.trim().replace(/\s+/g, ' ')
  const totals = new Map<string, number>()
  const positions = new Map<string, number>()
  const names = new Map<string, string>()

  for (const todo of todos) {
    const key = keyOf(todo.description)
    totals.set(key, (totals.get(key) ?? 0) + 1)
  }

  for (const todo of todos) {
    const key = keyOf(todo.description)
    const total = totals.get(key) ?? 1
    const position = (positions.get(key) ?? 0) + 1
    positions.set(key, position)
    names.set(
      todo.id,
      total > 1 ? `${todo.description}, item ${position} of ${total}` : todo.description,
    )
  }

  return names
}

export function TodoList({
  todos,
  onToggle,
  onEdit,
  onDelete,
  onFocusAdd,
  onFailure,
  onClearFailure,
  onReleaseOwner,
}: TodoListProps) {
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const focusTimerRef = useRef<number | null>(null)
  const focusObserverRef = useRef<MutationObserver | null>(null)
  const { active, completed } = groupTodos(todos)
  const orderedTodos = [...active, ...completed]
  const controlNames = controlNamesByTodo(orderedTodos)

  useEffect(
    () => () => {
      if (focusTimerRef.current !== null) {
        window.clearTimeout(focusTimerRef.current)
      }
      focusObserverRef.current?.disconnect()
    },
    [],
  )

  const focusAfterRender = (todoIds: string[], fallback?: HTMLButtonElement) => {
    if (focusTimerRef.current !== null) {
      window.clearTimeout(focusTimerRef.current)
    }
    focusObserverRef.current?.disconnect()
    focusObserverRef.current = null

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

      onFocusAdd()
    }, 0)
  }

  const focusAfterDelete = (targetIndex: number, targetId: string) => {
    if (focusTimerRef.current !== null) {
      window.clearTimeout(focusTimerRef.current)
      focusTimerRef.current = null
    }
    focusObserverRef.current?.disconnect()
    focusObserverRef.current = null

    const tryFocus = (): boolean => {
      const deleteControls = Array.from(
        listRef.current?.querySelectorAll<HTMLButtonElement>('[data-todo-delete-id]') ?? [],
      )

      if (deleteControls.some((button) => button.dataset.todoDeleteId === targetId)) {
        return false
      }

      if (deleteControls.length === 0) {
        onFocusAdd()
        return true
      }

      const pivot = Math.min(Math.max(targetIndex, 0), deleteControls.length - 1)
      for (let offset = 0; offset < deleteControls.length; offset += 1) {
        const next = deleteControls[pivot + offset]
        const previous = deleteControls[pivot - 1 - offset]
        if (next && !next.disabled) {
          next.focus()
          return true
        }
        if (previous && !previous.disabled) {
          previous.focus()
          return true
        }
      }

      return false
    }

    if (tryFocus()) return

    const list = listRef.current
    if (!list) {
      onFocusAdd()
      return
    }

    focusObserverRef.current = new MutationObserver(() => {
      if (!tryFocus()) return
      focusObserverRef.current?.disconnect()
      focusObserverRef.current = null
    })
    focusObserverRef.current.observe(list, {
      attributes: true,
      attributeFilter: ['disabled'],
      childList: true,
      subtree: true,
    })
  }

  const cancelDelete = () => {
    if (!deleteTarget) return
    const trigger = deleteTarget.trigger
    setDeleteTarget(null)
    focusAfterRender([], trigger)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const targetId = deleteTarget.todo.id
    const targetIndex = orderedTodos.findIndex((todo) => todo.id === targetId)

    await onDelete(targetId, deleteTarget.todo.description)
    flushSync(() => setDeleteTarget(null))
    focusAfterDelete(targetIndex, targetId)
  }

  const renderTodo = (todo: Todo) => (
    <TodoItem
      key={todo.id}
      todo={todo}
      accessibleName={controlNames.get(todo.id)}
      isEditing={editingTodoId === todo.id}
      editDisabled={editingTodoId !== null && editingTodoId !== todo.id}
      onToggle={onToggle}
      onFailure={onFailure}
      onClearFailure={onClearFailure}
      onReleaseOwner={onReleaseOwner}
      onStartEdit={() => {
        if (editingTodoId === null) setEditingTodoId(todo.id)
      }}
      onCancelEdit={() => setEditingTodoId(null)}
      onSaveEdit={async (description, owner) => {
        const updated = await onEdit(todo.id, description, owner)
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
        <DeleteDialog todo={deleteTarget.todo} onCancel={cancelDelete} onConfirm={confirmDelete} />
      ) : null}
    </>
  )
}
