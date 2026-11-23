import { and, count, desc, eq, gt, inArray, lt } from 'drizzle-orm';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { GameDatabase } from './db';
import { moves, rounds, sessions } from './db/schema';
import {
  evaluate,
  GameError,
  HISTORY_PAGE_SIZE,
  takeTurn,
  type Board,
  type GameSnapshot,
} from './game';

const SESSION_LIFETIME = 24 * 60 * 60 * 1000;
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const decode = (board: string): Board =>
  [...board].map((cell) => (cell === 'X' || cell === 'O' ? cell : null));

export function createGameStore(db: GameDatabase) {
  function findSession(token: string | undefined) {
    if (!token || !/^[\w-]{43}$/.test(token)) return undefined;
    return db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, digest(token)), gt(sessions.expiresAt, Date.now())))
      .limit(1)
      .get();
  }
  function createSession() {
    const token = randomBytes(32).toString('base64url');
    const id = digest(token);
    db.transaction((tx) => {
      tx.delete(sessions).where(lt(sessions.expiresAt, Date.now())).run();
      tx.insert(sessions)
        .values({ id, expiresAt: Date.now() + SESSION_LIFETIME })
        .run();
      tx.insert(rounds).values({ id: randomUUID(), sessionId: id, number: 1 }).run();
    });
    return { token, id };
  }
  function snapshot(sessionId: string, page = 1): GameSnapshot {
    return db.transaction((tx) => {
      const current = tx
        .select()
        .from(rounds)
        .where(eq(rounds.sessionId, sessionId))
        .orderBy(desc(rounds.number))
        .limit(1)
        .get();
      if (!current) throw new GameError('Your session expired. Reload to start again.', 401);
      const board = decode(current.board);
      const result = evaluate(board);
      const totals = tx
        .select({ result: rounds.result, total: count() })
        .from(rounds)
        .where(and(eq(rounds.sessionId, sessionId), inArray(rounds.result, ['X', 'O', 'draw'])))
        .groupBy(rounds.result)
        .all();
      const scores = { X: 0, O: 0, draw: 0 };
      for (const row of totals)
        if (row.result && row.result !== 'abandoned') scores[row.result] = row.total;
      const total = scores.X + scores.O + scores.draw;
      const pages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
      const safePage = Math.min(page, pages);
      const history = tx
        .select()
        .from(rounds)
        .where(and(eq(rounds.sessionId, sessionId), inArray(rounds.result, ['X', 'O', 'draw'])))
        .orderBy(desc(rounds.number))
        .limit(HISTORY_PAGE_SIZE)
        .offset((safePage - 1) * HISTORY_PAGE_SIZE)
        .all();
      return {
        round: {
          id: current.id,
          number: current.number,
          board,
          version: current.version,
          outcome: result.outcome,
          line: result.line,
          turn: current.version % 2 === 0 ? 'X' : 'O',
        },
        scores,
        history: {
          total,
          page: safePage,
          pages,
          items: history.map((round) => ({
            id: round.id,
            number: round.number,
            result: round.result as 'X' | 'O' | 'draw',
            endedAt: round.endedAt!,
            moves: round.version,
          })),
        },
      };
    });
  }
  function mutate(
    sessionId: string,
    input: { action: 'move' | 'restart'; roundId: string; version: number; cell?: number },
  ) {
    try {
      db.transaction(
        (tx) => {
          const current = tx
            .select()
            .from(rounds)
            .where(eq(rounds.sessionId, sessionId))
            .orderBy(desc(rounds.number))
            .limit(1)
            .get();
          if (!current || current.id !== input.roundId || current.version !== input.version) {
            throw new GameError('The board changed. Refresh the game and try again.');
          }
          if (input.action === 'restart') {
            if (!current.result)
              tx.update(rounds)
                .set({ result: 'abandoned', endedAt: Date.now() })
                .where(eq(rounds.id, current.id))
                .run();
            tx.insert(rounds)
              .values({ id: randomUUID(), sessionId, number: current.number + 1 })
              .run();
            return;
          }
          const board = takeTurn(decode(current.board), input.cell ?? -1);
          tx.insert(moves)
            .values({
              roundId: current.id,
              cell: input.cell!,
              player: board[input.cell!]!,
              playedAt: Date.now(),
            })
            .run();
          const result = evaluate(board).outcome;
          tx.update(rounds)
            .set({
              board: board.map((cell) => cell ?? '-').join(''),
              version: current.version + 1,
              result,
              endedAt: result ? Date.now() : null,
            })
            .where(eq(rounds.id, current.id))
            .run();
        },
        { behavior: 'immediate' },
      );
    } catch (error) {
      const cause = error instanceof Error && error.cause ? error.cause : error;
      if (
        cause instanceof Error &&
        'code' in cause &&
        String(cause.code).startsWith('SQLITE_CONSTRAINT')
      ) {
        throw new GameError('This move was already recorded. Refresh the game.');
      }
      throw error;
    }
    return snapshot(sessionId);
  }
  return { findSession, createSession, snapshot, mutate };
}
export type GameStore = ReturnType<typeof createGameStore>;
