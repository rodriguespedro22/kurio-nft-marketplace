import type { ComponentProps } from 'react';

import { ensFromLabel, ensLabel } from '@/shared/lib/ens';
import { cn } from '@/shared/lib/utils';

import { Input } from './input';

type EnsNameInputProps = Omit<ComponentProps<'input'>, 'value' | 'onChange'> & {
  value: string;
  onChange: (ensName: string) => void;
};

/**
 * "Nome ENS" (Perfil e Carteiras): o sufixo `.eth` (único aceito) fica fixo ao lado e o valor é o
 * nome completo. Recebe do FormField o id e os atributos de acessibilidade e os repassa ao `<input>`.
 */
export function EnsNameInput({ value, onChange, className, ...props }: EnsNameInputProps) {
  return (
    <div className={cn('flex gap-2.5', className)}>
      <span
        aria-hidden="true"
        className="grid h-11 w-19 shrink-0 place-items-center rounded-field border border-border text-body-sm text-foreground"
      >
        .eth
      </span>
      <Input
        {...props}
        autoCapitalize="none"
        spellCheck={false}
        value={ensLabel(value)}
        onChange={(event) => onChange(ensFromLabel(event.target.value.trim().toLowerCase()))}
      />
    </div>
  );
}
