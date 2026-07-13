import { describe, expect, it } from 'vitest'

import { createTodoSchema } from './todo.schema'

describe('createTodoSchema', () => {
  it('accepts a valid non-empty description', () => {
    const result = createTodoSchema.safeParse({ description: 'Buy milk' })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ description: 'Buy milk' })
    }
  })

  it('trims surrounding whitespace before storing', () => {
    const result = createTodoSchema.safeParse({ description: '  Buy milk  ' })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe('Buy milk')
    }
  })

  it('rejects an empty string', () => {
    expect(createTodoSchema.safeParse({ description: '' }).success).toBe(false)
  })

  it('rejects a whitespace-only string (trims to empty)', () => {
    expect(createTodoSchema.safeParse({ description: '   ' }).success).toBe(false)
  })

  it('rejects a description longer than 500 characters', () => {
    expect(createTodoSchema.safeParse({ description: 'a'.repeat(501) }).success).toBe(false)
  })

  it('accepts a description of exactly 500 characters', () => {
    expect(createTodoSchema.safeParse({ description: 'a'.repeat(500) }).success).toBe(true)
  })

  it('rejects a missing description', () => {
    expect(createTodoSchema.safeParse({}).success).toBe(false)
  })

  it('rejects a non-string description', () => {
    expect(createTodoSchema.safeParse({ description: 123 }).success).toBe(false)
  })

  it('rejects a non-object body', () => {
    expect(createTodoSchema.safeParse('nope').success).toBe(false)
  })
})
