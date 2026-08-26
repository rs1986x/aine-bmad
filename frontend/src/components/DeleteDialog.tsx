import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { isConnectionError } from '../api/api'
import type { Todo } from '../types/todo'

interface DeleteDialogProps {
  todo: Todo
  onCancel: () => void
  onConfirm: () => Promise<void>
}

export function DeleteDialog({ todo, onCancel, onConfirm }: DeleteDialogProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const errorId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const containFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.contains(event.target)) {
        const cancel = cancelRef.current
        if (cancel && !cancel.disabled) {
          cancel.focus()
        } else {
          dialog.focus()
        }
      }
    }
    document.addEventListener('focusin', containFocus)
    cancelRef.current?.focus()

    return () => {
      document.removeEventListener('focusin', containFocus)
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    if (pending) dialogRef.current?.focus()
  }, [pending])

  useEffect(() => {
    if (!pending && error) confirmRef.current?.focus()
  }, [error, pending])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (!pending) onCancel()
      return
    }

    if (event.key !== 'Tab') return

    if (pending) {
      event.preventDefault()
      return
    }

    const cancel = cancelRef.current
    const confirm = confirmRef.current
    if (!cancel || !confirm) return

    if (event.shiftKey && document.activeElement === cancel) {
      event.preventDefault()
      confirm.focus()
    } else if (!event.shiftKey && document.activeElement === confirm) {
      event.preventDefault()
      cancel.focus()
    }
  }

  const handleConfirm = async () => {
    if (pending) return
    setError(null)
    setPending(true)
    try {
      await onConfirm()
    } catch (failure) {
      setError(
        isConnectionError(failure)
          ? "Couldn't connect. Check your connection and retry."
          : "Couldn't save that change. Retry.",
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="delete-dialog__scrim">
      <div
        ref={dialogRef}
        className="delete-dialog"
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-busy={pending}
        aria-labelledby={titleId}
        aria-describedby={`${descriptionId}${error ? ` ${errorId}` : ''}`}
        onKeyDown={handleKeyDown}
      >
        <h2 id={titleId} className="delete-dialog__title">
          Delete this todo?
        </h2>
        <p id={descriptionId} className="delete-dialog__description">
          “{todo.description}” — this can't be undone.
        </p>
        {error ? (
          <p id={errorId} className="delete-dialog__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="delete-dialog__actions">
          <button
            ref={cancelRef}
            type="button"
            className="delete-dialog__cancel"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="delete-dialog__confirm"
            onClick={() => void handleConfirm()}
            disabled={pending}
            aria-busy={pending}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
