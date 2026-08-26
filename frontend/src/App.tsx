import { useEffect, useState } from 'react'
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
    addTodo,
    toggleTodo,
    editTodo,
    removeTodo,
  } = useTodos()
  const [addFocusRequest, setAddFocusRequest] = useState(0)

  useEffect(() => {
    if (!announcement) return
    const timer = window.setTimeout(dismissAnnouncement, 1_000)
    return () => window.clearTimeout(timer)
  }, [announcement, announcementId, dismissAnnouncement])

  return (
    <main className="app-shell" aria-busy={loading || retrying}>
      {loadFailed && errorMessage ? (
        <>
          <ErrorBanner key={errorId} message={errorMessage} retrying={retrying} onRetry={retry} />
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
            focusRequest={addFocusRequest}
          />
          {errorMessage ? (
            <ErrorBanner key={errorId} message={errorMessage} retrying={retrying} onRetry={retry} />
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
