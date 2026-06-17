import { describe, expect, it } from 'vitest'

import { EnvValidationError, parseEnv } from './env'

const validSource = {
  NODE_ENV: 'test',
  PORT: '8080',
  DATABASE_URL: 'postgres://todo:todo@localhost:5432/todo',
  CORS_ORIGIN: 'http://localhost:5173',
}

describe('parseEnv', () => {
  it('parses a valid environment record into a typed, coerced object', () => {
    const env = parseEnv(validSource)

    expect(env.NODE_ENV).toBe('test')
    expect(env.PORT).toBe(8080)
    expect(typeof env.PORT).toBe('number')
    expect(env.DATABASE_URL).toBe('postgres://todo:todo@localhost:5432/todo')
    expect(env.CORS_ORIGIN).toBe('http://localhost:5173')
  })

  it('throws EnvValidationError naming DATABASE_URL when it is missing', () => {
    const { DATABASE_URL: _omit, ...source } = validSource

    expect(() => parseEnv(source)).toThrow(EnvValidationError)
    try {
      parseEnv(source)
    } catch (err) {
      expect(err).toBeInstanceOf(EnvValidationError)
      expect((err as Error).message).toContain('DATABASE_URL')
    }
  })

  it('throws EnvValidationError when DATABASE_URL is blank', () => {
    expect(() => parseEnv({ ...validSource, DATABASE_URL: '' })).toThrow(/DATABASE_URL/)
  })

  it('throws EnvValidationError when PORT is not a positive integer', () => {
    expect(() => parseEnv({ ...validSource, PORT: 'not-a-number' })).toThrow(/PORT/)
  })

  it('throws EnvValidationError when NODE_ENV is not an allowed value', () => {
    expect(() => parseEnv({ ...validSource, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/)
  })
})
