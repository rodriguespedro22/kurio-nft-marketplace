import { useId, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/shared/ui/sheet';

import { useCatalogSearch } from '../use-catalog-search';
import { FilterPanel } from './CategorySidebar';

/** Filtros abaixo de 1280 px: bottom sheet com foco preso; `Escape` devolve o foco ao botão. */
export function FiltersDrawer({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const countId = useId();
  const { category, network, minPrice, maxPrice } = useCatalogSearch();
  const active = (category?.length ?? 0) + (network?.length ?? 0) + (minPrice || maxPrice ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          aria-label="Filtros"
          aria-describedby={active ? countId : undefined}
          className={cn(
            'relative size-12 rounded-[10px] bg-linear-to-b from-primary-light to-primary xl:hidden',
            className,
          )}
        >
          <SlidersHorizontal aria-hidden="true" className="size-5" strokeWidth={1.75} />
          {active ? (
            <span
              aria-hidden="true"
              className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-foreground text-micro font-bold text-ink"
            >
              {active}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      {active ? (
        <span id={countId} className="sr-only">
          {active === 1 ? '1 filtro ativo' : `${active} filtros ativos`}
        </span>
      ) : null}
      <SheetContent side="bottom" aria-describedby={undefined} className="xl:hidden">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>
        <FilterPanel />
        <SheetClose asChild>
          <Button size="lg" shape="pill" className="mt-2 w-full">
            Ver resultados
          </Button>
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}
