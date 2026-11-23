// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Game } from './game';
import { Board } from './board';
import { History } from './history';
import { GameStatus } from './game-status';
import { GameSkeleton } from './game-skeleton';
import { RestartControl } from './restart-control';
import type { GameSnapshot } from '@/lib/game';

const snapshot: GameSnapshot = {
  round: {
    id: 'test-round',
    number: 1,
    board: Array(9).fill(null),
    version: 0,
    outcome: null,
    line: [],
    turn: 'X',
  },
  scores: { X: 0, O: 0, draw: 0 },
  history: { items: [], total: 0, page: 1, pages: 1 },
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const reply = (data: unknown, ok = true) =>
  Promise.resolve({ ok, json: async () => data } as Response);

describe('game components', () => {
  it('offers nine accessible cells and prevents occupied and finished moves', () => {
    const onMove = vi.fn();
    const { rerender } = render(
      <Board
        round={{ ...snapshot.round, board: ['X', null, null, null, null, null, null, null, null] }}
        disabled={false}
        onMove={onMove}
      />,
    );
    expect(screen.getAllByRole('button')).toHaveLength(9);
    expect(screen.getByRole('button', { name: 'Row 1, column 1: X' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Row 1, column 2: empty' }));
    expect(onMove).toHaveBeenCalledWith(1);
    rerender(
      <Board round={{ ...snapshot.round, outcome: 'X' }} disabled={false} onMove={onMove} />,
    );
    expect(screen.getAllByRole('button').every((cell) => cell.hasAttribute('disabled'))).toBe(true);
  });
  it('announces turns, wins and draws', () => {
    const { rerender } = render(<GameStatus round={snapshot.round} saving={false} />);
    expect(screen.getByRole('status')).toHaveTextContent('Player X’s turn');
    rerender(<GameStatus round={{ ...snapshot.round, outcome: 'O' }} saving={false} />);
    expect(screen.getByRole('status')).toHaveTextContent('Player O wins!');
    rerender(<GameStatus round={{ ...snapshot.round, outcome: 'draw' }} saving={false} />);
    expect(screen.getByRole('status')).toHaveTextContent('It’s a draw!');
  });
  it('shows empty history and a meaningful loading skeleton', () => {
    render(
      <>
        <History history={snapshot.history} pending={false} onPage={vi.fn()} />
        <GameSkeleton />
      </>,
    );
    expect(screen.getByText('A clean slate')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading game' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });
  it('paginates history through its controls', () => {
    const onPage = vi.fn();
    render(
      <History
        history={{ ...snapshot.history, total: 7, pages: 2 }}
        pending={false}
        onPage={onPage}
      />,
    );
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPage).toHaveBeenCalledWith(2);
  });
  it('asks before abandoning an unfinished round', () => {
    const showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: { configurable: true, value: showModal },
      close: {
        configurable: true,
        value: function (this: HTMLDialogElement) {
          this.open = false;
        },
      },
    });
    const restart = vi.fn();
    render(<RestartControl unfinished pending={false} disabled={false} onRestart={restart} />);
    fireEvent.click(screen.getByRole('button', { name: 'Restart Game' }));
    expect(showModal).toHaveBeenCalledOnce();
    expect(restart).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }));
    expect(restart).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Restart Game' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Restart Game' })[1]!);
    expect(restart).toHaveBeenCalledOnce();
  });
});

describe('game client requests and recovery', () => {
  it('loads the session and sends versioned moves', async () => {
    const next = {
      ...snapshot,
      round: {
        ...snapshot.round,
        board: ['X', null, null, null, null, null, null, null, null],
        turn: 'O',
        version: 1,
      },
    };
    const fetcher = vi
      .fn()
      .mockImplementationOnce(() => reply(snapshot))
      .mockImplementationOnce(() => reply(next));
    vi.stubGlobal('fetch', fetcher);
    render(<Game />);
    await screen.findByText('Player X’s turn');
    fireEvent.click(screen.getByRole('button', { name: 'Row 1, column 1: empty' }));
    await screen.findByText('Player O’s turn');
    expect(JSON.parse(fetcher.mock.calls[1]![1].body)).toEqual({
      action: 'move',
      roundId: 'test-round',
      version: 0,
      cell: 0,
    });
    expect(screen.getByRole('button', { name: 'Row 1, column 1: X' })).toBeDisabled();
  });
  it('shows a recoverable initial-load error', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('Connection lost.'))
      .mockImplementationOnce(() => reply(snapshot));
    vi.stubGlobal('fetch', fetcher);
    render(<Game />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection lost.');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh game' }));
    await screen.findByText('Player X’s turn');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('preserves the board on a failed save and refreshes before allowing further moves', async () => {
    const fetcher = vi
      .fn()
      .mockImplementationOnce(() => reply(snapshot))
      .mockImplementationOnce(() => reply({ error: 'The board changed.' }, false))
      .mockImplementationOnce(() => reply(snapshot));
    vi.stubGlobal('fetch', fetcher);
    render(<Game />);
    await screen.findByText('Player X’s turn');
    fireEvent.click(screen.getByRole('button', { name: 'Row 1, column 1: empty' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The board changed.');
    expect(screen.getByRole('button', { name: 'Row 1, column 2: empty' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh game' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Row 1, column 2: empty' })).toBeEnabled(),
    );
  });
  it('disables moves while a save is in progress', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementationOnce(() => reply(snapshot))
        .mockImplementation(() => new Promise(() => undefined)),
    );
    render(<Game />);
    await screen.findByText('Player X’s turn');
    fireEvent.click(screen.getByRole('button', { name: 'Row 1, column 1: empty' }));
    await screen.findByText('Saving your move…');
    expect(screen.getByRole('button', { name: 'Row 1, column 2: empty' })).toBeDisabled();
  });
});
