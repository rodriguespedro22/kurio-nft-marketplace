import { useCanGoBack, useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

/** Celular: volta para onde o usuário estava (ex.: catálogo com filtros), ou para o Início. */
export function BackButton({ className }: { className?: string }) {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => (canGoBack ? router.history.back() : void router.navigate({ to: '/' }))}
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-full border border-border-soft text-foreground',
        className,
      )}
    >
      <ChevronLeft aria-hidden="true" className="size-5" />
    </button>
  );
}
