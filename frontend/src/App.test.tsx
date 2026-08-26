import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import * as api from './api/api'
import type { Todo } from './types/todo'

describe('App loading → empty transition', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('shows the loading skeleton, then the empty state when the list is []', async () => {
    let resolveTodos: (todos: never[]) => void = () => {}
    const pending = new Promise<never[]>((resolve) => {
      resolveTodos = resolve
    })
    vi.spyOn(api, 'getTodos').mockReturnValue(pending)

    render(<App />)

    // Loading first.
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
    expect(screen.queryByText('No todos yet.')).not.toBeInTheDocument()

    // Resolve to an empty list → empty state.
    resolveTodos([])

    expect(await screen.findByText('No todos yet.')).toBeInTheDocument()
    expect(screen.getByText('Add your first one above.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument())

    // The add input is present in the empty state (pinned above the CTA copy).
    expect(screen.getByPlaceholderText('Add a todo…')).toBeInTheDocument()
  })

  it('does not render the add input during loading', async () => {
    let resolveTodos: (todos: never[]) => void = () => {}
    const pending = new Promise<never[]>((resolve) => {
      resolveTodos = resolve
    })
    vi.spyOn(api, 'getTodos').mockReturnValue(pending)

    render(<App />)

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Add a todo…')).not.toBeInTheDocument()

    resolveTodos([])
    expect(await screen.findByPlaceholderText('Add a todo…')).toBeInTheDocument()
  })

  it('renders the exact load banner on failure and retries with a loading state', async () => {
    const user = userEvent.setup()
    let resolveRetry: (todos: Todo[]) => void = () => {}
    const getTodos = vi
      .spyOn(api, 'getTodos')
      .mockRejectedValueOnce(new api.ApiError('internal', 'boom', 500))
      .mockReturnValueOnce(
        new Promise<Todo[]>((resolve) => {
          resolveRetry = resolve
        }),
      )

    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load your todos. Retry.")
    expect(screen.queryByPlaceholderText('Add a todo…')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
    resolveRetry([])
    expect(await screen.findByPlaceholderText('Add a todo…')).toBeInTheDocument()
    expect(getTodos).toHaveBeenCalledTimes(2)
  })

  it('composes lowercase connection copy exactly once and keeps Retry visible while pending', async () => {
    const user = userEvent.setup()
    let resolveRetry: (todos: Todo[]) => void = () => {}
    vi.spyOn(api, 'getTodos')
      .mockRejectedValueOnce(new api.ApiError('connection_error', 'unreachable', 0))
      .mockReturnValueOnce(
        new Promise<Todo[]>((resolve) => {
          resolveRetry = resolve
        }),
      )
    render(<App />)

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe("Couldn't connect. Check your connection and retry.")
    expect(alert.textContent?.match(/retry/gi)).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(screen.getByRole('alert')).toBe(alert)
    expect(alert).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeDisabled()
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
    resolveRetry([])
    expect(await screen.findByPlaceholderText('Add a todo…')).toBeInTheDocument()
  })

  it('preserves create text and replays the transaction once through the global banner', async () => {
    const user = userEvent.setup()
    const created: Todo = {
      id: '00000000-0000-4000-8000-000000000003',
      description: 'Retry this create',
      completed: false,
      createdAt: '2026-08-26T08:00:00.000Z',
    }
    vi.spyOn(api, 'getTodos').mockResolvedValue([])
    const create = vi
      .spyOn(api, 'createTodo')
      .mockRejectedValueOnce(new api.ApiError('internal', 'boom', 500))
      .mockResolvedValueOnce(created)
    render(<App />)
    const input = await screen.findByPlaceholderText('Add a todo…')

    await user.type(input, created.description)
    await user.keyboard('{Enter}')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("Couldn't save that change. Retry.")
    expect(input).toHaveValue(created.description)

    const retry = screen.getByRole('button', { name: 'Retry' })
    await user.dblClick(retry)

    await waitFor(() => expect(create).toHaveBeenCalledTimes(2))
    expect(create).toHaveBeenLastCalledWith(
      { description: created.description },
      expect.any(AbortSignal),
      expect.any(String),
    )
    await waitFor(() => expect(input).toHaveValue(''))
    expect(
      screen.getByText(`Todo added: ${created.description}.`).closest('[aria-live="polite"]'),
    ).not.toBeNull()
    expect(input).toHaveFocus()
  })

  it('keeps a failed create replay retryable with its preserved draft', async () => {
    const user = userEvent.setup()
    const created: Todo = {
      id: '00000000-0000-4000-8000-000000000005',
      description: 'Create survives two failures',
      completed: false,
      createdAt: '2026-08-26T08:00:00.000Z',
    }
    vi.spyOn(api, 'getTodos').mockResolvedValue([])
    const create = vi
      .spyOn(api, 'createTodo')
      .mockRejectedValueOnce(new api.ApiError('internal', 'first', 500))
      .mockRejectedValueOnce(new api.ApiError('internal', 'second', 500))
      .mockResolvedValueOnce(created)
    render(<App />)
    const input = await screen.findByPlaceholderText('Add a todo…')
    await user.type(input, created.description)
    await user.keyboard('{Enter}')
    await screen.findByRole('alert')

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2))

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save that change. Retry.")
    expect(screen.getByRole('button', { name: 'Retry' })).not.toBeDisabled()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Retry' })).toHaveFocus())
    expect(input).toHaveValue(created.description)

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(create).toHaveBeenCalledTimes(3))
    await waitFor(() => expect(input).toHaveValue(''))
  })

  it('wires a confirmed toggle through App, the hook, and the list', async () => {
    const user = userEvent.setup()
    const todo: Todo = {
      id: '00000000-0000-4000-8000-000000000000',
      description: 'Toggle through App',
      completed: false,
      createdAt: '2026-08-26T08:00:00.000Z',
    }
    const confirmed = { ...todo, completed: true }
    vi.spyOn(api, 'getTodos').mockResolvedValue([todo])
    const update = vi.spyOn(api, 'updateTodo').mockResolvedValue(confirmed)
    render(<App />)
    const checkbox = await screen.findByRole('checkbox')

    await user.click(checkbox)

    expect(update).toHaveBeenCalledWith(todo.id, { completed: true }, expect.any(AbortSignal))
    expect(
      await screen.findByRole('listitem', { name: 'Completed: Toggle through App' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(
      screen.getByText(`Todo completed: ${todo.description}.`).closest('[aria-live="polite"]'),
    ).not.toBeNull()
  })

  it('forwards a failed toggle to the global banner and replays it once', async () => {
    const user = userEvent.setup()
    const todo: Todo = {
      id: '00000000-0000-4000-8000-000000000004',
      description: 'Retry toggle through App',
      completed: false,
      createdAt: '2026-08-26T08:00:00.000Z',
    }
    vi.spyOn(api, 'getTodos').mockResolvedValue([todo])
    const update = vi
      .spyOn(api, 'updateTodo')
      .mockRejectedValueOnce(new api.ApiError('internal', 'boom', 500))
      .mockResolvedValueOnce({ ...todo, completed: true })
    render(<App />)
    const checkbox = await screen.findByRole('checkbox')

    await user.click(checkbox)

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save that change. Retry.")
    expect(checkbox).not.toBeChecked()

    await user.dblClick(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => expect(update).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('checkbox')).toBeChecked()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps a second failed toggle replay retryable without changing confirmed state', async () => {
    const user = userEvent.setup()
    const todo: Todo = {
      id: '00000000-0000-4000-8000-000000000006',
      description: 'Toggle survives two failures',
      completed: false,
      createdAt: '2026-08-26T08:00:00.000Z',
    }
    vi.spyOn(api, 'getTodos').mockResolvedValue([todo])
    const update = vi
      .spyOn(api, 'updateTodo')
      .mockRejectedValueOnce(new api.ApiError('internal', 'first', 500))
      .mockRejectedValueOnce(new api.ApiError('internal', 'second', 500))
      .mockResolvedValueOnce({ ...todo, completed: true })
    render(<App />)
    const checkbox = await screen.findByRole('checkbox')
    await user.click(checkbox)
    await screen.findByRole('alert')

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2))

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save that change. Retry.")
    expect(screen.getByRole('button', { name: 'Retry' })).not.toBeDisabled()
    expect(checkbox).not.toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(update).toHaveBeenCalledTimes(3))
    expect(await screen.findByRole('checkbox')).toBeChecked()
  })

  it('keeps a second failed edit replay retryable with its preserved draft', async () => {
    const user = userEvent.setup()
    const todo: Todo = {
      id: '00000000-0000-4000-8000-000000000007',
      description: 'Original edit',
      completed: false,
      createdAt: '2026-08-26T08:00:00.000Z',
    }
    const updated = { ...todo, description: 'Preserved edit draft' }
    vi.spyOn(api, 'getTodos').mockResolvedValue([todo])
    const update = vi
      .spyOn(api, 'updateTodo')
      .mockRejectedValueOnce(new api.ApiError('internal', 'first', 500))
      .mockRejectedValueOnce(new api.ApiError('internal', 'second', 500))
      .mockResolvedValueOnce(updated)
    render(<App />)
    const row = await screen.findByRole('listitem', { name: todo.description })
    await user.click(within(row).getByRole('button', { name: 'Edit todo' }))
    const input = screen.getByLabelText(`Edit description for ${todo.description}`)
    await user.clear(input)
    await user.type(input, updated.description)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByRole('alert')

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2))

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save that change. Retry.")
    expect(screen.getByRole('button', { name: 'Retry' })).not.toBeDisabled()
    expect(screen.getByLabelText(`Edit description for ${todo.description}`)).toHaveValue(
      updated.description,
    )

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(update).toHaveBeenCalledTimes(3))
    expect(await screen.findByRole('listitem', { name: updated.description })).toBeInTheDocument()
    expect(
      screen.queryByLabelText(`Edit description for ${todo.description}`),
    ).not.toBeInTheDocument()
  })

  it('removes the last Todo only after confirmation, renders empty state, and focuses Add', async () => {
    const user = userEvent.setup()
    const todo: Todo = {
      id: '00000000-0000-4000-8000-000000000000',
      description: 'Delete through App',
      completed: false,
      createdAt: '2026-08-26T08:00:00.000Z',
    }
    vi.spyOn(api, 'getTodos').mockResolvedValue([todo])
    const remove = vi.spyOn(api, 'deleteTodo').mockResolvedValue()
    render(<App />)
    const item = await screen.findByRole('listitem', { name: 'Delete through App' })

    await user.click(item.querySelector<HTMLButtonElement>('button[aria-label="Delete todo"]')!)
    expect(item).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(remove).toHaveBeenCalledWith(todo.id, expect.any(AbortSignal))
    expect(await screen.findByText('No todos yet.')).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    expect(
      screen.getByText(`Todo deleted: ${todo.description}.`).closest('[aria-live="polite"]'),
    ).not.toBeNull()
    await waitFor(() => expect(screen.getByPlaceholderText('Add a todo…')).toHaveFocus())
  })

  it('keeps a Todo rendered while DELETE is pending, then removes only that Todo', async () => {
    const user = userEvent.setup()
    const target: Todo = {
      id: '00000000-0000-4000-8000-000000000000',
      description: 'Delete through App',
      completed: false,
      createdAt: '2026-08-26T08:00:00.000Z',
    }
    const sibling: Todo = {
      id: '00000000-0000-4000-8000-000000000001',
      description: 'Keep through App',
      completed: false,
      createdAt: '2026-08-25T08:00:00.000Z',
    }
    let resolveDelete: () => void = () => {}
    const pendingDelete = new Promise<void>((resolve) => {
      resolveDelete = resolve
    })
    vi.spyOn(api, 'getTodos').mockResolvedValue([target, sibling])
    const remove = vi.spyOn(api, 'deleteTodo').mockReturnValue(pendingDelete)
    render(<App />)
    const targetRow = await screen.findByRole('listitem', { name: target.description })

    await user.click(within(targetRow).getByRole('button', { name: 'Delete todo' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(remove).toHaveBeenCalledWith(target.id, expect.any(AbortSignal))
    expect(targetRow).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    resolveDelete()
    await waitFor(() => expect(targetRow).not.toBeInTheDocument())
    const siblingRow = screen.getByRole('listitem', { name: sibling.description })
    expect(siblingRow).toBeInTheDocument()
    await waitFor(() =>
      expect(within(siblingRow).getByRole('button', { name: 'Delete todo' })).toHaveFocus(),
    )
  })

  it('advances queued live-region announcements automatically', async () => {
    const user = userEvent.setup()
    const first: Todo = {
      id: '00000000-0000-4000-8000-000000000020',
      description: 'First announcement',
      completed: false,
      createdAt: '2026-08-26T08:00:00.000Z',
    }
    const second: Todo = {
      ...first,
      id: '00000000-0000-4000-8000-000000000021',
      description: 'Second announcement',
    }
    vi.spyOn(api, 'getTodos').mockResolvedValue([first, second])
    vi.spyOn(api, 'updateTodo')
      .mockResolvedValueOnce({ ...first, completed: true })
      .mockResolvedValueOnce({ ...second, completed: true })
    render(<App />)
    const checkboxes = await screen.findAllByRole('checkbox')

    await user.click(checkboxes[0])
    await user.click(checkboxes[1])
    expect(screen.getByText('Todo completed: First announcement.')).toBeInTheDocument()

    expect(
      await screen.findByText('Todo completed: Second announcement.', {}, { timeout: 2_000 }),
    ).toBeInTheDocument()
  })
})
