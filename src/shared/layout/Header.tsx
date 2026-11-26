import { Link } from '@tanstack/react-router';

import { AccountMenu } from '@/features/auth/components/AccountMenu';
import { HeaderCartLink } from '@/features/cart/components/CartBadge';
import { HeaderSearch } from '@/features/catalog/components/HeaderSearch';

import { MainNavLinks } from './MainNavLinks';
import { MobileMenu } from './MobileMenu';

/**
 * Header (layout: 24 px acima, linha de 45 px e divisor de 1 px só na largura do conteúdo). Logo e
 * ações ficam centrados nos primeiros 35 px; os itens da navegação, no topo, com o sublinhado do
 * ativo sobre o divisor. No celular (< 768 px) ele sai, como nos frames mobile: a barra de atalhos
 * embaixo leva a Início, Favoritos, Carrinho e Perfil.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-ink max-md:hidden">
      <div className="container-page">
        <div className="grid h-14 grid-cols-[1fr_auto] items-center gap-6 border-b border-primary/30 xl:h-[70px] xl:grid-cols-[1fr_auto_1fr] xl:items-start xl:pt-6">
          <Link
            to="/"
            className="flex items-center justify-self-start text-body-sm font-bold tracking-brand text-foreground xl:h-[35px]"
            aria-label="Kurio — página inicial"
          >
            KURIO
          </Link>

          <nav aria-label="Principal" className="hidden xl:block">
            <MainNavLinks variant="bar" />
          </nav>

          <div className="flex items-center gap-7 justify-self-end xl:h-[35px]">
            <HeaderSearch />
            <HeaderCartLink />
            <AccountMenu />
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
