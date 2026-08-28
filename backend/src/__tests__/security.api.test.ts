import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createApp } from '../app'
import { env } from '../config/env'
import { pool } from '../db/pool'

const app = createApp()
const untrustedOrigin =
  env.CORS_ORIGIN === 'https://untrusted.example'
    ? 'https://different-untrusted.example'
    : 'https://untrusted.example'

function expectSecurityHeaders(response: request.Response) {
  expect(response.headers['content-security-policy']).toBeDefined()
  expect(response.headers['x-content-type-options']).toBe('nosniff')
  expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')
  expect(response.headers['x-powered-by']).toBeUndefined()
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('HTTP security baseline', () => {
  it('sets Helmet security headers and disables X-Powered-By on a successful route', async () => {
    vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] } as never)

    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok', db: 'up' })
    expectSecurityHeaders(response)
  })

  it('keeps Helmet headers and disabled X-Powered-By on a 404 response', async () => {
    const response = await request(app).get('/api/does-not-exist')

    expect(response.status).toBe(404)
    expectSecurityHeaders(response)
  })

  it('keeps Helmet headers and disabled X-Powered-By on an unexpected 500 response', async () => {
    vi.spyOn(pool, 'query').mockRejectedValueOnce(new Error('database unavailable'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await request(app).get('/api/todos')

    expect(response.status).toBe(500)
    expect(response.body).toEqual({
      error: { code: 'INTERNAL', message: 'Something went wrong.' },
    })
    expectSecurityHeaders(response)
  })

  it('allows the configured CORS origin on a successful registered route', async () => {
    vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] } as never)

    const response = await request(app).get('/api/health').set('Origin', env.CORS_ORIGIN)

    expect(response.status).toBe(200)
    expect(response.headers['access-control-allow-origin']).toBe(env.CORS_ORIGIN)
  })

  it('never reflects an untrusted CORS origin on a successful registered route', async () => {
    vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] } as never)

    const response = await request(app).get('/api/health').set('Origin', untrustedOrigin)

    expect(response.status).toBe(200)
    expect(response.headers['access-control-allow-origin']).toBe(env.CORS_ORIGIN)
    expect(response.headers['access-control-allow-origin']).not.toBe(untrustedOrigin)
    expect(response.headers['access-control-allow-credentials']).toBeUndefined()
  })

  it('allows JSON Todo write preflight from the configured origin', async () => {
    const response = await request(app)
      .options('/api/todos')
      .set('Origin', env.CORS_ORIGIN)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,idempotency-key')

    expect(response.status).toBe(204)
    expect(response.headers['access-control-allow-origin']).toBe(env.CORS_ORIGIN)
    expect(response.headers['access-control-allow-methods']).toContain('POST')
    expect(response.headers['access-control-allow-headers']).toBe('content-type,idempotency-key')
  })

  it('never reflects an untrusted JSON Todo write preflight origin', async () => {
    const response = await request(app)
      .options('/api/todos')
      .set('Origin', untrustedOrigin)
      .set('Access-Control-Request-Method', 'PATCH')
      .set('Access-Control-Request-Headers', 'content-type')

    expect(response.status).toBe(204)
    expect(response.headers['access-control-allow-origin']).toBe(env.CORS_ORIGIN)
    expect(response.headers['access-control-allow-origin']).not.toBe(untrustedOrigin)
    expect(response.headers['access-control-allow-methods']).toContain('PATCH')
    expect(response.headers['access-control-allow-headers']).toBe('content-type')
    expect(response.headers['access-control-allow-credentials']).toBeUndefined()
  })
})
