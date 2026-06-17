import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import * as api from './api/api'

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
  })

  it('renders the minimal load-error fallback on failure', async () => {
    vi.spyOn(api, 'getTodos').mockRejectedValue(new api.ApiError('internal', 'boom', 500))

    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load your todos.")
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})
