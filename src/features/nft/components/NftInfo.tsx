import type { ReactNode } from 'react';
import { Mail, Star } from 'lucide-react';

import type { Edition, Nft } from '@/contracts';
import { cn } from '@/shared/lib/utils';
import { useMediaQuery } from '@/shared/lib/use-media-query';
import { formatEth } from '@/shared/money/eth';
import { LinkedinIcon, TwitterIcon } from '@/shared/ui/icons';

import { EditionPicker } from './EditionPicker';

/** Desktop: cinco estrelas + "n avaliações de colecionadores". */
function Rating({ average, count }: Nft['rating']) {
  const full = Math.round(average);
  return (
    <p className="flex items-center gap-1 text-body leading-5 text-foreground">
      <span className="flex gap-1" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={cn(
              'size-[15px]',
              i < full ? 'fill-primary text-primary' : 'fill-secondary text-secondary',
            )}
            strokeWidth={0}
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

/** Celular: selo "★ 4.8 (19)". */
function RatingBadge({ average, count }: Nft['rating']) {
  return (
    <p className="flex h-[27px] shrink-0 items-center gap-1 rounded-full border border-primary px-[7px] text-body-sm leading-4">
      <Star aria-hidden="true" className="size-3 fill-primary text-primary" strokeWidth={0} />
      <span className="sr-only">Nota</span>
      <span className="font-medium text-foreground">{average.toFixed(1)}</span>
      <span className="text-secondary">
        <span className="sr-only">de 5, </span>({count}
        <span className="sr-only"> {count === 1 ? 'avaliação' : 'avaliações'}</span>)
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
      icon: <LinkedinIcon className="size-[15px]" />,
    },
    {
      label: 'e-mail',
      href: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`,
      icon: <Mail aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />,
    },
    {
      label: 'X (Twitter)',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      icon: <TwitterIcon className="size-4" />,
    },
  ];

  return (
    <div className="flex items-center gap-1">
      <p className="text-body leading-4 font-bold text-foreground">Compartilhar este NFT:</p>
      <ul className="flex items-center">
        {links.map((link) => {
          const external = link.href.startsWith('http');
          return (
            <li key={link.label}>
              <a
                href={link.href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                aria-label={`Compartilhar por ${link.label}${external ? ' (abre em nova aba)' : ''}`}
                className="grid size-6 place-items-center text-foreground transition-colors hover:text-accent"
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

/**
 * Coluna de informações: título, preço da edição, avaliação, descrição, edições e dados do token.
 * No celular o preço fica na barra de compra (o título divide a linha com o selo da avaliação).
 */
export function NftInfo({ nft, edition, onEditionChange, purchase }: NftInfoProps) {
  const desktop = useMediaQuery('(min-width: 48rem)');
  const price = formatEth(edition?.price ?? nft.editions[0]?.price ?? '0');

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-title-sm leading-4 font-bold text-foreground md:text-h1 md:leading-[37px]">
            {nft.name}
          </h1>
          {desktop ? null : <RatingBadge {...nft.rating} />}
        </div>
        {desktop ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <p className="text-title leading-4 font-bold text-accent">
                <span className="sr-only">Preço: </span>
                <span data-testid="nft-price">{price}</span>
              </p>
              <Rating {...nft.rating} />
            </div>
            <span aria-hidden="true" className="h-px bg-primary/30 xl:w-[573px]" />
          </>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-body leading-4 font-bold text-foreground max-md:sr-only">Sobre este NFT:</h2>
        <p className="text-body-sm leading-6 text-secondary">{nft.summary}</p>
      </div>

      <EditionPicker editions={nft.editions} value={edition?.id ?? ''} onChange={onEditionChange} />

      {purchase}

      <div className="flex flex-col gap-3">
        <dl className="flex flex-col gap-3 text-body leading-5 text-muted">
          <div className="flex gap-[1ch]">
            <dt>ID do token:</dt>
            <dd>#{nft.tokenNumber}</dd>
          </div>
          <div className="flex gap-[1ch]">
            <dt>Coleção:</dt>
            <dd>{nft.collection}</dd>
          </div>
          <div className="flex gap-[1ch]">
            <dt>Atributos:</dt>
            <dd>{nft.attributes.join(', ')}</dd>
          </div>
        </dl>
        <ShareLinks name={nft.name} />
      </div>
    </div>
  );
}
