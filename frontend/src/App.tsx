import { AddTodoForm } from './components/AddTodoForm'
import { EmptyState } from './components/EmptyState'
import { LoadingSkeleton } from './components/LoadingSkeleton'
import { TodoList } from './components/TodoList'
import { useTodos } from './hooks/useTodos'

function App() {
  const { list, loading, error, reload, addTodo } = useTodos()

  return (
    <main className="app-shell" aria-busy={loading}>
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        // Minimal fallback so an early load failure isn't a blank screen. The
        // polished ErrorBanner + full retry UX is Story 2.5. The add form is
        // intentionally absent here (and during loading).
        <div className="load-error" role="alert">
          <span>Couldn't load your todos.</span>
          <button type="button" className="load-error__retry" onClick={reload}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <AddTodoForm onAdd={addTodo} />
          {list.length === 0 ? <EmptyState /> : <TodoList todos={list} />}
        </>
      )}
    </main>
  )
}

export default App
