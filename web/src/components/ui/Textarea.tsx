import clsx from 'clsx';
import type { TextareaHTMLAttributes } from 'react';
import { fieldClass } from './Input';

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(fieldClass, 'min-h-40 resize-y py-2.5 leading-6', className)}
      {...props}
    />
  );
}
