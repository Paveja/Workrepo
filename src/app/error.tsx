'use client';
import { Button } from '@/components/button';

export default function ErrorPage({ reset, retry }: { reset?: () => void; retry?: () => void }) {
  return (
    <main className="mx-auto max-w-lg space-y-4 px-4 py-16">
      <h1 className="text-3xl font-bold">The game couldn’t load</h1>
      <p role="alert" className="text-muted-foreground">
        Please try again. If this continues, reload the page.
      </p>
      <Button onClick={retry ?? reset}>Try again</Button>
    </main>
  );
}
