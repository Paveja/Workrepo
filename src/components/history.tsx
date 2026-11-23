import type { GameSnapshot } from '@/lib/game';
import { Button } from './button';

export function History({
  history,
  pending,
  onPage,
}: {
  history: GameSnapshot['history'];
  pending: boolean;
  onPage: (page: number) => void;
}) {
  return (
    <section
      aria-labelledby="history-title"
      aria-busy={pending}
      className="rounded-container border-border bg-card border p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="history-title" className="text-xl font-semibold">
          Game history
        </h2>
        <span className="text-muted-foreground text-base">{history.total} completed</span>
      </div>
      {history.items.length === 0 ? (
        <div className="py-12 text-center">
          <span aria-hidden="true" className="text-muted-foreground text-3xl">
            —
          </span>
          <p className="mt-4 font-medium">A clean slate</p>
          <p className="text-muted-foreground mt-2 text-base text-pretty">
            Finish your first round to see the result here.
          </p>
        </div>
      ) : (
        <ol className="divide-border mt-4 divide-y">
          {history.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-4">
              <div>
                <p className="text-base font-medium">Round {item.number}</p>
                <p className="text-muted-foreground mt-1 text-base">{item.moves} moves</p>
              </div>
              <span
                className={[
                  'shrink-0 rounded-full px-3 py-1 text-base font-medium',
                  item.result === 'draw'
                    ? 'bg-muted text-muted-foreground'
                    : item.result === 'X'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-accent/10 text-accent',
                ].join(' ')}
              >
                {item.result === 'draw' ? 'Draw' : `${item.result} wins`}
              </span>
            </li>
          ))}
        </ol>
      )}
      {history.pages > 1 && (
        <nav
          aria-label="History pages"
          className="border-border mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4"
        >
          <Button
            variant="secondary"
            disabled={pending || history.page === 1}
            onClick={() => onPage(history.page - 1)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-base" role="status">
            {pending ? 'Loading…' : `${history.page} / ${history.pages}`}
          </span>
          <Button
            variant="secondary"
            disabled={pending || history.page === history.pages}
            onClick={() => onPage(history.page + 1)}
          >
            Next
          </Button>
        </nav>
      )}
    </section>
  );
}
