import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, updateTodo } from './api'

const updatedTodo = {
  id: '00000000-0000-4000-8000-000000000000',
  description: 'Updated task',
  completed: true,
  createdAt: '2026-08-26T08:00:00.000Z',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('updateTodo', () => {
  it('PATCHes the encoded Todo path and returns the validated server object', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(updatedTodo), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(updateTodo('todo/id with space', { completed: true })).resolves.toEqual(updatedTodo)
    expect(fetchMock).toHaveBeenCalledWith('/api/todos/todo%2Fid%20with%20space', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    })
  })

  it('maps a non-2xx backend error envelope to ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: 'VALIDATION_ERROR', message: 'Invalid update' },
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    )

    await expect(updateTodo(updatedTodo.id, { description: '' })).rejects.toEqual(
      new ApiError('VALIDATION_ERROR', 'Invalid update', 400),
    )
  })

  it('rejects a successful JSON response with an invalid Todo shape', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ...updatedTodo, completed: 'yes' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(updateTodo(updatedTodo.id, { completed: true })).rejects.toEqual(
      new ApiError('malformed_response', 'Expected a Todo', 200),
    )
  })
})
