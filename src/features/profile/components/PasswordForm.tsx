import { useId, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { CircleAlert } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { ChangePasswordInputSchema } from '@/contracts';
import { signOutLocal } from '@/features/auth/sign-out';
import { applyServerErrors } from '@/shared/lib/form-errors';
import { Button } from '@/shared/ui/button';
import { FormField } from '@/shared/ui/form-field';
import { PasswordInput } from '@/shared/ui/password-input';

import { useChangePassword } from '../queries';

const FIELDS = ['currentPassword', 'newPassword', 'confirmPassword'] as const;

/**
 * "Alterar senha": formulário próprio (os campos obrigatórios do perfil não travam a troca). A troca
 * encerra as sessões no servidor; aqui a saída é local e o login mostra "Senha alterada".
 */
export function PasswordForm() {
  const titleId = useId();
  const navigate = useNavigate();
  const change = useChangePassword();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(ChangePasswordInputSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((input) => {
    setFormError(null);
    change.mutate(input, {
      onSuccess: () => {
        signOutLocal('logout');
        void navigate({ to: '/login', search: { redirect: '/perfil', motivo: 'senha' } });
      },
      onError: (error) => setFormError(applyServerErrors(error, form.setError, FIELDS)),
    });
  });

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-6 md:max-w-104.25">
      <h2 id={titleId} className="text-section font-bold text-foreground">
        Alterar senha
      </h2>
      <form aria-labelledby={titleId} noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
        {formError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-field border border-error/60 bg-error/10 px-3 py-2.5 text-body-sm text-coral"
          >
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{formError}</span>
          </div>
        ) : null}

        <FormField label="Senha atual" error={errors.currentPassword?.message}>
          <PasswordInput autoComplete="current-password" {...form.register('currentPassword')} />
        </FormField>
        <FormField
          label="Nova senha"
          hint="Mínimo de 8 caracteres, com maiúscula, número e símbolo"
          error={errors.newPassword?.message}
        >
          <PasswordInput autoComplete="new-password" {...form.register('newPassword')} />
        </FormField>
        <FormField label="Confirmar nova senha" error={errors.confirmPassword?.message}>
          <PasswordInput autoComplete="new-password" {...form.register('confirmPassword')} />
        </FormField>

        <Button type="submit" loading={change.isPending} className="w-full sm:w-auto sm:self-start">
          Alterar senha
        </Button>
      </form>
    </section>
  );
}
