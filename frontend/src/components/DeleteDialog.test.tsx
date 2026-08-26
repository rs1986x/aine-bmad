import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/api'
import { DeleteDialog } from './DeleteDialog'
import type { Todo } from '../types/todo'

const todo: Todo = {
  id: '1',
  description: 'Buy milk',
  completed: false,
  createdAt: '2026-01-02T10:00:00.000Z',
}

describe('DeleteDialog', () => {
  it('is a labelled modal with the required copy and initially focuses Cancel', async () => {
    render(<DeleteDialog todo={todo} onCancel={vi.fn()} onConfirm={vi.fn()} />)

    const dialog = screen.getByRole('dialog', { name: 'Delete this todo?' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveTextContent("“Buy milk” — this can't be undone.")
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus())
  })

  it('traps forward and backward Tab focus inside the dialog', async () => {
    const user = userEvent.setup()
    render(<DeleteDialog todo={todo} onCancel={vi.fn()} onConfirm={vi.fn()} />)
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    const confirm = screen.getByRole('button', { name: 'Delete' })
    await waitFor(() => expect(cancel).toHaveFocus())

    await user.tab({ shift: true })
    expect(confirm).toHaveFocus()
    await user.tab()
    expect(cancel).toHaveFocus()
  })

  it('redirects external focus and restores page scrolling on unmount', async () => {
    const { unmount } = render(
      <>
        <button type="button">Outside</button>
        <DeleteDialog todo={todo} onCancel={vi.fn()} onConfirm={vi.fn()} />
      </>,
    )
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    await waitFor(() => expect(cancel).toHaveFocus())
    expect(document.body).toHaveStyle({ overflow: 'hidden' })

    screen.getByRole('button', { name: 'Outside' }).focus()

    expect(cancel).toHaveFocus()
    unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it.each(['Cancel', 'Escape'])('dismisses with %s before confirmation', async (action) => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    render(<DeleteDialog todo={todo} onCancel={onCancel} onConfirm={onConfirm} />)

    if (action === 'Cancel') {
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
    } else {
      await user.keyboard('{Escape}')
    }

    expect(onCancel).toHaveBeenCalledOnce()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('suppresses duplicate confirmation while the request is pending', async () => {
    const user = userEvent.setup()
    let resolveDelete: () => void = () => {}
    const pending = new Promise<void>((resolve) => {
      resolveDelete = resolve
    })
    const onConfirm = vi.fn().mockReturnValue(pending)
    const onCancel = vi.fn()
    render(<DeleteDialog todo={todo} onCancel={onCancel} onConfirm={onConfirm} />)
    const confirm = screen.getByRole('button', { name: 'Delete' })

    await user.click(confirm)

    expect(onConfirm).toHaveBeenCalledOnce()
    expect(confirm).toBeDisabled()
    expect(confirm).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    confirm.click()
    expect(onConfirm).toHaveBeenCalledOnce()
    await user.keyboard('{Escape}')
    expect(onCancel).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    resolveDelete()
    await waitFor(() => expect(confirm).not.toBeDisabled())
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'false')
  })

  it('contains externally moved focus on the dialog while confirmation is pending', async () => {
    const user = userEvent.setup()
    let resolveDelete: () => void = () => {}
    const pending = new Promise<void>((resolve) => {
      resolveDelete = resolve
    })
    render(
      <>
        <button type="button">Outside</button>
        <DeleteDialog todo={todo} onCancel={vi.fn()} onConfirm={vi.fn().mockReturnValue(pending)} />
      </>,
    )
    const dialog = screen.getByRole('dialog')
    const confirm = screen.getByRole('button', { name: 'Delete' })

    await user.click(confirm)
    await waitFor(() => expect(dialog).toHaveFocus())
    screen.getByRole('button', { name: 'Outside' }).focus()

    expect(dialog).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    resolveDelete()
    await waitFor(() => expect(confirm).not.toBeDisabled())
  })

  it('keeps the dialog retryable and shows local feedback after failure', async () => {
    const user = userEvent.setup()
    const onConfirm = vi
      .fn()
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce(undefined)
    render(<DeleteDialog todo={todo} onCancel={vi.fn()} onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save that change. Retry.")
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps a classified connection failure local to the open dialog', async () => {
    const user = userEvent.setup()
    render(
      <DeleteDialog
        todo={todo}
        onCancel={vi.fn()}
        onConfirm={vi
          .fn()
          .mockRejectedValue(new ApiError('connection_error', 'Backend is unreachable', 0))}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't connect. Check your connection and retry.",
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
