import { useId, useState, type ReactNode } from 'react';

import type { CatalogFacets } from '@/contracts';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Skeleton } from '@/shared/ui/skeleton';
import { Slider } from '@/shared/ui/slider';

import { useCategories, useFacets } from '../queries';
import { useCatalogSearch, useUpdateCatalogSearch } from '../use-catalog-search';

type Option = { id: string; name: string; count: number };

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h3 id={id} className="text-section font-bold text-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function CheckboxList({
  options,
  selected,
  onToggle,
}: {
  options: Option[];
  selected: readonly string[];
  onToggle: (id: string, checked: boolean) => void;
}) {
  const baseId = useId();
  return (
    <ul className="flex flex-col">
      {options.map((option) => {
        const id = `${baseId}-${option.id}`;
        return (
          <li key={option.id} className="flex items-center gap-3">
            <Checkbox
              id={id}
              checked={selected.includes(option.id)}
              onCheckedChange={(checked) => onToggle(option.id, checked === true)}
            />
            <label
              htmlFor={id}
              className="flex min-h-10 flex-1 cursor-pointer items-center justify-between gap-2 text-body text-secondary transition-colors peer-data-[state=checked]:text-accent hover:text-foreground"
            >
              <span>{option.name}</span>
              <span className="tabular-nums">({option.count})</span>
            </label>
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
    <div className="flex flex-col gap-2">
      <Slider
        min={lo}
        max={hi}
        step={0.01}
        minStepsBetweenThumbs={1}
        value={value}
        onValueChange={(next) => setValue([next[0] ?? lo, next[1] ?? hi])}
        thumbLabels={['Preço mínimo', 'Preço máximo']}
        valueText={(v) => `${fmt(v)} ETH`}
      />
      <p className="text-body-sm text-foreground tabular-nums">
        Preço: {fmt(value[0])} – {fmt(value[1])} ETH
      </p>
      <Button size="sm" onClick={apply} className="w-fit">
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
    <div className={cn('flex flex-col gap-8', className)}>
      <FilterGroup title="Coleções">
        {categories.isPending ? (
          <ListSkeleton rows={9} />
        ) : categories.isError ? (
          <LoadError what="as coleções" onRetry={() => void categories.refetch()} />
        ) : (
          <CheckboxList
            options={categories.data}
            selected={selectedCategories}
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
          <CheckboxList
            options={facets.data.networks}
            selected={selectedNetworks}
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
    <aside aria-label="Filtros" className={cn('rounded-lg bg-surface p-5', className)}>
      <FilterPanel />
    </aside>
  );
}
