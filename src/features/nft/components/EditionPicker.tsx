import { useId } from 'react';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';

import type { Edition } from '@/contracts';
import { cn } from '@/shared/lib/utils';

type EditionPickerProps = {
  editions: Edition[];
  value: string;
  onChange: (editionId: string) => void;
};

/**
 * Pílulas de edição (radio). Esgotada fica desabilitada, riscada e com "Esgotada" no nome
 * acessível — nunca só pela cor.
 */
export function EditionPicker({ editions, value, onChange }: EditionPickerProps) {
  const labelId = useId();
  return (
    <div className="flex flex-col gap-2 md:gap-3">
      <p id={labelId} className="text-body leading-4 font-bold text-foreground">
        Edição:
      </p>
      <RadioGroupPrimitive.Root
        aria-labelledby={labelId}
        value={value}
        onValueChange={onChange}
        className="flex flex-wrap gap-3 md:gap-1.5"
      >
        {editions.map((edition) => {
          const soldOut = edition.available === 0;
          return (
            <RadioGroupPrimitive.Item
              key={edition.id}
              value={edition.id}
              disabled={soldOut}
              title={soldOut ? 'Esgotada' : undefined}
              className={cn(
                'inline-flex h-7 min-w-9 items-center justify-center rounded-full border border-border px-1.5 text-body-sm leading-4 text-secondary uppercase transition-colors',
                'hover:border-border-soft data-[state=checked]:border-primary data-[state=checked]:font-medium data-[state=checked]:text-accent',
                'disabled:cursor-not-allowed disabled:text-muted disabled:line-through disabled:opacity-60 disabled:hover:border-border',
              )}
            >
              {edition.label}
              {soldOut ? <span className="sr-only"> Esgotada</span> : null}
            </RadioGroupPrimitive.Item>
          );
        })}
      </RadioGroupPrimitive.Root>
    </div>
  );
}
