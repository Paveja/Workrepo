import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { openDatabase } from './db';
import { createGameStore } from './game-store';
import { createGameHandlers, SESSION_COOKIE } from './game-handler';
import type { GameSnapshot } from './game';

let database: ReturnType<typeof openDatabase>;
let handlers: ReturnType<typeof createGameHandlers>;
let cookie: string;
let state: GameSnapshot;
const origin = 'http://game.test';
function request(method = 'GET', body?: unknown, headers: Record<string, string> = {}, query = '') {
  return new NextRequest(`${origin}/api/game${query}`, {
    method,
    headers: { origin, cookie, 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
}
async function move(cell: number) {
  const response = await handlers.POST(
    request('POST', {
      action: 'move',
      roundId: state.round.id,
      version: state.round.version,
      cell,
    }),
  );
  expect(response.status).toBe(200);
  state = await response.json();
}
async function restart() {
  const response = await handlers.POST(
    request('POST', { action: 'restart', roundId: state.round.id, version: state.round.version }),
  );
  expect(response.status).toBe(200);
  state = await response.json();
}
async function play(cells: number[]) {
  for (const cell of cells) await move(cell);
}

beforeEach(async () => {
  database = openDatabase(':memory:');
  handlers = createGameHandlers(createGameStore(database.db));
  cookie = '';
  const response = await handlers.GET(request());
  cookie = `${SESSION_COOKIE}=${response.cookies.get(SESSION_COOKIE)!.value}`;
  state = await response.json();
});
afterEach(() => {
  database.sqlite.close();
  vi.restoreAllMocks();
});

describe('game API and real SQLite persistence', () => {
  it('creates a private session and reads persisted moves back', async () => {
    await move(4);
    const reloaded = await (await handlers.GET(request())).json();
    expect(reloaded.round.board[4]).toBe('X');
    expect(database.sqlite.prepare('SELECT count(*) AS total FROM moves').get()).toEqual({
      total: 1,
    });
    expect(database.sqlite.prepare('SELECT id FROM sessions').get()).not.toEqual({
      id: cookie.split('=')[1],
    });
  });
  it('sets a session-only HttpOnly cookie', async () => {
    const response = await handlers.GET(request('GET', undefined, { cookie: '' }));
    const header = response.headers.get('set-cookie')!;
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=lax');
    expect(header).not.toContain('Max-Age');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('records wins exactly once and restart preserves scores and history', async () => {
    await play([0, 3, 1, 4, 2]);
    expect(state.round.outcome).toBe('X');
    expect(state.scores).toEqual({ X: 1, O: 0, draw: 0 });
    expect(state.history.items[0]?.result).toBe('X');
    const rejected = await handlers.POST(
      request('POST', { action: 'move', roundId: state.round.id, version: 5, cell: 8 }),
    );
    expect(rejected.status).toBe(409);
    await restart();
    expect(state.round.board).toEqual(Array(9).fill(null));
    expect(state.round.turn).toBe('X');
    expect(state.scores.X).toBe(1);
    expect(state.history.total).toBe(1);
  });
  it('tracks O wins and draws and excludes abandoned rounds', async () => {
    await move(0);
    await restart();
    expect(state.history.total).toBe(0);
    await play([0, 3, 1, 4, 8, 5]);
    expect(state.scores.O).toBe(1);
    await restart();
    await play([0, 1, 2, 4, 3, 5, 7, 6, 8]);
    expect(state.round.outcome).toBe('draw');
    expect(state.scores).toEqual({ X: 0, O: 1, draw: 1 });
    expect(state.history.items.map((item) => item.result)).toEqual(['draw', 'O']);
  });
  it('rejects stale, duplicate and occupied-cell moves', async () => {
    const old = { action: 'move', roundId: state.round.id, version: 0, cell: 0 };
    await move(0);
    expect((await handlers.POST(request('POST', old))).status).toBe(409);
    expect((await handlers.POST(request('POST', { ...old, version: 1 }))).status).toBe(409);
    const oldRound = state.round.id;
    await restart();
    expect((await handlers.POST(request('POST', { ...old, roundId: oldRound }))).status).toBe(409);
    expect(database.sqlite.prepare('SELECT count(*) AS total FROM moves').get()).toEqual({
      total: 1,
    });
  });
  it('isolates sessions and rejects another session round id', async () => {
    await move(0);
    const firstRound = state.round.id;
    const response = await handlers.GET(request('GET', undefined, { cookie: '' }));
    const second: GameSnapshot = await response.json();
    expect(second.round.board.every((cell) => cell === null)).toBe(true);
    cookie = `${SESSION_COOKIE}=${response.cookies.get(SESSION_COOKIE)!.value}`;
    expect(
      (
        await handlers.POST(
          request('POST', { action: 'move', roundId: firstRound, version: 1, cell: 1 }),
        )
      ).status,
    ).toBe(409);
  });
  it('rejects unauthenticated, expired and cross-origin mutations', async () => {
    const body = { action: 'restart', roundId: state.round.id, version: 0 };
    expect((await handlers.POST(request('POST', body, { cookie: '' }))).status).toBe(401);
    expect(
      (await handlers.POST(request('POST', body, { origin: 'http://evil.test' }))).status,
    ).toBe(403);
    expect(
      (await handlers.POST(request('POST', body, { 'sec-fetch-site': 'cross-site' }))).status,
    ).toBe(403);
    database.sqlite.prepare('UPDATE sessions SET expires_at = 0').run();
    expect((await handlers.POST(request('POST', body))).status).toBe(401);
    const fresh = await handlers.GET(request());
    expect(fresh.status).toBe(200);
    expect(database.sqlite.prepare('SELECT count(*) AS total FROM sessions').get()).toEqual({
      total: 1,
    });
  });
  it('validates JSON, payload size, cell values and page numbers', async () => {
    const body = { action: 'move', roundId: state.round.id, version: 0, cell: 20 };
    expect((await handlers.POST(request('POST', body))).status).toBe(400);
    expect((await handlers.POST(request('POST', '{'))).status).toBe(400);
    expect((await handlers.POST(request('POST', 'x'.repeat(1025)))).status).toBe(413);
    expect(
      (await handlers.POST(request('POST', body, { 'content-type': 'text/plain' }))).status,
    ).toBe(415);
    expect((await handlers.GET(request('GET', undefined, {}, '?page=0'))).status).toBe(400);
  });
  it('paginates history while scores cover all rounds', async () => {
    for (let round = 0; round < 7; round++) {
      await play([0, 3, 1, 4, 2]);
      await restart();
    }
    expect(state.history.items).toHaveLength(6);
    const page: GameSnapshot = await (
      await handlers.GET(request('GET', undefined, {}, '?page=2'))
    ).json();
    expect(page.history.items).toHaveLength(1);
    expect(page.history.total).toBe(7);
    expect(page.scores.X).toBe(7);
  });
  it('maps a database uniqueness violation to a conflict response', async () => {
    database.sqlite
      .prepare("INSERT INTO moves(round_id,cell,player,played_at) VALUES (?,0,'X',0)")
      .run(state.round.id);
    const response = await handlers.POST(
      request('POST', { action: 'move', roundId: state.round.id, version: 0, cell: 0 }),
    );
    expect(response.status).toBe(409);
    const reloaded: GameSnapshot = await (await handlers.GET(request())).json();
    expect(reloaded.round.version).toBe(0);
  });
  it('enforces move uniqueness at the database level', () => {
    const statement = database.sqlite.prepare(
      "INSERT INTO moves(round_id,cell,player,played_at) VALUES (?,0,'X',0)",
    );
    statement.run(state.round.id);
    expect(() => statement.run(state.round.id)).toThrow('UNIQUE');
  });
  it('returns a safe error when storage fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const broken = createGameHandlers({
      ...createGameStore(database.db),
      snapshot() {
        throw new Error('private failure');
      },
    });
    const response = await broken.GET(request());
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('private failure');
    expect(log).toHaveBeenCalledOnce();
  });
});
