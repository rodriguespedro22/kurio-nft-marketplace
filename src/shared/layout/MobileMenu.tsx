import { useState } from 'react';
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

/** Menu de navegação abaixo de 1280 px: Sheet lateral (Radix prende o foco e devolve ao botão). */
export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
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
          <MainNavLinks variant="sheet" onNavigate={() => setOpen(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
