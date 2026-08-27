import { useEffect, useRef, useState } from 'react'
import { AddTodoForm } from './components/AddTodoForm'
import { EmptyState } from './components/EmptyState'
import { ErrorBanner } from './components/ErrorBanner'
import { LoadingSkeleton } from './components/LoadingSkeleton'
import { TodoList } from './components/TodoList'
import { useTodos } from './hooks/useTodos'

function App() {
  const {
    list,
    loading,
    loadFailed,
    errorId,
    errorMessage,
    retrying,
    announcement,
    announcementId,
    dismissAnnouncement,
    retry,
    registerFailure,
    clearFailure,
    releaseOwner,
    addTodo,
    toggleTodo,
    editTodo,
    removeTodo,
  } = useTodos()
  const [addFocusRequest, setAddFocusRequest] = useState(0)
  const [retryFocusId, setRetryFocusId] = useState<number | null>(null)
  const retryWasPending = useRef(false)

  useEffect(() => {
    if (!announcement) return
    const timer = window.setTimeout(dismissAnnouncement, 1_000)
    return () => window.clearTimeout(timer)
  }, [announcement, announcementId, dismissAnnouncement])

  useEffect(() => {
    if (retryWasPending.current && !retrying && errorMessage && errorId !== null) {
      setRetryFocusId(errorId)
    }
    retryWasPending.current = retrying
  }, [errorId, errorMessage, retrying])

  return (
    <main className="app-shell" aria-busy={loading || retrying}>
      {/* Above the mutually exclusive branches so the outline keeps a top-level
          heading in every state. Hidden visually: the design has no page title. */}
      <h1 className="sr-only">Todo</h1>
      {loadFailed && errorMessage ? (
        <>
          <ErrorBanner
            key={errorId}
            message={errorMessage}
            retrying={retrying}
            onRetry={retry}
            focusRetry={retryFocusId === errorId}
          />
          {loading ? <LoadingSkeleton /> : null}
        </>
      ) : loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          <AddTodoForm
            onAdd={addTodo}
            onFailure={registerFailure}
            onClearFailure={clearFailure}
            onReleaseOwner={releaseOwner}
            focusRequest={addFocusRequest}
          />
          {errorMessage ? (
            <ErrorBanner
              key={errorId}
              message={errorMessage}
              retrying={retrying}
              onRetry={retry}
              focusRetry={retryFocusId === errorId}
            />
          ) : null}
          {list.length === 0 ? (
            <EmptyState />
          ) : (
            <TodoList
              todos={list}
              onToggle={toggleTodo}
              onEdit={editTodo}
              onDelete={removeTodo}
              onFailure={registerFailure}
              onClearFailure={clearFailure}
              onReleaseOwner={releaseOwner}
              onFocusAdd={() => setAddFocusRequest((request) => request + 1)}
            />
          )}
        </>
      )}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        <span key={announcementId}>{announcement}</span>
      </p>
    </main>
  )
}

export default App
