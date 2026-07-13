import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TodoList } from './TodoList'
import type { Todo } from '../types/todo'

// Input order deliberately differs from the expected render order so the test
// proves TodoList (via groupTodos) re-establishes ordering rather than trusting
// the incoming prop order.
const todos: Todo[] = [
  { id: '1', description: 'active old', completed: false, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: '2', description: 'completed new', completed: true, createdAt: '2026-01-06T00:00:00.000Z' },
  { id: '3', description: 'active new', completed: false, createdAt: '2026-01-05T00:00:00.000Z' },
  { id: '4', description: 'completed old', completed: true, createdAt: '2026-01-02T00:00:00.000Z' },
]

describe('TodoList', () => {
  it('renders a single semantic list with one listitem per todo', () => {
    render(<TodoList todos={todos} />)

    const list = screen.getByRole('list')
    expect(list.tagName).toBe('UL')
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
  })

  it('renders active (newest-first) above completed (newest-first)', () => {
    render(<TodoList todos={todos} />)

    const items = screen.getAllByRole('listitem')
    const names = items.map((li) => li.getAttribute('aria-label'))

    expect(names).toEqual([
      'active new',
      'active old',
      'Completed: completed new',
      'Completed: completed old',
    ])
  })
})
