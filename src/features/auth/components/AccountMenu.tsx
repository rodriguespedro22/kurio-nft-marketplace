import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { LogOut, UserRound } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/shared/lib/utils';
import { buttonVariants } from '@/shared/ui/button-variants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { LoginIcon } from '@/shared/ui/icons';

import { useLogout } from '../queries';
import { safeRedirect, useSession } from '../session';

/** Header: botão "Entrar" (visitante) ou menu da conta com nome, perfil e "Sair". */
export function AccountMenu() {
  const session = useSession();
  const router = useRouter();
  const href = useRouterState({ select: (s) => s.location.href });
  const onProtectedRoute = useRouterState({
    select: (s) => s.matches.some((m) => m.routeId.startsWith('/_auth')),
  });
  const logout = useLogout();

  if (!session) {
    const redirect = safeRedirect(href);
    return (
      <Link
        to="/login"
        search={redirect === '/' ? {} : { redirect }}
        className={cn(buttonVariants({ size: 'sm' }), 'rounded-[6px] px-3')}
      >
        <LoginIcon className="size-5" />
        Entrar
      </Link>
    );
  }

  const { displayName, email } = session.user;
  const initial = displayName.trim().charAt(0).toUpperCase() || '?';

  function handleLogout() {
    logout.mutate(undefined, {
      onSettled: () => {
        toast('Você saiu da sua conta.');
        if (onProtectedRoute) void router.navigate({ to: '/' });
      },
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Conta de ${displayName}`}
        className="flex min-h-11 items-center gap-2 rounded-full py-1 pr-3 pl-1 text-body-sm text-foreground transition-colors hover:bg-surface-raised data-[state=open]:bg-surface-raised"
      >
        {/* Inicial via CSS: o texto visível do botão é só o nome (rótulo no nome acessível). */}
        <span
          aria-hidden="true"
          data-text={initial}
          className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-bold text-ink before:content-[attr(data-text)]"
        />
        <span className="max-w-28 truncate sm:max-w-40">{displayName}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to="/perfil">
            <UserRound aria-hidden="true" strokeWidth={1.5} />
            Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout} disabled={logout.isPending}>
          <LogOut aria-hidden="true" strokeWidth={1.5} />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
