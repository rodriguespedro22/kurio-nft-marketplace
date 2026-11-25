import type { ComponentProps } from 'react';
import { Tabs as TabsPrimitive } from 'radix-ui';

import { cn } from '@/shared/lib/utils';

export function Tabs({ className, ...props }: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col gap-3', className)} {...props} />;
}

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'flex [scrollbar-width:none] items-end gap-8 overflow-x-auto overflow-y-hidden border-b border-primary/30 [&::-webkit-scrollbar]:hidden',
        className,
      )}
      {...props}
    />
  );
}

/** Aba com sublinhado de 3 px `primary` quando ativa, sobre o divisor da lista. */
export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'relative -mb-px inline-flex min-h-7 items-start pb-3 text-[1.0625rem] leading-4 whitespace-nowrap text-foreground transition-colors hover:text-accent data-[state=active]:font-bold data-[state=active]:text-accent',
        'after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:bg-primary after:opacity-0 data-[state=active]:after:opacity-100',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn('flex-1', className)} {...props} />;
}
