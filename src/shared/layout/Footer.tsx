import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';

import { cn } from '@/shared/lib/utils';
import { FacebookIcon, InstagramIcon, LinkedinIcon, TwitterIcon, YoutubeIcon } from '@/shared/ui/icons';
import { InertLink } from '@/shared/ui/inert-link';
import { LiveRegion } from '@/shared/ui/live-region';

const HIGHLIGHTS = [
  {
    mark: 'W',
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    mark: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    mark: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
] as const;

type SoonLink = { label: string };

const PROFILE_LINKS: SoonLink[] = [
  { label: 'Minha coleção' },
  { label: 'Atividade' },
  { label: 'Estúdio do criador' },
];

const HELP_LINKS: SoonLink[] = [
  { label: 'Central de ajuda' },
  { label: 'Como comprar NFTs' },
  { label: 'Carteira e segurança' },
  { label: 'Política do mercado' },
  { label: 'Denunciar item' },
];

/** Coleções do rodapé → catálogo já filtrado pela categoria. */
const COLLECTIONS = [
  { id: 'arte-digital', name: 'Arte digital' },
  { id: 'fotografia', name: 'Fotografia' },
  { id: 'musica', name: 'Música' },
  { id: 'arte-3d', name: 'Arte 3D' },
  { id: 'utilidade', name: 'Utilidade' },
] as const;

const SOCIAL = [
  { label: 'Facebook', Icon: FacebookIcon },
  { label: 'Instagram', Icon: InstagramIcon },
  { label: 'Twitter', Icon: TwitterIcon },
  { label: 'LinkedIn', Icon: LinkedinIcon },
  { label: 'YouTube', Icon: YoutubeIcon },
] as const;

const linkClass = 'text-body-sm leading-[30px] text-foreground transition-colors hover:text-accent';

function FooterColumn({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={cn('flex flex-col gap-2', className)}>
      <h2 id={id} className="text-section leading-4 font-bold text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Itens fora do escopo do desafio: aparecem como no layout e não fazem nada. */
function SoonItems({ links }: { links: SoonLink[] }) {
  return links.map((link) => (
    <li key={link.label}>
      <InertLink className={linkClass}>{link.label}</InertLink>
    </li>
  ));
}

/** Newsletter fora do escopo: o envio só explica que ainda não existe — nunca simula sucesso. */
function Newsletter() {
  const inputId = useId();
  const [notice, setNotice] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('A newsletter chega em breve — nenhum e-mail foi cadastrado.');
  }

  return (
    <section aria-labelledby={`${inputId}-title`} className="flex flex-col gap-3 xl:px-4">
      <div className="flex flex-col gap-4">
        <h2 id={`${inputId}-title`} className="text-section leading-4 font-bold text-foreground">
          Antecipe-se ao próximo lançamento
        </h2>
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex h-10 overflow-hidden rounded-[6px] bg-surface-dark focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary"
        >
          <label htmlFor={inputId} className="sr-only">
            E-mail para a newsletter
          </label>
          <input
            id={inputId}
            type="email"
            name="email"
            autoComplete="email"
            placeholder="digite seu e-mail..."
            className="min-w-0 flex-1 bg-transparent px-3 text-body-sm text-foreground outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            className="w-[85px] shrink-0 bg-primary text-section leading-4 font-bold text-ink transition-colors hover:bg-primary-dark"
          >
            Enviar
          </button>
        </form>
      </div>
      <LiveRegion className="text-caption text-accent empty:hidden">{notice}</LiveRegion>
      <p className="text-caption leading-[22px] text-secondary">
        Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
      </p>
    </section>
  );
}

/**
 * Rodapé: destaques W/C/D + newsletter, faixa de contato, colunas de links e copyright.
 * `phoneBottomBar`: a página tem barra fixa mais alta que a navegação no celular.
 */
export function Footer({ phoneBottomBar = false }: { phoneBottomBar?: boolean }) {
  return (
    <footer className={cn('mt-20 pb-28 xl:mt-24 xl:pb-6', phoneBottomBar && 'max-md:pb-48')}>
      <div className="container-page flex flex-col">
        <div className="grid gap-8 bg-surface p-6 md:grid-cols-2 md:p-8 xl:grid-cols-[265px_265px_265px_minmax(0,1fr)] xl:gap-0">
          {HIGHLIGHTS.map(({ mark, title, text }) => (
            <div key={title} className="flex flex-col gap-3 xl:border-r xl:border-primary xl:px-4">
              <span
                aria-hidden="true"
                className="grid size-[74px] place-items-center rounded-full bg-primary text-h2 leading-8 font-bold text-ink"
              >
                {mark}
              </span>
              <h2 className="text-[1.0625rem] leading-4 font-bold text-foreground">{title}</h2>
              <p className="max-w-[204px] text-body-sm leading-[22px] text-secondary">{text}</p>
            </div>
          ))}
          <Newsletter />
        </div>

        <div className="grid gap-3 bg-surface-dark p-6 text-body-sm leading-[22px] text-foreground sm:grid-cols-2 md:p-8 xl:grid-cols-[303px_302px_303px_minmax(0,1fr)] xl:items-center xl:gap-0">
          <span className="font-bold tracking-brand">KURIO</span>
          <span>
            Feito para colecionadores,
            <br className="max-xl:hidden" /> criadores e cultura
          </span>
          <span>contato@email.com</span>
          <span>+55 11 4002 8922</span>
        </div>

        <div className="grid gap-8 bg-surface p-6 sm:grid-cols-2 md:p-8 xl:grid-cols-[303px_302px_303px_minmax(0,1fr)] xl:gap-0">
          <FooterColumn title="Meu perfil">
            <ul className="flex flex-col">
              <li>
                <Link to="/perfil" className={linkClass}>
                  Meu perfil
                </Link>
              </li>
              <SoonItems links={PROFILE_LINKS} />
              <li>
                <Link to="/favoritos" className={linkClass}>
                  Lista de interesse
                </Link>
              </li>
            </ul>
          </FooterColumn>
          <FooterColumn title="Central de ajuda">
            <ul className="flex flex-col">
              <SoonItems links={HELP_LINKS} />
            </ul>
          </FooterColumn>
          <FooterColumn title="Coleções">
            <ul className="flex flex-col">
              {COLLECTIONS.map(({ id, name }) => (
                <li key={id}>
                  <Link to="/" search={{ category: [id] }} hash="catalogo" className={linkClass}>
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </FooterColumn>
          <div className="flex flex-col gap-8">
            <FooterColumn title="Redes sociais" className="gap-5">
              <ul className="flex flex-wrap gap-2.5">
                {SOCIAL.map(({ label, Icon }) => (
                  <li key={label}>
                    <InertLink
                      label={label}
                      className="grid size-[30px] place-items-center rounded-[4px] border border-primary text-accent"
                    >
                      <Icon className="size-3.5" />
                    </InertLink>
                  </li>
                ))}
              </ul>
            </FooterColumn>
            <FooterColumn title="Carteiras compatíveis" className="gap-3">
              <p className="flex h-[26px] w-fit items-center rounded-[6px] border border-border-soft bg-surface-dark px-2.5 text-[0.5625rem] leading-3 font-bold tracking-[0.01em] whitespace-pre text-accent">
                {'METAMASK  •  WALLETCONNECT  •  COINBASE'}
              </p>
            </FooterColumn>
          </div>
        </div>

        <p className="pt-1.5 text-center text-body-sm leading-[30px] text-foreground">
          © 2026 Kurio. Propriedade digital para todos.
        </p>
      </div>
    </footer>
  );
}
