import type { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/db';
import { createGameStore } from '@/lib/game-store';
import { createGameHandlers } from '@/lib/game-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(request: NextRequest) {
  return createGameHandlers(createGameStore(getDatabase())).GET(request);
}
export function POST(request: NextRequest) {
  return createGameHandlers(createGameStore(getDatabase())).POST(request);
}
