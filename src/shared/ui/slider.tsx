import type { ComponentProps } from 'react';
import { Slider as SliderPrimitive } from 'radix-ui';

import { cn } from '@/shared/lib/utils';

type SliderProps = ComponentProps<typeof SliderPrimitive.Root> & {
  /** Nome acessível de cada alça (ex.: "Preço mínimo", "Preço máximo"). */
  thumbLabels: readonly string[];
  /** Texto lido pelo leitor de tela para o valor de cada alça. */
  valueText?: (value: number) => string;
};

export function Slider({ className, thumbLabels, valueText, ...props }: SliderProps) {
  const values = props.value ?? props.defaultValue ?? [props.min ?? 0];
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        'relative flex h-11 w-full touch-none items-center select-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 grow overflow-hidden bg-primary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {values.map((value, i) => (
        <SliderPrimitive.Thumb
          key={thumbLabels[i] ?? i}
          aria-label={thumbLabels[i]}
          aria-valuetext={valueText?.(value)}
          className="relative block size-[15px] rounded-full border-3 border-ink bg-primary transition-transform before:absolute before:-inset-3.5 hover:scale-110 focus-visible:scale-110"
        />
      ))}
    </SliderPrimitive.Root>
  );
}
