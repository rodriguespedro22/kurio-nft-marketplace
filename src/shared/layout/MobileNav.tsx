import { Link } from '@tanstack/react-router';
import { Heart, ScanLine } from 'lucide-react';

import { BarCartLink } from '@/features/cart/components/CartBadge';
import { cn } from '@/shared/lib/utils';
import { HomeIcon, UserIcon } from '@/shared/ui/icons';
import { InertLink } from '@/shared/ui/inert-link';

const itemClass =
  'flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-field text-micro font-medium text-secondary transition-colors hover:text-foreground data-[status=active]:text-accent';

/** Atalho centrado num ponto da barra (layout de 414 px: centros em 46, 118, 301 e 364 px). */
const slotClass = 'absolute top-1/2 flex -translate-1/2 justify-center';

type MobileNavProps = {
  /** No celular a página tem barra própria embaixo (ex.: compra no detalhe): a navegação sai. */
  hideOnPhone?: boolean;
};

/**
 * Barra inferior (< 1280 px), só ícones como no frame mobile: Início, Favoritos, escanear (central),
 * Carrinho, Perfil. Barra de 95 px com recorte côncavo em volta do botão: duas faixas retas e, no
 * meio, uma peça SVG de 160 px com o arco (raio 49 px) e os ombros arredondados. O botão de 65 px
 * sobe 31 px acima da barra.
 */
export function MobileNav({ hideOnPhone = false }: MobileNavProps) {
  return (
    <nav
      aria-label="Atalhos"
      data-bottom-bar=""
      className={cn(hideOnPhone && 'max-md:hidden', 'fixed inset-x-0 bottom-0 z-40 xl:hidden')}
    >
      <div className="drop-shadow-[0_-6px_22px_rgb(0_0_0/0.45)]">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 flex h-[95px] text-surface">
          <div className="-mr-px flex-1 rounded-tl-[28px] bg-current" />
          <svg viewBox="0 0 160 95" className="relative h-full w-40 shrink-0" fill="currentColor">
            <path d="M0 0H14C24 0 29 5 32.5 12A49 49 0 0 0 127.5 12C131 5 136 0 146 0H160V95H0Z" />
          </svg>
          <div className="-ml-px flex-1 rounded-tr-[28px] bg-current" />
        </div>

        <ul className="relative mx-auto h-[95px] max-w-[414px]">
          <li className={cn(slotClass, 'left-[11.1%]')}>
            <Link to="/" activeOptions={{ exact: true, includeHash: true }} className={itemClass}>
              <HomeIcon className="size-5" />
              <span className="sr-only">Início</span>
            </Link>
          </li>
          <li className={cn(slotClass, 'left-[28.5%]')}>
            <Link to="/favoritos" className={itemClass}>
              <Heart aria-hidden="true" className="size-5" fill="currentColor" strokeWidth={1.75} />
              <span className="sr-only">Favoritos</span>
            </Link>
          </li>
          <li className="absolute top-0 left-1/2 flex -translate-x-1/2 -translate-y-[31px] justify-center">
            <InertLink
              label="Escanear NFT"
              className="grid size-[65px] place-items-center rounded-full bg-linear-to-b from-[#e9c3a0] to-primary text-foreground"
            >
              <ScanLine aria-hidden="true" className="size-[26px]" strokeWidth={2} />
            </InertLink>
          </li>
          <li className={cn(slotClass, 'left-[72.7%]')}>
            <BarCartLink className={itemClass} />
          </li>
          <li className={cn(slotClass, 'left-[87.9%]')}>
            <Link to="/perfil" className={itemClass}>
              <UserIcon className="size-5" />
              <span className="sr-only">Perfil</span>
            </Link>
          </li>
        </ul>
        <div className="h-[env(safe-area-inset-bottom)] bg-surface" />
      </div>
    </nav>
  );
}
