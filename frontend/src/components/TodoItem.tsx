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

// Display-only row. The checkbox and icon buttons are real, focusable, labeled
// controls with no handlers — Story 2.3 wires toggle/edit, Story 2.4 wires
// delete. The row's accessible name lives on the <li> via aria-label so it
// resolves to exactly "{description}" / "Completed: {description}" without the
// meta line or button labels polluting the computed name.
export function TodoItem({ todo }: { todo: Todo }) {
  const { description, completed, createdAt } = todo
  const label = completed ? `Completed: ${description}` : description

  return (
    <li className="todo-item" aria-label={label}>
      <input
        type="checkbox"
        className="todo-item__checkbox"
        checked={completed}
        readOnly
        aria-label={completed ? 'Completed' : 'Not completed'}
      />
      <span
        className={`todo-item__desc${completed ? ' todo-item__desc--completed' : ''}`}
      >
        {description}
      </span>
      <time className="todo-item__meta" dateTime={createdAt}>
        {formatCreatedAt(createdAt)}
      </time>
      <span className="todo-item__actions">
        <button type="button" className="todo-item__action" aria-label="Edit todo">
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
        <button type="button" className="todo-item__action" aria-label="Delete todo">
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
