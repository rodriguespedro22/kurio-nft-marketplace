import { useId } from 'react';
import { useController, type Control } from 'react-hook-form';
import { Wallet as WalletIcon } from 'lucide-react';

import { WALLET_PROVIDER_LABELS, WALLET_PROVIDERS, type WalletProvider } from '@/contracts';
import { cn } from '@/shared/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';

import type { BuyerFormValues } from '../schema';

/** Selo de cada provedor no layout: letra em círculo (WalletConnect, MetaMask) ou ícone (Coinbase). */
function ProviderMark({ provider }: { provider: WalletProvider }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-raised text-caption font-bold text-primary md:hidden"
    >
      {provider === 'coinbase' ? (
        <WalletIcon className="size-[18px]" strokeWidth={1.75} />
      ) : (
        provider[0]!.toUpperCase()
      )}
    </span>
  );
}

type ProviderPickerProps = { control: Control<BuyerFormValues>; className?: string };

/**
 * "Carteira e rede" do layout: WalletConnect, MetaMask e Coinbase Wallet como opções de rádio. É o
 * mesmo campo "Tipo de carteira" do formulário (os dois controles mostram o mesmo valor).
 */
export function ProviderPicker({ control, className }: ProviderPickerProps) {
  const titleId = useId();
  const {
    field: { value, onChange },
  } = useController({ control, name: 'walletType' });

  return (
    <div role="group" aria-labelledby={titleId} className={cn('flex flex-col gap-3', className)}>
      <h2 id={titleId} className="text-[1.0625rem] leading-4 font-bold text-foreground">
        Carteira e rede
      </h2>
      <RadioGroup aria-labelledby={titleId} value={value} onValueChange={onChange} className="gap-4 md:gap-3">
        {WALLET_PROVIDERS.map((provider) => {
          const itemId = `${titleId}-${provider}`;
          const checked = value === provider;
          return (
            <label
              key={provider}
              htmlFor={itemId}
              className={cn(
                'flex min-h-16 cursor-pointer items-center gap-3 rounded-[14px] bg-surface px-3 transition-colors',
                'md:min-h-[45px] md:flex-row-reverse md:justify-end md:rounded-[3px] md:border md:bg-transparent md:px-3',
                checked ? 'md:border-primary' : 'md:border-border md:hover:border-border-soft',
              )}
            >
              <ProviderMark provider={provider} />
              <span className="min-w-0 flex-1 truncate text-body leading-5 text-foreground md:flex-none">
                {WALLET_PROVIDER_LABELS[provider]}
              </span>
              <RadioGroupItem id={itemId} value={provider} />
            </label>
          );
        })}
      </RadioGroup>
    </div>
  );
}
