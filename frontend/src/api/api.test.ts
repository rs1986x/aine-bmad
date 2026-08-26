import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, deleteTodo, updateTodo } from './api'

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

    await expect(updateTodo('todo/id with space', { completed: true })).resolves.toEqual(
      updatedTodo,
    )
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

describe('deleteTodo', () => {
  it('DELETEs the encoded Todo path and does not parse a successful 204 body', async () => {
    const response = {
      ok: true,
      status: 204,
      json: vi.fn(),
    } as unknown as Response
    const fetchMock = vi.fn().mockResolvedValue(response)
    vi.stubGlobal('fetch', fetchMock)

    await expect(deleteTodo('todo/id with space')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith('/api/todos/todo%2Fid%20with%20space', {
      method: 'DELETE',
    })
    expect(response.json).not.toHaveBeenCalled()
  })

  it('maps a failed delete envelope to ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Todo not found' } }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(deleteTodo(updatedTodo.id)).rejects.toEqual(
      new ApiError('NOT_FOUND', 'Todo not found', 404),
    )
  })

  it('rejects an unexpected successful status instead of confirming removal', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })))

    await expect(deleteTodo(updatedTodo.id)).rejects.toEqual(
      new ApiError('malformed_response', 'Expected 204 No Content', 200),
    )
  })

  it('propagates a native fetch rejection without confirming removal', async () => {
    const networkError = new TypeError('Failed to fetch')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(networkError))

    await expect(deleteTodo(updatedTodo.id)).rejects.toBe(networkError)
  })
})
