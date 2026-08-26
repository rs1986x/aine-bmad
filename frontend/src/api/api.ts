import type { CreateTodoInput, Todo, UpdateTodoInput } from '../types/todo'

// Typed error raised from the backend's `{ error: { code, message } }` envelope.
// User-facing copy comes from EXPERIENCE.md — never the raw `message` here.
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

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body: unknown = await response.json()
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
      return new ApiError(String(envelope.code), String(envelope.message), response.status)
    }
  } catch {
    // Body was not JSON / not the expected shape — fall through to generic.
  }
  return new ApiError('unknown', `Request failed with status ${response.status}`, response.status)
}

export async function getTodos(): Promise<Todo[]> {
  const response = await fetch(`${API_BASE}/todos`)
  if (!response.ok) {
    throw await toApiError(response)
  }
  const body: unknown = await response.json()
  if (!Array.isArray(body)) {
    throw new ApiError('malformed_response', 'Expected an array of todos', response.status)
  }
  return body as Todo[]
}

export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const response = await fetch(`${API_BASE}/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw await toApiError(response)
  }
  const body: unknown = await response.json()
  if (!isTodo(body)) {
    throw new ApiError('malformed_response', 'Expected a Todo', response.status)
  }
  return body
}

export async function updateTodo(id: string, input: UpdateTodoInput): Promise<Todo> {
  const response = await fetch(`${API_BASE}/todos/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw await toApiError(response)
  }
  const body: unknown = await response.json()
  if (!isTodo(body)) {
    throw new ApiError('malformed_response', 'Expected a Todo', response.status)
  }
  return body
}

export async function deleteTodo(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/todos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw await toApiError(response)
  }
  if (response.status !== 204) {
    throw new ApiError('malformed_response', 'Expected 204 No Content', response.status)
  }
}

// Light runtime shape check so a malformed 2xx body surfaces as a typed
// ApiError instead of crashing downstream render (mirrors getTodos's guard).
function isTodo(value: unknown): value is Todo {
  if (typeof value !== 'object' || value === null) return false
  const todo = value as Record<string, unknown>
  return (
    typeof todo.id === 'string' &&
    typeof todo.description === 'string' &&
    typeof todo.completed === 'boolean' &&
    typeof todo.createdAt === 'string'
  )
}
