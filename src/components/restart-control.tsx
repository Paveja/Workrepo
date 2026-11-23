'use client';
import { useRef } from 'react';
import { Button } from './button';

export function RestartControl({
  unfinished,
  pending,
  disabled,
  onRestart,
}: {
  unfinished: boolean;
  pending: boolean;
  disabled: boolean;
  onRestart: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <Button
        className="w-full"
        disabled={disabled}
        onClick={() => (unfinished ? dialog.current?.showModal() : onRestart())}
      >
        {pending ? 'Restarting…' : 'Restart Game'}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby="restart-title"
        aria-describedby="restart-description"
        className={[
          'rounded-container border-border bg-card text-foreground backdrop:bg-foreground/30',
          'fixed inset-0 m-auto w-full max-w-sm border p-6 shadow-xl',
        ].join(' ')}
      >
        <h2 id="restart-title" className="text-xl font-semibold">
          Restart this round?
        </h2>
        <p id="restart-description" className="text-muted-foreground mt-3 text-base text-pretty">
          Your current moves will be cleared. Scores and completed games will stay.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" autoFocus onClick={() => dialog.current?.close()}>
            Keep playing
          </Button>
          <Button
            onClick={() => {
              dialog.current?.close();
              onRestart();
            }}
          >
            Restart Game
          </Button>
        </div>
      </dialog>
    </>
  );
}
