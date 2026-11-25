import { Menu } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/sheet';

import { MainNavLinks } from './MainNavLinks';

type MobileMenuSheetProps = { open: boolean; onOpenChange: (open: boolean) => void };

/** Sheet do menu mobile (chunk próprio: Radix Dialog só baixa quando vai ser usado). */
export default function MobileMenuSheet({ open, onOpenChange }: MobileMenuSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Abrir menu" className="xl:hidden">
          <Menu aria-hidden="true" className="size-6" strokeWidth={1.5} />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" aria-describedby="menu-descricao">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription id="menu-descricao">Navegue pelas seções da Kurio.</SheetDescription>
        </SheetHeader>
        <nav aria-label="Principal">
          <MainNavLinks variant="sheet" onNavigate={() => onOpenChange(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
