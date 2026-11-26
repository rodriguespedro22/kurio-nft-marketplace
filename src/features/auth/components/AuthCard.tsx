import { useId, useRef, useState, type ReactNode } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';

import { cn } from '@/shared/lib/utils';
import { useMediaQuery } from '@/shared/lib/use-media-query';
import { LiveRegion } from '@/shared/ui/live-region';

type AuthCardProps = {
  active: 'login' | 'register';
  /** Destino pós-autenticação, repassado entre as abas. */
  redirect?: string;
  description: string;
  /** Título do mobile; no desktop fica só para o leitor de tela (as abas fazem o papel visual). */
  mobileTitle: string;
  notice?: ReactNode;
  children: ReactNode;
  /** Link para a outra tela (só no mobile: no desktop as abas cumprem esse papel). */
  footer: ReactNode;
  /** Página que aparece, inerte, atrás do modal no desktop (a Início). */
  backdrop: ReactNode;
};

const DESKTOP = '(min-width: 48rem)';

const tabClass =
  'text-title-sm leading-4 font-medium text-foreground transition-colors hover:text-accent aria-[current=page]:text-accent';

/**
 * Login/Cadastro. No desktop é o modal do layout sobre a Início (500 px, sem escurecer o fundo,
 * faixa `primary` embaixo): foco preso, `Escape` ou clique fora fecham e voltam à página anterior.
 * No celular é tela cheia, com a marca no topo.
 */
export function AuthCard(props: AuthCardProps) {
  const desktop = useMediaQuery(DESKTOP);
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);

  if (!desktop) {
    return (
      <div className="flex justify-center px-4 pt-[113px] pb-8">
        <div className="w-full max-w-[31.25rem]">
          <AuthBody {...props} desktop={false} />
        </div>
      </div>
    );
  }

  const close = () =>
    router.history.canGoBack() ? router.history.back() : void router.navigate({ to: '/' });

  return (
    <>
      <div inert>{props.backdrop}</div>
      <DialogPrimitive.Root open onOpenChange={(open) => (open ? undefined : close())}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50" />
          <DialogPrimitive.Content
            ref={contentRef}
            aria-describedby={undefined}
            // Abre no primeiro campo (não no X), como um formulário.
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              contentRef.current?.querySelector('input')?.focus();
            }}
            className={cn(
              'fixed top-[max(1rem,min(160px,calc(100dvh-42rem)))] left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[500px] max-w-[calc(100%-2rem)] -translate-x-1/2 flex-col overflow-y-auto bg-surface text-foreground outline-none',
              props.active === 'login' ? 'min-h-[600px]' : 'min-h-[656px] rounded-lg',
            )}
          >
            <DialogPrimitive.Close
              aria-label="Fechar"
              className="absolute top-2 right-2 grid size-9 place-items-center rounded-full text-primary transition-colors hover:text-accent"
            >
              <X aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
            </DialogPrimitive.Close>
            <AuthBody {...props} desktop />
            <div aria-hidden="true" className="mt-auto h-2.5 shrink-0 bg-primary" />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}

function AuthBody({
  active,
  redirect,
  description,
  mobileTitle,
  notice,
  children,
  footer,
  desktop,
}: AuthCardProps & { desktop: boolean }) {
  const search = redirect ? { redirect } : {};
  const title = <h1 className="text-center text-section font-bold md:sr-only">{mobileTitle}</h1>;

  return (
    <div className="flex flex-col gap-6 md:gap-0 md:pt-12 md:pb-6">
      <p className="mb-12 text-center text-display font-bold tracking-brand md:hidden" aria-hidden="true">
        KURIO
      </p>

      <nav aria-label="Acesso à conta" className="hidden justify-center md:flex">
        <ul className="flex items-center gap-2">
          <li>
            <Link
              to="/login"
              search={search}
              replace
              aria-current={active === 'login' ? 'page' : undefined}
              className={tabClass}
            >
              Entrar
            </Link>
          </li>
          <li aria-hidden="true" className="h-5 w-px bg-coral" />
          <li>
            <Link
              to="/cadastro"
              search={search}
              replace
              aria-current={active === 'register' ? 'page' : undefined}
              className={tabClass}
            >
              Criar conta
            </Link>
          </li>
        </ul>
      </nav>

      {desktop ? <DialogPrimitive.Title asChild>{title}</DialogPrimitive.Title> : title}
      <p className="max-md:sr-only md:mt-10 md:px-12 md:text-center md:text-caption md:leading-4 md:text-foreground">
        {description}
      </p>
      {notice ? <div className="md:px-20 md:pt-6">{notice}</div> : null}
      <div className="md:px-20 md:pt-6 max-md:[&_button[type=submit]]:h-[60px] max-md:[&_input]:h-[50px] md:[&_input]:h-10 md:[&_input]:pl-4">
        {children}
      </div>
      <SocialLogin wide={active === 'register'} />
      <div className="text-center text-body-sm text-secondary md:hidden">{footer}</div>
    </div>
  );
}

const socialClass =
  'flex h-11 w-full items-center justify-center gap-3 rounded-field border border-border text-caption font-medium text-secondary transition-colors hover:border-primary hover:text-foreground md:h-10';

/** Login social fora do escopo: explica que ainda não existe, sem simular sucesso. */
function SocialLogin({ wide }: { wide: boolean }) {
  const noticeId = useId();
  const [notice, setNotice] = useState('');
  const soon = (provider: string) => setNotice(`Entrar com ${provider} chega em breve. Use e-mail e senha.`);

  return (
    <div className={cn('flex flex-col gap-3 md:pt-6', wide && 'md:gap-4')}>
      <div className="flex items-center gap-3 text-caption leading-4 text-foreground">
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        Ou continue com
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>
      <div className={cn('flex flex-col gap-3 md:px-20', wide && 'md:gap-4')}>
        <button type="button" className={socialClass} onClick={() => soon('Google')}>
          <GoogleMark />
          Continuar com Google
        </button>
        <button type="button" className={socialClass} onClick={() => soon('Facebook')}>
          <FacebookMark />
          Continuar com Facebook
        </button>
      </div>
      <LiveRegion id={noticeId} className="text-center text-caption text-accent empty:hidden md:px-20">
        {notice}
      </LiveRegion>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20">
      <path
        fill="#4285F4"
        d="M19.6 10.2c0-.7-.1-1.4-.2-2H10v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3Z"
      />
      <path
        fill="#34A853"
        d="M10 20c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H1.1v2.6A10 10 0 0 0 10 20Z"
      />
      <path fill="#FBBC05" d="M4.4 11.9a6 6 0 0 1 0-3.8V5.5H1.1a10 10 0 0 0 0 9l3.3-2.6Z" />
      <path
        fill="#EA4335"
        d="M10 4c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 1.1 5.5l3.3 2.6C5.2 5.8 7.4 4 10 4Z"
      />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20">
      <path
        fill="#1877F2"
        d="M11.5 20v-9.1h3l.5-3.6h-3.5V5.1c0-1 .3-1.7 1.8-1.7H15V.2A24 24 0 0 0 12.4 0C9.8 0 8 1.6 8 4.5v2.8H5v3.6h3V20h3.5Z"
      />
    </svg>
  );
}
