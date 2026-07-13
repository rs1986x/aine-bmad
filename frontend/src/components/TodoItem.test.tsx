import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TodoItem } from './TodoItem'
import type { Todo } from '../types/todo'

const activeTodo: Todo = {
  id: '1',
  description: 'Buy milk',
  completed: false,
  createdAt: '2026-01-02T10:00:00.000Z',
}

const completedTodo: Todo = {
  id: '2',
  description: 'Walk the dog',
  completed: true,
  createdAt: '2026-01-01T09:30:00.000Z',
}

function renderItem(todo: Todo) {
  // TodoItem renders an <li>; wrap in a <ul> so the DOM is valid and the
  // listitem role resolves.
  return render(
    <ul>
      <TodoItem todo={todo} />
    </ul>,
  )
}

describe('TodoItem', () => {
  it('renders an active todo with plain treatment and an unchecked checkbox', () => {
    renderItem(activeTodo)

    const item = screen.getByRole('listitem', { name: 'Buy milk' })
    expect(item).toBeInTheDocument()

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()

    const desc = screen.getByText('Buy milk')
    expect(desc).not.toHaveClass('todo-item__desc--completed')
  })

  it('renders a completed todo with the dual signal (checked + strike-through) and prefixed label', () => {
    renderItem(completedTodo)

    // Dual signal 1: accessible label carries the "Completed:" prefix.
    const item = screen.getByRole('listitem', { name: 'Completed: Walk the dog' })
    expect(item).toBeInTheDocument()

    // Dual signal 2a: checkbox is checked.
    expect(screen.getByRole('checkbox')).toBeChecked()

    // Dual signal 2b: description has the strike-through modifier class.
    const desc = screen.getByText('Walk the dog')
    expect(desc).toHaveClass('todo-item__desc--completed')
  })

  it('renders a <time> element carrying the exact createdAt in dateTime', () => {
    const { container } = renderItem(activeTodo)
    const time = container.querySelector('time')
    expect(time).not.toBeNull()
    expect(time).toHaveAttribute('dateTime', '2026-01-02T10:00:00.000Z')
  })

  it('renders labeled, inert edit and delete buttons', () => {
    renderItem(activeTodo)

    const edit = screen.getByRole('button', { name: 'Edit todo' })
    const del = screen.getByRole('button', { name: 'Delete todo' })

    expect(edit).toBeInTheDocument()
    expect(del).toBeInTheDocument()
    // Display-only in this story: real, focusable, not disabled.
    expect(edit).not.toBeDisabled()
    expect(del).not.toBeDisabled()
    expect(edit).toHaveAttribute('type', 'button')
    expect(del).toHaveAttribute('type', 'button')
  })
})
