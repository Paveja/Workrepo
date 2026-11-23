import { Game } from '@/components/game';

export default function Home() {
  return (
    <main id="game" className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-16">
      <header className="mb-8 space-y-3">
        <h1 className="font-heading text-4xl leading-10 font-bold tracking-tight text-balance sm:text-5xl">
          Tic-Tac-Toe<span className="text-primary">.</span>
        </h1>
        <p className="text-muted-foreground text-base text-pretty">
          Two players. Three in a row. Your move.
        </p>
      </header>
      <Game />
    </main>
  );
}
