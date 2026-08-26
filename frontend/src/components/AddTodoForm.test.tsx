import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Todo } from '../types/todo'
import { AddTodoForm } from './AddTodoForm'

const aTodo: Todo = {
  id: '1',
  description: 'Buy milk',
  completed: false,
  createdAt: '2026-07-13T10:00:00.000Z',
}

describe('AddTodoForm', () => {
  it('renders a labeled input with the exact placeholder and an Add button', () => {
    render(<AddTodoForm onAdd={vi.fn()} />)

    const input = screen.getByRole('textbox', { name: /add a todo/i })
    expect(input).toHaveAttribute('placeholder', 'Add a todo…')
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it('submits with Enter, clears the field, and refocuses the input', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn().mockResolvedValue(aTodo)
    render(<AddTodoForm onAdd={onAdd} />)

    const input = screen.getByRole('textbox', { name: /add a todo/i })
    await user.type(input, 'Buy milk')
    await user.keyboard('{Enter}')

    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd).toHaveBeenCalledWith('Buy milk', expect.anything(), expect.any(String))
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
  })

  it('submits with a click on the Add button', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn().mockResolvedValue(aTodo)
    render(<AddTodoForm onAdd={onAdd} />)

    await user.type(screen.getByRole('textbox', { name: /add a todo/i }), 'Buy milk')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd).toHaveBeenCalledWith('Buy milk', expect.anything(), expect.any(String))
  })

  it('trims the value before calling onAdd', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn().mockResolvedValue(aTodo)
    render(<AddTodoForm onAdd={onAdd} />)

    await user.type(screen.getByRole('textbox', { name: /add a todo/i }), '  Buy milk  ')
    await user.keyboard('{Enter}')

    expect(onAdd).toHaveBeenCalledWith('Buy milk', expect.anything(), expect.any(String))
  })

  it('rejects an empty/whitespace submit without calling onAdd and preserves the text', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn().mockResolvedValue(aTodo)
    render(<AddTodoForm onAdd={onAdd} />)

    const input = screen.getByRole('textbox', { name: /add a todo/i })
    await user.type(input, '   ')
    await user.keyboard('{Enter}')

    expect(onAdd).not.toHaveBeenCalled()
    expect(screen.getByText('Enter some text first.')).toBeInTheDocument()
    expect(input).toHaveValue('   ')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby')
    const describedBy = input.getAttribute('aria-describedby') as string
    expect(document.getElementById(describedBy)).toHaveTextContent('Enter some text first.')
  })

  it('preserves text and registers the original create transaction for global Retry', async () => {
    const user = userEvent.setup()
    const failure = new Error('boom')
    const onAdd = vi.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce(aTodo)
    const onFailure = vi.fn()
    render(<AddTodoForm onAdd={onAdd} onFailure={onFailure} />)

    const input = screen.getByRole('textbox', { name: /add a todo/i })
    await user.type(input, 'Buy milk')
    await user.keyboard('{Enter}')

    await waitFor(() =>
      expect(onFailure).toHaveBeenCalledWith(expect.anything(), failure, expect.any(Function)),
    )
    expect(input).toHaveValue('Buy milk')
    expect(input).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Add' })).not.toBeDisabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    const retry = onFailure.mock.calls[0][2] as () => Promise<void>
    await act(() => retry())
    expect(onAdd).toHaveBeenCalledTimes(2)
    expect(onAdd).toHaveBeenLastCalledWith('Buy milk', expect.anything(), expect.any(String))
    expect(onAdd.mock.calls[1][2]).toBe(onAdd.mock.calls[0][2])
    expect(input).toHaveValue('')
  })

  it('clears a stale create retry when the preserved draft changes', async () => {
    const user = userEvent.setup()
    const onFailure = vi.fn()
    const onClearFailure = vi.fn()
    render(
      <AddTodoForm
        onAdd={vi.fn().mockRejectedValue(new Error('boom'))}
        onFailure={onFailure}
        onClearFailure={onClearFailure}
      />,
    )
    const input = screen.getByRole('textbox', { name: /add a todo/i })
    await user.type(input, 'Original')
    await user.keyboard('{Enter}')
    await waitFor(() => expect(onFailure).toHaveBeenCalled())
    onClearFailure.mockClear()

    await user.type(input, ' changed')

    expect(onClearFailure).toHaveBeenCalled()
    expect(input).toHaveValue('Original changed')
  })

  it('clears a stale create retry before manually resubmitting an unchanged draft', async () => {
    const user = userEvent.setup()
    const failure = new Error('boom')
    const onAdd = vi.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce(aTodo)
    const onFailure = vi.fn()
    const onClearFailure = vi.fn()
    render(
      <AddTodoForm
        onAdd={onAdd}
        onFailure={onFailure}
        onClearFailure={onClearFailure}
      />,
    )
    const input = screen.getByRole('textbox', { name: /add a todo/i })
    await user.type(input, 'Buy milk')
    await user.keyboard('{Enter}')
    await waitFor(() => expect(onFailure).toHaveBeenCalledOnce())
    const owner = onFailure.mock.calls[0][0] as symbol
    onClearFailure.mockClear()

    await user.keyboard('{Enter}')

    expect(onClearFailure).toHaveBeenCalledWith(owner)
    expect(onAdd).toHaveBeenCalledTimes(2)
    expect(input).toHaveValue('')
  })

  it('releases its failure owner when unmounted', () => {
    const onReleaseOwner = vi.fn()
    const { unmount } = render(
      <AddTodoForm onAdd={vi.fn()} onReleaseOwner={onReleaseOwner} />,
    )

    unmount()

    expect(onReleaseOwner).toHaveBeenCalledOnce()
    expect(onReleaseOwner).toHaveBeenCalledWith(expect.anything())
  })

  it('disables controls while in flight and guards against double-submit', async () => {
    const user = userEvent.setup()
    let resolve: (todo: Todo) => void = () => {}
    const pending = new Promise<Todo>((r) => {
      resolve = r
    })
    const onAdd = vi.fn().mockReturnValue(pending)
    render(<AddTodoForm onAdd={onAdd} />)

    const input = screen.getByRole('textbox', { name: /add a todo/i })
    await user.type(input, 'Buy milk')
    await user.keyboard('{Enter}')

    expect(input).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()

    // A second submit while pending must not call onAdd again.
    await user.keyboard('{Enter}')
    expect(onAdd).toHaveBeenCalledTimes(1)

    resolve(aTodo)
  })

  it('honors a queued focus request after an in-flight Add re-enables the input', async () => {
    const user = userEvent.setup()
    let rejectAdd: (error: Error) => void = () => {}
    const pending = new Promise<Todo>((_resolve, reject) => {
      rejectAdd = reject
    })
    const onAdd = vi.fn().mockReturnValue(pending)
    const { rerender } = render(
      <>
        <button type="button">Outside</button>
        <AddTodoForm onAdd={onAdd} focusRequest={0} />
      </>,
    )
    const input = screen.getByRole('textbox', { name: /add a todo/i })
    await user.type(input, 'Buy milk')
    await user.keyboard('{Enter}')
    screen.getByRole('button', { name: 'Outside' }).focus()

    rerender(
      <>
        <button type="button">Outside</button>
        <AddTodoForm onAdd={onAdd} focusRequest={1} />
      </>,
    )
    expect(input).toBeDisabled()

    rejectAdd(new Error('boom'))
    await waitFor(() => expect(input).not.toBeDisabled())
    await waitFor(() => expect(input).toHaveFocus())
  })

  it('clears the empty-validation error once the user types', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn().mockResolvedValue(aTodo)
    render(<AddTodoForm onAdd={onAdd} />)

    const input = screen.getByRole('textbox', { name: /add a todo/i })
    await user.type(input, ' ')
    await user.keyboard('{Enter}')
    expect(screen.getByText('Enter some text first.')).toBeInTheDocument()

    await user.type(input, 'x')
    expect(screen.queryByText('Enter some text first.')).not.toBeInTheDocument()
  })
})
