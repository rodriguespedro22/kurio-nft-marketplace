import { useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';

import { cn } from '@/shared/lib/utils';
import { SearchIcon } from '@/shared/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';

import { catalogSearchSchema, SEARCH_INPUT_ID } from '../search';
import { SearchInput } from './SearchInput';

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

  // Chegou à Início pela lupa de outra página (`/#busca`): no desktop, abre o popover. Ajuste de
  // estado durante a renderização, quando o destino muda (sem efeito em cascata).
  const arrival = onHome && location.hash === SEARCH_INPUT_ID ? location.href : null;
  const [seenArrival, setSeenArrival] = useState<string | null>(null);
  if (arrival !== seenArrival) {
    setSeenArrival(arrival);
    if (arrival && typeof window !== 'undefined' && window.matchMedia(DESKTOP).matches) setOpen(true);
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

  return (
    <>
      {toField}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger aria-label="Buscar NFTs" className={cn(iconClass, 'hidden xl:grid')}>
          <SearchIcon aria-hidden="true" className="size-5" />
        </PopoverTrigger>
        <PopoverContent aria-label="Busca" className="w-[380px] p-2">
          <SearchInput id="busca-header" onSubmitted={() => setOpen(false)} />
        </PopoverContent>
      </Popover>
    </>
  );
}
