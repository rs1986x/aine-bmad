import { useCallback, useEffect, useState } from 'react'
import type { Todo } from '../types/todo'
import { getTodos } from '../api/api'

export interface UseTodos {
  list: Todo[]
  loading: boolean
  error: Error | null
  reload: () => void
}

// Read path only. The server response is the only source of truth — no
// optimistic state. Action methods (addTodo/toggle/edit/remove) are Epic 2.
export function useTodos(): UseTodos {
  const [list, setList] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

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

  return { list, loading, error, reload }
}
