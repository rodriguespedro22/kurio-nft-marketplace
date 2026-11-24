import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib/utils';

export const fieldClasses =
  'rounded-field border-border text-body-sm text-foreground placeholder:text-muted w-full min-w-0 border bg-transparent px-3 transition-colors focus-visible:border-primary aria-[invalid=true]:border-error disabled:cursor-not-allowed disabled:opacity-60';

export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return <input type={type} data-slot="input" className={cn(fieldClasses, 'h-11', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea data-slot="textarea" className={cn(fieldClasses, 'min-h-24 py-2.5', className)} {...props} />
  );
}
