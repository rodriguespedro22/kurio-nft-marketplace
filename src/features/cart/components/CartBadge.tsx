import { Link } from '@tanstack/react-router';

import { cn } from '@/shared/lib/utils';
import { CartIcon, ShopIcon } from '@/shared/ui/icons';

import { cartShortcutLabel } from '../labels';
import { useCartCount } from '../queries';

/**
 * Bolinha com a contagem. Decorativa: o número já está no nome acessível do link, e o texto vem do
 * CSS (`attr`) para não contar como texto visível fora do nome (WCAG 2.5.3, rótulo no nome).
 */
export function CartBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      data-text={count > 99 ? '99+' : String(count)}
      className={cn(
        'absolute grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-none font-bold text-ink tabular-nums before:content-[attr(data-text)]',
        className,
      )}
    />
  );
}

/** Atalho do header (desktop): ícone do carrinho com contador. */
export function HeaderCartLink() {
  const count = useCartCount();
  return (
    <Link
      to="/carrinho"
      aria-label={cartShortcutLabel(count)}
      className="relative hidden size-11 place-items-center rounded-full text-foreground transition-colors hover:text-accent data-[status=active]:text-accent xl:grid"
    >
      <CartIcon aria-hidden="true" className="size-6" />
      <CartBadge count={count} className="top-1.5 right-1" />
    </Link>
  );
}

/** Item "Carrinho" da barra inferior (mobile/tablet). */
export function BarCartLink({ className }: { className?: string }) {
  const count = useCartCount();
  return (
    <Link to="/carrinho" aria-label={cartShortcutLabel(count)} className={className}>
      <span className="relative">
        <ShopIcon aria-hidden="true" className="size-6" />
        <CartBadge count={count} className="-top-1.5 -right-2" />
      </span>
      <span>Carrinho</span>
    </Link>
  );
}
