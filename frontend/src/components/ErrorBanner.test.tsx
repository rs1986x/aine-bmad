import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ErrorBanner } from './ErrorBanner'

describe('ErrorBanner', () => {
  it('renders exact classified copy in one assertive alert and invokes Retry', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(
      <ErrorBanner message="Couldn't load your todos. Retry." retrying={false} onRetry={onRetry} />,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent("Couldn't load your todos. Retry.")
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('exposes retry busy state and suppresses duplicate activation', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<ErrorBanner message="Couldn't save that change. Retry." retrying onRetry={onRetry} />)

    const alert = screen.getByRole('alert')
    const retry = screen.getByRole('button', { name: 'Retry' })
    expect(alert).toHaveAttribute('aria-busy', 'true')
    expect(retry).toBeDisabled()
    expect(retry).toHaveAttribute('aria-busy', 'true')
    await user.click(retry)
    expect(onRetry).not.toHaveBeenCalled()
  })

  it('preserves unexpected reusable copy instead of truncating it', () => {
    render(<ErrorBanner message="A custom failure occurred." retrying={false} onRetry={vi.fn()} />)

    expect(screen.getByRole('alert')).toHaveTextContent('A custom failure occurred. Retry.')
  })
})
