import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { TodoItem } from './TodoItem'
import type { Todo } from '../types/todo'

const activeTodo: Todo = {
  id: '1',
  description: 'Buy milk',
  completed: false,
  createdAt: '2026-01-02T10:00:00.000Z',
}

const completedTodo: Todo = {
  id: '2',
  description: 'Walk the dog',
  completed: true,
  createdAt: '2026-01-01T09:30:00.000Z',
}

function renderItem(todo: Todo, overrides: Partial<ComponentProps<typeof TodoItem>> = {}) {
  const props: ComponentProps<typeof TodoItem> = {
    todo,
    isEditing: false,
    editDisabled: false,
    onToggle: vi.fn().mockResolvedValue(todo),
    onStartEdit: vi.fn(),
    onCancelEdit: vi.fn(),
    onSaveEdit: vi.fn().mockResolvedValue(todo),
    ...overrides,
  }
  // TodoItem renders an <li>; wrap in a <ul> so the DOM is valid and the
  // listitem role resolves.
  const view = render(
    <ul>
      <TodoItem {...props} />
    </ul>,
  )
  return {
    ...view,
    props,
    rerenderItem(next: Partial<ComponentProps<typeof TodoItem>>) {
      Object.assign(props, next)
      view.rerender(
        <ul>
          <TodoItem {...props} />
        </ul>,
      )
    },
  }
}

