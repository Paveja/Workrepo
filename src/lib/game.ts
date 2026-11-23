export type Player = 'X' | 'O';
export type Cell = Player | null;
export type Outcome = Player | 'draw';
export type Board = Cell[];
export const HISTORY_PAGE_SIZE = 6;
export const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

export class GameError extends Error {
  constructor(
    message: string,
    public status = 409,
  ) {
    super(message);
  }
}

export function evaluate(board: Board): { outcome: Outcome | null; line: readonly number[] } {
  for (const line of WINNING_LINES) {
    const player = board[line[0]];
    if (player && line.every((cell) => board[cell] === player)) {
      return { outcome: player, line };
    }
  }
  return { outcome: board.every(Boolean) ? 'draw' : null, line: [] };
}

export function takeTurn(board: Board, cell: number): Board {
  if (!Number.isInteger(cell) || cell < 0 || cell > 8) {
    throw new GameError('Choose a cell on the board.', 400);
  }
  if (evaluate(board).outcome)
    throw new GameError('This round has finished. Restart to play again.');
  if (board[cell]) throw new GameError('That cell is already occupied.');
  const player: Player = board.filter(Boolean).length % 2 === 0 ? 'X' : 'O';
  return board.map((value, index) => (index === cell ? player : value));
}

export type Round = {
  id: string;
  number: number;
  board: Board;
  version: number;
  outcome: Outcome | null;
  line: readonly number[];
  turn: Player;
};
export type HistoryItem = {
  id: string;
  number: number;
  result: Outcome;
  endedAt: number;
  moves: number;
};
export type GameSnapshot = {
  round: Round;
  scores: Record<Outcome, number>;
  history: { items: HistoryItem[]; total: number; page: number; pages: number };
};
