import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import * as schema from './schema';

export function openDatabase(path: string) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('journal_mode = WAL');
  const version = sqlite.pragma('user_version', { simple: true }) as number;
  if (version < 1)
    sqlite.transaction(() => {
      sqlite.exec(`
      CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS rounds (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        number INTEGER NOT NULL CHECK(number > 0),
        board TEXT NOT NULL DEFAULT '---------' CHECK(length(board) = 9),
        version INTEGER NOT NULL DEFAULT 0 CHECK(version BETWEEN 0 AND 9),
        result TEXT CHECK(result IN ('X','O','draw','abandoned')),
        ended_at INTEGER
      );
      CREATE UNIQUE INDEX IF NOT EXISTS round_session_number ON rounds(session_id, number);
      CREATE INDEX IF NOT EXISTS round_session_result ON rounds(session_id, result, number);
      CREATE TABLE IF NOT EXISTS moves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
        cell INTEGER NOT NULL CHECK(cell BETWEEN 0 AND 8),
        player TEXT NOT NULL CHECK(player IN ('X','O')),
        played_at INTEGER NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS move_round_cell ON moves(round_id, cell);
      PRAGMA user_version = 1;
    `);
    })();
  return { db: drizzle(sqlite, { schema }), sqlite };
}
export type GameDatabase = ReturnType<typeof openDatabase>['db'];
const globalDatabase = globalThis as typeof globalThis & {
  gameDatabase?: ReturnType<typeof openDatabase>;
};
export function getDatabase() {
  globalDatabase.gameDatabase ??= openDatabase(join(process.cwd(), 'data', 'game.db'));
  return globalDatabase.gameDatabase.db;
}
