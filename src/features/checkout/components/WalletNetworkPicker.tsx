import { useId, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { CircleAlert } from 'lucide-react';

import { NETWORK_LABELS, WALLET_PROVIDER_LABELS, type Wallet, type WalletConnection } from '@/contracts';
import { ConnectWalletDialog } from '@/features/wallets/components/ConnectWalletDialog';
import { SLOT_TITLES } from '@/features/wallets/form-values';
import { shortAddress } from '@/features/wallets/short-address';
import { buttonVariants } from '@/shared/ui/button-variants';
import { Button } from '@/shared/ui/button';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { cn } from '@/shared/lib/utils';

const CONNECTION_LABELS: Record<WalletConnection, string> = {
  connected: 'Conectada',
  disconnected: 'Desconectada',
  declined: 'Recusada',
};

type WalletNetworkPickerProps = {
  wallets: Wallet[];
  selectedId: string | null;
  onSelect: (wallet: Wallet) => void;
  /** Erro da tentativa de revisão (sem carteira ou carteira desconectada). */
  error?: string | null;
  className?: string;
};

/**
 * "Carteira conectada": as carteiras cadastradas como cartões com radio (a principal vem marcada).
 * A carteira escolhida precisa estar conectada — a conexão é a mesma simulação de /carteiras.
 */
export function WalletNetworkPicker({
  wallets,
  selectedId,
  onSelect,
  error,
  className,
}: WalletNetworkPickerProps) {
  const titleId = useId();
  const errorId = useId();
  const [connecting, setConnecting] = useState<Wallet | null>(null);
  const selected = wallets.find((wallet) => wallet.id === selectedId) ?? null;

  return (
    <div
      role="group"
      aria-labelledby={titleId}
      aria-describedby={error ? errorId : undefined}
      className={cn('flex flex-col gap-3', className)}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={titleId} className="text-[1.0625rem] leading-4 font-bold text-foreground">
          Carteira conectada
        </h3>
        <Link to="/carteiras" className="text-body-sm leading-4 text-accent hover:underline">
          Trocar carteira
        </Link>
      </div>

      {wallets.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-field border border-border p-4 text-body-sm text-secondary">
          <p>Você ainda não tem carteira cadastrada.</p>
          <Link to="/carteiras" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Cadastrar carteira
          </Link>
        </div>
      ) : (
        <RadioGroup
          aria-labelledby={titleId}
          className="gap-4"
          value={selectedId ?? ''}
          onValueChange={(id) => {
            const wallet = wallets.find((item) => item.id === id);
            if (wallet) onSelect(wallet);
          }}
        >
          {wallets.map((wallet) => {
            const itemId = `${titleId}-${wallet.id}`;
            const checked = wallet.id === selectedId;
            return (
              <div
                key={wallet.id}
                className={cn(
                  'flex min-h-[45px] items-center gap-2.5 rounded-[14px] border bg-surface p-4 transition-colors md:rounded-[3px] md:bg-transparent md:px-3 md:py-2',
                  checked ? 'border-primary' : 'border-transparent hover:border-border-soft md:border-border',
                )}
              >
                <RadioGroupItem id={itemId} value={wallet.id} />
                <label htmlFor={itemId} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5">
                  <span className="truncate text-body leading-5 text-foreground">
                    {wallet.label} <span className="text-secondary">· {SLOT_TITLES[wallet.slot]}</span>
                  </span>
                  <span className="truncate text-caption text-secondary">
                    {shortAddress(wallet.address)} · {NETWORK_LABELS[wallet.network]} ·{' '}
                    {WALLET_PROVIDER_LABELS[wallet.provider]}
                  </span>
                  <span
                    className={cn(
                      'text-caption',
                      wallet.connection === 'connected' ? 'text-success' : 'text-amber',
                    )}
                  >
                    {CONNECTION_LABELS[wallet.connection]}
                  </span>
                </label>
              </div>
            );
          })}
        </RadioGroup>
      )}

      {selected && selected.connection !== 'connected' ? (
        <Button variant="outline" size="sm" className="self-start" onClick={() => setConnecting(selected)}>
          Conectar {WALLET_PROVIDER_LABELS[selected.provider]}
        </Button>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-body-sm text-coral">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      ) : null}

      {connecting ? (
        <ConnectWalletDialog
          wallet={connecting}
          open
          onOpenChange={(open) => {
            if (!open) setConnecting(null);
          }}
        />
      ) : null}
    </div>
  );
}
