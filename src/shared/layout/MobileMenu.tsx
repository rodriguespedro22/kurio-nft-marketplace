import { Suspense, useEffect, useState } from 'react';
import { Menu } from 'lucide-react';

import { lazyWithPreload, whenIdle } from '@/shared/lib/lazy-with-preload';
import { Button } from '@/shared/ui/button';

const MobileMenuSheet = lazyWithPreload(() => import('./MobileMenuSheet'));

/**
 * Menu de navegação abaixo de 1280 px: Sheet lateral (Radix prende o foco e devolve ao botão). O
 * Sheet só monta na 1ª abertura; até lá, o botão provisório tem a mesma cara e o mesmo nome.
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => whenIdle(() => void MobileMenuSheet.preload()), []);

  const placeholder = (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Abrir menu"
      aria-haspopup="dialog"
      aria-expanded={false}
      className="xl:hidden"
      onPointerEnter={() => void MobileMenuSheet.preload()}
      onFocus={() => void MobileMenuSheet.preload()}
      onClick={() => {
        setMounted(true);
        setOpen(true);
      }}
    >
      <Menu aria-hidden="true" className="size-6" strokeWidth={1.5} />
    </Button>
  );

  if (!mounted) return placeholder;

  return (
    <Suspense fallback={placeholder}>
      <MobileMenuSheet open={open} onOpenChange={setOpen} />
    </Suspense>
  );
}
