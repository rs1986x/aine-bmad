import { afterEach, describe, expect, it, vi } from 'vitest'

import { NotFoundError } from '../errors/AppError'
import { todoRepository } from '../repositories/todo.repository'
import { todoService } from '../services/todo.service'
import type { Todo } from '../types/todo'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('todoService.update', () => {
  it('delegates to the repository and returns the updated Todo', async () => {
    const updated: Todo = {
      id: '00000000-0000-4000-8000-000000000000',
      description: 'Updated task',
      completed: true,
      createdAt: '2026-08-26T08:00:00.000Z',
    }
    const update = vi.spyOn(todoRepository, 'update').mockResolvedValueOnce(updated)

    await expect(
      todoService.update(updated.id, {
        description: updated.description,
        completed: updated.completed,
      }),
    ).resolves.toBe(updated)
    expect(update).toHaveBeenCalledWith(updated.id, {
      description: updated.description,
      completed: updated.completed,
    })
  })

  it('throws the typed not-found error when the repository returns no row', async () => {
    vi.spyOn(todoRepository, 'update').mockResolvedValueOnce(null)

    await expect(
      todoService.update('00000000-0000-4000-8000-000000000000', { completed: true }),
    ).rejects.toEqual(new NotFoundError('Todo not found'))
  })
})

describe('todoService.remove', () => {
  it('delegates to the repository for an existing Todo', async () => {
    const remove = vi.spyOn(todoRepository, 'remove').mockResolvedValueOnce(true)
    const id = '00000000-0000-4000-8000-000000000000'

    await expect(todoService.remove(id)).resolves.toBeUndefined()
    expect(remove).toHaveBeenCalledWith(id)
  })

  it('throws the typed not-found error when the repository affects no row', async () => {
    vi.spyOn(todoRepository, 'remove').mockResolvedValueOnce(false)

    await expect(
      todoService.remove('00000000-0000-4000-8000-000000000000'),
    ).rejects.toEqual(new NotFoundError('Todo not found'))
  })
})
