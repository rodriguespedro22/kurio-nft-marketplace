import { useId, type FormEventHandler } from 'react';
import { useController, type UseFormReturn } from 'react-hook-form';

import { NETWORK_LABELS, NETWORKS, WALLET_PROVIDER_LABELS, WALLET_PROVIDERS } from '@/contracts';
import { Checkbox } from '@/shared/ui/checkbox';
import { EnsNameInput } from '@/shared/ui/ens-name-input';
import { FormField } from '@/shared/ui/form-field';
import { Input, Textarea } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select } from '@/shared/ui/select';

import type { BuyerFormValues } from '../schema';

type BuyerFormProps = {
  id: string;
  form: UseFormReturn<BuyerFormValues>;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

/**
 * "Perfil do colecionador" do frame Pagamento: duas colunas no desktop, uma no
 * mobile. O envio fica no resumo ("Confirmar compra", `form={id}`).
 */
export function BuyerForm({ id, form, onSubmit }: BuyerFormProps) {
  const titleId = useId();
  const otherWalletId = useId();
  const { errors } = form.formState;
  const {
    field: { ref: ensRef, name: ensName, value: ensValue, onChange: onEnsChange, onBlur: onEnsBlur },
  } = useController({ control: form.control, name: 'ensName' });
  const {
    field: { value: useOtherWallet, onChange: onUseOtherWalletChange },
  } = useController({ control: form.control, name: 'useOtherWallet' });

  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-4">
      <h2 id={titleId} className="text-section font-bold text-foreground">
        Perfil do colecionador
      </h2>
      <form id={id} aria-labelledby={titleId} noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
        <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
          <FormField label="Nome de exibição" error={errors.displayName?.message} required>
            <Input autoComplete="name" {...form.register('displayName')} />
          </FormField>
          <FormField label="Nome de usuário" error={errors.username?.message} required>
            <Input
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              {...form.register('username')}
            />
          </FormField>

          <FormField label="Rede" error={errors.network?.message} required>
            <Select {...form.register('network')}>
              <option value="">Selecione uma rede</option>
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

          <FormField label="Endereço da carteira" error={errors.walletAddress?.message} required>
            <Input
              placeholder="Endereço 0x da carteira"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              {...form.register('walletAddress')}
            />
          </FormField>
          <FormField
            label="ENS ou carteira secundária (opcional)"
            error={errors.secondaryWalletOrEns?.message}
          >
            <Input
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              {...form.register('secondaryWalletOrEns')}
            />
          </FormField>

          <FormField label="Tipo de carteira" error={errors.walletType?.message} required>
            <Select {...form.register('walletType')}>
              <option value="">Selecione uma carteira</option>
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

        <div className="flex min-h-11 items-center gap-3">
          <Checkbox
            id={otherWalletId}
            checked={useOtherWallet}
            onCheckedChange={(checked) => onUseOtherWalletChange(checked === true)}
          />
          <Label htmlFor={otherWalletId} className="text-body-sm font-normal">
            Usar outra carteira?
          </Label>
        </div>

        <FormField
          label="Observação do colecionador (opcional)"
          error={errors.notes?.message}
          className="md:max-w-[370px]"
        >
          <Textarea rows={6} maxLength={500} {...form.register('notes')} />
        </FormField>
      </form>
    </section>
  );
}
