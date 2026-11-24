import { useId } from 'react';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';

import type { Edition } from '@/contracts';
import { cn } from '@/shared/lib/utils';

type EditionPickerProps = {
  editions: Edition[];
  value: string;
  onChange: (editionId: string) => void;
};

/** Chips de edição (radio). Esgotada fica desabilitada e diz "Esgotada" — nunca só pela cor. */
export function EditionPicker({ editions, value, onChange }: EditionPickerProps) {
  const labelId = useId();
  return (
    <div className="flex flex-col gap-2">
      <p id={labelId} className="text-body font-bold text-foreground">
        Edição:
      </p>
      <RadioGroupPrimitive.Root
        aria-labelledby={labelId}
        value={value}
        onValueChange={onChange}
        className="flex flex-wrap gap-2"
      >
        {editions.map((edition) => {
          const soldOut = edition.available === 0;
          return (
            <RadioGroupPrimitive.Item
              key={edition.id}
              value={edition.id}
              disabled={soldOut}
              className={cn(
                'inline-flex min-h-11 min-w-16 flex-col items-center justify-center rounded-full border border-border px-4 py-1 text-body-sm text-foreground uppercase transition-colors',
                'hover:border-primary data-[state=checked]:border-primary data-[state=checked]:font-bold data-[state=checked]:text-accent',
                'disabled:cursor-not-allowed disabled:border-dashed disabled:text-muted disabled:hover:border-border',
              )}
            >
              <span>{edition.label}</span>
              {soldOut ? <span className="text-micro font-medium normal-case">Esgotada</span> : null}
            </RadioGroupPrimitive.Item>
          );
        })}
      </RadioGroupPrimitive.Root>
    </div>
  );
}
