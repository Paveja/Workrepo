import type { ButtonHTMLAttributes } from 'react';

export function Button({
  className = '',
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-control focus-visible:outline-ring inline-flex min-h-12 items-center justify-center gap-2 px-4 py-3 text-base font-semibold transition-colors duration-150 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${variant === 'primary' ? 'bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-muted border'} ${className}`}
    />
  );
}
