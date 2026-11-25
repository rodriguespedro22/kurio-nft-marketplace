import { CircleCheck, Clock } from 'lucide-react';

import { PASSWORD_CHANGED_NOTICE, SESSION_EXPIRED_NOTICE } from '../search';

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

export function PasswordChangedNotice() {
  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-field border border-success/60 bg-success/10 px-3 py-2.5 text-body-sm text-success"
    >
      <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
      <span>{PASSWORD_CHANGED_NOTICE}</span>
    </p>
  );
}
