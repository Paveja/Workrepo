import type { GameSnapshot } from '@/lib/game';

export function Scoreboard({ scores }: { scores: GameSnapshot['scores'] }) {
  return (
    <section
      aria-labelledby="score-title"
      className="rounded-container border-border bg-card border p-6 shadow-sm"
    >
      <h2 id="score-title" className="text-xl font-semibold">
        Scoreboard
      </h2>
      <dl className="divide-border mt-6 grid grid-cols-3 divide-x text-center">
        {(['X', 'O', 'draw'] as const).map((player) => (
          <div key={player} className="px-2">
            <dt
              className={`text-base font-medium ${player === 'X' ? 'text-primary' : player === 'O' ? 'text-accent' : 'text-muted-foreground'}`}
            >
              {player === 'draw' ? 'Draws' : `Player ${player}`}
            </dt>
            <dd className="mt-2 text-3xl font-semibold tabular-nums">{scores[player]}</dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground mt-6 text-base">Scores stay with this browser session.</p>
    </section>
  );
}
