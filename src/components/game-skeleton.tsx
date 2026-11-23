export function GameSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading game"
      aria-busy="true"
      className="grid gap-8 md:grid-cols-2"
    >
      <div className="space-y-6">
        <div className="rounded-container bg-muted h-16 motion-safe:animate-pulse" />
        <div className="grid aspect-square grid-cols-3 gap-3">
          {Array.from({ length: 9 }, (_, cell) => (
            <div key={cell} className="rounded-container bg-muted motion-safe:animate-pulse" />
          ))}
        </div>
        <div className="rounded-control bg-muted h-12 motion-safe:animate-pulse" />
      </div>
      <div className="space-y-6">
        <div className="rounded-container bg-muted h-40 motion-safe:animate-pulse" />
        <div className="rounded-container bg-muted h-64 motion-safe:animate-pulse" />
      </div>
      <span className="sr-only">Loading your board, scores, and history…</span>
    </div>
  );
}
