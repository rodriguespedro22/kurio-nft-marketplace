import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib/utils';

type InertLinkProps = Omit<ComponentProps<'a'>, 'href' | 'onClick'> & {
  /** Nome acessível de um item só com ícone (ex.: redes sociais, escanear). */
  label?: string;
};

/**
 * Item que o layout desenha mas está fora do escopo do desafio (Criadores, Aprenda, editorial,
 * suporte, atividade, ofertas, downloads): aparece como no layout e não faz nada ao clicar, sem
 * tela própria nem sucesso simulado. `<a>` sem `href` é o link-placeholder do HTML: não navega,
 * fica fora da ordem do Tab e é lido como texto.
 */
export function InertLink({ label, className, children, ...props }: InertLinkProps) {
  return (
    <a
      {...props}
      {...(label ? { role: 'img', 'aria-label': label } : {})}
      className={cn(className, 'cursor-default')}
    >
      {children}
    </a>
  );
}
