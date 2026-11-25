import { TriangleAlert } from 'lucide-react';

import { formatEth } from '@/shared/money/eth';

import type { QuoteChange } from '../quote-changes';

/** Diferenças entre a cotação vista e a renovada: a pessoa confirma sabendo o que mudou. */
export function QuoteDiff({ changes }: { changes: QuoteChange[] }) {
  if (changes.length === 0) return null;
  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-field border border-amber/60 bg-amber/10 px-3 py-2.5 text-body-sm text-amber"
    >
      <p className="flex items-start gap-2 font-bold">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Os valores mudaram desde a última cotação. Confira antes de confirmar.
      </p>
      <ul className="flex flex-col gap-1 pl-6">
        {changes.map((change) => (
          <li key={change.key} className="flex flex-wrap justify-between gap-x-3">
            <span>{change.label}</span>
            <span className="tabular-nums">
              <s>{change.previous === null ? '—' : formatEth(change.previous)}</s>
              <span aria-hidden="true"> → </span>
              <span className="sr-only"> agora </span>
              {change.current === null ? 'removido' : formatEth(change.current)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
