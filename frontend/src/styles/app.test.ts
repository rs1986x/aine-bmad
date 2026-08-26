import { describe, expect, it } from 'vitest'

import css from './app.css?raw'

describe('Story 2.3 update styles', () => {
  it('provides a real 44px checkbox target and busy affordance', () => {
    expect(css).toMatch(
      /\.todo-item__checkbox-target\s*\{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;/s,
    )
    expect(css).toMatch(
      /\.todo-item__checkbox-target--disabled\s*\{[^}]*cursor:\s*not-allowed;/s,
    )
    expect(css).toMatch(/\.todo-item__checkbox-target--busy\s*\{[^}]*cursor:\s*wait;/s)
    expect(css).toMatch(/\.todo-item__checkbox:disabled\s*\{[^}]*cursor:\s*not-allowed;/s)
    expect(css).toMatch(/\.todo-item__checkbox\[aria-busy='true'\]\s*\{[^}]*cursor:\s*wait;/s)
  })

  it('uses existing tokens for inline editing and error treatment', () => {
    expect(css).toMatch(
      /\.todo-item--editing\s*\{[^}]*background:\s*var\(--color-accent-subtle\);/s,
    )
    expect(css).toContain('background: var(--input-text-bg);')
    expect(css).toContain('background: var(--button-primary-bg);')
    expect(css).toContain('background: var(--button-secondary-bg);')
    expect(css).toContain('color: var(--color-danger-text);')
  })

  it('defines visible focus treatment for all update controls', () => {
    expect(css).toMatch(/\.todo-item__checkbox:focus-visible/)
    expect(css).toMatch(/\.todo-item__action:focus-visible/)
    expect(css).toMatch(/\.todo-item__save:focus-visible/)
    expect(css).toMatch(/\.todo-item__cancel:focus-visible/)
  })

  it('allows the editor and actions to wrap on narrow layouts', () => {
    expect(css).toMatch(/\.todo-item__edit\s*\{[^}]*min-width:\s*0;[^}]*flex-wrap:\s*wrap;/s)
    expect(css).toMatch(/\.todo-item__error\s*\{[^}]*flex:\s*1 1 100%;[^}]*min-width:\s*0;/s)
    expect(css).toMatch(/@media \(max-width:\s*640px\)[\s\S]*\.todo-item\s*\{[^}]*flex-wrap:\s*wrap;/)
  })
})
