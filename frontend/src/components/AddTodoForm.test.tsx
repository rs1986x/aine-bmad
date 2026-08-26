import { render, screen, waitFor } from '@testing-library/react'
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
    expect(onAdd).toHaveBeenCalledWith('Buy milk')
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
    expect(onAdd).toHaveBeenCalledWith('Buy milk')
  })

  it('trims the value before calling onAdd', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn().mockResolvedValue(aTodo)
    render(<AddTodoForm onAdd={onAdd} />)

    await user.type(screen.getByRole('textbox', { name: /add a todo/i }), '  Buy milk  ')
    await user.keyboard('{Enter}')

    expect(onAdd).toHaveBeenCalledWith('Buy milk')
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

  it('preserves the text and re-enables controls with an inline message on a failed create', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn().mockRejectedValue(new Error('boom'))
    render(<AddTodoForm onAdd={onAdd} />)

    const input = screen.getByRole('textbox', { name: /add a todo/i })
    await user.type(input, 'Buy milk')
    await user.keyboard('{Enter}')

    expect(await screen.findByText("Couldn't save that change.")).toBeInTheDocument()
    expect(input).toHaveValue('Buy milk')
    expect(input).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Add' })).not.toBeDisabled()
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
    expect(await screen.findByText("Couldn't save that change.")).toBeInTheDocument()
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
