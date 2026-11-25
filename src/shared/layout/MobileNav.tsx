import { Link } from '@tanstack/react-router';
import { Heart, ScanLine } from 'lucide-react';

import { BarCartLink } from '@/features/cart/components/CartBadge';
import { cn } from '@/shared/lib/utils';
import { HomeIcon, UserIcon } from '@/shared/ui/icons';

const itemClass =
  'flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-field text-micro font-medium text-muted transition-colors hover:text-secondary data-[status=active]:text-accent';

type MobileNavProps = {
  /** No celular a página tem barra própria embaixo (ex.: compra no detalhe): a navegação sai. */
  hideOnPhone?: boolean;
};

/** Barra inferior (< 1280 px): Início, Favoritos, escanear (central), Carrinho, Perfil. */
export function MobileNav({ hideOnPhone = false }: MobileNavProps) {
  return (
    <nav
      aria-label="Atalhos"
      data-bottom-bar=""
      className={cn(
        hideOnPhone && 'max-md:hidden',
        'fixed inset-x-0 bottom-0 z-40 rounded-t-[28px] border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-bar backdrop-blur xl:hidden',
      )}
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4">
        <li className="col-start-1 flex justify-center">
          <Link to="/" activeOptions={{ exact: true, includeHash: true }} className={itemClass}>
            <HomeIcon className="size-6" />
            <span>Início</span>
          </Link>
        </li>
        <li className="col-start-2 flex justify-center">
          <Link to="/favoritos" className={itemClass}>
            <Heart aria-hidden="true" className="size-6" strokeWidth={1.75} />
            <span>Favoritos</span>
          </Link>
        </li>
        <li className="col-start-3 flex justify-center">
          <Link
            to="/em-breve"
            search={{ secao: 'escanear' }}
            aria-label="Escanear NFT"
            className="-mt-8 grid size-16 place-items-center rounded-full bg-linear-to-b from-primary-light to-primary-dark text-ink shadow-bar ring-4 ring-ink"
          >
            <ScanLine aria-hidden="true" className="size-7" strokeWidth={1.5} />
          </Link>
        </li>
        <li className="col-start-4 flex justify-center">
          <BarCartLink className={itemClass} />
        </li>
        <li className="col-start-5 flex justify-center">
          <Link to="/perfil" className={itemClass}>
            <UserIcon className="size-6" />
            <span>Perfil</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
