import { cn } from '@/shared/lib/utils';
import { SearchIcon } from '@/shared/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';

import { SearchInput } from './SearchInput';

type HeaderSearchPopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerClassName: string;
};

/** Busca do header no desktop (chunk próprio: Radix Popover + Floating UI só quando abre). */
export default function HeaderSearchPopover({
  open,
  onOpenChange,
  triggerClassName,
}: HeaderSearchPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger aria-label="Buscar NFTs" className={cn(triggerClassName, 'hidden xl:grid')}>
        <SearchIcon aria-hidden="true" className="size-5" />
      </PopoverTrigger>
      <PopoverContent aria-label="Busca" className="w-[380px] p-2">
        <SearchInput id="busca-header" onSubmitted={() => onOpenChange(false)} />
      </PopoverContent>
    </Popover>
  );
}
