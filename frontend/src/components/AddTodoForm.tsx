import { useEffect, useId, useRef, useState } from 'react'

// Pinned add-todo input. Owns its own local UI state (typed value, in-flight
// busy flag, and an inline message). It never calls the API directly — the
// parent passes `onAdd` (wired to useTodos.addTodo). Confirm-on-response: the
// list only updates when `onAdd` resolves; on rejection the typed text is kept.
export function AddTodoForm({
  onAdd,
  onFailure,
  onClearFailure,
  onReleaseOwner,
  focusRequest = 0,
}: {
  onAdd: (description: string, owner?: symbol, idempotencyKey?: string) => Promise<unknown>
  onFailure?: (owner: symbol, error: unknown, retry: () => Promise<void>) => void
  onClearFailure?: (owner: symbol) => void
  onReleaseOwner?: (owner: symbol) => void
  focusRequest?: number
}) {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const shouldRefocus = useRef(false)
  const handledFocusRequest = useRef(focusRequest)
  const failureOwner = useRef(Symbol('add-todo')).current
  const inputId = useId()
  const errorId = useId()

  useEffect(() => () => onReleaseOwner?.(failureOwner), [failureOwner, onReleaseOwner])

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

  useEffect(() => {
    if (focusRequest === handledFocusRequest.current || submitting) return
    handledFocusRequest.current = focusRequest
    inputRef.current?.focus()
  }, [focusRequest, submitting])

  async function submit(
    description: string,
    clearStandingFailure: boolean,
    idempotencyKey: string,
  ): Promise<void> {
    if (submitting) return
    if (clearStandingFailure) onClearFailure?.(failureOwner)
    setSubmitting(true)
    setError(null)
    try {
      await onAdd(description, failureOwner, idempotencyKey)
      setValue('')
      shouldRefocus.current = true
    } catch (failure) {
      onFailure?.(failureOwner, failure, () => submit(description, false, idempotencyKey))
      throw failure
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return

    const trimmed = value.trim()
    if (trimmed === '') {
      setError('Enter some text first.')
      return
    }

    await submit(trimmed, true, crypto.randomUUID()).catch(() => undefined)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value)
    onClearFailure?.(failureOwner)
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
