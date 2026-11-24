import type { ComponentProps } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

import { fieldClasses } from './input';

/**
 * Select nativo estilizado: acessível por padrão, seletor nativo no mobile,
 * compatível com `register` do react-hook-form e com `selectOption` do Playwright.
 */
export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div data-slot="select" className={cn('relative w-full', className)}>
      <select
        className={cn(fieldClasses, 'h-11 cursor-pointer appearance-none bg-ink pr-10 [&>option]:bg-surface')}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
      />
    </div>
  );
}
