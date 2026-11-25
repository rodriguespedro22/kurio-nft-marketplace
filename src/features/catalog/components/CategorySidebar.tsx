import { useId, useState, type ReactNode } from 'react';

import type { CatalogFacets } from '@/contracts';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { Slider } from '@/shared/ui/slider';

import { useCategories, useFacets } from '../queries';
import { useCatalogSearch, useUpdateCatalogSearch } from '../use-catalog-search';

type Option = { id: string; name: string; count: number };

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h3 id={id} className="text-section leading-4 font-bold text-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * Lista de opções como no layout: só texto, sem caixa de seleção. Cada linha é um botão de alternar
 * (`aria-pressed`, várias ao mesmo tempo); a selecionada fica na cor de destaque e sublinhada, para
 * não depender só da cor.
 */
function ToggleList({
  options,
  selected,
  onToggle,
  boldCount = false,
  className,
}: {
  options: Option[];
  selected: readonly string[];
  onToggle: (id: string, pressed: boolean) => void;
  boldCount?: boolean;
  className?: string;
}) {
  return (
    <ul className={cn('flex flex-col', className)}>
      {options.map((option) => {
        const pressed = selected.includes(option.id);
        return (
          <li key={option.id}>
            <button
              type="button"
              aria-pressed={pressed}
              onClick={() => onToggle(option.id, !pressed)}
              className={cn(
                'flex h-10 w-full items-center justify-between gap-2 text-left text-body leading-10 transition-colors',
                pressed ? 'text-accent' : 'text-secondary hover:text-foreground',
              )}
            >
              <span className={cn(pressed && 'underline decoration-1 underline-offset-4')}>
                {option.name}
              </span>
              <span className={cn('tabular-nums', boldCount && 'font-bold')}>({option.count})</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <ul aria-hidden="true" className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex h-10 items-center">
          <Skeleton className="h-4 w-full" />
        </li>
      ))}
    </ul>
  );
}

function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 text-body-sm text-coral">
      <p>Não foi possível carregar {what}.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}

const floor2 = (eth: string) => Math.floor(Number(eth) * 100 + 1e-6) / 100;
const ceil2 = (eth: string) => Math.ceil(Number(eth) * 100 - 1e-6) / 100;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const fmt = (value: number) => value.toFixed(2);
const fmtBr = (value: number) => fmt(value).replace('.', ',');

type PriceRangeProps = {
  range: NonNullable<CatalogFacets['priceRange']>;
  minPrice: string | undefined;
  maxPrice: string | undefined;
  onApply: (min: string | undefined, max: string | undefined) => void;
};

/** Slider duplo + "Aplicar": o filtro só vai para a URL quando o usuário confirma. */
function PriceRange({ range, minPrice, maxPrice, onApply }: PriceRangeProps) {
  const lo = floor2(range.min);
  const hi = Math.max(ceil2(range.max), lo + 0.01);
  const [value, setValue] = useState<[number, number]>(() => [
    minPrice ? clamp(Number(minPrice), lo, hi) : lo,
    maxPrice ? clamp(Number(maxPrice), lo, hi) : hi,
  ]);

  function apply() {
    const [min, max] = value;
    // Alça no limite = sem limite (não esconde NFTs que entrarem depois com preço maior/menor).
    onApply(min <= lo ? undefined : fmt(min), max >= hi ? undefined : fmt(max));
  }

  return (
    <div className="flex flex-col gap-3 pl-3">
      <Slider
        min={lo}
        max={hi}
        step={0.01}
        minStepsBetweenThumbs={1}
        value={value}
        onValueChange={(next) => setValue([next[0] ?? lo, next[1] ?? hi])}
        thumbLabels={['Preço mínimo', 'Preço máximo']}
        valueText={(v) => `${fmt(v)} ETH`}
        className="h-[21px]"
      />
      <p className="text-body leading-5 text-foreground tabular-nums">
        Preço: {fmtBr(value[0])} - {fmtBr(value[1])} ETH
      </p>
      <Button onClick={apply} className="h-9 w-fit rounded-[6px] px-3 py-2 text-body-lg leading-5 font-bold">
        Aplicar
      </Button>
    </div>
  );
}

/** Coleções, faixa de preço e rede — usado na sidebar (desktop) e no drawer (mobile/tablet). */
export function FilterPanel({ className }: { className?: string }) {
  const search = useCatalogSearch();
  const updateSearch = useUpdateCatalogSearch();
  const categories = useCategories();
  const facets = useFacets();

  const selectedCategories = search.category ?? [];
  const selectedNetworks = search.network ?? [];

  return (
    <div className={cn('flex flex-col gap-10', className)}>
      <FilterGroup title="Coleções">
        {categories.isPending ? (
          <ListSkeleton rows={9} />
        ) : categories.isError ? (
          <LoadError what="as coleções" onRetry={() => void categories.refetch()} />
        ) : (
          <ToggleList
            options={categories.data}
            selected={selectedCategories}
            boldCount
            className="px-3"
            onToggle={(id, checked) =>
              updateSearch({
                category: checked ? [...selectedCategories, id] : selectedCategories.filter((c) => c !== id),
              })
            }
          />
        )}
      </FilterGroup>

      <FilterGroup title="Faixa de preço">
        {facets.isPending ? (
          <Skeleton aria-hidden="true" className="h-24 w-full" />
        ) : facets.isError ? (
          <LoadError what="a faixa de preço" onRetry={() => void facets.refetch()} />
        ) : facets.data.priceRange ? (
          <PriceRange
            // Recomeça do valor da URL quando ela muda por fora (voltar, "Limpar filtros").
            key={`${search.minPrice ?? ''}|${search.maxPrice ?? ''}|${facets.data.priceRange.min}|${facets.data.priceRange.max}`}
            range={facets.data.priceRange}
            minPrice={search.minPrice}
            maxPrice={search.maxPrice}
            onApply={(minPrice, maxPrice) => updateSearch({ minPrice, maxPrice })}
          />
        ) : (
          <p className="text-body-sm text-secondary">Sem preços para filtrar no momento.</p>
        )}
      </FilterGroup>

      <FilterGroup title="Rede">
        {facets.isPending ? (
          <ListSkeleton rows={3} />
        ) : facets.isError ? (
          <LoadError what="as redes" onRetry={() => void facets.refetch()} />
        ) : (
          <ToggleList
            options={facets.data.networks}
            selected={selectedNetworks}
            className="pl-3"
            onToggle={(id, checked) => {
              const network = facets.data.networks.find((n) => n.id === id)?.id;
              if (!network) return;
              updateSearch({
                network: checked
                  ? [...selectedNetworks, network]
                  : selectedNetworks.filter((n) => n !== network),
              });
            }}
          />
        )}
      </FilterGroup>
    </div>
  );
}

/** Sidebar de filtros do desktop (≥ 1280 px). */
export function CategorySidebar({ className }: { className?: string }) {
  return (
    <aside aria-label="Filtros" className={cn('bg-surface p-5', className)}>
      <FilterPanel />
    </aside>
  );
}
