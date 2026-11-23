'use client';
import { useGame } from '@/lib/use-game';
import { Board } from './board';
import { Button } from './button';
import { GameSkeleton } from './game-skeleton';
import { GameStatus } from './game-status';
import { History } from './history';
import { RestartControl } from './restart-control';
import { Scoreboard } from './scoreboard';

export function Game() {
  const { data, pending, error, refresh, move, restart } = useGame();
  if (!data && pending) return <GameSkeleton />;
  const disabled = Boolean(pending || error);
  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className={[
            'rounded-container border-destructive bg-card',
            'flex flex-wrap items-center justify-between gap-4 border p-4',
          ].join(' ')}
        >
          <div className="space-y-1">
            <p className="text-destructive font-semibold">Let’s get you back in the game</p>
            <p className="text-muted-foreground text-base">{error}</p>
          </div>
          <Button variant="secondary" disabled={Boolean(pending)} onClick={() => refresh()}>
            {pending ? 'Refreshing…' : 'Refresh game'}
          </Button>
        </div>
      )}
      {data && (
        <div className="grid items-start gap-8 md:grid-cols-2">
          <section aria-label={`Round ${data.round.number}`} className="animate-enter space-y-6">
            <GameStatus round={data.round} saving={pending === 'move'} />
            <Board round={data.round} disabled={disabled} onMove={move} />
            <RestartControl
              unfinished={data.round.version > 0 && !data.round.outcome}
              pending={pending === 'restart'}
              disabled={disabled}
              onRestart={restart}
            />
            <p className="text-muted-foreground text-center text-base">
              X goes first. Connect three to win.
            </p>
          </section>
          <aside aria-label="Session results" className="animate-enter space-y-6">
            <Scoreboard scores={data.scores} />
            <History history={data.history} pending={Boolean(pending)} onPage={refresh} />
          </aside>
        </div>
      )}
    </div>
  );
}
