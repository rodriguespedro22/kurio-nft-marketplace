import { useId } from 'react';
import { TriangleAlert } from 'lucide-react';

import type { Cart } from '@/contracts';
import { cn } from '@/shared/lib/utils';

import { dismissCartNotices, noticeMessage, useCartNotices, useNoticeOwner } from './cart-notices';

/**
 * "Seu carrinho mudou": preço alterado ou edição esgotada enquanto o carrinho estava aberto
 * (eventos do socket). `role="alert"` para quem não está olhando para a linha que mudou. Só lista
 * linhas que ainda estão no carrinho.
 */
export function CartChangeNotice({ cart, className }: { cart: Cart; className?: string }) {
  const titleId = useId();
  const inCart = new Set(cart.items.map((item) => item.id));
  const notices = useCartNotices(useNoticeOwner()).filter((n) => inCart.has(n.cartItemId));
  if (notices.length === 0) return null;

  return (
    <div
      role="alert"
      aria-labelledby={titleId}
      className={cn(
        'flex items-start gap-3 rounded-field border border-amber/60 bg-amber/10 px-4 py-3',
        className,
      )}
    >
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p id={titleId} className="text-body font-bold text-foreground">
          Seu carrinho mudou
        </p>
        <ul className="flex flex-col gap-0.5 text-body-sm text-secondary">
          {notices.map((notice) => (
            <li key={notice.key}>{noticeMessage(notice)}</li>
          ))}
        </ul>
        <button
          type="button"
          onClick={dismissCartNotices}
          className="mt-1 self-start text-body-sm text-accent underline-offset-4 hover:underline"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
