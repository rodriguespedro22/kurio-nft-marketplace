import { Link } from '@tanstack/react-router';

import { MainNavLinks } from './MainNavLinks';
import { MobileMenu } from './MobileMenu';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-ink/95 backdrop-blur supports-[backdrop-filter]:bg-ink/85">
      <div className="container-page grid h-14 grid-cols-[1fr_auto] items-center gap-6 xl:h-17 xl:grid-cols-[1fr_auto_1fr]">
        <Link
          to="/"
          className="justify-self-start text-body-sm font-bold tracking-brand text-foreground"
          aria-label="Kurio — página inicial"
        >
          KURIO
        </Link>

        <nav aria-label="Principal" className="hidden xl:block">
          <MainNavLinks variant="bar" />
        </nav>

        <div className="flex items-center gap-2 justify-self-end">
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
