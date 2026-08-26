import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { TodoList } from './TodoList'
import type { Todo } from '../types/todo'

// Input order deliberately differs from the expected render order so the test
// proves TodoList (via groupTodos) re-establishes ordering rather than trusting
// the incoming prop order.
const todos: Todo[] = [
  { id: '1', description: 'active old', completed: false, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: '2', description: 'completed new', completed: true, createdAt: '2026-01-06T00:00:00.000Z' },
  { id: '3', description: 'active new', completed: false, createdAt: '2026-01-05T00:00:00.000Z' },
  { id: '4', description: 'completed old', completed: true, createdAt: '2026-01-02T00:00:00.000Z' },
]

function renderList(
  list = todos,
  onToggle = vi.fn<(todo: Todo) => Promise<Todo>>().mockImplementation(async (todo) => todo),
  onEdit = vi
    .fn<(id: string, description: string) => Promise<Todo>>()
    .mockImplementation(async (id, description) => ({
      ...list.find((todo) => todo.id === id)!,
      description,
    })),
  onDelete = vi.fn<(id: string) => Promise<void>>().mockResolvedValue(),
) {
  return {
    onToggle,
    onEdit,
    onDelete,
    ...render(
      <TodoList todos={list} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />,
    ),
  }
}

describe('TodoList', () => {
  it('renders a single semantic list with one listitem per todo', () => {
    renderList()

    const list = screen.getByRole('list')
    expect(list.tagName).toBe('UL')
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
  })

  it('renders active (newest-first) above completed (newest-first)', () => {
    renderList()

    const items = screen.getAllByRole('listitem')
    const names = items.map((li) => li.getAttribute('aria-label'))

    expect(names).toEqual([
      'active new',
      'active old',
      'Completed: completed new',
      'Completed: completed old',
    ])
  })

  it('forwards toggle actions without changing the prop-backed checkbox early', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn<(todo: Todo) => Promise<Todo>>()
    const { onToggle: toggle } = renderList(todos, onToggle)
    const activeNew = screen.getByRole('listitem', { name: 'active new' })
    const checkbox = within(activeNew).getByRole('checkbox')

    await user.click(checkbox)

    expect(toggle).toHaveBeenCalledWith(todos[2])
    expect(checkbox).not.toBeChecked()
  })

  it('allows exactly one editor and suppresses other Edit actions', async () => {
    const user = userEvent.setup()
    renderList()
    const activeNew = screen.getByRole('listitem', { name: 'active new' })

    await user.click(within(activeNew).getByRole('button', { name: 'Edit todo' }))

    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(screen.getByLabelText('Edit description for active new')).toBeInTheDocument()
    const otherRow = screen.getByRole('listitem', { name: 'active old' })
    expect(within(otherRow).getByRole('button', { name: 'Edit todo' })).toBeDisabled()
    expect(within(activeNew).getByRole('button', { name: 'Delete todo' })).toBeDisabled()
  })

  it('forwards an edit and closes only after the confirmed response', async () => {
    const user = userEvent.setup()
    let resolveEdit: (todo: Todo) => void = () => {}
    const pending = new Promise<Todo>((resolve) => {
      resolveEdit = resolve
    })
    const onEdit = vi.fn().mockReturnValue(pending)
    renderList(todos, undefined, onEdit)
    const activeNew = screen.getByRole('listitem', { name: 'active new' })
    await user.click(within(activeNew).getByRole('button', { name: 'Edit todo' }))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'updated wording')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onEdit).toHaveBeenCalledWith('3', 'updated wording')
    expect(screen.getByRole('textbox')).toBeDisabled()

    resolveEdit({ ...todos[2], description: 'updated wording' })
    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument())
  })

  it('keeps edit mode open when the update fails', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn().mockRejectedValue(new Error('failed'))
    renderList(todos, undefined, onEdit)
    const activeNew = screen.getByRole('listitem', { name: 'active new' })
    await user.click(within(activeNew).getByRole('button', { name: 'Edit todo' }))

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('textbox')).toBeInTheDocument()
  })

  it('restores focus to the originating Edit action after Cancel', async () => {
    const user = userEvent.setup()
    renderList()
    const activeNew = screen.getByRole('listitem', { name: 'active new' })
    const edit = within(activeNew).getByRole('button', { name: 'Edit todo' })
    await user.click(edit)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(edit).toHaveFocus())
  })

  it('excludes same-row edits while a toggle is pending', async () => {
    const user = userEvent.setup()
    let resolveToggle: (todo: Todo) => void = () => {}
    const pending = new Promise<Todo>((resolve) => {
      resolveToggle = resolve
    })
    const onToggle = vi.fn().mockReturnValue(pending)
    renderList(todos, onToggle)
    const activeNew = screen.getByRole('listitem', { name: 'active new' })
    const checkbox = within(activeNew).getByRole('checkbox')
    const edit = within(activeNew).getByRole('button', { name: 'Edit todo' })

    await user.click(checkbox)

    expect(checkbox).toBeDisabled()
    expect(edit).toBeDisabled()
    resolveToggle({ ...todos[2], completed: true })
    await waitFor(() => expect(checkbox).not.toBeDisabled())
  })

  it('restores focus to Edit after a confirmed save', async () => {
    const user = userEvent.setup()
    renderList()
    const activeNew = screen.getByRole('listitem', { name: 'active new' })
    const edit = within(activeNew).getByRole('button', { name: 'Edit todo' })
    await user.click(edit)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument())
    expect(edit).toHaveFocus()
  })

  it('re-groups a server-confirmed completion without changing newest-first order', async () => {
    const user = userEvent.setup()
    const confirmed = { ...todos[2], completed: true }
    const onToggle = vi.fn().mockResolvedValue(confirmed)
    const { rerender } = renderList(todos, onToggle)
    const activeNew = screen.getByRole('listitem', { name: 'active new' })

    await user.click(within(activeNew).getByRole('checkbox'))
    await waitFor(() => expect(onToggle).toHaveBeenCalledWith(todos[2]))
    rerender(
      <TodoList
        todos={todos.map((todo) => (todo.id === confirmed.id ? confirmed : todo))}
        onToggle={onToggle}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(
      screen.getAllByRole('listitem').map((item) => item.getAttribute('aria-label')),
    ).toEqual([
      'active old',
      'Completed: completed new',
      'Completed: active new',
      'Completed: completed old',
    ])
  })

  it('re-groups a server-confirmed un-completion and removes completed signals', async () => {
    const user = userEvent.setup()
    const confirmed = { ...todos[1], completed: false }
    const onToggle = vi.fn().mockResolvedValue(confirmed)
    const { rerender } = renderList(todos, onToggle)
    const completedNew = screen.getByRole('listitem', { name: 'Completed: completed new' })

    await user.click(within(completedNew).getByRole('checkbox'))
    await waitFor(() => expect(onToggle).toHaveBeenCalledWith(todos[1]))
    rerender(
      <TodoList
        todos={todos.map((todo) => (todo.id === confirmed.id ? confirmed : todo))}
        onToggle={onToggle}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(
      screen.getAllByRole('listitem').map((item) => item.getAttribute('aria-label')),
    ).toEqual([
      'completed new',
      'active new',
      'active old',
      'Completed: completed old',
    ])
    const activeAgain = screen.getByRole('listitem', { name: 'completed new' })
    expect(within(activeAgain).getByRole('checkbox')).not.toBeChecked()
    expect(within(activeAgain).getByText('completed new')).not.toHaveClass(
      'todo-item__desc--completed',
    )
  })

  it('opens one confirmation dialog without changing the selected row', async () => {
    const user = userEvent.setup()
    renderList()
    const activeNew = screen.getByRole('listitem', { name: 'active new' })

    await user.click(within(activeNew).getByRole('button', { name: 'Delete todo' }))

    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Delete this todo?' })).toHaveTextContent(
      "“active new” — this can't be undone.",
    )
    expect(activeNew).toBeInTheDocument()
  })

  it.each(['Cancel', 'Escape'])(
    'dismisses with %s, preserves the Todo, and restores Delete focus',
    async (action) => {
      const user = userEvent.setup()
      const { onDelete } = renderList()
      const activeNew = screen.getByRole('listitem', { name: 'active new' })
      const trigger = within(activeNew).getByRole('button', { name: 'Delete todo' })
      await user.click(trigger)

      if (action === 'Cancel') {
        await user.click(screen.getByRole('button', { name: 'Cancel' }))
      } else {
        await user.keyboard('{Escape}')
      }

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(activeNew).toBeInTheDocument()
      expect(onDelete).not.toHaveBeenCalled()
      await waitFor(() => expect(trigger).toHaveFocus())
    },
  )

  it('keeps the row during pending deletion, suppresses duplicates, then focuses a neighbor', async () => {
    const user = userEvent.setup()
    let resolveDelete: () => void = () => {}
    const pending = new Promise<void>((resolve) => {
      resolveDelete = resolve
    })
    const onDelete = vi.fn().mockReturnValue(pending)
    renderList(todos, undefined, undefined, onDelete)
    const activeNew = screen.getByRole('listitem', { name: 'active new' })
    await user.click(within(activeNew).getByRole('button', { name: 'Delete todo' }))
    const confirm = screen.getByRole('button', { name: 'Delete' })

    await user.click(confirm)

    expect(onDelete).toHaveBeenCalledOnce()
    expect(onDelete).toHaveBeenCalledWith('3')
    expect(activeNew).toBeInTheDocument()
    expect(confirm).toBeDisabled()
    confirm.click()
    expect(onDelete).toHaveBeenCalledOnce()

    resolveDelete()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const neighboringDelete = within(
      screen.getByRole('listitem', { name: 'active old' }),
    ).getByRole('button', { name: 'Delete todo' })
    await waitFor(() => expect(neighboringDelete).toHaveFocus())
  })

  it("focuses the preceding Todo's Delete control after deleting the final displayed Todo", async () => {
    const user = userEvent.setup()

    function StatefulList() {
      const [list, setList] = useState(todos)
      return (
        <TodoList
          todos={list}
          onToggle={async (todo) => todo}
          onEdit={async (id, description) => ({
            ...list.find((todo) => todo.id === id)!,
            description,
          })}
          onDelete={async (id) => setList((current) => current.filter((todo) => todo.id !== id))}
        />
      )
    }

    render(<StatefulList />)
    const finalTodo = screen.getByRole('listitem', { name: 'Completed: completed old' })
    await user.click(within(finalTodo).getByRole('button', { name: 'Delete todo' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(finalTodo).not.toBeInTheDocument())
    const precedingDelete = within(
      screen.getByRole('listitem', { name: 'Completed: completed new' }),
    ).getByRole('button', { name: 'Delete todo' })
    await waitFor(() => expect(precedingDelete).toHaveFocus())
  })

  it('keeps the dialog and Todo retryable after deletion fails', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn().mockRejectedValue(new Error('failed'))
    renderList(todos, undefined, undefined, onDelete)
    const activeNew = screen.getByRole('listitem', { name: 'active new' })
    await user.click(within(activeNew).getByRole('button', { name: 'Delete todo' }))

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save that change.")
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(activeNew).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).not.toBeDisabled()
  })
})
