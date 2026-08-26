import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { Todo } from '../types/todo'

// Human-readable rendering of the ISO createdAt. Only the machine-readable
// dateTime attribute (the raw ISO string) is contract-tested; this visible text
// is presentational and locale-dependent.
function formatCreatedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

interface TodoItemProps {
  todo: Todo
  isEditing: boolean
  editDisabled: boolean
  onToggle: (todo: Todo) => Promise<Todo>
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: (description: string) => Promise<Todo>
  onRequestDelete: (trigger: HTMLButtonElement) => void
  onFailure?: (owner: symbol, error: unknown, retry: () => Promise<void>) => void
  onClearFailure?: (owner: symbol) => void
}

export function TodoItem({
  todo,
  isEditing,
  editDisabled,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRequestDelete,
  onFailure,
  onClearFailure,
}: TodoItemProps) {
  const { description, completed, createdAt } = todo
  const label = completed ? `Completed: ${description}` : description
  const [draft, setDraft] = useState(description)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const editButtonRef = useRef<HTMLButtonElement>(null)
  const deleteButtonRef = useRef<HTMLButtonElement>(null)
  const wasEditing = useRef(isEditing)
  const failureOwner = useRef(Symbol(`todo-${todo.id}`)).current
  const editErrorId = `todo-edit-error-${todo.id}`

  useEffect(() => {
    if (wasEditing.current && !isEditing) {
      editButtonRef.current?.focus()
    }
    wasEditing.current = isEditing
  }, [isEditing])

  const runToggle = async (clearStandingFailure: boolean): Promise<void> => {
    if (toggling || isEditing) return
    if (clearStandingFailure) onClearFailure?.(failureOwner)
    setToggling(true)
    try {
      await onToggle(todo)
    } catch (failure) {
      onFailure?.(failureOwner, failure, () => runToggle(false))
      throw failure
    } finally {
      setToggling(false)
    }
  }

  const handleToggle = () => {
    void runToggle(true).catch(() => undefined)
  }

  const runEdit = async (description: string, clearStandingFailure: boolean): Promise<void> => {
    if (saving) return
    if (clearStandingFailure) onClearFailure?.(failureOwner)
    setEditError(null)
    setSaving(true)
    try {
      await onSaveEdit(description)
    } catch (failure) {
      onFailure?.(failureOwner, failure, () => runEdit(description, false))
      throw failure
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    const trimmedDraft = draft.trim()
    if (trimmedDraft.length === 0) {
      setEditError('Enter some text first.')
      return
    }

    await runEdit(trimmedDraft, true).catch(() => undefined)
  }

  const handleEditKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && !saving) {
      event.preventDefault()
      onClearFailure?.(failureOwner)
      onCancelEdit()
    }
  }

  const handleCheckboxKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleToggle()
    }
  }

  return (
    <li className={`todo-item${isEditing ? ' todo-item--editing' : ''}`} aria-label={label}>
      <label
        className={`todo-item__checkbox-target${
          toggling
            ? ' todo-item__checkbox-target--busy'
            : isEditing
              ? ' todo-item__checkbox-target--disabled'
              : ''
        }`}
      >
        <input
          type="checkbox"
          className="todo-item__checkbox"
          checked={completed}
          onChange={handleToggle}
          onKeyDown={handleCheckboxKeyDown}
          disabled={isEditing || toggling}
          aria-busy={toggling}
          aria-label={completed ? 'Completed' : 'Not completed'}
        />
      </label>
      {isEditing ? (
        <form className="todo-item__edit" onSubmit={(event) => void handleSubmit(event)}>
          <label className="sr-only" htmlFor={`todo-edit-${todo.id}`}>
            Edit description for {description}
          </label>
          <input
            id={`todo-edit-${todo.id}`}
            className="todo-item__edit-input"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              setEditError(null)
              onClearFailure?.(failureOwner)
            }}
            onKeyDown={handleEditKeyDown}
            disabled={saving}
            aria-invalid={editError ? true : undefined}
            aria-describedby={editError ? editErrorId : undefined}
            autoFocus
          />
          {editError ? (
            <span id={editErrorId} className="todo-item__error" role="alert">
              {editError}
            </span>
          ) : null}
          <span className="todo-item__edit-actions">
            <button type="submit" className="todo-item__save" disabled={saving}>
              Save
            </button>
            <button
              type="button"
              className="todo-item__cancel"
              onClick={() => {
                onClearFailure?.(failureOwner)
                onCancelEdit()
              }}
              disabled={saving}
            >
              Cancel
            </button>
          </span>
        </form>
      ) : (
        <span className={`todo-item__desc${completed ? ' todo-item__desc--completed' : ''}`}>
          {description}
        </span>
      )}
      <time className="todo-item__meta" dateTime={createdAt}>
        {formatCreatedAt(createdAt)}
      </time>
      <span className="todo-item__actions">
        <button
          ref={editButtonRef}
          type="button"
          className="todo-item__action"
          aria-label="Edit todo"
          onClick={() => {
            setDraft(description)
            setEditError(null)
            onClearFailure?.(failureOwner)
            onStartEdit()
          }}
          disabled={editDisabled || isEditing || toggling}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
        <button
          ref={deleteButtonRef}
          type="button"
          className="todo-item__action"
          aria-label="Delete todo"
          data-todo-delete-id={todo.id}
          onClick={() => {
            if (deleteButtonRef.current) {
              onClearFailure?.(failureOwner)
              onRequestDelete(deleteButtonRef.current)
            }
          }}
          disabled={editDisabled || isEditing || toggling}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        </button>
      </span>
    </li>
  )
}
