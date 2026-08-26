import { useCallback, useEffect, useState } from 'react'
import type { Todo, UpdateTodoInput } from '../types/todo'
import { createTodo, deleteTodo, getTodos, updateTodo } from '../api/api'

export interface UseTodos {
  list: Todo[]
  loading: boolean
  error: Error | null
  reload: () => void
  addTodo: (description: string) => Promise<Todo>
  toggleTodo: (todo: Todo) => Promise<Todo>
  editTodo: (id: string, description: string) => Promise<Todo>
  removeTodo: (id: string) => Promise<void>
}

// Read path only. The server response is the only source of truth — no
// optimistic state. Action methods (addTodo/toggle/edit/remove) are Epic 2.
export function useTodos(): UseTodos {
  const [list, setList] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  // Create path: commit the server-confirmed Todo to the list only on the 201
  // (no optimistic insert), prepending immutably. On failure, re-throw so the
  // form owns the error locally. CRITICAL: never touch the top-level `error`
  // here — that drives App's load-error branch and would unmount AddTodoForm,
  // destroying the user's typed text.
  const addTodo = useCallback(async (description: string): Promise<Todo> => {
    const created = await createTodo({ description })
    setList((prev) => [created, ...prev])
    return created
  }, [])

  const confirmedUpdate = useCallback(
    async (id: string, input: UpdateTodoInput): Promise<Todo> => {
      const updated = await updateTodo(id, input)
      setList((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      return updated
    },
    [],
  )

  const toggleTodo = useCallback(
    (todo: Todo): Promise<Todo> =>
      confirmedUpdate(todo.id, {
        completed: !todo.completed,
      }),
    [confirmedUpdate],
  )

  const editTodo = useCallback(
    (id: string, description: string): Promise<Todo> => confirmedUpdate(id, { description }),
    [confirmedUpdate],
  )

  const removeTodo = useCallback(async (id: string): Promise<void> => {
    await deleteTodo(id)
    setList((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const reload = useCallback(() => {
    // Reset request state here (an event callback) rather than synchronously in
    // the effect body, then re-trigger the effect. Initial mount already starts
    // with loading=true / error=null.
    setLoading(true)
    setError(null)
    setReloadToken((token) => token + 1)
  }, [])

  useEffect(() => {
    let ignore = false

    getTodos()
      .then((todos) => {
        if (ignore) return
        setList(todos)
      })
      .catch((err: unknown) => {
        if (ignore) return
        setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        if (ignore) return
        setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [reloadToken])

  return { list, loading, error, reload, addTodo, toggleTodo, editTodo, removeTodo }
}
