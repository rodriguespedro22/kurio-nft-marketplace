import { Suspense, useEffect, useState } from 'react';
import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { toast } from 'sonner';

import { lazyWithPreload, whenIdle } from '@/shared/lib/lazy-with-preload';
import { cn } from '@/shared/lib/utils';
import { buttonVariants } from '@/shared/ui/button-variants';
import { LoginIcon } from '@/shared/ui/icons';

import { useLogout } from '../queries';
import { safeRedirect, useSession } from '../session';
import { AccountTrigger } from './account-trigger';

const AccountDropdown = lazyWithPreload(() => import('./AccountDropdown'));

/** Header: botão "Entrar" (visitante) ou menu da conta com nome, perfil e "Sair". */
export function AccountMenu() {
  const session = useSession();
  const router = useRouter();
  const href = useRouterState({ select: (s) => s.location.href });
  const onProtectedRoute = useRouterState({
    select: (s) => s.matches.some((m) => m.routeId.startsWith('/_auth')),
  });
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  // O menu (Radix) só monta na 1ª abertura; até lá, o botão provisório tem a mesma cara e o mesmo nome.
  const [mounted, setMounted] = useState(false);
  const signedIn = session !== null;

  useEffect(() => (signedIn ? whenIdle(() => void AccountDropdown.preload()) : undefined), [signedIn]);

  if (!session) {
    const redirect = safeRedirect(href);
    return (
      <Link
        to="/login"
        search={redirect === '/' ? {} : { redirect }}
        className={cn(
          buttonVariants({ size: 'sm' }),
          'h-[35px] gap-1 rounded-[6px] px-[9px] text-body-lg font-medium',
        )}
      >
        <LoginIcon className="size-5" />
        Entrar
      </Link>
    );
  }

  const { displayName, email } = session.user;

  function handleLogout() {
    logout.mutate(undefined, {
      onSettled: () => {
        toast('Você saiu da sua conta.');
        if (onProtectedRoute) void router.navigate({ to: '/' });
      },
    });
  }

  const placeholder = (
    <AccountTrigger
      displayName={displayName}
      aria-haspopup="menu"
      aria-expanded={false}
      onPointerEnter={() => void AccountDropdown.preload()}
      onFocus={() => void AccountDropdown.preload()}
      onClick={() => {
        setMounted(true);
        setOpen(true);
      }}
    />
  );

  if (!mounted) return placeholder;

  return (
    <Suspense fallback={placeholder}>
      <AccountDropdown
        displayName={displayName}
        email={email}
        open={open}
        onOpenChange={setOpen}
        onLogout={handleLogout}
        logoutPending={logout.isPending}
      />
    </Suspense>
  );
}
