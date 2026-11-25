import { useState } from 'react';
import { CircleAlert } from 'lucide-react';
import { toast } from 'sonner';

import { NETWORK_LABELS, WALLET_PROVIDER_LABELS, type Wallet } from '@/contracts';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

import { isWalletDeclined, useConnectWallet } from '../queries';
import { shortAddress } from '../short-address';

type ConnectWalletDialogProps = {
  wallet: Wallet;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Simulação da conexão: o diálogo faz o papel da extensão da carteira (nenhuma é usada). A recusa
 * fecha o diálogo e aparece como "Recusada" no status da carteira; outra falha fica aqui.
 */
export function ConnectWalletDialog({ wallet, open, onOpenChange }: ConnectWalletDialogProps) {
  const connect = useConnectWallet();
  const [error, setError] = useState<string | null>(null);
  const provider = WALLET_PROVIDER_LABELS[wallet.provider];

  function handleOpenChange(next: boolean) {
    if (!next) setError(null);
    onOpenChange(next);
  }

  function handleConnect() {
    setError(null);
    connect.mutate(wallet.id, {
      onSuccess: () => {
        handleOpenChange(false);
        toast.success(`${provider} conectada`);
      },
      onError: (failure) => {
        if (isWalletDeclined(failure)) handleOpenChange(false);
        else setError(failure.message);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conectar {provider}</DialogTitle>
          <DialogDescription>
            Demonstração: nenhuma extensão é aberta. Confirme para simular a aprovação na carteira.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-field border border-border px-4 py-3 text-body-sm">
          <dt className="text-muted">Carteira</dt>
          <dd className="truncate">{wallet.label}</dd>
          <dt className="text-muted">Rede</dt>
          <dd>{NETWORK_LABELS[wallet.network]}</dd>
          <dt className="text-muted">Endereço</dt>
          <dd className="font-mono">{shortAddress(wallet.address)}</dd>
        </dl>

        {error ? (
          <p role="alert" className="flex items-start gap-2 text-body-sm text-coral">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button loading={connect.isPending} onClick={handleConnect}>
            Conectar carteira
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
