import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
export const metadata: Metadata = {
  title: 'Tic-Tac-Toe',
  description: 'A two-player classic. Take turns, connect three, and keep the score.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-background text-foreground selection:bg-primary selection:text-primary-foreground min-h-dvh font-sans antialiased">
        <a
          href="#game"
          className="rounded-control bg-primary text-primary-foreground sr-only p-3 focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50"
        >
          Skip to game
        </a>
        {children}
      </body>
    </html>
  );
}
