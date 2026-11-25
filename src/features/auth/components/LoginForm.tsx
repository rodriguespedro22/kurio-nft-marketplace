import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { LoginInputSchema, type LoginInput } from '@/contracts';
import { applyServerErrors } from '@/shared/lib/form-errors';
import { Button } from '@/shared/ui/button';
import { FormField } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';
import { PasswordInput } from '@/shared/ui/password-input';

import { useLogin } from '../queries';
import { InertLink } from '@/shared/ui/inert-link';

type LoginFormProps = { onSuccess: () => void };

export function LoginForm({ onSuccess }: LoginFormProps) {
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(LoginInputSchema),
    defaultValues: { email: '', password: '' },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values: LoginInput) => {
    setFormError(null);
    login.mutate(values, {
      onSuccess,
      onError: (error) => setFormError(applyServerErrors(error, form.setError, ['email', 'password'])),
    });
  });

  return (
    <form aria-label="Entrar" noValidate onSubmit={onSubmit} className="flex flex-col gap-4 md:gap-3">
      {formError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-field border border-error/60 bg-error/10 px-3 py-2.5 text-body-sm text-coral"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{formError}</span>
        </div>
      ) : null}

      <FormField label="E-mail" error={errors.email?.message} required labelClassName="md:sr-only">
        <Input
          type="email"
          autoComplete="email"
          placeholder="contato@email.com"
          {...form.register('email')}
        />
      </FormField>

      <FormField label="Senha" error={errors.password?.message} required labelClassName="md:sr-only">
        <PasswordInput autoComplete="current-password" placeholder="Senha" {...form.register('password')} />
      </FormField>

      <InertLink className="-mt-1 self-end text-body-sm text-accent md:mt-0 md:leading-4">
        Esqueceu a senha?
      </InertLink>

      <Button
        type="submit"
        size="lg"
        loading={login.isPending}
        className="w-full md:mt-3 md:h-[45px] md:rounded-field md:text-body-lg"
      >
        Entrar
      </Button>
    </form>
  );
}
