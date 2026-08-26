import { afterEach, describe, expect, it, vi } from 'vitest'

import { pool } from '../db/pool'
import { todoRepository } from './todo.repository'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('todoRepository.update', () => {
  it('uses one parameterized update and maps the returned row', async () => {
    const createdAt = new Date('2026-08-26T08:00:00.000Z')
    const query = vi.spyOn(pool, 'query')
    const queryMock = query as unknown as ReturnType<typeof vi.fn>
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: '00000000-0000-4000-8000-000000000000',
          description: 'Updated task',
          completed: false,
          created_at: createdAt,
        },
      ],
      rowCount: 1,
      command: 'UPDATE',
      oid: 0,
      fields: [],
    })

    const result = await todoRepository.update('00000000-0000-4000-8000-000000000000', {
      description: 'Updated task',
      completed: false,
    })

    expect(query).toHaveBeenCalledOnce()
    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(
        /UPDATE todos[\s\S]*description = COALESCE\(\$1, description\)[\s\S]*completed = COALESCE\(\$2, completed\)[\s\S]*WHERE id = \$3[\s\S]*RETURNING id, description, completed, created_at/,
      ),
      ['Updated task', false, '00000000-0000-4000-8000-000000000000'],
    )
    expect(result).toEqual({
      id: '00000000-0000-4000-8000-000000000000',
      description: 'Updated task',
      completed: false,
      createdAt: createdAt.toISOString(),
    })
  })

  it('passes null for omitted fields and returns null for an unknown id', async () => {
    const query = vi.spyOn(pool, 'query')
    const queryMock = query as unknown as ReturnType<typeof vi.fn>
    queryMock.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
      command: 'UPDATE',
      oid: 0,
      fields: [],
    })

    const result = await todoRepository.update('00000000-0000-4000-8000-000000000000', {
      completed: true,
    })

    expect(query).toHaveBeenCalledWith(expect.any(String), [
      null,
      true,
      '00000000-0000-4000-8000-000000000000',
    ])
    expect(result).toBeNull()
  })
})

describe('todoRepository.remove', () => {
  it('uses one parameterized delete and reports an affected row', async () => {
    const query = vi.spyOn(pool, 'query')
    const queryMock = query as unknown as ReturnType<typeof vi.fn>
    queryMock.mockResolvedValueOnce({
      rows: [{ id: '00000000-0000-4000-8000-000000000000' }],
      rowCount: 1,
      command: 'DELETE',
      oid: 0,
      fields: [],
    })

    await expect(
      todoRepository.remove('00000000-0000-4000-8000-000000000000'),
    ).resolves.toBe(true)
    expect(query).toHaveBeenCalledOnce()
    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(/DELETE FROM todos[\s\S]*WHERE id = \$1[\s\S]*RETURNING id/),
      ['00000000-0000-4000-8000-000000000000'],
    )
  })

  it('reports no affected row for an unknown id', async () => {
    const query = vi.spyOn(pool, 'query')
    const queryMock = query as unknown as ReturnType<typeof vi.fn>
    queryMock.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
      command: 'DELETE',
      oid: 0,
      fields: [],
    })

    await expect(
      todoRepository.remove('00000000-0000-4000-8000-000000000000'),
    ).resolves.toBe(false)
  })
})
