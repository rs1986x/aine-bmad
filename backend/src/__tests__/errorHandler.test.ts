import express from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { ValidationError } from '../errors/AppError'
import { errorHandler } from '../middleware/errorHandler'

describe('error envelope middleware', () => {
  it('formats a typed AppError as { error: { code, message } } with the right status and no stack', async () => {
    const app = express()
    app.get('/boom', () => {
      throw new ValidationError('description is required')
    })
    app.use(errorHandler)

    const res = await request(app).get('/boom')

    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'description is required' },
    })
    expect(res.body.error).not.toHaveProperty('stack')
    expect(res.body).not.toHaveProperty('stack')
  })

  it('delegates to next when headers have already been sent', () => {
    const err = new Error('too late for an envelope')
    const next = vi.fn()
    const res = {
      headersSent: true,
      status: vi.fn(),
      json: vi.fn(),
    }

    errorHandler(err, {} as express.Request, res as unknown as express.Response, next)

    expect(next).toHaveBeenCalledWith(err)
    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
  })

  it('maps a 413 client error to PAYLOAD_TOO_LARGE without leaking internals', async () => {
    const app = express()
    app.post('/too-large', () => {
      const err = Object.assign(new Error('secret limit details'), { status: 413 })
      throw err
    })
    app.use(errorHandler)

    const res = await request(app).post('/too-large')

    expect(res.status).toBe(413)
    expect(res.body).toEqual({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request payload too large.' },
    })
    expect(JSON.stringify(res.body)).not.toContain('secret limit details')
  })

  it('maps an unexpected (untyped) error to a generic 500 INTERNAL with no leaked detail', async () => {
    const app = express()
    app.get('/kaboom', () => {
      throw new Error('secret internal detail: db password leaked')
    })
    app.use(errorHandler)

    const res = await request(app).get('/kaboom')

    expect(res.status).toBe(500)
    expect(res.body).toEqual({
      error: { code: 'INTERNAL', message: 'Something went wrong.' },
    })
    expect(JSON.stringify(res.body)).not.toContain('secret internal detail')
    expect(res.body.error).not.toHaveProperty('stack')
  })
})
