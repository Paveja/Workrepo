import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg space-y-4 px-4 py-16">
      <h1 className="text-3xl font-bold">No game here</h1>
      <p className="text-muted-foreground">This page doesn’t exist.</p>
      <Link
        href="/"
        className="rounded-control bg-primary text-primary-foreground focus-visible:outline-ring inline-flex min-h-12 items-center px-4 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        Back to the board
      </Link>
    </main>
  );
}
