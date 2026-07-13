import { useCallback, useEffect, useState } from 'react'
import type { Todo } from '../types/todo'
import { createTodo, getTodos } from '../api/api'

export interface UseTodos {
  list: Todo[]
  loading: boolean
  error: Error | null
  reload: () => void
  addTodo: (description: string) => Promise<Todo>
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

  return { list, loading, error, reload, addTodo }
}
