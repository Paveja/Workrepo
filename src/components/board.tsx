import type { Round } from '@/lib/game';

type Props = { round: Round; disabled: boolean; onMove: (cell: number) => void };
export function Board({ round, disabled, onMove }: Props) {
  return (
    <div
      role="group"
      aria-label="Tic-Tac-Toe board"
      className="grid aspect-square w-full grid-cols-3 gap-3"
    >
      {round.board.map((player, cell) => {
        const winning = round.line.includes(cell);
        return (
          <button
            key={cell}
            type="button"
            disabled={disabled || Boolean(player) || Boolean(round.outcome)}
            aria-label={`Row ${Math.floor(cell / 3) + 1}, column ${(cell % 3) + 1}: ${player ?? 'empty'}${winning ? ', winning cell' : ''}`}
            onClick={() => onMove(cell)}
            className={`group rounded-container focus-visible:outline-ring flex aspect-square min-h-16 items-center justify-center border text-5xl leading-none font-semibold transition-colors duration-150 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-default motion-reduce:transition-none ${winning ? 'border-success bg-success/10' : 'border-border bg-card enabled:hover:border-primary enabled:hover:bg-primary/5 shadow-sm enabled:active:scale-[0.98]'} ${player === 'O' ? 'text-accent' : 'text-primary'}`}
          >
            <span aria-hidden="true">
              {player ?? (
                <span className="opacity-0 group-enabled:group-hover:opacity-20">{round.turn}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
