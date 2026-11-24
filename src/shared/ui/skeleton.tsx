import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib/utils';

/** Placeholder de carregamento com shimmer; decorativo (o estado é anunciado por quem o usa). */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn('animate-shimmer rounded-md skeleton-shimmer motion-reduce:animate-none', className)}
      {...props}
    />
  );
}
