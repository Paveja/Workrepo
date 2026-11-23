import type { Round } from '@/lib/game';

export function GameStatus({ round, saving }: { round: Round; saving: boolean }) {
  const title =
    round.outcome === 'draw'
      ? 'It’s a draw!'
      : round.outcome
        ? `Player ${round.outcome} wins!`
        : `Player ${round.turn}’s turn`;
  const detail = round.outcome
    ? 'Restart the game for another round.'
    : saving
      ? 'Saving your move…'
      : 'Choose an empty square to play.';
  return (
    <div className="rounded-container border-border bg-card flex min-h-24 items-center gap-4 border p-4 shadow-sm">
      <span
        aria-hidden="true"
        className={`rounded-control bg-muted flex h-12 w-12 shrink-0 items-center justify-center text-3xl font-semibold ${(round.outcome ?? round.turn) === 'O' ? 'text-accent' : 'text-primary'}`}
      >
        {round.outcome === 'draw' ? '=' : (round.outcome ?? round.turn)}
      </span>
      <div role="status" aria-live="polite" aria-atomic="true">
        <p className={`text-xl font-semibold ${round.outcome ? 'text-success' : ''}`}>{title}</p>
        <p className="text-muted-foreground mt-1 text-base">{detail}</p>
      </div>
    </div>
  );
}
