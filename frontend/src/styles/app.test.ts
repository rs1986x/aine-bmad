import { describe, expect, it } from 'vitest'

import css from './app.css?raw'

describe('Story 2.3 update styles', () => {
  it('provides a real 44px checkbox target and busy affordance', () => {
    expect(css).toMatch(
      /\.todo-item__checkbox-target\s*\{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;/s,
    )
    expect(css).toMatch(/\.todo-item__checkbox-target--disabled\s*\{[^}]*cursor:\s*not-allowed;/s)
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
    expect(css).toMatch(
      /@media \(max-width:\s*640px\)[\s\S]*\.todo-item\s*\{[^}]*flex-wrap:\s*wrap;/,
    )
  })
})

describe('Story 2.4 delete dialog styles', () => {
  it('uses existing tokens for the scrim, surface, actions, and local error', () => {
    expect(css).toMatch(
      /\.delete-dialog__scrim\s*\{[^}]*background:\s*color-mix\(in srgb, var\(--color-ink-primary\)[^;]*;/s,
    )
    expect(css).toMatch(/\.delete-dialog\s*\{[^}]*background:\s*var\(--color-surface-raised\);/s)
    expect(css).toMatch(
      /\.delete-dialog\s*\{[^}]*box-shadow:[^;]*color-mix\(in srgb, var\(--color-ink-primary\) 20%, transparent\);/s,
    )
    expect(css).toContain('background: var(--button-danger-bg);')
    expect(css).toContain('background: var(--button-secondary-bg);')
    expect(css).toMatch(/\.delete-dialog__error\s*\{[^}]*color:\s*var\(--color-danger-text\);/s)
  })

  it('provides busy, focus-visible, and narrow-layout treatment', () => {
    expect(css).toMatch(/\.delete-dialog__confirm\[aria-busy='true'\]\s*\{[^}]*cursor:\s*wait;/s)
    expect(css).toMatch(/\.delete-dialog__cancel:focus-visible/)
    expect(css).toMatch(/\.delete-dialog__confirm:focus-visible/)
    expect(css).toMatch(
      /@media \(max-width:\s*640px\)[\s\S]*\.delete-dialog\s*\{[^}]*width:\s*100%;/s,
    )
  })
})

describe('Story 2.5 reliability styles', () => {
  it('uses existing tokens for the shared banner and Retry states', () => {
    expect(css).toMatch(/\.error-banner\s*\{[^}]*background:\s*var\(--error-banner-bg\);/s)
    expect(css).toMatch(/\.error-banner\s*\{[^}]*color:\s*var\(--error-banner-fg\);/s)
    expect(css).toMatch(/\.error-banner__retry\s*\{[^}]*background:\s*var\(--button-primary-bg\);/s)
    expect(css).toMatch(
      /\.error-banner__retry:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--color-focus-ring\);[^}]*outline-offset:\s*2px;/s,
    )
    expect(css).toMatch(
      /\.error-banner__retry:disabled,[\s\S]*\.error-banner__retry\[aria-busy='true'\]\s*\{[^}]*cursor:\s*wait;/s,
    )
  })

  it('keeps the polite live region visually hidden with the shared utility', () => {
    expect(css).toMatch(
      /\.add-todo-form__label,\s*\.sr-only\s*\{[^}]*position:\s*absolute;[^}]*clip:\s*rect\(0, 0, 0, 0\);/s,
    )
  })
})
