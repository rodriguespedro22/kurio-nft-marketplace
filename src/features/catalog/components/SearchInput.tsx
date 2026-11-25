import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation } from '@tanstack/react-router';

import { cn } from '@/shared/lib/utils';
import { SearchIcon } from '@/shared/ui/icons';
import { Input } from '@/shared/ui/input';

import { SEARCH_INPUT_ID } from '../search';
import { useCatalogSearch, useUpdateCatalogSearch } from '../use-catalog-search';

const DEBOUNCE_MS = 300;

/**
 * Busca por nome/coleção/criador. O texto digitado vai para a URL (`?q=`) 300 ms depois da
 * última tecla (Enter envia na hora); mudanças externas da URL (voltar, "Limpar filtros")
 * atualizam o campo sem atropelar o que o usuário ainda está digitando.
 */
type SearchInputProps = {
  className?: string;
  /** Id do campo: o do catálogo é o alvo de `/#busca`; o do header usa outro para não duplicar. */
  id?: string;
  /** Enter: avisa quem abriu a busca (o popover do header fecha). */
  onSubmitted?: () => void;
};

export function SearchInput({ className, id = SEARCH_INPUT_ID, onSubmitted }: SearchInputProps) {
  const { q } = useCatalogSearch();
  const updateSearch = useUpdateCatalogSearch();
  const urlValue = q ?? '';

  const [value, setValue] = useState(urlValue);
  const [seenUrlValue, setSeenUrlValue] = useState(urlValue);
  const [committed, setCommitted] = useState<string | null>(null);

  if (urlValue !== seenUrlValue) {
    setSeenUrlValue(urlValue);
    // Só sobrescreve o campo quando a URL mudou por outro motivo que não a nossa digitação.
    if (urlValue !== committed) setValue(urlValue);
    setCommitted(null);
  }

  useEffect(() => {
    const next = value.trim();
    if (next === urlValue) return;
    const timer = window.setTimeout(() => {
      setCommitted(next);
      updateSearch({ q: next }, { replace: true });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [value, urlValue, updateSearch]);

  // Ícone de busca do header leva a `/#busca`: foca o campo.
  const hash = useLocation({ select: (location) => location.hash });
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (id === SEARCH_INPUT_ID && hash === SEARCH_INPUT_ID) inputRef.current?.focus({ preventScroll: false });
  }, [hash, id]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = value.trim();
    onSubmitted?.();
    if (next === urlValue) return;
    setCommitted(next);
    updateSearch({ q: next }, { replace: true });
  }

  return (
    <form role="search" onSubmit={handleSubmit} className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        Buscar NFTs
      </label>
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted"
      />
      <Input
        ref={inputRef}
        id={id}
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Explorar coleções"
        autoComplete="off"
        enterKeyHint="search"
        maxLength={80}
        className="h-[45px] scroll-mt-28 rounded-[10px] border-transparent bg-surface pl-12 text-body-sm placeholder:font-bold"
      />
    </form>
  );
}
