import { useCallback, useEffect, useRef, useState } from 'react'
import type { Todo, UpdateTodoInput } from '../types/todo'
import {
  ApiError,
  createTodo,
  deleteTodo,
  getTodos,
  isAbortError,
  isConnectionError,
  updateTodo,
} from '../api/api'

type FailureKind = 'load' | 'save'

interface RetryFailure {
  id: number
  owner: symbol
  error: Error
  kind: FailureKind
  retry: () => Promise<void>
}

interface ConfirmedMutation {
  sequence: number
  reconcile: (todos: Todo[]) => Todo[]
}

interface Announcement {
  id: number
  message: string
}

export interface UseTodos {
  list: Todo[]
  loading: boolean
  loadFailed: boolean
  error: Error | null
  errorId: number | null
  errorMessage: string | null
  retrying: boolean
  announcement: string
  announcementId: number
  dismissAnnouncement: () => void
  reload: () => void
  retry: () => void
  registerFailure: (owner: symbol, error: unknown, retry: () => Promise<void>) => void
  clearFailure: (owner: symbol) => void
  addTodo: (description: string) => Promise<Todo>
  toggleTodo: (todo: Todo) => Promise<Todo>
  editTodo: (id: string, description: string) => Promise<Todo>
  removeTodo: (id: string, description: string) => Promise<void>
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

function failureMessage(failure: RetryFailure | null): string | null {
  if (!failure) return null
  if (isConnectionError(failure.error)) {
    return "Couldn't connect. Check your connection and retry."
  }
  return failure.kind === 'load'
    ? "Couldn't load your todos. Retry."
    : "Couldn't save that change. Retry."
}

export function useTodos(): UseTodos {
  const [list, setList] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [failures, setFailures] = useState<RetryFailure[]>([])
  const [retrying, setRetrying] = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const failureId = useRef(0)
  const announcementId = useRef(0)
  const retryPending = useRef(false)
  const mounted = useRef(true)
  const loadGeneration = useRef(0)
  const loadController = useRef<AbortController | null>(null)
  const runLoadRef = useRef<(clearStandingFailure: boolean) => Promise<void>>(async () => {})
  const listRef = useRef<Todo[]>([])
  const mutationSequence = useRef(0)
  const confirmedMutations = useRef<ConfirmedMutation[]>([])
  const mutationControllers = useRef(new Map<string, AbortController>())
  const mutationTokens = useRef(new Map<string, symbol>())
  const loadOwner = useRef(Symbol('load')).current
  const failure = failures[0] ?? null

  const clearFailure = useCallback((owner: symbol) => {
    setFailures((current) => current.filter((item) => item.owner !== owner))
  }, [])

  const registerFailure = useCallback(
    (owner: symbol, error: unknown, retryAction: () => Promise<void>) => {
      if (!mounted.current || isAbortError(error)) return
      failureId.current += 1
      const nextFailure = {
        id: failureId.current,
        owner,
        error: asError(error),
        kind: 'save' as const,
        retry: retryAction,
      }
      setFailures((current) => {
        const existingIndex = current.findIndex((item) => item.owner === owner)
        if (existingIndex === -1) return [...current, nextFailure]
        return current.map((item, index) => (index === existingIndex ? nextFailure : item))
      })
    },
    [],
  )

  const runMutation = useCallback(
    async <T>(
      key: string,
      request: (signal: AbortSignal) => Promise<T>,
      commit: (current: Todo[], result: T) => Todo[] | null,
      reconcile: (todos: Todo[], result: T) => Todo[],
      successAnnouncement?: (result: T) => string,
    ): Promise<T> => {
      mutationControllers.current.get(key)?.abort()
      const controller = new AbortController()
      const token = Symbol(key)
      mutationTokens.current.set(key, token)
      mutationControllers.current.set(key, controller)

      try {
        const result = await request(controller.signal)
        if (!mounted.current || mutationTokens.current.get(key) !== token) {
          throw new ApiError('aborted', 'Request superseded', 0)
        }
        const committed = commit(listRef.current, result)
        if (committed) {
          listRef.current = committed
          setList(committed)
          mutationSequence.current += 1
          confirmedMutations.current.push({
            sequence: mutationSequence.current,
            reconcile: (todos) => reconcile(todos, result),
          })
        }
        if (committed && successAnnouncement) {
          announcementId.current += 1
          const nextAnnouncement = {
            id: announcementId.current,
            message: successAnnouncement(result),
          }
          setAnnouncements((current) => [...current, nextAnnouncement])
        }
        return result
      } catch (error) {
        if (!mounted.current || mutationTokens.current.get(key) !== token) {
          throw new ApiError('aborted', 'Request superseded', 0)
        }
        throw error
      } finally {
        if (mutationTokens.current.get(key) === token) {
          mutationControllers.current.delete(key)
          mutationTokens.current.delete(key)
        }
      }
    },
    [],
  )

  const addTodo = useCallback(
    (description: string): Promise<Todo> =>
      runMutation(
        'create',
        (signal) => createTodo({ description }, signal),
        (current, created) => {
          if (current.some((todo) => todo.id.toLowerCase() === created.id.toLowerCase())) {
            throw new ApiError('malformed_response', 'Created Todo id already exists', 0)
          }
          return [created, ...current]
        },
        (todos, created) =>
          todos.some((todo) => todo.id.toLowerCase() === created.id.toLowerCase())
            ? todos.map((todo) =>
                todo.id.toLowerCase() === created.id.toLowerCase() ? created : todo,
              )
            : [created, ...todos],
        (created) => `Todo added: ${created.description}.`,
      ),
    [runMutation],
  )

  const confirmedUpdate = useCallback(
    (
      id: string,
      input: UpdateTodoInput,
      successAnnouncement?: (todo: Todo) => string,
    ): Promise<Todo> =>
      runMutation(
        `update:${id}`,
        (signal) => updateTodo(id, input, signal),
        (current, updated) => {
          if (!current.some((item) => item.id === updated.id)) return null
          return current.map((item) => (item.id === updated.id ? updated : item))
        },
        (todos, updated) =>
          todos.some((item) => item.id === updated.id)
            ? todos.map((item) => (item.id === updated.id ? updated : item))
            : [updated, ...todos],
        successAnnouncement,
      ),
    [runMutation],
  )

  const toggleTodo = useCallback(
    (todo: Todo): Promise<Todo> =>
      confirmedUpdate(
        todo.id,
        {
          completed: !todo.completed,
        },
        (updated) =>
          updated.completed
            ? `Todo completed: ${updated.description}.`
            : `Todo marked active: ${updated.description}.`,
      ),
    [confirmedUpdate],
  )

  const editTodo = useCallback(
    (id: string, description: string): Promise<Todo> => confirmedUpdate(id, { description }),
    [confirmedUpdate],
  )

  const removeTodo = useCallback(
    (id: string, description: string): Promise<void> =>
      runMutation(
        `delete:${id}`,
        (signal) => deleteTodo(id, signal),
        (current) => {
          if (!current.some((item) => item.id === id)) return null
          return current.filter((item) => item.id !== id)
        },
        (todos) => todos.filter((item) => item.id !== id),
        () => `Todo deleted: ${description}.`,
      ),
    [runMutation],
  )

  const runLoad = useCallback(
    async (clearStandingFailure: boolean): Promise<void> => {
      loadController.current?.abort()
      const generation = loadGeneration.current + 1
      loadGeneration.current = generation
      const mutationAtStart = mutationSequence.current
      const controller = new AbortController()
      loadController.current = controller
      if (clearStandingFailure) clearFailure(loadOwner)
      setLoading(true)

      try {
        const todos = await getTodos(controller.signal)
        if (!mounted.current || generation !== loadGeneration.current) return
        const reconciled = confirmedMutations.current
          .filter((mutation) => mutation.sequence > mutationAtStart)
          .reduce((current, mutation) => mutation.reconcile(current), todos)
        listRef.current = reconciled
        setList(reconciled)
        confirmedMutations.current = confirmedMutations.current.filter(
          (mutation) => mutation.sequence > mutationSequence.current,
        )
      } catch (error) {
        if (!mounted.current || generation !== loadGeneration.current || isAbortError(error)) return
        if (mutationSequence.current !== mutationAtStart) return
        failureId.current += 1
        const nextFailure = {
          id: failureId.current,
          owner: loadOwner,
          error: asError(error),
          kind: 'load' as const,
          retry: () => runLoadRef.current(false),
        }
        setFailures((current) => {
          const existingIndex = current.findIndex((item) => item.owner === loadOwner)
          if (existingIndex === -1) return [...current, nextFailure]
          return current.map((item, index) => (index === existingIndex ? nextFailure : item))
        })
        throw error
      } finally {
        if (mounted.current && generation === loadGeneration.current) setLoading(false)
      }
    },
    [clearFailure, loadOwner],
  )

  const reload = useCallback(() => {
    void runLoad(true).catch(() => undefined)
  }, [runLoad])

  useEffect(() => {
    runLoadRef.current = runLoad
  }, [runLoad])

  useEffect(() => {
    const controllers = mutationControllers.current
    const tokens = mutationTokens.current
    mounted.current = true
    void runLoad(false).catch(() => undefined)
    return () => {
      mounted.current = false
      loadController.current?.abort()
      controllers.forEach((controller) => controller.abort())
      controllers.clear()
      tokens.clear()
    }
  }, [runLoad])

  const retry = useCallback(() => {
    if (!failure || retryPending.current) return
    const attemptedFailure = failure
    retryPending.current = true
    setRetrying(true)

    void attemptedFailure
      .retry()
      .then(() => {
        setFailures((current) => current.filter((item) => item.id !== attemptedFailure.id))
      })
      .catch(() => undefined)
      .finally(() => {
        retryPending.current = false
        if (mounted.current) setRetrying(false)
      })
  }, [failure])

  const dismissAnnouncement = useCallback(() => {
    setAnnouncements((current) => current.slice(1))
  }, [])

  const currentAnnouncement = announcements[0]

  return {
    list,
    loading,
    loadFailed: failure?.kind === 'load',
    error: failure?.error ?? null,
    errorId: failure?.id ?? null,
    errorMessage: failureMessage(failure),
    retrying,
    announcement: currentAnnouncement?.message ?? '',
    announcementId: currentAnnouncement?.id ?? 0,
    dismissAnnouncement,
    reload,
    retry,
    registerFailure,
    clearFailure,
    addTodo,
    toggleTodo,
    editTodo,
    removeTodo,
  }
}
