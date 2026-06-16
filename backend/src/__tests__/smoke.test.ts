import { describe, expect, it } from 'vitest'

// Smoke test proving Vitest runs in the Node environment.
// Supertest is installed for future in-process HTTP tests (Story 1.2+).
describe('backend test harness', () => {
  it('runs basic assertions in the node env', () => {
    expect(true).toBe(true)
  })
})
