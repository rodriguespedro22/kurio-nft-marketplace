import { useId, type ReactElement, type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { Slot } from 'radix-ui';

import { cn } from '@/shared/lib/utils';

import { Label } from './label';

type FormFieldProps = {
  label: ReactNode;
  /** Controle único (Input, Select, Textarea…); recebe id e atributos de acessibilidade. */
  children: ReactElement;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  id?: string;
  className?: string;
  /** Ex.: `md:sr-only` quando o layout mostra só o placeholder (o rótulo segue para o leitor de tela). */
  labelClassName?: string;
  hintClassName?: string;
};

/**
 * Liga rótulo, dica e erro ao controle: `id`/`htmlFor`, `aria-describedby`, `aria-invalid`
 * e `aria-required`. O erro aparece em coral com ícone (nunca só pela cor —.
 */
export function FormField({
  label,
  children,
  error,
  hint,
  required,
  id,
  className,
  labelClassName,
  hintClassName,
}: FormFieldProps) {
  const autoId = useId();
  const controlId = id ?? `field-${autoId}`;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div data-slot="form-field" className={cn('flex flex-col gap-2', className)}>
      {/* O asterisco fica fora do <label>: o texto do rótulo é exatamente o nome do campo. */}
      <div className={cn('flex items-center gap-1', labelClassName)}>
        <Label htmlFor={controlId}>{label}</Label>
        {required ? (
          <span aria-hidden="true" className="text-body-sm text-coral">
            *
          </span>
        ) : null}
      </div>
      <Slot.Root
        id={controlId}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        aria-required={required ? true : undefined}
      >
        {children}
      </Slot.Root>
      {hint ? (
        <p id={hintId} className={cn('text-caption text-muted', hintClassName)}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="flex items-start gap-1.5 text-caption text-coral">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <span id={errorId}>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
