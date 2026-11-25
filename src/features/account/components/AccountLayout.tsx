import { useId, type ReactNode } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import {
  Download,
  Heart,
  LineChart,
  LogOut,
  MapPin,
  ShoppingCart,
  TriangleAlert,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';

import { useLogout } from '@/features/auth/queries';
import { cn } from '@/shared/lib/utils';
import { InertLink } from '@/shared/ui/inert-link';

type NavIcon = typeof UserRound;
type NavItem =
  | { label: string; Icon: NavIcon; to: '/perfil' | '/carteiras' | '/favoritos' }
  | { label: string; Icon: NavIcon; inert: true };

/** Sidebar da conta; o que está fora do escopo aparece, mas não faz nada. */
const ITEMS: NavItem[] = [
  { label: 'Dados do perfil', Icon: UserRound, to: '/perfil' },
  { label: 'Carteiras', Icon: MapPin, to: '/carteiras' },
  { label: 'Atividade', Icon: ShoppingCart, inert: true },
  { label: 'Lista de interesse', Icon: Heart, to: '/favoritos' },
  { label: 'Ofertas', Icon: LineChart, inert: true },
  { label: 'Arquivos baixados', Icon: Download, inert: true },
  { label: 'Suporte', Icon: TriangleAlert, inert: true },
];

// No mobile a lista vira uma faixa rolável de atalhos; no desktop, a coluna do layout.
const itemClass =
  'relative flex min-h-11 shrink-0 items-center gap-3 rounded-field px-3 text-body whitespace-nowrap text-accent transition-colors hover:text-foreground lg:min-h-[45px] lg:rounded-none lg:px-4 [&>svg]:text-muted data-[status=active]:[&>svg]:text-accent data-[status=active]:before:absolute data-[status=active]:before:inset-y-0 data-[status=active]:before:left-0 data-[status=active]:before:w-1 data-[status=active]:before:bg-primary max-lg:data-[status=active]:bg-surface-raised max-lg:data-[status=active]:before:hidden';

type AccountLayoutProps = { title: string; children: ReactNode };

/** Páginas da conta: sidebar "Meu perfil" + conteúdo com o `<h1>` da página (só para leitores). */
export function AccountLayout({ title, children }: AccountLayoutProps) {
  const navTitleId = useId();
  const router = useRouter();
  const logout = useLogout();

  function handleLogout() {
    logout.mutate(undefined, {
      onSettled: () => {
        toast('Você saiu da sua conta.');
        void router.navigate({ to: '/' });
      },
    });
  }

  return (
    <div className="container-page grid gap-8 py-6 lg:grid-cols-[19.375rem_minmax(0,1fr)] lg:gap-7 lg:py-8">
      <nav aria-labelledby={navTitleId} className="min-w-0 rounded-sm bg-surface py-3 lg:self-start lg:py-2">
        <p id={navTitleId} className="px-3 pb-2 text-section leading-4 font-bold text-foreground lg:p-2.5">
          Meu perfil
        </p>
        <ul className="flex gap-1 overflow-x-auto px-2 pb-1 lg:flex-col lg:gap-0 lg:px-0 lg:pb-0">
          {ITEMS.map(({ label, Icon, ...target }) => (
            <li key={label}>
              {'to' in target ? (
                <Link to={target.to} className={itemClass}>
                  <Icon aria-hidden="true" className="size-4.5" strokeWidth={1.5} />
                  {label}
                </Link>
              ) : (
                <InertLink className={cn(itemClass, 'hover:text-accent')}>
                  <Icon aria-hidden="true" className="size-4.5" strokeWidth={1.5} />
                  {label}
                </InertLink>
              )}
            </li>
          ))}
          <li className="lg:border-t lg:border-primary/30">
            <button
              type="button"
              onClick={handleLogout}
              disabled={logout.isPending}
              className={cn(
                itemClass,
                'w-full font-bold disabled:opacity-60 lg:min-h-10 [&>svg]:text-primary',
              )}
            >
              <LogOut aria-hidden="true" className="size-4.5" strokeWidth={1.5} />
              Sair
            </button>
          </li>
        </ul>
      </nav>

      <div className="flex min-w-0 flex-col gap-10">
        <h1 className="sr-only">{title}</h1>
        {children}
      </div>
    </div>
  );
}
