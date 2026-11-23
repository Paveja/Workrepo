'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameSnapshot } from './game';

type Pending = 'load' | 'move' | 'restart' | 'history' | null;
async function fetchGame(init?: RequestInit, page = 1): Promise<GameSnapshot> {
  const signal = init?.signal
    ? AbortSignal.any([init.signal, AbortSignal.timeout(15000)])
    : AbortSignal.timeout(15000);
  const response = await fetch(`/api/game?page=${page}`, { cache: 'no-store', ...init, signal });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error ?? 'The game could not be loaded. Please try again.');
  return body;
}
const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Connection lost. Refresh the game to try again.';

export function useGame() {
  const [data, setData] = useState<GameSnapshot | null>(null);
  const [pending, setPending] = useState<Pending>('load');
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetchGame({ signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setPending(null);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setError(message(error));
          setPending(null);
        }
      });
    return () => controller.abort();
  }, []);

  const refresh = useCallback(async (page = 1) => {
    if (busy.current) return;
    busy.current = true;
    setPending('history');
    setError(null);
    try {
      setData(await fetchGame(undefined, page));
    } catch (error) {
      setError(message(error));
    } finally {
      setPending(null);
      busy.current = false;
    }
  }, []);

  async function act(action: 'move' | 'restart', cell?: number) {
    if (!data || busy.current || error) return;
    busy.current = true;
    setPending(action);
    setError(null);
    try {
      setData(
        await fetchGame({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            roundId: data.round.id,
            version: data.round.version,
            ...(action === 'move' ? { cell } : {}),
          }),
        }),
      );
    } catch (error) {
      setError(message(error));
    } finally {
      setPending(null);
      busy.current = false;
    }
  }
  return {
    data,
    pending,
    error,
    refresh,
    move: (cell: number) => act('move', cell),
    restart: () => act('restart'),
  };
}
