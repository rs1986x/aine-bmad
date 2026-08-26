import { describe, expect, it } from 'vitest'

import { createTodoSchema, todoIdSchema, updateTodoSchema } from './todo.schema'

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

describe('updateTodoSchema', () => {
  it('accepts and trims a description-only update', () => {
    const result = updateTodoSchema.safeParse({ description: '  Buy oat milk  ' })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ description: 'Buy oat milk' })
    }
  })

  it.each([true, false])('accepts completed-only update %s', (completed) => {
    expect(updateTodoSchema.safeParse({ completed })).toEqual({
      success: true,
      data: { completed },
    })
  })

  it('accepts both recognized update fields', () => {
    expect(
      updateTodoSchema.safeParse({
        description: 'Buy oat milk',
        completed: true,
      }),
    ).toEqual({
      success: true,
      data: {
        description: 'Buy oat milk',
        completed: true,
      },
    })
  })

  it('strips unknown fields when a recognized field is present', () => {
    expect(
      updateTodoSchema.safeParse({
        description: 'Buy oat milk',
        ignored: 'value',
      }),
    ).toEqual({
      success: true,
      data: { description: 'Buy oat milk' },
    })
  })

  it.each([
    ['empty object', {}],
    ['extra-fields-only object', { ignored: 'value' }],
    ['array', []],
    ['string primitive', 'nope'],
    ['number primitive', 42],
    ['null', null],
    ['empty description', { description: '' }],
    ['whitespace-only description', { description: '   ' }],
    ['overlong description', { description: 'a'.repeat(501) }],
    ['non-string description', { description: 123 }],
    ['non-boolean completed', { completed: 'true' }],
  ])('rejects %s', (_case, input) => {
    expect(updateTodoSchema.safeParse(input).success).toBe(false)
  })
})

describe('todoIdSchema', () => {
  it('accepts a UUID', () => {
    expect(todoIdSchema.safeParse('00000000-0000-4000-8000-000000000000').success).toBe(true)
  })

  it('rejects a malformed UUID', () => {
    expect(todoIdSchema.safeParse('not-a-uuid').success).toBe(false)
  })
})
