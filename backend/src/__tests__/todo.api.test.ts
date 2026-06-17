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
    expect(columns).toEqual(['completed', 'created_at', 'description', 'id'])
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
