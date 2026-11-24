import { TriangleAlert } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

import { Button } from './button';

type ErrorCopy = { title: string; description: string };

const COPY_BY_CODE: Record<string, ErrorCopy> = {
  NETWORK: {
    title: 'Sem conexão',
    description: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
  },
  TIMEOUT: {
    title: 'A resposta demorou demais',
    description: 'O servidor levou tempo demais para responder. Tente novamente em instantes.',
  },
  TRANSIENT: {
    title: 'Instabilidade temporária',
    description: 'O serviço está instável no momento. Tente novamente em instantes.',
  },
  NOT_FOUND: {
    title: 'Não encontrado',
    description: 'Não encontramos o que você procurava. Ele pode ter sido removido.',
  },
  FORBIDDEN: {
    title: 'Acesso negado',
    description: 'Você não tem permissão para ver este conteúdo.',
  },
};

const FALLBACK: ErrorCopy = {
  title: 'Algo deu errado',
  description: 'Não foi possível carregar este conteúdo. Tente novamente em instantes.',
};

function copyFor(error: unknown): ErrorCopy {
  if (error && typeof error === 'object') {
    const { code, status } = error as { code?: unknown; status?: unknown };
    if (typeof code === 'string' && COPY_BY_CODE[code]) return COPY_BY_CODE[code];
    if (typeof status === 'number' && status >= 500) return COPY_BY_CODE.TRANSIENT ?? FALLBACK;
  }
  return FALLBACK;
}

type PageErrorProps = {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
};

/** Estado de erro de página/seção. Mensagens são da UI; detalhes técnicos nunca são exibidos. */
export function PageError({ error, onRetry, title, className }: PageErrorProps) {
  const copy = copyFor(error);

  return (
    <div
      role="alert"
      data-slot="page-error"
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-border bg-surface px-6 py-12 text-center',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="grid size-14 place-items-center rounded-full bg-surface-raised text-coral"
      >
        <TriangleAlert className="size-6" />
      </div>
      <h2 className="text-section font-bold text-foreground">{title ?? copy.title}</h2>
      <p className="max-w-md text-body-sm text-secondary">{copy.description}</p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry} className="mt-2">
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}
