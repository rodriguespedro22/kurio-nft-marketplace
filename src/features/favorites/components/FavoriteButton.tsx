import { useRouter, useRouterState } from '@tanstack/react-router';
import { Heart } from 'lucide-react';

import type { NftListItem } from '@/contracts';
import { useSession } from '@/features/auth/session';
import { cn } from '@/shared/lib/utils';
import { buttonVariants } from '@/shared/ui/button-variants';

import { useIsFavorite, useToggleFavorite } from '../queries';

type FavoriteButtonProps = {
  item: NftListItem;
  /** `icon`: coração sobre o card (nome inclui o NFT); `full`: botão "Favoritar" do detalhe. */
  variant?: 'icon' | 'full';
  /** Nome do ícone quando o contexto já diz qual é o NFT (detalhe no celular: "Favoritar"). */
  label?: string;
  className?: string;
};

/**
 * Botão de alternância (`aria-pressed`) — o nome não muda com o estado, só o ícone preenche.
 * Visitante vai para o login e volta para a página em que estava.
 */
export function FavoriteButton({ item, variant = 'icon', label, className }: FavoriteButtonProps) {
  const session = useSession();
  const router = useRouter();
  const href = useRouterState({ select: (s) => s.location.href });
  const favorited = useIsFavorite(item.id);
  const toggle = useToggleFavorite(item.id);

  function handleClick() {
    if (!session) {
      void router.navigate({ to: '/login', search: { redirect: href } });
      return;
    }
    toggle.mutate({ item, favorited: !favorited });
  }

  const icon = (
    <Heart
      aria-hidden="true"
      className={cn('size-5 transition-colors', favorited ? 'fill-coral text-coral' : 'fill-transparent')}
      strokeWidth={2}
    />
  );

  if (variant === 'full') {
    return (
      <button
        type="button"
        aria-pressed={favorited}
        onClick={handleClick}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'md' }),
          'h-10 border-primary px-4 text-accent hover:bg-primary/10',
          className,
        )}
      >
        {icon}
        Favoritar
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={favorited}
      aria-label={label ?? `Favoritar ${item.name}`}
      onClick={handleClick}
      className={cn(
        'relative z-10 grid size-9 place-items-center rounded-full bg-ink/70 text-foreground backdrop-blur transition-colors before:absolute before:-inset-1 hover:bg-ink hover:text-coral',
        className,
      )}
    >
      {icon}
    </button>
  );
}
