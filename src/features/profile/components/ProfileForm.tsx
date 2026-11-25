import { useId, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert } from 'lucide-react';
import { useController, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { UpdateProfileInputSchema, type Profile, type UpdateProfileInput } from '@/contracts';
import { applyServerErrors } from '@/shared/lib/form-errors';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { DENSE_FIELDS, FORM_TITLE } from '@/shared/ui/form-look';
import { EnsNameInput } from '@/shared/ui/ens-name-input';
import { FormField } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';

import { useUpdateProfile } from '../queries';
import { AvatarUpload } from './AvatarUpload';

const FIELDS = ['displayName', 'username', 'email', 'ensName', 'walletLabel'] as const;

function formValues(profile: Profile): UpdateProfileInput {
  const { displayName, username, email } = profile;
  return {
    displayName,
    username,
    email,
    ensName: profile.ensName ?? '',
    walletLabel: profile.walletLabel ?? '',
  };
}

/** "Perfil do colecionador": dados da conta; o avatar tem ações próprias. */
export function ProfileForm({ profile }: { profile: Profile }) {
  const titleId = useId();
  const update = useUpdateProfile();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(UpdateProfileInputSchema),
    defaultValues: formValues(profile),
  });
  const {
    field: { ref: ensRef, name: ensName, value: ensValue, onChange: onEnsChange, onBlur: onEnsBlur },
  } = useController({ control: form.control, name: 'ensName' });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((input) => {
    setFormError(null);
    update.mutate(input, {
      onSuccess: (saved) => {
        form.reset(formValues(saved));
        toast.success('Perfil salvo');
      },
      onError: (error) => setFormError(applyServerErrors(error, form.setError, FIELDS)),
    });
  });

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-8">
      <h2 id={titleId} className={FORM_TITLE}>
        Perfil do colecionador
      </h2>
      <form
        aria-labelledby={titleId}
        noValidate
        onSubmit={onSubmit}
        className={cn('flex flex-col gap-6', DENSE_FIELDS, '[&_[data-slot=form-field]]:gap-2.5')}
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
          <FormField label="Nome de usuário" error={errors.username?.message} required>
            <Input
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              {...form.register('username')}
            />
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

          <FormField label="Apelido da carteira" error={errors.walletLabel?.message} required>
            <Input autoComplete="off" {...form.register('walletLabel')} />
          </FormField>
          <AvatarUpload avatarUrl={profile.avatarUrl} />
        </div>

        <Button type="submit" loading={update.isPending} className="w-full sm:w-32.75 sm:self-start">
          Salvar
        </Button>
      </form>
    </section>
  );
}
