import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { CircleAlert, TicketPercent } from 'lucide-react';

import { ApiError } from '@/shared/api/api-error';
import { announce } from '@/shared/ui/announce';

import { useApplyCoupon, useRemoveCoupon } from '../quote-queries';

function couponError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.fields?.code) return error.fields.code;
    if (error.code === 'COUPON_EXPIRED') return 'Cupom expirado';
    if (error.code === 'COUPON_INVALID') return 'Cupom inválido';
  }
  return 'Não foi possível aplicar o cupom. Tente novamente.';
}

/**
 * "Código promocional" do layout. O cupom vive no carrinho do servidor; a mensagem de erro fica
 * no próprio campo (`aria-invalid` + `aria-describedby`). Aplicar leva o foco para "Remover
 * cupom"; remover devolve o foco ao campo.
 */
export function CouponForm({ appliedCode }: { appliedCode: string | null }) {
  const id = useId();
  const inputId = `${id}-cupom`;
  const errorId = `${id}-erro`;
  const apply = useApplyCoupon();
  const remove = useRemoveCoupon();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const removeRef = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<'input' | 'remove' | null>(null);

  // Troca entre campo e cupom aplicado: o foco acompanha a ação do usuário.
  useEffect(() => {
    const target = focusNext.current;
    focusNext.current = null;
    if (target === 'remove') removeRef.current?.focus();
    if (target === 'input') inputRef.current?.focus();
  }, [appliedCode]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = code.trim();
    if (!value) {
      setError('Informe o código');
      inputRef.current?.focus();
      return;
    }
    setError(null);
    apply.mutate(value, {
      onSuccess: (cart) => {
        focusNext.current = 'remove';
        setCode('');
        announce(`Cupom ${cart.couponCode ?? value} aplicado.`);
      },
      onError: (err) => {
        setError(couponError(err));
        inputRef.current?.focus();
      },
    });
  }

  function handleRemove() {
    remove.mutate(undefined, {
      onSuccess: () => {
        focusNext.current = 'input';
        announce('Cupom removido.');
      },
      onError: () => announce('Não foi possível remover o cupom.', 'assertive'),
    });
  }

  if (appliedCode) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-body-sm font-bold text-foreground">Código promocional</p>
        <div className="flex items-center justify-between gap-3 rounded-field border border-primary/60 bg-primary/10 px-3 py-2">
          <p className="flex items-center gap-2 text-body-sm text-foreground">
            <TicketPercent aria-hidden="true" className="size-4 text-accent" />
            <span>
              <strong className="text-accent">{appliedCode}</strong> aplicado
            </span>
          </p>
          <button
            ref={removeRef}
            type="button"
            onClick={handleRemove}
            aria-busy={remove.isPending || undefined}
            className="text-body-sm text-accent underline-offset-4 hover:underline"
          >
            Remover cupom
          </button>
        </div>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-body-sm font-bold text-foreground">
        Código promocional
      </label>
      <div className="flex rounded-field border border-border focus-within:border-primary has-[[aria-invalid=true]]:border-error">
        <input
          ref={inputRef}
          id={inputId}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Digite o código promocional..."
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-10 min-w-0 flex-1 bg-transparent px-3 text-body-sm text-foreground outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          aria-busy={apply.isPending || undefined}
          className="h-10 shrink-0 rounded-r-field bg-primary px-5 text-body font-bold text-ink transition-colors hover:bg-primary-dark"
        >
          Aplicar
        </button>
      </div>
      {error ? (
        <p className="flex items-start gap-1.5 text-caption text-coral">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <span id={errorId}>{error}</span>
        </p>
      ) : null}
    </form>
  );
}
