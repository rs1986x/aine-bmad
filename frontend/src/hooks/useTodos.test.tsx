import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTodos } from './useTodos'
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
})