describe('TodoItem', () => {
  it('renders an active todo with plain treatment and an unchecked checkbox', () => {
    renderItem(activeTodo)

    const item = screen.getByRole('listitem', { name: 'Buy milk' })
    expect(item).toBeInTheDocument()

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()

    const desc = screen.getByText('Buy milk')
    expect(desc).not.toHaveClass('todo-item__desc--completed')
  })

  it('renders a completed todo with the dual signal (checked + strike-through) and prefixed label', () => {
    renderItem(completedTodo)

    // Dual signal 1: accessible label carries the "Completed:" prefix.
    const item = screen.getByRole('listitem', { name: 'Completed: Walk the dog' })
    expect(item).toBeInTheDocument()

    // Dual signal 2a: checkbox is checked.
    expect(screen.getByRole('checkbox')).toBeChecked()

    // Dual signal 2b: description has the strike-through modifier class.
    const desc = screen.getByText('Walk the dog')
    expect(desc).toHaveClass('todo-item__desc--completed')
  })

  it('renders a <time> element carrying the exact createdAt in dateTime', () => {
    const { container } = renderItem(activeTodo)
    const time = container.querySelector('time')
    expect(time).not.toBeNull()
    expect(time).toHaveAttribute('dateTime', '2026-01-02T10:00:00.000Z')
  })

  it('renders labeled edit and delete buttons', () => {
    renderItem(activeTodo)

    const edit = screen.getByRole('button', { name: 'Edit todo' })
    const del = screen.getByRole('button', { name: 'Delete todo' })

    expect(edit).toBeInTheDocument()
    expect(del).toBeInTheDocument()
    expect(edit).not.toBeDisabled()
    expect(del).not.toBeDisabled()
    expect(edit).toHaveAttribute('type', 'button')
    expect(del).toHaveAttribute('type', 'button')
  })

  it('guards a pending toggle, exposes busy state, and waits for prop confirmation', async () => {
    const user = userEvent.setup()
    let resolveToggle: (todo: Todo) => void = () => {}
    const pending = new Promise<Todo>((resolve) => {
      resolveToggle = resolve
    })
    const onToggle = vi.fn().mockReturnValue(pending)
    const { rerenderItem } = renderItem(activeTodo, { onToggle })
    const checkbox = screen.getByRole('checkbox')

    await user.click(checkbox)

    expect(onToggle).toHaveBeenCalledOnce()
    expect(onToggle).toHaveBeenCalledWith(activeTodo)
    expect(checkbox).not.toBeChecked()
    expect(checkbox).toBeDisabled()
    expect(checkbox).toHaveAttribute('aria-busy', 'true')
    expect(checkbox.closest('label')).toHaveClass('todo-item__checkbox-target--busy')
    expect(screen.getByRole('button', { name: 'Edit todo' })).toBeDisabled()
    await user.click(checkbox)
    expect(onToggle).toHaveBeenCalledOnce()

    const confirmed = { ...activeTodo, completed: true }
    resolveToggle(confirmed)
    await waitFor(() => expect(checkbox).not.toBeDisabled())
    rerenderItem({ todo: confirmed })
    expect(checkbox).toBeChecked()
    expect(screen.getByText('Buy milk')).toHaveClass('todo-item__desc--completed')
  })

  it('removes checked and strike-through signals only after confirmed un-completion', async () => {
    const user = userEvent.setup()
    const confirmed = { ...completedTodo, completed: false }
    const onToggle = vi.fn().mockResolvedValue(confirmed)
    const { rerenderItem } = renderItem(completedTodo, { onToggle })
    const checkbox = screen.getByRole('checkbox')

    await user.click(checkbox)

    expect(onToggle).toHaveBeenCalledWith(completedTodo)
    expect(checkbox).toBeChecked()
    expect(screen.getByText('Walk the dog')).toHaveClass('todo-item__desc--completed')

    rerenderItem({ todo: confirmed })
    expect(checkbox).not.toBeChecked()
    expect(screen.getByText('Walk the dog')).not.toHaveClass('todo-item__desc--completed')
  })

  it('keeps the checked state on toggle failure and clears local feedback on retry', async () => {
    const user = userEvent.setup()
    const onToggle = vi
      .fn()
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce({ ...activeTodo, completed: true })
    renderItem(activeTodo, { onToggle })
    const checkbox = screen.getByRole('checkbox')

    await user.click(checkbox)
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save that change.")
    expect(checkbox).not.toBeChecked()
    expect(checkbox).not.toBeDisabled()

    await user.click(checkbox)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(onToggle).toHaveBeenCalledTimes(2)
  })

  it('supports Enter activation and uses a semantic checkbox target wrapper', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn().mockResolvedValue({ ...activeTodo, completed: true })
    renderItem(activeTodo, { onToggle })
    const checkbox = screen.getByRole('checkbox')

    expect(checkbox.closest('label')).toHaveClass('todo-item__checkbox-target')
    checkbox.focus()
    await user.keyboard('{Enter}')
    expect(onToggle).toHaveBeenCalledWith(activeTodo)
  })

  it('supports native Space activation', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn().mockResolvedValue({ ...activeTodo, completed: true })
    renderItem(activeTodo, { onToggle })
    const checkbox = screen.getByRole('checkbox')

    checkbox.focus()
    await user.keyboard(' ')

    expect(onToggle).toHaveBeenCalledWith(activeTodo)
  })

  it('renders a pre-filled, labeled, focused inline editor', () => {
    renderItem(activeTodo, { isEditing: true })

    const input = screen.getByLabelText('Edit description for Buy milk')
    expect(input).toHaveValue('Buy milk')
    expect(input).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('listitem')).toHaveClass('todo-item--editing')
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeDisabled()
    expect(checkbox.closest('label')).toHaveClass('todo-item__checkbox-target--disabled')
  })

  it('trims a Save submission and debounces controls while pending', async () => {
    const user = userEvent.setup()
    let resolveSave: (todo: Todo) => void = () => {}
    const pending = new Promise<Todo>((resolve) => {
      resolveSave = resolve
    })
    const onSaveEdit = vi.fn().mockReturnValue(pending)
    renderItem(activeTodo, { isEditing: true, onSaveEdit })
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, '  updated wording  ')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSaveEdit).toHaveBeenCalledWith('updated wording')
    expect(input).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()

    resolveSave({ ...activeTodo, description: 'updated wording' })
    await waitFor(() => expect(input).not.toBeDisabled())
  })

  it('submits the edit form with Enter', async () => {
    const user = userEvent.setup()
    const onSaveEdit = vi.fn().mockResolvedValue(activeTodo)
    renderItem(activeTodo, { isEditing: true, onSaveEdit })

    await user.type(screen.getByRole('textbox'), '{Enter}')

    expect(onSaveEdit).toHaveBeenCalledWith('Buy milk')
  })

  it.each(['Cancel', 'Escape'])('cancels with %s without saving', async (action) => {
    const user = userEvent.setup()
    const onCancelEdit = vi.fn()
    const onSaveEdit = vi.fn()
    renderItem(activeTodo, { isEditing: true, onCancelEdit, onSaveEdit })

    if (action === 'Cancel') {
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
    } else {
      await user.type(screen.getByRole('textbox'), '{Escape}')
    }

    expect(onCancelEdit).toHaveBeenCalledOnce()
    expect(onSaveEdit).not.toHaveBeenCalled()
  })

  it('associates empty validation feedback and skips the save callback', async () => {
    const user = userEvent.setup()
    const onSaveEdit = vi.fn()
    renderItem(activeTodo, { isEditing: true, onSaveEdit })
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, '   ')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    const error = screen.getByRole('alert')
    expect(error).toHaveTextContent('Enter some text first.')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', error.id)
    expect(onSaveEdit).not.toHaveBeenCalled()
  })

  it('preserves the typed draft and edit mode after a failed save, then clears feedback on typing', async () => {
    const user = userEvent.setup()
    const onSaveEdit = vi.fn().mockRejectedValue(new Error('failed'))
    renderItem(activeTodo, { isEditing: true, onSaveEdit })
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'keep this draft')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save that change.")
    expect(input).toHaveValue('keep this draft')
    expect(input).not.toBeDisabled()
    expect(screen.getByRole('listitem')).toHaveClass('todo-item--editing')

    await user.type(input, '!')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
