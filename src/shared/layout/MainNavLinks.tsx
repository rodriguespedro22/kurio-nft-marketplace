import { Link, useLocation } from '@tanstack/react-router';

import { cn } from '@/shared/lib/utils';
import { InertLink } from '@/shared/ui/inert-link';

type MainNavLinksProps = {
  variant: 'bar' | 'sheet';
  onNavigate?: () => void;
};

const variants = {
  // Layout: texto no topo da linha de 45 px, sublinhado de 3 px do ativo sobre o divisor do header.
  bar: cn(
    'relative inline-flex h-[46px] items-start text-body-lg leading-[21px] text-foreground transition-colors hover:text-accent',
    'data-section:font-bold data-section:text-accent data-[status=active]:font-bold data-[status=active]:text-accent',
    'after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:bg-primary after:opacity-0 data-section:after:opacity-100 data-[status=active]:after:opacity-100',
  ),
  sheet: cn(
    'flex min-h-12 items-center rounded-field border-l-4 border-transparent px-4 text-body-lg text-foreground transition-colors hover:bg-surface-raised',
    'data-section:border-primary data-section:font-bold data-section:text-accent data-[status=active]:border-primary data-[status=active]:font-bold data-[status=active]:text-accent',
  ),
} as const;

/** Páginas de compra ficam sob "Mercado"; as da conta, sob "Início" (destaque visual, sem `aria-current`). */
const MARKET = /^\/(nft|carrinho|checkout|pedido)(\/|$)/;
const ACCOUNT = /^\/(perfil|carteiras|favoritos)(\/|$)/;

/** Início · Mercado (= catálogo) · Criadores · Aprenda — os dois últimos, fora do escopo, não fazem nada. */
export function MainNavLinks({ variant, onNavigate }: MainNavLinksProps) {
  const className = variants[variant];
  const { pathname } = useLocation();
  const section = MARKET.test(pathname) ? 'market' : ACCOUNT.test(pathname) ? 'home' : null;
  return (
    <ul className={variant === 'bar' ? 'flex items-start gap-10' : 'flex flex-col gap-1'}>
      <li>
        <Link
          to="/"
          activeOptions={{ exact: true, includeHash: true, includeSearch: false }}
          className={className}
          data-section={section === 'home' || undefined}
          onClick={onNavigate}
        >
          Início
        </Link>
      </li>
      <li>
        <Link
          to="/"
          hash="catalogo"
          activeOptions={{ exact: true, includeHash: true, includeSearch: false }}
          className={className}
          data-section={section === 'market' || undefined}
          onClick={onNavigate}
        >
          Mercado
        </Link>
      </li>
      <li>
        <InertLink className={className}>Criadores</InertLink>
      </li>
      <li>
        <InertLink className={className}>Aprenda</InertLink>
      </li>
    </ul>
  );
}
