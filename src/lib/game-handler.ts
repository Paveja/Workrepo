import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { GameError } from './game';
import type { GameStore } from './game-store';

export const SESSION_COOKIE = 'ttt-session';
const base = { roundId: z.uuid(), version: z.number().int().min(0).max(9) };
const mutation = z.discriminatedUnion('action', [
  z.object({ ...base, action: z.literal('move'), cell: z.number().int().min(0).max(8) }).strict(),
  z.object({ ...base, action: z.literal('restart') }).strict(),
]);
const pageSchema = z.coerce.number().int().min(1).max(100000).default(1);

function assertOrigin(request: NextRequest) {
  const site = request.headers.get('sec-fetch-site');
  const origin = request.headers.get('origin');
  if (
    (site && !['same-origin', 'none'].includes(site)) ||
    (origin && origin !== request.nextUrl.origin)
  ) {
    throw new GameError('Cross-site request blocked.', 403);
  }
  if (request.method !== 'GET' && !origin)
    throw new GameError('A same-origin request is required.', 403);
}

export function createGameHandlers(store: GameStore) {
  async function handle(request: NextRequest) {
    try {
      assertOrigin(request);
      let token = request.cookies.get(SESSION_COOKIE)?.value;
      let session = store.findSession(token);
      const newSession = !session;
      if (!session && request.method !== 'GET')
        throw new GameError('Your session expired. Refresh the game to continue.', 401);
      if (request.method === 'GET') {
        const page = pageSchema.safeParse(request.nextUrl.searchParams.get('page') ?? undefined);
        if (!page.success) throw new GameError('Choose a valid history page.', 400);
        if (!session) {
          const created = store.createSession();
          token = created.token;
          session = { id: created.id, expiresAt: 0 };
        }
        const response = NextResponse.json(store.snapshot(session.id, page.data));
        response.headers.set('Cache-Control', 'no-store');
        if (newSession)
          response.cookies.set(SESSION_COOKIE, token!, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
          });
        return response;
      }
      if (!request.headers.get('content-type')?.startsWith('application/json'))
        throw new GameError('Send a JSON request.', 415);
      const reader = request.body?.getReader();
      if (!reader) throw new GameError('A move or restart is required.', 400);
      let body = '';
      let bytes = 0;
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.length;
        if (bytes > 1024) {
          await reader.cancel();
          throw new GameError('Request is too large.', 413);
        }
        body += decoder.decode(value, { stream: true });
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(body + decoder.decode());
      } catch {
        throw new GameError('Send valid JSON.', 400);
      }
      const input = mutation.safeParse(parsed);
      if (!input.success) throw new GameError('Choose a valid move and game version.', 400);
      return NextResponse.json(store.mutate(session!.id, input.data), {
        headers: { 'Cache-Control': 'no-store' },
      });
    } catch (error) {
      if (error instanceof GameError)
        return NextResponse.json({ error: error.message }, { status: error.status });
      console.error('Game request failed', error);
      return NextResponse.json(
        { error: 'The game could not be saved. Refresh and try again.' },
        { status: 500 },
      );
    }
  }
  return { GET: handle, POST: handle };
}
