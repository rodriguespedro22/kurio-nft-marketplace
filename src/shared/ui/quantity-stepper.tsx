import { useId, useState, type KeyboardEvent } from 'react';
import { Minus, Plus } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

type QuantityStepperProps = {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  /** Nome acessível do campo (ex.: "Quantidade"). */
  label: string;
  /** Mostra o rótulo ao lado dos botões (mobile: "Qtd."); por padrão fica só para leitores de tela. */
  visibleLabel?: string;
  /** Classes extras do rótulo visível (ex.: `md:sr-only` para mostrá-lo só no celular). */
  labelClassName?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
};

const INTEGER = /^\d+$/;

/** "Quantidade de X" → "quantidade de X": compõe "Aumentar …"/"Diminuir …" sem mexer em nomes. */
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

const stepButton =
  'relative grid size-8 shrink-0 place-items-center rounded-full bg-primary text-ink transition-colors before:absolute before:-inset-1.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40';

/**
 * Campo numérico com − / +. O texto digitado só vale ao confirmar (Enter ou sair do campo):
 * abaixo do mínimo vira o mínimo, acima do disponível vira o máximo (com aviso), e o que não
 * for inteiro fica marcado como inválido sem mudar a quantidade.
 */
export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  label,
  visibleLabel,
  labelClassName,
  id,
  disabled = false,
  className,
}: QuantityStepperProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-erro`;
  const hintId = `${inputId}-limite`;
  const upper = Math.max(max, min);

  const [draft, setDraft] = useState(String(value));
  const [seenValue, setSeenValue] = useState(value);
  const [error, setError] = useState<string | null>(null);

  // Valor novo vindo de fora (botões, troca de edição, servidor): o campo acompanha.
  if (value !== seenValue) {
    setSeenValue(value);
    setDraft(String(value));
    setError(null);
  }

  function commit() {
    const text = draft.trim();
    if (text === '') {
      setDraft(String(value));
      setError(null);
      return;
    }
    if (!INTEGER.test(text)) {
      setError('Use um número inteiro');
      return;
    }
    const next = Math.min(Math.max(Number.parseInt(text, 10), min), upper);
    setError(null);
    setDraft(String(next));
    if (next !== value) onChange(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    }
  }

  const atMax = value >= upper;
  const describedBy = [error ? errorId : null, atMax ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div data-slot="quantity-stepper" className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center gap-3">
        <label
          htmlFor={inputId}
          className={visibleLabel ? cn('text-body-sm font-medium text-secondary', labelClassName) : 'sr-only'}
        >
          {visibleLabel ?? label}
          {visibleLabel ? <span className="sr-only"> ({label})</span> : null}
        </label>
        <button
          type="button"
          aria-label={`Diminuir ${lowerFirst(label)}`}
          aria-controls={inputId}
          disabled={disabled || value <= min}
          onClick={() => onChange(Math.max(value - 1, min))}
          className={stepButton}
        >
          <Minus aria-hidden="true" className="size-4" strokeWidth={2.5} />
        </button>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={draft}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="h-10 w-12 rounded-field border border-transparent bg-transparent text-center text-body-lg text-foreground tabular-nums transition-colors hover:border-border focus-visible:border-primary aria-[invalid=true]:border-error"
        />
        <button
          type="button"
          aria-label={`Aumentar ${lowerFirst(label)}`}
          aria-controls={inputId}
          disabled={disabled || atMax}
          onClick={() => onChange(Math.min(value + 1, upper))}
          className={stepButton}
        >
          <Plus aria-hidden="true" className="size-4" strokeWidth={2.5} />
        </button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-caption text-coral">
          {error}
        </p>
      ) : null}
      <p id={hintId} aria-live="polite" className="min-h-5 text-caption text-muted">
        {atMax ? `Máximo disponível: ${upper}` : ''}
      </p>
    </div>
  );
}
