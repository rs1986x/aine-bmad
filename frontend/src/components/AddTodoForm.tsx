import { useEffect, useId, useRef, useState } from 'react'

// Pinned add-todo input. Owns its own local UI state (typed value, in-flight
// busy flag, and an inline message). It never calls the API directly — the
// parent passes `onAdd` (wired to useTodos.addTodo). Confirm-on-response: the
// list only updates when `onAdd` resolves; on rejection the typed text is kept.
export function AddTodoForm({ onAdd }: { onAdd: (description: string) => Promise<unknown> }) {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const shouldRefocus = useRef(false)
  const inputId = useId()
  const errorId = useId()

  // Refocus after a successful add (AC #1). This runs in an effect rather than
  // right after the await because the input is still `disabled` at that point
  // (the re-enable happens in `finally`); focusing a disabled element is a
  // no-op in real browsers. The effect fires after the re-render that clears
  // `submitting`, so the input is enabled and focusable.
  useEffect(() => {
    if (!submitting && shouldRefocus.current) {
      shouldRefocus.current = false
      inputRef.current?.focus()
    }
  }, [submitting])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return

    const trimmed = value.trim()
    if (trimmed === '') {
      // Empty-validation: no network call, keep the typed text (AC #2).
      setError('Enter some text first.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await onAdd(trimmed)
      setValue('')
      shouldRefocus.current = true
    } catch {
      // Create failure (AC #6): keep the text, re-enable, show inline message.
      // The polished Retry/banner/aria-live is Story 2.5.
      setError("Couldn't save that change.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value)
    // Typing clears a standing empty-validation message.
    if (error) setError(null)
  }

  const hasError = error !== null

  return (
    <form className="add-todo-form" onSubmit={handleSubmit}>
      <label className="add-todo-form__label" htmlFor={inputId}>
        Add a todo
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="text"
        className={`add-todo-form__input${hasError ? ' add-todo-form__input--error' : ''}`}
        placeholder="Add a todo…"
        value={value}
        onChange={handleChange}
        disabled={submitting}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
      />
      <button type="submit" className="add-todo-form__submit" disabled={submitting}>
        Add
      </button>
      {hasError && (
        <p id={errorId} className="add-todo-form__error">
          {error}
        </p>
      )}
    </form>
  )
}
