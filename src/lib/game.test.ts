import { describe, expect, it } from 'vitest';
import { evaluate, takeTurn, WINNING_LINES, type Board } from './game';

describe('game rules', () => {
  for (const player of ['X', 'O'] as const) {
    for (const line of WINNING_LINES) {
      it(`detects ${player} winning on ${line.join(',')}`, () => {
        const board: Board = Array(9).fill(null);
        for (const cell of line) board[cell] = player;
        expect(evaluate(board)).toEqual({ outcome: player, line });
      });
    }
  }
  it('alternates players without mutating the original board', () => {
    const empty: Board = Array(9).fill(null);
    const first = takeTurn(empty, 0);
    expect(takeTurn(first, 1).slice(0, 2)).toEqual(['X', 'O']);
    expect(empty.every((cell) => cell === null)).toBe(true);
  });
  it('detects a full-board draw', () => {
    expect(evaluate(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X']).outcome).toBe('draw');
  });
  it('prioritizes a final-move win over a draw', () => {
    expect(evaluate(['X', 'O', 'X', 'O', 'X', 'O', 'O', 'X', 'X']).outcome).toBe('X');
  });
  it('rejects occupied, invalid, and post-game moves', () => {
    expect(() => takeTurn(['X', null, null, null, null, null, null, null, null], 0)).toThrow(
      'occupied',
    );
    for (const cell of [-1, 9, 1.5]) expect(() => takeTurn(Array(9).fill(null), cell)).toThrow();
    expect(() => takeTurn(['X', 'X', 'X', 'O', 'O', null, null, null, null], 5)).toThrow(
      'finished',
    );
    expect(() => takeTurn(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'], 0)).toThrow('finished');
  });
});
