import { Clock } from 'lucide-react';

import { SESSION_EXPIRED_NOTICE } from '../search';

export function SessionExpiredNotice() {
  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-field border border-amber/60 bg-amber/10 px-3 py-2.5 text-body-sm text-amber"
    >
      <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
      <span>{SESSION_EXPIRED_NOTICE}</span>
    </p>
  );
}
