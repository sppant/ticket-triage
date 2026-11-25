import clsx from 'clsx';
import type { InputHTMLAttributes } from 'react';

export const fieldClass =
  'w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-fg shadow-sm ' +
  'placeholder:text-muted transition-colors duration-150 hover:border-muted ' +
  'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:border-accent';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(fieldClass, 'h-11', className)} {...props} />;
}
