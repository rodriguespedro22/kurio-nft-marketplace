import { useState, type ComponentProps } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert } from 'lucide-react';
import { useController, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  NETWORK_LABELS,
  NETWORKS,
  WALLET_PROVIDER_LABELS,
  WALLET_PROVIDERS,
  WalletInputSchema,
  type WalletInput,
} from '@/contracts';
import { applyServerErrors } from '@/shared/lib/form-errors';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { FormField } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';
import { Select } from '@/shared/ui/select';

import { ensFromLabel, ensLabel, SLOT_TITLES, walletFormValues } from '../form-values';
import { useSaveWallet } from '../queries';

const FIELDS = [
  'displayName',
  'label',
  'network',
  'profileName',
  'address',
  'secondaryAddressOrEns',
  'provider',
  'referralCode',
  'email',
  'ensName',
] as const;

type EnsNameInputProps = Omit<ComponentProps<'input'>, 'value' | 'onChange'> & {
  value: string;
  onChange: (ensName: string) => void;
};

/**
 * "Nome ENS": o sufixo `.eth` (único aceito) fica fixo ao lado e o campo guarda o nome completo.
 * Recebe do FormField o id e os atributos de acessibilidade e os repassa ao `<input>`.
 */
function EnsNameInput({ value, onChange, className, ...props }: EnsNameInputProps) {
  return (
    <div className={cn('flex gap-2.5', className)}>
      <span
        aria-hidden="true"
        className="grid h-11 w-19 shrink-0 place-items-center rounded-field border border-border text-body-sm text-foreground"
      >
        .eth
      </span>
      <Input
        {...props}
        autoCapitalize="none"
        spellCheck={false}
        value={ensLabel(value)}
        onChange={(event) => onChange(ensFromLabel(event.target.value.trim().toLowerCase()))}
      />
    </div>
  );
}

type WalletFormProps = {
  /** Carteira salva (edição); sem ela o envio cria o slot. */
  walletId?: string;
  defaultValues: WalletInput;
};

/** Formulário da carteira: mesmos campos e mensagens que a API valida. */
export function WalletForm({ walletId, defaultValues }: WalletFormProps) {
  const save = useSaveWallet();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(WalletInputSchema), defaultValues });
  const {
    field: { ref: ensRef, name: ensName, value: ensValue, onChange: onEnsChange, onBlur: onEnsBlur },
  } = useController({ control: form.control, name: 'ensName' });
  const { errors } = form.formState;
  const slotTitle = SLOT_TITLES[defaultValues.slot];

  const onSubmit = form.handleSubmit((input) => {
    setFormError(null);
    save.mutate(
      { id: walletId, input },
      {
        onSuccess: (saved) => {
          form.reset(walletFormValues(saved.slot, saved));
          toast.success(`${SLOT_TITLES[saved.slot]} salva`);
        },
        onError: (error) => setFormError(applyServerErrors(error, form.setError, FIELDS)),
      },
    );
  });

  return (
    <form
      aria-label={`Dados da ${slotTitle.toLowerCase()}`}
      noValidate
      onSubmit={onSubmit}
      className="flex flex-col gap-6"
    >
      {formError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-field border border-error/60 bg-error/10 px-3 py-2.5 text-body-sm text-coral"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{formError}</span>
        </div>
      ) : null}

      <div className="grid gap-x-7 gap-y-6 md:grid-cols-2">
        <FormField label="Nome de exibição" error={errors.displayName?.message} required>
          <Input autoComplete="name" {...form.register('displayName')} />
        </FormField>
        <FormField label="Apelido da carteira" error={errors.label?.message} required>
          <Input autoComplete="off" {...form.register('label')} />
        </FormField>

        <FormField label="Rede" error={errors.network?.message} required>
          <Select {...form.register('network')}>
            <option value="" disabled>
              Selecione uma rede
            </option>
            {NETWORKS.map((network) => (
              <option key={network} value={network}>
                {NETWORK_LABELS[network]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Nome do perfil" error={errors.profileName?.message} required>
          <Input autoComplete="off" {...form.register('profileName')} />
        </FormField>

        <FormField label="Endereço da carteira" error={errors.address?.message} required>
          <Input
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Endereço 0x da carteira"
            {...form.register('address')}
          />
        </FormField>
        <FormField
          label="ENS ou carteira secundária (opcional)"
          error={errors.secondaryAddressOrEns?.message}
        >
          <Input
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="ENS ou carteira secundária (opcional)"
            {...form.register('secondaryAddressOrEns')}
          />
        </FormField>

        <FormField label="Tipo de carteira" error={errors.provider?.message} required>
          <Select {...form.register('provider')}>
            <option value="" disabled>
              Selecione uma carteira
            </option>
            {WALLET_PROVIDERS.map((provider) => (
              <option key={provider} value={provider}>
                {WALLET_PROVIDER_LABELS[provider]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Código de indicação" error={errors.referralCode?.message} required>
          <Input autoComplete="off" autoCapitalize="characters" {...form.register('referralCode')} />
        </FormField>

        <FormField label="E-mail" error={errors.email?.message} required>
          <Input type="email" autoComplete="email" {...form.register('email')} />
        </FormField>
        <FormField label="Nome ENS" error={errors.ensName?.message} required>
          <EnsNameInput
            ref={ensRef}
            name={ensName}
            value={ensValue}
            onChange={onEnsChange}
            onBlur={onEnsBlur}
          />
        </FormField>
      </div>

      <Button type="submit" loading={save.isPending} className="self-start">
        Salvar carteira
      </Button>
    </form>
  );
}
