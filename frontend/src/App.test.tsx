import { render, screen, waitFor } from '@testing-library/react'
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

  it('renders the minimal load-error fallback on failure (no add input)', async () => {
    vi.spyOn(api, 'getTodos').mockRejectedValue(new api.ApiError('internal', 'boom', 500))

    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load your todos.")
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Add a todo…')).not.toBeInTheDocument()
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

    expect(update).toHaveBeenCalledWith(todo.id, { completed: true })
    expect(
      await screen.findByRole('listitem', { name: 'Completed: Toggle through App' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeChecked()
  })
})
