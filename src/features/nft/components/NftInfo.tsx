import type { ReactNode } from 'react';
import { Mail, Star } from 'lucide-react';

import type { Edition, Nft } from '@/contracts';
import { cn } from '@/shared/lib/utils';
import { formatEth } from '@/shared/money/eth';

import { EditionPicker } from './EditionPicker';

function Rating({ average, count }: Nft['rating']) {
  const full = Math.round(average);
  return (
    <p className="flex items-center gap-2 text-body-sm text-foreground">
      <span className="flex gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={cn('size-4', i < full ? 'fill-amber text-amber' : 'text-border-soft')}
            strokeWidth={1.5}
          />
        ))}
      </span>
      <span className="sr-only">Nota {average.toFixed(1)} de 5,</span>
      <span>
        {count} {count === 1 ? 'avaliação' : 'avaliações'} de colecionadores
      </span>
    </p>
  );
}

function ShareLinks({ name }: { name: string }) {
  const url = typeof window === 'undefined' ? '' : window.location.href;
  const text = `${name} na Kurio`;
  const links = [
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      icon: <span className="text-caption font-bold">in</span>,
    },
    {
      label: 'e-mail',
      href: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`,
      icon: <Mail aria-hidden="true" className="size-4" strokeWidth={1.75} />,
    },
    {
      label: 'X (Twitter)',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      icon: <span className="text-caption font-bold">X</span>,
    },
  ];

  return (
    <div className="flex items-center gap-2">
      <p className="text-body-sm font-bold text-foreground">Compartilhar este NFT:</p>
      <ul className="flex items-center gap-1">
        {links.map((link) => {
          const external = link.href.startsWith('http');
          return (
            <li key={link.label}>
              <a
                href={link.href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                aria-label={`Compartilhar por ${link.label}${external ? ' (abre em nova aba)' : ''}`}
                className="grid size-11 place-items-center rounded-full text-foreground transition-colors hover:text-accent"
              >
                {link.icon}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type NftInfoProps = {
  nft: Nft;
  edition: Edition | undefined;
  onEditionChange: (editionId: string) => void;
  /** Quantidade e ações de compra (montadas pela página). */
  purchase: ReactNode;
};

/** Coluna de informações: título, preço da edição, avaliação, descrição, edições e dados do token. */
export function NftInfo({ nft, edition, onEditionChange, purchase }: NftInfoProps) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-2 border-b border-border pb-4">
        <h1 className="text-title-sm font-bold text-foreground md:text-h1">{nft.name}</h1>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <p className="text-title font-bold text-accent">
            <span className="sr-only">Preço: </span>
            <span data-testid="nft-price">{formatEth(edition?.price ?? nft.editions[0]?.price ?? '0')}</span>
          </p>
          <Rating {...nft.rating} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-body font-bold text-foreground">Sobre este NFT:</h2>
        <p className="text-body-sm text-secondary">{nft.summary}</p>
      </div>

      <EditionPicker editions={nft.editions} value={edition?.id ?? ''} onChange={onEditionChange} />

      {purchase}

      <dl className="grid gap-2 text-body-sm text-secondary">
        <div className="flex gap-2">
          <dt>ID do token:</dt>
          <dd>#{nft.tokenNumber}</dd>
        </div>
        <div className="flex gap-2">
          <dt>Coleção:</dt>
          <dd>{nft.collection}</dd>
        </div>
        <div className="flex gap-2">
          <dt>Atributos:</dt>
          <dd>{nft.attributes.join(', ')}</dd>
        </div>
      </dl>

      <ShareLinks name={nft.name} />
    </div>
  );
}
