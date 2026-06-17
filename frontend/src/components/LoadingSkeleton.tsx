// Purely decorative placeholder rows. Marked aria-hidden so screen readers are
// not flooded with placeholder noise — the busy state is announced at the shell
// level (App.tsx).
export function LoadingSkeleton() {
  return (
    <div className="loading-skeleton" aria-hidden="true" data-testid="loading-skeleton">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="loading-skeleton__row" />
      ))}
    </div>
  )
}
