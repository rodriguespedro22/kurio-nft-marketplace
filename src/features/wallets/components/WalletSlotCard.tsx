import { useId, useState } from 'react';
import { CircleCheck, CircleMinus, CircleX } from 'lucide-react';
import { toast } from 'sonner';

import { WALLET_PROVIDER_LABELS, type Wallet, type WalletConnection, type WalletSlot } from '@/contracts';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Label } from '@/shared/ui/label';

import { copyFromPrimary, SLOT_TITLES, walletFormValues } from '../form-values';
import { useDisconnectWallet } from '../queries';
import { shortAddress } from '../short-address';
import { ConnectWalletDialog } from './ConnectWalletDialog';
import { WalletForm } from './WalletForm';

const CONNECTION = {
  connected: { label: 'Conectada', Icon: CircleCheck, className: 'text-success' },
  disconnected: { label: 'Desconectada', Icon: CircleMinus, className: 'text-secondary' },
  declined: { label: 'Recusada', Icon: CircleX, className: 'text-coral' },
} satisfies Record<WalletConnection, unknown>;

const EMPTY: Record<WalletSlot, string> = {
  primary: 'Você ainda não adicionou uma carteira principal.',
  secondary: 'Você ainda não adicionou uma carteira secundária.',
};

/** Status da conexão por texto e ícone (nunca só cor), com a ação que cabe a cada estado. */
function ConnectionStatus({ wallet }: { wallet: Wallet }) {
  const [connecting, setConnecting] = useState(false);
  const disconnect = useDisconnectWallet();
  const { label, Icon, className } = CONNECTION[wallet.connection];

  function handleDisconnect() {
    disconnect.mutate(wallet.id, {
      onError: () => toast.error('Não foi possível desconectar a carteira. Tente novamente.'),
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-field border border-border bg-surface px-4 py-3">
      <div role="status" className="flex min-w-0 flex-col gap-0.5">
        <p className={cn('flex items-center gap-2 text-body font-bold', className)}>
          <Icon aria-hidden="true" className="size-4.5 shrink-0" />
          {label}
        </p>
        <p className="text-caption text-secondary">
          {WALLET_PROVIDER_LABELS[wallet.provider]} ·{' '}
          <span className="font-mono">{shortAddress(wallet.address)}</span>
        </p>
        {wallet.connection === 'declined' ? (
          <p className="text-caption text-coral">
            A carteira recusou a conexão. Tente de novo ou escolha outro tipo de carteira.
          </p>
        ) : null}
      </div>

      {wallet.connection === 'connected' ? (
        <Button variant="outline" size="sm" loading={disconnect.isPending} onClick={handleDisconnect}>
          Desconectar
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setConnecting(true)}>
          {wallet.connection === 'declined' ? 'Tentar de novo' : 'Conectar'}
        </Button>
      )}
      <ConnectWalletDialog wallet={wallet} open={connecting} onOpenChange={setConnecting} />
    </div>
  );
}

type WalletSlotCardProps = {
  slot: WalletSlot;
  wallet: Wallet | undefined;
  /** Na secundária: a principal salva, para "Igual à carteira principal". */
  primary?: Wallet;
  account: { displayName: string; email: string };
};

/**
 * Um slot (principal ou secundária): vazio com "Adicionar", ou status da conexão + formulário.
 * "Igual à carteira principal" preenche o formulário da secundária com os dados da principal.
 */
export function WalletSlotCard({ slot, wallet, primary, account }: WalletSlotCardProps) {
  const titleId = useId();
  const sameId = useId();
  const [adding, setAdding] = useState(false);
  const [sameAsPrimary, setSameAsPrimary] = useState(false);
  const title = SLOT_TITLES[slot];
  const showForm = Boolean(wallet) || adding || sameAsPrimary;

  const saved = walletFormValues(slot, wallet, account);
  const defaultValues = sameAsPrimary && primary ? copyFromPrimary(primary, saved) : saved;

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={titleId} className="text-section font-bold text-foreground">
            {title}
          </h2>
          {slot === 'primary' ? (
            <p className="text-body-sm text-accent">
              Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
            </p>
          ) : null}
          {!showForm ? <p className="text-body-sm text-accent">{EMPTY[slot]}</p> : null}
        </div>

        <div className="flex items-center gap-4">
          {slot === 'secondary' && primary ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id={sameId}
                checked={sameAsPrimary}
                onCheckedChange={(checked) => setSameAsPrimary(checked === true)}
              />
              <Label htmlFor={sameId} className="text-body-sm font-normal">
                Igual à carteira principal
              </Label>
            </div>
          ) : null}
          {!showForm ? (
            <Button variant="link" className="text-body font-bold" onClick={() => setAdding(true)}>
              Adicionar
            </Button>
          ) : null}
        </div>
      </header>

      {wallet ? <ConnectionStatus wallet={wallet} /> : null}
      {showForm ? (
        <WalletForm
          key={sameAsPrimary ? 'same' : 'own'}
          walletId={wallet?.id}
          defaultValues={defaultValues}
        />
      ) : null}
    </section>
  );
}
