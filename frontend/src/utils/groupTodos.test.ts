import { describe, expect, it } from 'vitest'
import { groupTodos } from './groupTodos'
import type { Todo } from '../types/todo'

function todo(overrides: Partial<Todo> & Pick<Todo, 'id' | 'createdAt' | 'completed'>): Todo {
  return {
    description: `todo ${overrides.id}`,
    ...overrides,
  }
}

describe('groupTodos', () => {
  // Deliberately out-of-order and interleaved active/completed input.
  const input: Todo[] = [
    todo({ id: 'a', createdAt: '2026-01-02T10:00:00.000Z', completed: false }),
    todo({ id: 'b', createdAt: '2026-01-05T10:00:00.000Z', completed: true }),
    todo({ id: 'c', createdAt: '2026-01-04T10:00:00.000Z', completed: false }),
    todo({ id: 'd', createdAt: '2026-01-01T10:00:00.000Z', completed: true }),
    todo({ id: 'e', createdAt: '2026-01-03T10:00:00.000Z', completed: false }),
  ]

  it('splits todos into active and completed groups', () => {
    const { active, completed } = groupTodos(input)
    expect(active.map((t) => t.id)).toEqual(['c', 'e', 'a'])
    expect(completed.map((t) => t.id)).toEqual(['b', 'd'])
  })

  it('orders each group newest-first by createdAt', () => {
    const { active, completed } = groupTodos(input)
    // active: c (01-04) > e (01-03) > a (01-02)
    expect(active.map((t) => t.createdAt)).toEqual([
      '2026-01-04T10:00:00.000Z',
      '2026-01-03T10:00:00.000Z',
      '2026-01-02T10:00:00.000Z',
    ])
    // completed: b (01-05) > d (01-01)
    expect(completed.map((t) => t.createdAt)).toEqual([
      '2026-01-05T10:00:00.000Z',
      '2026-01-01T10:00:00.000Z',
    ])
  })

  it('does not mutate the input array', () => {
    const snapshot = input.map((t) => t.id)
    groupTodos(input)
    expect(input.map((t) => t.id)).toEqual(snapshot)
  })

  it('handles an empty list', () => {
    expect(groupTodos([])).toEqual({ active: [], completed: [] })
  })
})
