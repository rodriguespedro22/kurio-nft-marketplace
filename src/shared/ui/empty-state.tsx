import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
  /** Nível do título: `h1` quando o estado vazio é a página inteira. */
  titleAs?: 'h1' | 'h2' | 'h3';
};

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  titleAs: Title = 'h2',
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-border bg-surface px-6 py-12 text-center',
        className,
      )}
    >
      {icon ? (
        <div
          aria-hidden="true"
          className="mb-1 grid size-14 place-items-center rounded-full bg-surface-raised text-accent"
        >
          {icon}
        </div>
      ) : null}
      <Title className="text-section font-bold text-foreground">{title}</Title>
      {description ? <p className="max-w-md text-body-sm text-secondary">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
