import { useState, type ReactNode } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import { X } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { LiveRegion } from '@/shared/ui/live-region';

type AuthCardProps = {
  active: 'login' | 'register';
  /** Destino pós-autenticação, repassado entre as abas. */
  redirect?: string;
  description: string;
  /** Título do mobile (o desktop usa as abas como título). */
  mobileTitle: string;
  notice?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
};

const tabClass =
  'px-1 text-title-sm text-foreground transition-colors hover:text-accent aria-[current=page]:text-accent';

/**
 * Moldura de Login/Cadastro: cartão 500 px com faixa inferior `primary` no desktop (modal do
 * layout, aqui como rota própria) e tela cheia no mobile.
 */
export function AuthCard({
  active,
  redirect,
  description,
  mobileTitle,
  notice,
  children,
  footer,
}: AuthCardProps) {
  const router = useRouter();
  const search = redirect ? { redirect } : {};

  return (
    <div className="flex justify-center px-4 py-8 md:py-14">
      <div className="relative w-full max-w-[31.25rem] md:overflow-hidden md:border md:border-border md:bg-surface md:shadow-[0_20px_60px_rgb(10_6_4/0.55)]">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Fechar e voltar"
          className="absolute top-2 right-2 hidden text-primary md:inline-flex"
          onClick={() => (router.history.canGoBack() ? router.history.back() : router.navigate({ to: '/' }))}
        >
          <X aria-hidden="true" className="size-5" strokeWidth={1.5} />
        </Button>

        <div className="flex flex-col gap-6 md:px-12 md:pt-12 md:pb-14">
          <p className="text-center text-display font-bold tracking-brand md:hidden" aria-hidden="true">
            KURIO
          </p>

          <nav aria-label="Acesso à conta" className="hidden justify-center md:flex">
            <ul className="flex items-center gap-2">
              <li>
                <Link
                  to="/login"
                  search={search}
                  aria-current={active === 'login' ? 'page' : undefined}
                  className={tabClass}
                >
                  Entrar
                </Link>
              </li>
              <li aria-hidden="true" className="h-6 w-px bg-primary" />
              <li>
                <Link
                  to="/cadastro"
                  search={search}
                  aria-current={active === 'register' ? 'page' : undefined}
                  className={tabClass}
                >
                  Criar conta
                </Link>
              </li>
            </ul>
          </nav>

          <h1 className="text-center text-section font-bold md:sr-only">{mobileTitle}</h1>
          <p className="text-center text-body-sm text-secondary">{description}</p>
          {notice}
          {children}
          <SocialLogin />
          <div className="text-center text-body-sm text-secondary">{footer}</div>
        </div>
        <div aria-hidden="true" className="hidden h-2.5 bg-primary md:block" />
      </div>
    </div>
  );
}

/** Login social fora do escopo: explica que ainda não existe, sem simular sucesso. */
function SocialLogin() {
  const [notice, setNotice] = useState('');
  const soon = (provider: string) => setNotice(`Entrar com ${provider} chega em breve. Use e-mail e senha.`);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-caption text-foreground">
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        Ou continue com
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>
      <Button variant="outline" onClick={() => soon('Google')}>
        <span aria-hidden="true" className="font-bold text-accent">
          G
        </span>
        Continuar com Google
      </Button>
      <Button variant="outline" onClick={() => soon('Facebook')}>
        <span aria-hidden="true" className="font-bold text-accent">
          f
        </span>
        Continuar com Facebook
      </Button>
      <LiveRegion className="min-h-5 text-center text-caption text-accent">{notice}</LiveRegion>
    </div>
  );
}
