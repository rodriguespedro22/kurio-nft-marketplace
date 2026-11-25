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
  /**
   * `sm`: botões de 20×30; `responsive`: `sm` no celular e 33×50 a partir do tablet (detalhe);
   * `cart`: círculos de 24 px no celular e `sm` a partir do tablet (linha do carrinho).
   */
  size?: 'sm' | 'responsive' | 'cart';
  className?: string;
};

/** "Quantidade de X" → "quantidade de X": compõe "Aumentar …"/"Diminuir …" sem mexer em nomes. */
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

const stepButton =
  'relative grid h-[30px] w-5 shrink-0 place-items-center rounded-full border border-ink bg-primary text-ink transition-colors before:absolute before:-inset-x-0.5 before:-inset-y-1 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40';

const sizes = {
  sm: { button: stepButton, icon: 'size-3', input: 'w-8 text-[1.0625rem] leading-6' },
  responsive: {
    button: cn(stepButton, 'md:h-[50px] md:w-[33px] md:before:hidden'),
    icon: 'size-3 md:size-[18px]',
    input:
      'w-8 text-[1.125rem] leading-[25px] font-medium md:w-9 md:text-title-sm md:leading-7 md:font-normal',
  },
  cart: {
    button: cn(
      'relative grid size-6 shrink-0 place-items-center rounded-full border border-border bg-surface-raised text-foreground transition-colors hover:border-primary disabled:cursor-not-allowed disabled:text-border-soft disabled:hover:border-border',
      'md:h-[30px] md:w-5 md:border-ink md:bg-primary md:text-ink md:before:absolute md:before:-inset-x-0.5 md:before:-inset-y-1 md:hover:bg-primary-dark md:disabled:text-ink md:disabled:opacity-40',
    ),
    icon: 'size-3.5 md:size-3',
    input: 'w-8 text-body-lg leading-[22px] md:text-[1.0625rem] md:leading-6',
  },
} as const;

/**
 * Campo numérico com − / +. O texto digitado só vale ao confirmar (Enter ou sair do campo), e o
 * campo passa a mostrar exatamente a quantidade que vale, com a explicação ligada a ele: abaixo do
 * mínimo vira o mínimo ("Mínimo: 1"), fração vira o inteiro abaixo e texto que não é número volta ao
 * valor atual ("Use um número inteiro"), acima do disponível vira o máximo ("Máximo disponível").
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
  size = 'sm',
  className,
}: QuantityStepperProps) {
  const look = sizes[size];
  const autoId = useId();
  const inputId = id ?? autoId;
  const noticeId = `${inputId}-ajuste`;
  const hintId = `${inputId}-limite`;
  const upper = Math.max(max, min);

  const [draft, setDraft] = useState(String(value));
  const [seenValue, setSeenValue] = useState(value);
  /** Explicação do último ajuste, válida enquanto a quantidade for a que ele produziu. */
  const [notice, setNotice] = useState<{ text: string; value: number } | null>(null);

  // Valor novo vindo de fora (botões, troca de edição, servidor): o campo acompanha.
  if (value !== seenValue) {
    setSeenValue(value);
    setDraft(String(value));
    if (notice && notice.value !== value) setNotice(null);
  }

  function commit() {
    const text = draft.trim().replace(',', '.');
    if (text === '') {
      setDraft(String(value));
      setNotice(null);
      return;
    }
    const typed = Number(text);
    if (!Number.isFinite(typed)) {
      setDraft(String(value));
      setNotice({ text: 'Use um número inteiro', value });
      return;
    }
    let message = Number.isInteger(typed) ? null : 'Use um número inteiro';
    let next = Math.trunc(typed);
    if (next < min) {
      next = min;
      message ??= `Mínimo: ${min}`;
    }
    next = Math.min(next, upper);
    setDraft(String(next));
    setNotice(message ? { text: message, value: next } : null);
    if (next !== value) onChange(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    }
  }

  const atMax = value >= upper;
  const describedBy =
    [notice ? noticeId : null, atMax ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div data-slot="quantity-stepper" className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center gap-1">
        <label
          htmlFor={inputId}
          className={
            visibleLabel
              ? cn('mr-1 text-body leading-4 font-medium text-secondary', labelClassName)
              : 'sr-only'
          }
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
          className={look.button}
        >
          <Minus aria-hidden="true" className={look.icon} strokeWidth={2.5} />
        </button>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={draft}
          disabled={disabled}
          aria-describedby={describedBy}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className={cn(
            'h-10 rounded-field border border-transparent bg-transparent text-center text-foreground tabular-nums transition-colors hover:border-border focus-visible:border-primary',
            look.input,
          )}
        />
        <button
          type="button"
          aria-label={`Aumentar ${lowerFirst(label)}`}
          aria-controls={inputId}
          disabled={disabled || atMax}
          onClick={() => onChange(Math.min(value + 1, upper))}
          className={look.button}
        >
          <Plus aria-hidden="true" className={look.icon} strokeWidth={2.5} />
        </button>
      </div>
      {notice ? (
        <p id={noticeId} role="status" className="text-caption text-coral">
          {notice.text}
        </p>
      ) : null}
      <p id={hintId} aria-live="polite" className="min-h-5 text-caption text-muted">
        {atMax ? `Máximo disponível: ${upper}` : ''}
      </p>
    </div>
  );
}
