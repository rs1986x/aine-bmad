import { EmptyState } from './components/EmptyState'
import { LoadingSkeleton } from './components/LoadingSkeleton'
import { useTodos } from './hooks/useTodos'

function App() {
  const { list, loading, error, reload } = useTodos()

  return (
    <main className="app-shell" aria-busy={loading}>
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        // Minimal fallback so an early load failure isn't a blank screen. The
        // polished ErrorBanner + full retry UX is Story 2.5.
        <div className="load-error" role="alert">
          <span>Couldn't load your todos.</span>
          <button type="button" className="load-error__retry" onClick={reload}>
            Retry
          </button>
        </div>
      ) : list.length === 0 ? (
        <EmptyState />
      ) : (
        // A populated list cannot happen against a fresh DB in Epic 1; the real
        // TodoList is Story 2.1. Render a minimal placeholder — do not crash.
        <p>{list.length} todos</p>
      )}
    </main>
  )
}

export default App
