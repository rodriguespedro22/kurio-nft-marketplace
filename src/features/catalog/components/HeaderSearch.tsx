import { Suspense, useEffect, useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';

import { lazyWithPreload, whenIdle } from '@/shared/lib/lazy-with-preload';
import { cn } from '@/shared/lib/utils';
import { SearchIcon } from '@/shared/ui/icons';

import { catalogSearchSchema, SEARCH_INPUT_ID } from '../search';

const HeaderSearchPopover = lazyWithPreload(() => import('./HeaderSearchPopover'));

const iconClass =
  '-m-2 grid place-items-center rounded-full p-2 text-foreground transition-colors hover:text-accent';

const DESKTOP = '(min-width: 80rem)';

/**
 * Lupa do header. No desktop o layout não desenha barra de busca na Início: a lupa abre o campo num
 * popover. Abaixo de 1280 px o campo fica no catálogo (como no frame mobile) e a lupa leva até ele.
 * Fora da Início, a lupa leva à Início (`/#busca`), que abre a busca ao chegar.
 */
export function HeaderSearch() {
  const location = useLocation();
  const onHome = location.pathname === '/';
  const [open, setOpen] = useState(false);
  // O popover (Radix) só monta na 1ª abertura; até lá, a lupa provisória tem a mesma cara e o mesmo nome.
  const [mounted, setMounted] = useState(false);

  useEffect(() => (onHome ? whenIdle(() => void HeaderSearchPopover.preload()) : undefined), [onHome]);

  // Chegou à Início pela lupa de outra página (`/#busca`): no desktop, abre o popover. Ajuste de
  // estado durante a renderização, quando o destino muda (sem efeito em cascata).
  const arrival = onHome && location.hash === SEARCH_INPUT_ID ? location.href : null;
  const [seenArrival, setSeenArrival] = useState<string | null>(null);
  if (arrival !== seenArrival) {
    setSeenArrival(arrival);
    if (arrival && typeof window !== 'undefined' && window.matchMedia(DESKTOP).matches) {
      setMounted(true);
      setOpen(true);
    }
  }

  const toField = (
    <Link
      to="/"
      // Mantém a busca atual quando já está no catálogo; vindo de outra página, abre sem filtros.
      search={(prev) => catalogSearchSchema.parse(prev)}
      hash={SEARCH_INPUT_ID}
      aria-label="Ir para a busca"
      onClick={() => document.getElementById(SEARCH_INPUT_ID)?.focus({ preventScroll: true })}
      className={cn(iconClass, onHome && 'xl:hidden')}
    >
      <SearchIcon aria-hidden="true" className="size-5" />
    </Link>
  );

  if (!onHome) return toField;

  const placeholder = (
    <button
      type="button"
      aria-label="Buscar NFTs"
      aria-haspopup="dialog"
      aria-expanded={false}
      className={cn(iconClass, 'hidden xl:grid')}
      onPointerEnter={() => void HeaderSearchPopover.preload()}
      onFocus={() => void HeaderSearchPopover.preload()}
      onClick={() => {
        setMounted(true);
        setOpen(true);
      }}
    >
      <SearchIcon aria-hidden="true" className="size-5" />
    </button>
  );

  return (
    <>
      {toField}
      {mounted ? (
        <Suspense fallback={placeholder}>
          <HeaderSearchPopover open={open} onOpenChange={setOpen} triggerClassName={iconClass} />
        </Suspense>
      ) : (
        placeholder
      )}
    </>
  );
}
