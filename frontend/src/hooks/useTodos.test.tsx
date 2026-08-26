import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTodos } from './useTodos'
import * as api from '../api/api'
import { ApiError } from '../api/api'
import type { Todo } from '../types/todo'

function mockFetchOnce(body: unknown, init: { ok: boolean; status: number }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: init.ok,
    status: init.status,
    json: async () => body,
  } as Response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useTodos', () => {
  it('starts in the loading state', () => {
    mockFetchOnce([], { ok: true, status: 200 })
    const { result } = renderHook(() => useTodos())

    expect(result.current.loading).toBe(true)
    expect(result.current.list).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('resolves an empty list to loading=false, list=[], error=null', async () => {
    mockFetchOnce([], { ok: true, status: 200 })
    const { result } = renderHook(() => useTodos())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.list).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('exposes the returned Todo[] on success', async () => {
    const todos: Todo[] = [
      { id: '1', description: 'write tests', completed: false, createdAt: '2026-06-17T00:00:00Z' },
    ]
    mockFetchOnce(todos, { ok: true, status: 200 })
    const { result } = renderHook(() => useTodos())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.list).toEqual(todos)
    expect(result.current.error).toBeNull()
  })

  it('sets an ApiError and loading=false on a non-2xx response', async () => {
    mockFetchOnce({ error: { code: 'internal', message: 'boom' } }, { ok: false, status: 500 })
    const { result } = renderHook(() => useTodos())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeInstanceOf(ApiError)
    expect((result.current.error as ApiError).status).toBe(500)
    expect(result.current.list).toEqual([])
  })

  it('prepends a created todo immutably and leaves error null', async () => {
    vi.spyOn(api, 'getTodos').mockResolvedValue([])
    const created: Todo = {
      id: 'new-1',
      description: 'Buy milk',
      completed: false,
      createdAt: '2026-07-13T10:00:00.000Z',
    }
    vi.spyOn(api, 'createTodo').mockResolvedValue(created)

    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const before = result.current.list

    await act(async () => {
      const returned = await result.current.addTodo('Buy milk')
      expect(returned).toEqual(created)
    })

    expect(result.current.list[0]).toEqual(created)
    expect(result.current.list).toHaveLength(1)
    expect(result.current.error).toBeNull()
    // Previous array identity was not mutated.
    expect(before).toEqual([])
    expect(result.current.list).not.toBe(before)
  })

  it('re-throws on a failed create and leaves error null + list unchanged', async () => {
    const existing: Todo = {
      id: '1',
      description: 'existing',
      completed: false,
      createdAt: '2026-06-17T00:00:00Z',
    }
    vi.spyOn(api, 'getTodos').mockResolvedValue([existing])
    vi.spyOn(api, 'createTodo').mockRejectedValue(new ApiError('internal', 'boom', 500))

    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.addTodo('nope')).rejects.toBeInstanceOf(ApiError)

    expect(result.current.error).toBeNull()
    expect(result.current.list).toEqual([existing])
  })

  it.each([
    [false, true],
    [true, false],
  ])('toggles completed %s → %s using the exact server object', async (completed, nextCompleted) => {
    const target: Todo = {
      id: '1',
      description: 'target',
      completed,
      createdAt: '2026-06-17T00:00:00Z',
    }
    const sibling: Todo = {
      id: '2',
      description: 'sibling',
      completed: false,
      createdAt: '2026-06-18T00:00:00Z',
    }
    const updated: Todo = {
      ...target,
      description: 'server-confirmed wording',
      completed: nextCompleted,
    }
    vi.spyOn(api, 'getTodos').mockResolvedValue([target, sibling])
    const update = vi.spyOn(api, 'updateTodo').mockResolvedValue(updated)

    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const previousArray = result.current.list

    await act(async () => {
      await expect(result.current.toggleTodo(target)).resolves.toBe(updated)
    })

    expect(update).toHaveBeenCalledWith(target.id, { completed: nextCompleted })
    expect(result.current.list).toEqual([updated, sibling])
    expect(result.current.list[0]).toBe(updated)
    expect(result.current.list[1]).toBe(sibling)
    expect(result.current.list).not.toBe(previousArray)
    expect(previousArray).toEqual([target, sibling])
    expect(result.current.error).toBeNull()
  })

  it('edits through the shared confirmed-response replacement path', async () => {
    const existing: Todo = {
      id: '1',
      description: 'before',
      completed: true,
      createdAt: '2026-06-17T00:00:00Z',
    }
    const updated: Todo = { ...existing, description: 'server-confirmed edit' }
    vi.spyOn(api, 'getTodos').mockResolvedValue([existing])
    const update = vi.spyOn(api, 'updateTodo').mockResolvedValue(updated)

    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await expect(result.current.editTodo(existing.id, 'edited draft')).resolves.toBe(updated)
    })

    expect(update).toHaveBeenCalledWith(existing.id, { description: 'edited draft' })
    expect(result.current.list).toEqual([updated])
    expect(result.current.list[0]).toBe(updated)
  })

  it.each(['toggleTodo', 'editTodo'] as const)(
    'rethrows a failed %s without changing list identity or top-level error',
    async (action) => {
      const existing: Todo = {
        id: '1',
        description: 'unchanged',
        completed: false,
        createdAt: '2026-06-17T00:00:00Z',
      }
      vi.spyOn(api, 'getTodos').mockResolvedValue([existing])
      vi.spyOn(api, 'updateTodo').mockRejectedValue(new ApiError('internal', 'boom', 500))

      const { result } = renderHook(() => useTodos())
      await waitFor(() => expect(result.current.loading).toBe(false))
      const previousArray = result.current.list

      await expect(
        action === 'toggleTodo'
          ? result.current.toggleTodo(existing)
          : result.current.editTodo(existing.id, 'draft'),
      ).rejects.toBeInstanceOf(ApiError)

      expect(result.current.list).toBe(previousArray)
      expect(result.current.list).toEqual([existing])
      expect(result.current.error).toBeNull()
    },
  )

  it('removes only the server-confirmed Todo with an immutable filter', async () => {
    const target: Todo = {
      id: '1',
      description: 'target',
      completed: false,
      createdAt: '2026-06-17T00:00:00Z',
    }
    const sibling: Todo = {
      id: '2',
      description: 'sibling',
      completed: true,
      createdAt: '2026-06-18T00:00:00Z',
    }
    vi.spyOn(api, 'getTodos').mockResolvedValue([target, sibling])
    const remove = vi.spyOn(api, 'deleteTodo').mockResolvedValue()

    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const previousArray = result.current.list

    await act(async () => {
      await expect(result.current.removeTodo(target.id)).resolves.toBeUndefined()
    })

    expect(remove).toHaveBeenCalledWith(target.id)
    expect(result.current.list).toEqual([sibling])
    expect(result.current.list[0]).toBe(sibling)
    expect(result.current.list).not.toBe(previousArray)
    expect(previousArray).toEqual([target, sibling])
    expect(result.current.error).toBeNull()
  })

  it('rethrows a failed deletion without changing list identity or load error', async () => {
    const existing: Todo = {
      id: '1',
      description: 'unchanged',
      completed: false,
      createdAt: '2026-06-17T00:00:00Z',
    }
    vi.spyOn(api, 'getTodos').mockResolvedValue([existing])
    vi.spyOn(api, 'deleteTodo').mockRejectedValue(new ApiError('internal', 'boom', 500))

    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const previousArray = result.current.list

    await expect(result.current.removeTodo(existing.id)).rejects.toBeInstanceOf(ApiError)

    expect(result.current.list).toBe(previousArray)
    expect(result.current.list).toEqual([existing])
    expect(result.current.error).toBeNull()
  })
})
