import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, createTodo, deleteTodo, getTodos, updateTodo } from './api'

const updatedTodo = {
  id: '00000000-0000-4000-8000-000000000000',
  description: 'Updated task',
  completed: true,
  createdAt: '2026-08-26T08:00:00.000Z',
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

async function expectCallerCancellation(
  invoke: (signal: AbortSignal) => Promise<unknown>,
): Promise<void> {
  const caller = new AbortController()
  let fetchSignal: AbortSignal | undefined
  vi.stubGlobal(
    'fetch',
    vi.fn((_url: string, init?: RequestInit) => {
      fetchSignal = init?.signal ?? undefined
      return new Promise<Response>(() => {})
    }),
  )

  const pending = invoke(caller.signal)
  const rejection = expect(pending).rejects.toEqual(new ApiError('aborted', 'Request aborted', 0))
  caller.abort()

  await rejection
  expect(fetchSignal?.aborted).toBe(true)
}

describe('updateTodo', () => {
  it('PATCHes the Todo path and returns the validated server object', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(updatedTodo), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(updateTodo(updatedTodo.id, { completed: true })).resolves.toEqual(updatedTodo)
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/todos/${updatedTodo.id}`,
      expect.objectContaining({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
        signal: expect.any(AbortSignal),
      }),
    )
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

  it('uses a generic typed error when the backend envelope fields are not strings', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: 42, message: { raw: true } } }), {
          status: 400,
        }),
      ),
    )

    await expect(updateTodo(updatedTodo.id, { completed: true })).rejects.toEqual(
      new ApiError('unknown', 'Request failed with status 400', 400),
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

  it('classifies an unreachable backend without exposing the native fetch error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(updateTodo(updatedTodo.id, { completed: true })).rejects.toEqual(
      new ApiError('connection_error', 'Backend is unreachable', 0),
    )
  })

  it('aborts and classifies a request that hangs for 10 seconds', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const pending = updateTodo(updatedTodo.id, { completed: true })
    const rejection = expect(pending).rejects.toEqual(
      new ApiError('timeout', 'Request timed out', 0),
    )
    await vi.advanceTimersByTimeAsync(10_000)

    await rejection
    expect((fetchMock.mock.calls[0][1]?.signal as AbortSignal).aborted).toBe(true)
  })

  it('keeps the deadline active while a successful response body is being read', async () => {
    vi.useFakeTimers()
    let fetchSignal: AbortSignal | undefined
    const response = {
      ok: true,
      status: 200,
      json: () =>
        new Promise<unknown>((_resolve, reject) => {
          fetchSignal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        }),
    } as Response
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        fetchSignal = init?.signal ?? undefined
        return Promise.resolve(response)
      }),
    )

    const pending = updateTodo(updatedTodo.id, { completed: true })
    const rejection = expect(pending).rejects.toEqual(
      new ApiError('timeout', 'Request timed out', 0),
    )
    await vi.advanceTimersByTimeAsync(10_000)

    await rejection
    expect(fetchSignal?.aborted).toBe(true)
  })

  it('rejects a late result when a noncompliant transport ignores abort', async () => {
    vi.useFakeTimers()
    const startedAt = new Date('2026-08-26T08:00:00.000Z')
    vi.setSystemTime(startedAt)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          vi.setSystemTime(new Date(startedAt.getTime() + 10_001))
          return updatedTodo
        },
      } as Response),
    )

    await expect(updateTodo(updatedTodo.id, { completed: true })).rejects.toEqual(
      new ApiError('timeout', 'Request timed out', 0),
    )
  })

  it('bridges caller cancellation to fetch and returns a typed abort', async () => {
    const caller = new AbortController()
    let fetchSignal: AbortSignal | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        fetchSignal = init?.signal ?? undefined
        return new Promise<Response>((_resolve, reject) => {
          fetchSignal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        })
      }),
    )

    const pending = updateTodo(updatedTodo.id, { completed: true }, caller.signal)
    const rejection = expect(pending).rejects.toEqual(new ApiError('aborted', 'Request aborted', 0))
    caller.abort()

    await rejection
    expect(fetchSignal?.aborted).toBe(true)
  })

  it('keeps caller cancellation authoritative when it happens before the deadline', async () => {
    vi.useFakeTimers()
    const caller = new AbortController()
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise<Response>(() => {})))
    const pending = updateTodo(updatedTodo.id, { completed: true }, caller.signal)
    const rejection = expect(pending).rejects.toEqual(new ApiError('aborted', 'Request aborted', 0))

    await vi.advanceTimersByTimeAsync(9_999)
    caller.abort()
    await vi.advanceTimersByTimeAsync(1)

    await rejection
  })

  it('rejects a valid Todo returned for a different requested id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ...updatedTodo,
            id: '00000000-0000-4000-8000-000000000001',
          }),
          { status: 200 },
        ),
      ),
    )

    await expect(updateTodo(updatedTodo.id, { completed: true })).rejects.toEqual(
      new ApiError('malformed_response', 'Expected the requested Todo', 200),
    )
  })
})

describe('createTodo', () => {
  it('accepts only a validated 201 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(updatedTodo), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(createTodo({ description: updatedTodo.description })).resolves.toEqual(updatedTodo)
  })

  it('rejects malformed success JSON and Todo shapes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('not-json', { status: 201 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...updatedTodo, description: '   ' }), { status: 201 }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(createTodo({ description: 'Task' })).rejects.toEqual(
      new ApiError('malformed_response', 'Expected valid JSON', 201),
    )
    await expect(createTodo({ description: 'Task' })).rejects.toEqual(
      new ApiError('malformed_response', 'Expected a Todo', 201),
    )
  })
})

describe('getTodos', () => {
  it('validates every Todo in a successful list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([updatedTodo, { ...updatedTodo, id: 42 }]), {
          status: 200,
        }),
      ),
    )

    await expect(getTodos()).rejects.toEqual(
      new ApiError('malformed_response', 'Expected an array of todos', 200),
    )
  })

  it('rejects invalid JSON from a successful response as a typed failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not-json', { status: 200 })))

    await expect(getTodos()).rejects.toEqual(
      new ApiError('malformed_response', 'Expected valid JSON', 200),
    )
  })

  it('rejects duplicate ids and invalid Todo contract strings', async () => {
    const mixedCaseId = 'abcdefab-cdef-4abc-8def-abcdefabcdef'
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { ...updatedTodo, id: mixedCaseId },
            { ...updatedTodo, id: mixedCaseId.toUpperCase() },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ ...updatedTodo, description: '   ' }]), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ ...updatedTodo, createdAt: '2026-02-30T08:00:00Z' }]), {
          status: 200,
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getTodos()).rejects.toEqual(
      new ApiError('malformed_response', 'Expected unique Todo ids', 200),
    )
    await expect(getTodos()).rejects.toEqual(
      new ApiError('malformed_response', 'Expected an array of todos', 200),
    )
    await expect(getTodos()).rejects.toEqual(
      new ApiError('malformed_response', 'Expected an array of todos', 200),
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
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/todos/todo%2Fid%20with%20space',
      expect.objectContaining({
        method: 'DELETE',
        signal: expect.any(AbortSignal),
      }),
    )
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

  it('classifies a native fetch rejection without confirming removal', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(deleteTodo(updatedTodo.id)).rejects.toEqual(
      new ApiError('connection_error', 'Backend is unreachable', 0),
    )
  })
})

describe('exact success statuses', () => {
  it.each([
    ['GET', () => getTodos(), 201, []],
    ['POST', () => createTodo({ description: 'Task' }), 200, updatedTodo],
    ['PATCH', () => updateTodo(updatedTodo.id, { completed: true }), 201, updatedTodo],
  ])('rejects an unexpected successful %s status', async (_method, invoke, status, body) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })),
    )

    await expect(invoke()).rejects.toMatchObject({
      name: 'ApiError',
      code: 'malformed_response',
      status,
    })
  })
})

describe('caller cancellation wrappers', () => {
  it.each([
    ['getTodos', (signal: AbortSignal) => getTodos(signal)],
    ['createTodo', (signal: AbortSignal) => createTodo({ description: 'Task' }, signal)],
    ['deleteTodo', (signal: AbortSignal) => deleteTodo(updatedTodo.id, signal)],
  ])('propagates caller cancellation through %s', async (_name, invoke) => {
    await expectCallerCancellation(invoke)
  })
})
