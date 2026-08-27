import { randomUUID } from 'node:crypto'

import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createApp } from '../app'
import { pool } from '../db/pool'
import { runMigrations } from '../db/migrate'

const app = createApp()

beforeAll(async () => {
  await runMigrations(pool)
})

beforeEach(async () => {
  await pool.query('TRUNCATE todos')
})

afterEach(async () => {
  await pool.query('TRUNCATE todos')
})

afterAll(async () => {
  await pool.end()
})

describe('migration runner', () => {
  it('is idempotent: running twice records 001 exactly once and is a no-op the second time', async () => {
    await runMigrations(pool)
    await runMigrations(pool)

    const { rows } = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM _migrations WHERE filename = '001_create_todos.sql'",
    )
    expect(rows[0].count).toBe('1')
  })

  it('creates the todos table with the expected columns', async () => {
    const { rows } = await pool.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'todos' ORDER BY column_name`,
    )
    const columns = rows.map((r) => r.column_name)
    expect(columns).toEqual(['completed', 'created_at', 'description', 'id', 'idempotency_key'])
  })
})

describe('unmatched routes', () => {
  it('returns a NOT_FOUND envelope instead of Express HTML', async () => {
    const res = await request(app).get('/api/does-not-exist')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Route not found.' },
    })
  })
})

describe('GET /api/health', () => {
  it('returns 200 { status: "ok", db: "up" } when the DB is reachable', async () => {
    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok', db: 'up' })
  })

  it('returns 503 { status: "error", db: "down" } when the DB query fails', async () => {
    const spy = vi.spyOn(pool, 'query').mockRejectedValueOnce(new Error('connection refused'))

    const res = await request(app).get('/api/health')

    expect(res.status).toBe(503)
    expect(res.body).toEqual({ status: 'error', db: 'down' })
    spy.mockRestore()
  })
})

describe('GET /api/todos', () => {
  it('returns 200 [] against a fresh (empty) DB', async () => {
    const res = await request(app).get('/api/todos')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns rows newest-first in camelCase with no snake_case leak', async () => {
    await pool.query(
      `INSERT INTO todos (description, completed, created_at)
       VALUES ($1, $2, $3), ($4, $5, $6)`,
      [
        'older task',
        false,
        '2026-01-01T00:00:00.000Z',
        'newer task',
        true,
        '2026-02-01T00:00:00.000Z',
      ],
    )

    const res = await request(app).get('/api/todos')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)

    // Newest-first ordering (created_at DESC).
    expect(res.body[0].description).toBe('newer task')
    expect(res.body[1].description).toBe('older task')

    const first = res.body[0]
    expect(first).toHaveProperty('id')
    expect(first).toHaveProperty('description')
    expect(first).toHaveProperty('completed')
    expect(first).toHaveProperty('createdAt')
    expect(first.createdAt).toBe('2026-02-01T00:00:00.000Z')
    expect(first).not.toHaveProperty('created_at')
    expect(typeof first.createdAt).toBe('string')
  })
})

describe('POST /api/todos', () => {
  it('creates a todo and returns 201 with the camelCase Todo', async () => {
    const res = await request(app).post('/api/todos').send({ description: 'Buy milk' })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(typeof res.body.id).toBe('string')
    expect(res.body.description).toBe('Buy milk')
    expect(res.body.completed).toBe(false)
    expect(typeof res.body.createdAt).toBe('string')
    expect(res.body).not.toHaveProperty('created_at')
  })

  it('trims the description server-side before persisting', async () => {
    const res = await request(app).post('/api/todos').send({ description: '  Buy milk  ' })

    expect(res.status).toBe(201)
    expect(res.body.description).toBe('Buy milk')
  })

  it('persists the created todo (a follow-up GET includes it)', async () => {
    await request(app).post('/api/todos').send({ description: 'Buy milk' })

    const res = await request(app).get('/api/todos')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].description).toBe('Buy milk')
    expect(res.body[0].completed).toBe(false)
  })

  it('returns the original Todo when the same idempotency key is retried', async () => {
    const key = randomUUID()
    const first = await request(app)
      .post('/api/todos')
      .set('Idempotency-Key', key)
      .send({ description: 'Buy milk' })
    const retry = await request(app)
      .post('/api/todos')
      .set('Idempotency-Key', key)
      .send({ description: 'Buy milk' })

    expect(first.status).toBe(201)
    expect(retry.status).toBe(201)
    expect(retry.body).toEqual(first.body)
    const list = await request(app).get('/api/todos')
    expect(list.body).toEqual([first.body])
  })

  it('rejects invalid or reused idempotency keys with a different payload', async () => {
    const key = randomUUID()
    await request(app)
      .post('/api/todos')
      .set('Idempotency-Key', key)
      .send({ description: 'First intent' })

    const conflict = await request(app)
      .post('/api/todos')
      .set('Idempotency-Key', key)
      .send({ description: 'Different intent' })
    const invalid = await request(app)
      .post('/api/todos')
      .set('Idempotency-Key', 'not-a-uuid')
      .send({ description: 'Invalid key' })

    expect(conflict.status).toBe(409)
    expect(conflict.body.error.code).toBe('CONFLICT')
    expect(invalid.status).toBe(400)
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects a whitespace-only description with 400 and persists nothing', async () => {
    const res = await request(app).post('/api/todos').send({ description: '   ' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')

    const list = await request(app).get('/api/todos')
    expect(list.body).toEqual([])
  })

  it('rejects a missing description with 400 and persists nothing', async () => {
    const res = await request(app).post('/api/todos').send({})

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')

    const list = await request(app).get('/api/todos')
    expect(list.body).toEqual([])
  })

  it('rejects a request body above 16kb with PAYLOAD_TOO_LARGE and persists nothing', async () => {
    const res = await request(app)
      .post('/api/todos')
      .send({ description: 'x'.repeat(20_000) })

    expect(res.status).toBe(413)
    expect(res.body).toEqual({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request payload too large.' },
    })

    const list = await request(app).get('/api/todos')
    expect(list.body).toEqual([])
  })

  it('rejects a description longer than 500 characters with 400 and persists nothing', async () => {
    const res = await request(app)
      .post('/api/todos')
      .send({ description: 'a'.repeat(501) })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')

    const list = await request(app).get('/api/todos')
    expect(list.body).toEqual([])
  })
})

describe('PATCH /api/todos/:id', () => {
  it('returns 200 with the complete updated Todo', async () => {
    const created = await request(app).post('/api/todos').send({ description: 'Buy milk' })

    const res = await request(app).patch(`/api/todos/${created.body.id}`).send({ completed: true })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      ...created.body,
      completed: true,
    })
  })

  it('returns 400 VALIDATION_ERROR for a malformed id', async () => {
    const res = await request(app).patch('/api/todos/not-a-uuid').send({ completed: true })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 404 NOT_FOUND for a valid absent UUID', async () => {
    const res = await request(app).patch(`/api/todos/${randomUUID()}`).send({ completed: true })

    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
    expect(res.body.error.message).toBe('Todo not found')
  })

  it('persists completed false → true → false with a complete camelCase response', async () => {
    const created = await request(app).post('/api/todos').send({ description: 'Toggle me' })

    const completed = await request(app)
      .patch(`/api/todos/${created.body.id}`)
      .send({ completed: true })
    const activeAgain = await request(app)
      .patch(`/api/todos/${created.body.id}`)
      .send({ completed: false })

    expect(completed.status).toBe(200)
    expect(completed.body).toEqual({ ...created.body, completed: true })
    expect(completed.body).not.toHaveProperty('created_at')
    expect(activeAgain.status).toBe(200)
    expect(activeAgain.body).toEqual(created.body)

    const list = await request(app).get('/api/todos')
    expect(list.body).toEqual([created.body])
  })

  it('trims a description update and preserves id, createdAt, and completed', async () => {
    const created = await request(app).post('/api/todos').send({ description: 'Original' })

    const res = await request(app)
      .patch(`/api/todos/${created.body.id}`)
      .send({ description: '  Updated wording  ' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      ...created.body,
      description: 'Updated wording',
    })

    const list = await request(app).get('/api/todos')
    expect(list.body).toEqual([res.body])
  })

  it('updates both supported fields in one request', async () => {
    const created = await request(app).post('/api/todos').send({ description: 'Original' })

    const res = await request(app)
      .patch(`/api/todos/${created.body.id}`)
      .send({ description: 'Updated', completed: true })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      ...created.body,
      description: 'Updated',
      completed: true,
    })
  })

  it('does not mutate a Todo when the id is malformed', async () => {
    const created = await request(app).post('/api/todos').send({ description: 'Original' })

    const res = await request(app).patch('/api/todos/not-a-uuid').send({ completed: true })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    const list = await request(app).get('/api/todos')
    expect(list.body).toEqual([created.body])
  })

  it.each([
    ['empty object', {}],
    ['extra-only object', { ignored: 'value' }],
    ['array', []],
    ['empty description', { description: '' }],
    ['whitespace description', { description: '   ' }],
    ['overlong description', { description: 'a'.repeat(501) }],
    ['wrong description type', { description: 123 }],
    ['wrong completed type', { completed: 'true' }],
  ])('returns 400 VALIDATION_ERROR without mutation for %s', async (_case, body) => {
    const created = await request(app).post('/api/todos').send({ description: 'Original' })

    const res = await request(app).patch(`/api/todos/${created.body.id}`).send(body)

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    const list = await request(app).get('/api/todos')
    expect(list.body).toEqual([created.body])
  })

  it('retains 400 BAD_REQUEST for malformed JSON', async () => {
    const res = await request(app)
      .patch(`/api/todos/${randomUUID()}`)
      .set('Content-Type', 'application/json')
      .send('{"completed":')

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('BAD_REQUEST')
  })

  it.each(['true', '42', '"text"', 'null'])(
    'retains 400 BAD_REQUEST for top-level JSON primitive %s',
    async (body) => {
      const res = await request(app)
        .patch(`/api/todos/${randomUUID()}`)
        .set('Content-Type', 'application/json')
        .send(body)

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('BAD_REQUEST')
    },
  )
})

describe('DELETE /api/todos/:id', () => {
  it('returns an empty 204, persists removal, and leaves siblings unchanged', async () => {
    const target = await request(app).post('/api/todos').send({ description: 'Delete me' })
    const sibling = await request(app).post('/api/todos').send({ description: 'Keep me' })

    const res = await request(app).delete(`/api/todos/${target.body.id}`)

    expect(res.status).toBe(204)
    expect(res.text).toBe('')
    const list = await request(app).get('/api/todos')
    expect(list.status).toBe(200)
    expect(list.body).toEqual([sibling.body])
  })

  it('returns 400 VALIDATION_ERROR for a malformed id without changing data', async () => {
    const existing = await request(app).post('/api/todos').send({ description: 'Keep me' })

    const res = await request(app).delete('/api/todos/not-a-uuid')

    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
      },
    })
    const list = await request(app).get('/api/todos')
    expect(list.body).toEqual([existing.body])
  })

  it('returns 404 NOT_FOUND for a valid absent UUID without changing data', async () => {
    const existing = await request(app).post('/api/todos').send({ description: 'Keep me' })

    const res = await request(app).delete(`/api/todos/${randomUUID()}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toEqual({ code: 'NOT_FOUND', message: 'Todo not found' })
    const list = await request(app).get('/api/todos')
    expect(list.body).toEqual([existing.body])
  })

  it('returns a generic 500 and preserves data when the delete query fails', async () => {
    const existing = await request(app).post('/api/todos').send({ description: 'Keep me' })
    const query = vi.spyOn(pool, 'query').mockRejectedValueOnce(new Error('database unavailable'))

    const res = await request(app).delete(`/api/todos/${existing.body.id}`)
    query.mockRestore()

    expect(res.status).toBe(500)
    expect(res.body).toEqual({
      error: { code: 'INTERNAL', message: 'Something went wrong.' },
    })
    const list = await request(app).get('/api/todos')
    expect(list.body).toEqual([existing.body])
  })
})
