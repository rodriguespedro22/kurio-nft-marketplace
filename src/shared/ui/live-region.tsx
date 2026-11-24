import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib/utils';

export type Politeness = 'polite' | 'assertive';

type LiveRegionProps = ComponentProps<'div'> & {
  politeness?: Politeness;
  /** Mantém o conteúdo só para leitores de tela. */
  visuallyHidden?: boolean;
};

/** Região viva local: o conteúdo é anunciado quando muda (ex.: total do carrinho). */
export function LiveRegion({ politeness = 'polite', visuallyHidden, className, ...props }: LiveRegionProps) {
  return (
    <div
      role={politeness === 'assertive' ? 'alert' : 'status'}
      aria-live={politeness}
      aria-atomic="true"
      className={cn(visuallyHidden && 'sr-only', className)}
      {...props}
    />
  );
}
