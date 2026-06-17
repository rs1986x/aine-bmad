// Exact copy from EXPERIENCE.md Voice & Tone — do not paraphrase. The add-input
// CTA is wired here (and in the shell) when AddTodoForm lands in Story 2.2.
export function EmptyState() {
  return (
    <div className="empty-state">
      <h1 className="empty-state__headline">No todos yet.</h1>
      <p className="empty-state__subline">Add your first one above.</p>
    </div>
  )
}
