import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'

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
