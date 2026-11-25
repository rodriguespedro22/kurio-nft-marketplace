import { forwardRef, type ComponentPropsWithoutRef } from 'react';

const TRIGGER_CLASS =
  'flex min-h-11 items-center gap-2 rounded-full py-1 pr-3 pl-1 text-body-sm text-foreground transition-colors hover:bg-surface-raised data-[state=open]:bg-surface-raised';

type AccountTriggerProps = ComponentPropsWithoutRef<'button'> & { displayName: string };

/**
 * Botão da conta no header. O mesmo elemento serve de trigger do menu (Radix) e de botão provisório
 * enquanto o chunk do menu ainda não chegou.
 */
export const AccountTrigger = forwardRef<HTMLButtonElement, AccountTriggerProps>(function AccountTrigger(
  { displayName, className, ...props },
  ref,
) {
  const initial = displayName.trim().charAt(0).toUpperCase() || '?';
  return (
    <button
      ref={ref}
      type="button"
      aria-label={`Conta de ${displayName}`}
      className={className ? `${TRIGGER_CLASS} ${className}` : TRIGGER_CLASS}
      {...props}
    >
      {/* Inicial via CSS: o texto visível do botão é só o nome (rótulo no nome acessível). */}
      <span
        aria-hidden="true"
        data-text={initial}
        className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-bold text-ink before:content-[attr(data-text)]"
      />
      <span className="max-w-28 truncate sm:max-w-40">{displayName}</span>
    </button>
  );
});
