import type { Todo } from '../types/todo'

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

// createTodo / updateTodo / deleteTodo land in Epic 2 (Stories 2.2–2.4).
