import { Link } from '@tanstack/react-router';

import { cn } from '@/shared/lib/utils';

type MainNavLinksProps = {
  variant: 'bar' | 'sheet';
  onNavigate?: () => void;
};

const variants = {
  bar: cn(
    'relative inline-flex h-17 items-center px-1 text-body-lg text-foreground transition-colors hover:text-accent',
    'data-[status=active]:font-bold data-[status=active]:text-accent',
    'after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:rounded-full after:bg-primary after:opacity-0 data-[status=active]:after:opacity-100',
  ),
  sheet: cn(
    'flex min-h-12 items-center rounded-field border-l-4 border-transparent px-4 text-body-lg text-foreground transition-colors hover:bg-surface-raised',
    'data-[status=active]:border-primary data-[status=active]:font-bold data-[status=active]:text-accent',
  ),
} as const;

/** Início · Mercado (= catálogo) · Criadores · Aprenda — os dois últimos estão fora do escopo. */
export function MainNavLinks({ variant, onNavigate }: MainNavLinksProps) {
  const className = variants[variant];
  return (
    <ul className={variant === 'bar' ? 'flex items-center gap-8' : 'flex flex-col gap-1'}>
      <li>
        <Link
          to="/"
          activeOptions={{ exact: true, includeHash: true, includeSearch: false }}
          className={className}
          onClick={onNavigate}
        >
          Início
        </Link>
      </li>
      <li>
        <Link
          to="/"
          hash="catalogo"
          activeOptions={{ exact: true, includeHash: true, includeSearch: false }}
          className={className}
          onClick={onNavigate}
        >
          Mercado
        </Link>
      </li>
      <li>
        <Link to="/em-breve" search={{ secao: 'criadores' }} className={className} onClick={onNavigate}>
          Criadores
        </Link>
      </li>
      <li>
        <Link to="/em-breve" search={{ secao: 'aprenda' }} className={className} onClick={onNavigate}>
          Aprenda
        </Link>
      </li>
    </ul>
  );
}
