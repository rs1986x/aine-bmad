import type { CreateTodoInput, Todo, UpdateTodoInput } from '../types/todo'

export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

// Relative path: nginx reverse-proxies /api in prod, the Vite dev proxy handles
// it in dev. No base URL, no env var.
const API_BASE = '/api'
const REQUEST_TIMEOUT_MS = 10_000

export function isConnectionError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'connection_error'
}

export function isAbortError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'aborted'
}

async function request<T>(
  url: string,
  init: RequestInit,
  consume: (response: Response) => Promise<T>,
): Promise<T> {
  const controller = new AbortController()
  const deadline = Date.now() + REQUEST_TIMEOUT_MS
  let abortCause: 'caller' | 'timeout' | null = null
  let rejectAbort: (error: ApiError) => void = () => {}
  const abortResult = new Promise<never>((_resolve, reject) => {
    rejectAbort = reject
  })
  const abort = (cause: 'caller' | 'timeout') => {
    if (abortCause) return
    abortCause = cause
    controller.abort()
    rejectAbort(
      cause === 'timeout'
        ? new ApiError('timeout', 'Request timed out', 0)
        : new ApiError('aborted', 'Request aborted', 0),
    )
  }
  const abortFromCaller = () => abort('caller')
  init.signal?.addEventListener('abort', abortFromCaller, { once: true })
  if (init.signal?.aborted) abort('caller')

  const timeoutId = window.setTimeout(() => abort('timeout'), REQUEST_TIMEOUT_MS)

  try {
    const result = await Promise.race([
      (async () => {
        const response = await fetch(url, { ...init, signal: controller.signal })
        return consume(response)
      })(),
      abortResult,
    ])
    if (abortCause === 'caller') {
      throw new ApiError('aborted', 'Request aborted', 0)
    }
    if (abortCause === 'timeout' || Date.now() >= deadline) {
      abort('timeout')
      throw new ApiError('timeout', 'Request timed out', 0)
    }
    return result
  } catch (error) {
    if (abortCause === 'caller') {
      throw new ApiError('aborted', 'Request aborted', 0)
    }
    if (abortCause === 'timeout' || Date.now() >= deadline) {
      throw new ApiError('timeout', 'Request timed out', 0)
    }
    if (error instanceof ApiError) {
      throw error
    }
    if (error instanceof TypeError) {
      throw new ApiError('connection_error', 'Backend is unreachable', 0)
    }
    throw new ApiError('unknown', 'Request failed', 0)
  } finally {
    window.clearTimeout(timeoutId)
    init.signal?.removeEventListener('abort', abortFromCaller)
  }
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new ApiError('malformed_response', 'Expected valid JSON', response.status)
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = await parseJson(response)
    if (
      body &&
      typeof body === 'object' &&
      'error' in body &&
      body.error &&
      typeof body.error === 'object' &&
      'code' in body.error &&
      'message' in body.error
    ) {
      const envelope = body.error as { code: unknown; message: unknown }
      if (typeof envelope.code === 'string' && typeof envelope.message === 'string') {
        return new ApiError(envelope.code, envelope.message, response.status)
      }
    }
  } catch {
    // Body was not JSON / not the expected shape — fall through to generic.
  }
  return new ApiError('unknown', `Request failed with status ${response.status}`, response.status)
}

export async function getTodos(signal?: AbortSignal): Promise<Todo[]> {
  return request(`${API_BASE}/todos`, { signal }, async (response) => {
    if (!response.ok) {
      throw await toApiError(response)
    }
    if (response.status !== 200) {
      throw new ApiError('malformed_response', 'Expected 200 OK', response.status)
    }
    const body = await parseJson(response)
    if (!Array.isArray(body) || !body.every(isTodo)) {
      throw new ApiError('malformed_response', 'Expected an array of todos', response.status)
    }
    if (new Set(body.map((todo) => todo.id.toLowerCase())).size !== body.length) {
      throw new ApiError('malformed_response', 'Expected unique Todo ids', response.status)
    }
    return body
  })
}

export async function createTodo(input: CreateTodoInput, signal?: AbortSignal): Promise<Todo> {
  return request(
    `${API_BASE}/todos`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal,
    },
    async (response) => {
      if (!response.ok) {
        throw await toApiError(response)
      }
      if (response.status !== 201) {
        throw new ApiError('malformed_response', 'Expected 201 Created', response.status)
      }
      const body = await parseJson(response)
      if (!isTodo(body)) {
        throw new ApiError('malformed_response', 'Expected a Todo', response.status)
      }
      return body
    },
  )
}

export async function updateTodo(
  id: string,
  input: UpdateTodoInput,
  signal?: AbortSignal,
): Promise<Todo> {
  return request(
    `${API_BASE}/todos/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal,
    },
    async (response) => {
      if (!response.ok) {
        throw await toApiError(response)
      }
      if (response.status !== 200) {
        throw new ApiError('malformed_response', 'Expected 200 OK', response.status)
      }
      const body = await parseJson(response)
      if (!isTodo(body)) {
        throw new ApiError('malformed_response', 'Expected a Todo', response.status)
      }
      if (body.id !== id) {
        throw new ApiError('malformed_response', 'Expected the requested Todo', response.status)
      }
      return body
    },
  )
}

export async function deleteTodo(id: string, signal?: AbortSignal): Promise<void> {
  return request(
    `${API_BASE}/todos/${encodeURIComponent(id)}`,
    { method: 'DELETE', signal },
    async (response) => {
      if (!response.ok) {
        throw await toApiError(response)
      }
      if (response.status !== 204) {
        throw new ApiError('malformed_response', 'Expected 204 No Content', response.status)
      }
    },
  )
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_UTC_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z$/

function isUtcTimestamp(value: string): boolean {
  const match = ISO_UTC_PATTERN.exec(value)
  if (!match) return false
  const [, year, month, day, hour, minute, second] = match
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return false
  const date = new Date(timestamp)
  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() + 1 === Number(month) &&
    date.getUTCDate() === Number(day) &&
    date.getUTCHours() === Number(hour) &&
    date.getUTCMinutes() === Number(minute) &&
    date.getUTCSeconds() === Number(second)
  )
}

function isTodo(value: unknown): value is Todo {
  if (typeof value !== 'object' || value === null) return false
  const todo = value as Record<string, unknown>
  return (
    typeof todo.id === 'string' &&
    UUID_PATTERN.test(todo.id) &&
    typeof todo.description === 'string' &&
    todo.description.trim().length >= 1 &&
    todo.description.length <= 500 &&
    typeof todo.completed === 'boolean' &&
    typeof todo.createdAt === 'string' &&
    isUtcTimestamp(todo.createdAt)
  )
}
