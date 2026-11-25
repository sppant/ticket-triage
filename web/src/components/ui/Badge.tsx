import clsx from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'blue' | 'red' | 'violet' | 'teal' | 'green' | 'amber';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-[var(--neutral-bg)] text-[var(--neutral-fg)]',
  blue: 'bg-[var(--blue-bg)] text-[var(--blue-fg)]',
  red: 'bg-[var(--red-bg)] text-[var(--red-fg)]',
  violet: 'bg-[var(--violet-bg)] text-[var(--violet-fg)]',
  teal: 'bg-[var(--teal-bg)] text-[var(--teal-fg)]',
  green: 'bg-[var(--green-bg)] text-[var(--green-fg)]',
  amber: 'bg-[var(--amber-bg)] text-[var(--amber-fg)]',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
}

/** Small status pill. Always pair the tone with an icon and text, never colour alone. */
export function Badge({ tone = 'neutral', icon, children, className, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-none',
        TONES[tone],
        className,
      )}
      {...props}
    >
      {icon ? (
        <span aria-hidden="true" className="inline-flex">
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  );
}
