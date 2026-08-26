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
      {
        id: '00000000-0000-4000-8000-000000000000',
        description: 'write tests',
        completed: false,
        createdAt: '2026-06-17T00:00:00Z',
      },
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
  ])(
    'toggles completed %s → %s using the exact server object',
    async (completed, nextCompleted) => {
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

      expect(update).toHaveBeenCalledWith(
        target.id,
        { completed: nextCompleted },
        expect.any(AbortSignal),
      )
      expect(result.current.list).toEqual([updated, sibling])
      expect(result.current.list[0]).toBe(updated)
      expect(result.current.list[1]).toBe(sibling)
      expect(result.current.list).not.toBe(previousArray)
      expect(previousArray).toEqual([target, sibling])
      expect(result.current.error).toBeNull()
    },
  )

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

    expect(update).toHaveBeenCalledWith(
      existing.id,
      { description: 'edited draft' },
      expect.any(AbortSignal),
    )
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
      await expect(
        result.current.removeTodo(target.id, target.description),
      ).resolves.toBeUndefined()
    })

    expect(remove).toHaveBeenCalledWith(target.id, expect.any(AbortSignal))
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

    await expect(
      result.current.removeTodo(existing.id, existing.description),
    ).rejects.toBeInstanceOf(ApiError)

    expect(result.current.list).toBe(previousArray)
    expect(result.current.list).toEqual([existing])
    expect(result.current.error).toBeNull()
  })

  it('never announces pending, failed, timed-out, or owner-aborted mutations', async () => {
    const todo: Todo = {
      id: '00000000-0000-4000-8000-000000000010',
      description: 'Stay silent',
      completed: false,
      createdAt: '2026-06-17T00:00:00Z',
    }
    vi.spyOn(api, 'getTodos').mockResolvedValue([todo])
    const update = vi
      .spyOn(api, 'updateTodo')
      .mockImplementationOnce((_id, _input, signal) => {
        return new Promise<Todo>((_resolve, reject) => {
          signal?.addEventListener('abort', () => {
            reject(new ApiError('aborted', 'Request aborted', 0))
          })
        })
      })
      .mockRejectedValueOnce(new ApiError('internal', 'failed', 500))
      .mockRejectedValueOnce(new ApiError('timeout', 'Request timed out', 0))
    const owner = Symbol('todo-owner')
    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const pending = result.current.toggleTodo(todo, owner)
    expect(result.current.announcement).toBe('')
    act(() => result.current.releaseOwner(owner))
    await expect(pending).rejects.toEqual(new ApiError('aborted', 'Request superseded', 0))
    expect(result.current.announcement).toBe('')

    await expect(result.current.toggleTodo(todo)).rejects.toEqual(
      new ApiError('internal', 'failed', 500),
    )
    expect(result.current.announcement).toBe('')

    await expect(result.current.toggleTodo(todo)).rejects.toEqual(
      new ApiError('timeout', 'Request timed out', 0),
    )
    expect(result.current.announcement).toBe('')
    expect(update).toHaveBeenCalledTimes(3)
  })

  it('announces each confirmed list change with exact polite copy', async () => {
    const existing: Todo = {
      id: '1',
      description: 'Existing',
      completed: false,
      createdAt: '2026-06-17T00:00:00Z',
    }
    const created: Todo = {
      id: '2',
      description: 'Created',
      completed: false,
      createdAt: '2026-06-18T00:00:00Z',
    }
    vi.spyOn(api, 'getTodos').mockResolvedValue([existing])
    vi.spyOn(api, 'createTodo').mockResolvedValue(created)
    vi.spyOn(api, 'updateTodo')
      .mockResolvedValueOnce({ ...existing, completed: true })
      .mockResolvedValueOnce(existing)
    vi.spyOn(api, 'deleteTodo').mockResolvedValue()
    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.addTodo(created.description)
    })
    expect(result.current.announcement).toBe('Todo added: Created.')
    act(() => result.current.dismissAnnouncement())

    await act(async () => {
      await result.current.toggleTodo(existing)
    })
    expect(result.current.announcement).toBe('Todo completed: Existing.')
    act(() => result.current.dismissAnnouncement())

    await act(async () => {
      await result.current.toggleTodo({ ...existing, completed: true })
    })
    expect(result.current.announcement).toBe('Todo marked active: Existing.')
    act(() => result.current.dismissAnnouncement())

    await act(async () => {
      await result.current.removeTodo(created.id, created.description)
    })
    expect(result.current.announcement).toBe('Todo deleted: Created.')
  })

  it('queues identical confirmed announcements as distinct live-region events', async () => {
    const first: Todo = {
      id: '1',
      description: 'Same description',
      completed: false,
      createdAt: '2026-06-17T00:00:00Z',
    }
    const second: Todo = { ...first, id: '2' }
    vi.spyOn(api, 'getTodos').mockResolvedValue([first, second])
    vi.spyOn(api, 'updateTodo')
      .mockResolvedValueOnce({ ...first, completed: true })
      .mockResolvedValueOnce({ ...second, completed: true })
    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.toggleTodo(first)
      await result.current.toggleTodo(second)
    })

    const firstAnnouncementId = result.current.announcementId
    expect(result.current.announcement).toBe('Todo completed: Same description.')
    act(() => result.current.dismissAnnouncement())
    expect(result.current.announcement).toBe('Todo completed: Same description.')
    expect(result.current.announcementId).not.toBe(firstAnnouncementId)
  })

  it('does not let an older GET overwrite a confirmed mutation', async () => {
    let resolveLoad: (todos: Todo[]) => void = () => {}
    vi.spyOn(api, 'getTodos').mockReturnValue(
      new Promise<Todo[]>((resolve) => {
        resolveLoad = resolve
      }),
    )
    const created: Todo = {
      id: 'new',
      description: 'Confirmed while loading',
      completed: false,
      createdAt: '2026-06-18T00:00:00Z',
    }
    vi.spyOn(api, 'createTodo').mockResolvedValue(created)
    const { result } = renderHook(() => useTodos())

    await act(async () => {
      await result.current.addTodo(created.description)
    })
    expect(result.current.list).toEqual([created])

    resolveLoad([])
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.list).toEqual([created])
  })

  it('does not let an older GET failure hide a confirmed mutation', async () => {
    let rejectLoad: (error: Error) => void = () => {}
    vi.spyOn(api, 'getTodos').mockReturnValue(
      new Promise<Todo[]>((_resolve, reject) => {
        rejectLoad = reject
      }),
    )
    const created: Todo = {
      id: 'new',
      description: 'Confirmed before load failed',
      completed: false,
      createdAt: '2026-06-18T00:00:00Z',
    }
    vi.spyOn(api, 'createTodo').mockResolvedValue(created)
    const { result } = renderHook(() => useTodos())

    await act(async () => {
      await result.current.addTodo(created.description)
    })
    rejectLoad(new ApiError('internal', 'stale load failure', 500))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.list).toEqual([created])
    expect(result.current.errorMessage).toBeNull()
  })

  it('aborts a superseded load and ignores its late completion', async () => {
    let firstSignal: AbortSignal | undefined
    let resolveFirst: (todos: Todo[]) => void = () => {}
    const newer: Todo = {
      id: 'newer',
      description: 'Newer load',
      completed: false,
      createdAt: '2026-06-18T00:00:00Z',
    }
    vi.spyOn(api, 'getTodos')
      .mockImplementationOnce((signal) => {
        firstSignal = signal
        return new Promise<Todo[]>((resolve) => {
          resolveFirst = resolve
        })
      })
      .mockResolvedValueOnce([newer])
    const { result } = renderHook(() => useTodos())

    act(() => result.current.reload())
    await waitFor(() => expect(result.current.list).toEqual([newer]))
    expect(firstSignal?.aborted).toBe(true)

    resolveFirst([])
    await act(async () => Promise.resolve())
    expect(result.current.list).toEqual([newer])
  })

  it('aborts in-flight mutations when unmounted', async () => {
    vi.spyOn(api, 'getTodos').mockResolvedValue([])
    let mutationSignal: AbortSignal | undefined
    vi.spyOn(api, 'createTodo').mockImplementation((_input, signal) => {
      mutationSignal = signal
      return new Promise<Todo>(() => {})
    })
    const { result, unmount } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    void result.current.addTodo('Pending')
    await waitFor(() => expect(mutationSignal).toBeDefined())
    unmount()

    expect(mutationSignal?.aborted).toBe(true)
  })

  it('aborts the initial load when unmounted', async () => {
    let loadSignal: AbortSignal | undefined
    vi.spyOn(api, 'getTodos').mockImplementation((signal) => {
      loadSignal = signal
      return new Promise<Todo[]>(() => {})
    })
    const { unmount } = renderHook(() => useTodos())
    await waitFor(() => expect(loadSignal).toBeDefined())

    unmount()

    expect(loadSignal?.aborted).toBe(true)
  })

  it('aborts owner-scoped work and removes its queued failure when released', async () => {
    vi.spyOn(api, 'getTodos').mockResolvedValue([])
    let mutationSignal: AbortSignal | undefined
    vi.spyOn(api, 'createTodo').mockImplementation((_input, signal) => {
      mutationSignal = signal
      return new Promise<Todo>(() => {})
    })
    const owner = Symbol('owner')
    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))
    void result.current.addTodo('Pending', owner)
    await waitFor(() => expect(mutationSignal).toBeDefined())
    act(() => {
      result.current.registerFailure(
        owner,
        new ApiError('internal', 'stale', 500),
        vi.fn().mockResolvedValue(undefined),
      )
    })
    expect(result.current.errorMessage).not.toBeNull()

    act(() => result.current.releaseOwner(owner))

    expect(mutationSignal?.aborted).toBe(true)
    expect(result.current.errorMessage).toBeNull()
  })

  it('classifies connection failures and makes Retry duplicate-safe', async () => {
    vi.spyOn(api, 'getTodos').mockResolvedValue([])
    let resolveRetry: () => void = () => {}
    const retryAction = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRetry = resolve
        }),
    )
    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.registerFailure(
        Symbol('connection'),
        new ApiError('connection_error', 'Backend is unreachable', 0),
        retryAction,
      )
    })
    expect(result.current.errorMessage).toBe("Couldn't connect. Check your connection and retry.")

    act(() => {
      result.current.retry()
      result.current.retry()
    })
    expect(retryAction).toHaveBeenCalledOnce()
    expect(result.current.retrying).toBe(true)
    expect(result.current.errorMessage).toBe("Couldn't connect. Check your connection and retry.")

    resolveRetry()
    await waitFor(() => expect(result.current.retrying).toBe(false))
    expect(result.current.errorMessage).toBeNull()
  })

  it('queues concurrent failures so each transaction retains a Retry path', async () => {
    vi.spyOn(api, 'getTodos').mockResolvedValue([])
    const firstRetry = vi.fn().mockResolvedValue(undefined)
    const secondRetry = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.registerFailure(
        Symbol('first'),
        new ApiError('internal', 'first', 500),
        firstRetry,
      )
      result.current.registerFailure(
        Symbol('second'),
        new ApiError('connection_error', 'second', 0),
        secondRetry,
      )
    })
    expect(result.current.errorMessage).toBe("Couldn't save that change. Retry.")

    act(() => result.current.retry())
    await waitFor(() =>
      expect(result.current.errorMessage).toBe(
        "Couldn't connect. Check your connection and retry.",
      ),
    )
    expect(firstRetry).toHaveBeenCalledOnce()

    act(() => result.current.retry())
    await waitFor(() => expect(result.current.errorMessage).toBeNull())
    expect(secondRetry).toHaveBeenCalledOnce()
  })

  it('clears only the requested owner failure from the queue', async () => {
    vi.spyOn(api, 'getTodos').mockResolvedValue([])
    const firstOwner = Symbol('first')
    const secondOwner = Symbol('second')
    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.registerFailure(
        firstOwner,
        new ApiError('internal', 'first', 500),
        vi.fn().mockResolvedValue(undefined),
      )
      result.current.registerFailure(
        secondOwner,
        new ApiError('connection_error', 'second', 0),
        vi.fn().mockResolvedValue(undefined),
      )
      result.current.clearFailure(firstOwner)
    })

    expect(result.current.errorMessage).toBe("Couldn't connect. Check your connection and retry.")
  })

  it('keeps a replay failure retryable when no replacement is registered', async () => {
    vi.spyOn(api, 'getTodos').mockResolvedValue([])
    const owner = Symbol('retry')
    const retryAction = vi.fn().mockRejectedValue(new Error('failed again'))
    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.registerFailure(
        owner,
        new ApiError('internal', 'first failure', 500),
        retryAction,
      )
    })
    act(() => result.current.retry())

    await waitFor(() => expect(result.current.retrying).toBe(false))
    expect(retryAction).toHaveBeenCalledOnce()
    expect(result.current.errorMessage).toBe("Couldn't save that change. Retry.")
    act(() => result.current.retry())
    await waitFor(() => expect(retryAction).toHaveBeenCalledTimes(2))
  })

  it('replaces only the attempted owner when its component re-registers', async () => {
    vi.spyOn(api, 'getTodos').mockResolvedValue([])
    const attemptedOwner = Symbol('attempted')
    const queuedOwner = Symbol('queued')
    const replacementRetry = vi.fn().mockResolvedValue(undefined)
    const queuedRetry = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const attemptedRetry = vi.fn(async () => {
      result.current.registerFailure(
        attemptedOwner,
        new ApiError('connection_error', 'replacement', 0),
        replacementRetry,
      )
      throw new Error('failed again')
    })

    act(() => {
      result.current.registerFailure(
        attemptedOwner,
        new ApiError('internal', 'attempted', 500),
        attemptedRetry,
      )
      result.current.registerFailure(
        queuedOwner,
        new ApiError('internal', 'queued', 500),
        queuedRetry,
      )
    })
    act(() => result.current.retry())

    await waitFor(() => expect(result.current.retrying).toBe(false))
    expect(result.current.errorMessage).toBe("Couldn't connect. Check your connection and retry.")
    act(() => result.current.retry())
    await waitFor(() => {
      expect(replacementRetry).toHaveBeenCalledOnce()
      expect(result.current.errorMessage).toBe("Couldn't save that change. Retry.")
    })
    act(() => result.current.retry())
    await waitFor(() => {
      expect(queuedRetry).toHaveBeenCalledOnce()
      expect(result.current.errorMessage).toBeNull()
    })
  })

  it('rejects a create id collision without overwriting or announcing', async () => {
    const existing: Todo = {
      id: 'collision',
      description: 'Existing',
      completed: false,
      createdAt: '2026-06-17T00:00:00Z',
    }
    vi.spyOn(api, 'getTodos').mockResolvedValue([existing])
    vi.spyOn(api, 'createTodo').mockResolvedValue({
      ...existing,
      id: 'COLLISION',
      description: 'Conflicting response',
    })
    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.addTodo('New')).rejects.toEqual(
      new ApiError('malformed_response', 'Created Todo id already exists', 0),
    )
    expect(result.current.list).toEqual([existing])
    expect(result.current.announcement).toBe('')
  })

  it('reconciles overlapping GET data with confirmed create, update, and delete results', async () => {
    const updateTarget: Todo = {
      id: 'update',
      description: 'Before',
      completed: false,
      createdAt: '2026-06-17T00:00:00Z',
    }
    const deleteTarget: Todo = {
      id: 'delete',
      description: 'Delete',
      completed: false,
      createdAt: '2026-06-16T00:00:00Z',
    }
    const unaffected: Todo = {
      id: 'unaffected',
      description: 'Fetched unaffected',
      completed: false,
      createdAt: '2026-06-18T00:00:00Z',
    }
    const created: Todo = {
      id: 'created',
      description: 'Created',
      completed: false,
      createdAt: '2026-06-19T00:00:00Z',
    }
    const updated = { ...updateTarget, description: 'Confirmed update' }
    let resolveReload: (todos: Todo[]) => void = () => {}
    vi.spyOn(api, 'getTodos')
      .mockResolvedValueOnce([updateTarget, deleteTarget])
      .mockReturnValueOnce(
        new Promise<Todo[]>((resolve) => {
          resolveReload = resolve
        }),
      )
    vi.spyOn(api, 'createTodo').mockResolvedValue(created)
    vi.spyOn(api, 'updateTodo').mockResolvedValue(updated)
    vi.spyOn(api, 'deleteTodo').mockResolvedValue()
    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.reload())
    await act(async () => {
      await result.current.addTodo(created.description)
      await result.current.editTodo(updateTarget.id, updated.description)
      await result.current.removeTodo(deleteTarget.id, deleteTarget.description)
    })
    resolveReload([deleteTarget, unaffected])
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.list).toEqual([updated, created, unaffected])
  })

  it('treats a 404 delete response as confirmed absence', async () => {
    const todo: Todo = {
      id: '00000000-0000-4000-8000-000000000011',
      description: 'Already deleted remotely',
      completed: false,
      createdAt: '2026-06-17T00:00:00Z',
    }
    vi.spyOn(api, 'getTodos').mockResolvedValue([todo])
    vi.spyOn(api, 'deleteTodo').mockRejectedValue(
      new ApiError('NOT_FOUND', 'Todo not found', 404),
    )
    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.removeTodo(todo.id, todo.description)
    })

    expect(result.current.list).toEqual([])
    expect(result.current.announcement).toBe(`Todo deleted: ${todo.description}.`)
  })

  it('commits and announces an update confirmed after an older list removed its item', async () => {
    const missing: Todo = {
      id: 'missing',
      description: 'Missing',
      completed: true,
      createdAt: '2026-06-17T00:00:00Z',
    }
    vi.spyOn(api, 'getTodos').mockResolvedValue([])
    vi.spyOn(api, 'updateTodo').mockResolvedValue(missing)
    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.toggleTodo({ ...missing, completed: false })
    })

    expect(result.current.list).toEqual([missing])
    expect(result.current.announcement).toBe('Todo completed: Missing.')
  })
})
