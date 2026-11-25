import { useState, type ComponentProps } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

import { Input } from './input';

type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'>;

/**
 * Campo de senha com botão mostrar/ocultar (ícone de olho do layout). Os atributos de
 * acessibilidade injetados pelo `FormField` vão para o `<input>`; o botão tem nome próprio.
 */
export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className={cn('pr-12', className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-field text-muted transition-colors hover:text-secondary"
      >
        {/* Como no Layout: olho riscado enquanto a senha está oculta. */}
        {visible ? (
          <Eye aria-hidden="true" className="size-5" strokeWidth={1.5} />
        ) : (
          <EyeOff aria-hidden="true" className="size-5" strokeWidth={1.5} />
        )}
      </button>
    </div>
  );
}
