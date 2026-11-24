import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { BellRing, ShieldCheck, Sparkles } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { LiveRegion } from '@/shared/ui/live-region';

import type { ComingSoonSection } from './coming-soon';

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    icon: Sparkles,
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    icon: BellRing,
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
] as const;

type SoonLink = { label: string; secao: ComingSoonSection };

const PROFILE_LINKS: SoonLink[] = [
  { label: 'Minha coleção', secao: 'colecao' },
  { label: 'Atividade', secao: 'atividade' },
  { label: 'Estúdio do criador', secao: 'estudio' },
];

const HELP_LINKS: SoonLink[] = [
  { label: 'Central de ajuda', secao: 'ajuda' },
  { label: 'Como comprar NFTs', secao: 'como-comprar' },
  { label: 'Carteira e segurança', secao: 'seguranca' },
  { label: 'Política do mercado', secao: 'politica' },
  { label: 'Denunciar item', secao: 'denunciar' },
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
  { label: 'Facebook', mono: 'f' },
  { label: 'Instagram', mono: 'ig' },
  { label: 'Twitter', mono: 'x' },
  { label: 'LinkedIn', mono: 'in' },
  { label: 'YouTube', mono: 'yt' },
] as const;

const linkClass = 'text-body-sm text-foreground/90 transition-colors hover:text-accent';

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-body-lg font-bold text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Links "em breve" da coluna; `children` acrescenta itens que já levam a telas reais. */
function SoonList({ links, children }: { links: SoonLink[]; children?: ReactNode }) {
  return (
    <ul className="flex flex-col gap-2">
      {links.map((link) => (
        <li key={link.secao}>
          <Link to="/em-breve" search={{ secao: link.secao }} className={linkClass}>
            {link.label}
          </Link>
        </li>
      ))}
      {children}
    </ul>
  );
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
    <section aria-labelledby={`${inputId}-title`} className="flex flex-col gap-3">
      <h2 id={`${inputId}-title`} className="text-body-lg font-bold text-foreground">
        Antecipe-se ao próximo lançamento
      </h2>
      <form onSubmit={handleSubmit} noValidate className="flex">
        <label htmlFor={inputId} className="sr-only">
          E-mail para a newsletter
        </label>
        <Input
          id={inputId}
          type="email"
          name="email"
          autoComplete="email"
          placeholder="digite seu e-mail..."
          className="rounded-r-none"
        />
        <Button type="submit" className="h-11 rounded-l-none">
          Enviar
        </Button>
      </form>
      <LiveRegion className="min-h-5 text-caption text-accent">{notice}</LiveRegion>
      <p className="text-caption text-secondary">
        Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
      </p>
    </section>
  );
}

/** `phoneBottomBar`: a página tem barra fixa mais alta que a navegação no celular. */
export function Footer({ phoneBottomBar = false }: { phoneBottomBar?: boolean }) {
  return (
    <footer className={cn('mt-20 pb-28 xl:pb-10', phoneBottomBar && 'max-md:pb-48')}>
      <div className="container-page flex flex-col">
        <div className="grid gap-8 bg-surface p-6 md:grid-cols-2 md:p-8 xl:grid-cols-4">
          {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex flex-col gap-3 xl:border-r xl:border-primary/60 xl:pr-6">
              <span
                aria-hidden="true"
                className="grid size-14 place-items-center rounded-full bg-primary text-ink"
              >
                <Icon className="size-6" strokeWidth={1.5} />
              </span>
              <h2 className="text-body-lg font-bold text-foreground">{title}</h2>
              <p className="text-body-sm text-secondary">{text}</p>
            </div>
          ))}
          <Newsletter />
        </div>

        <div className="grid gap-3 bg-surface-dark px-6 py-6 text-body-sm text-foreground sm:grid-cols-2 xl:grid-cols-4 xl:items-center">
          <span className="font-bold tracking-brand">KURIO</span>
          <span>Feito para colecionadores, criadores e cultura</span>
          <span>contato@email.com</span>
          <span>+55 11 4002 8922</span>
        </div>

        <div className="grid gap-8 bg-surface px-6 py-8 sm:grid-cols-2 xl:grid-cols-4">
          <FooterColumn title="Meu perfil">
            <SoonList links={PROFILE_LINKS}>
              <li>
                <Link to="/favoritos" className={linkClass}>
                  Lista de interesse
                </Link>
              </li>
            </SoonList>
          </FooterColumn>
          <FooterColumn title="Central de ajuda">
            <SoonList links={HELP_LINKS} />
          </FooterColumn>
          <FooterColumn title="Coleções">
            <ul className="flex flex-col gap-2">
              {COLLECTIONS.map(({ id, name }) => (
                <li key={id}>
                  <Link to="/" search={{ category: [id] }} hash="catalogo" className={linkClass}>
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </FooterColumn>
          <div className="flex flex-col gap-6">
            <FooterColumn title="Redes sociais">
              <ul className="flex flex-wrap gap-2">
                {SOCIAL.map(({ label, mono }) => (
                  <li key={label}>
                    <Link
                      to="/em-breve"
                      search={{ secao: 'redes-sociais' }}
                      aria-label={label}
                      className="grid size-11 place-items-center rounded-control border border-primary text-caption font-bold text-accent uppercase transition-colors hover:bg-primary hover:text-ink"
                    >
                      <span aria-hidden="true">{mono}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </FooterColumn>
            <FooterColumn title="Carteiras compatíveis">
              <p className="w-fit rounded-control border border-primary/60 px-3 py-1.5 text-micro font-bold tracking-brand text-accent">
                METAMASK • WALLETCONNECT • COINBASE
              </p>
            </FooterColumn>
          </div>
        </div>

        <p className="py-6 text-center text-caption text-muted">
          © 2026 Kurio. Propriedade digital para todos.
        </p>
      </div>
    </footer>
  );
}
