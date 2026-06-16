import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

// Smoke test proving the Vitest + jsdom + React Testing Library wiring works.
// Replaced by real component tests in later stories.
describe('frontend test harness', () => {
  it('renders a DOM node via React Testing Library', () => {
    render(<div>harness ok</div>)
    expect(screen.getByText('harness ok')).toBeInTheDocument()
  })

  it('runs basic assertions', () => {
    expect(1 + 1).toBe(2)
  })
})
