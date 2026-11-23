import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at').notNull(),
});
export const rounds = sqliteTable(
  'rounds',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    board: text('board').notNull().default('---------'),
    version: integer('version').notNull().default(0),
    result: text('result', { enum: ['X', 'O', 'draw', 'abandoned'] }),
    endedAt: integer('ended_at'),
  },
  (table) => [
    uniqueIndex('round_session_number').on(table.sessionId, table.number),
    index('round_session_result').on(table.sessionId, table.result, table.number),
  ],
);
export const moves = sqliteTable(
  'moves',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    roundId: text('round_id')
      .notNull()
      .references(() => rounds.id, { onDelete: 'cascade' }),
    cell: integer('cell').notNull(),
    player: text('player', { enum: ['X', 'O'] }).notNull(),
    playedAt: integer('played_at').notNull(),
  },
  (table) => [uniqueIndex('move_round_cell').on(table.roundId, table.cell)],
);
