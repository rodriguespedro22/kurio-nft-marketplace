import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { RegisterInputSchema, type RegisterInput } from '@/contracts';
import { applyServerErrors } from '@/shared/lib/form-errors';
import { Button } from '@/shared/ui/button';
import { FormField } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';
import { PasswordInput } from '@/shared/ui/password-input';

import { useRegister } from '../queries';

const FIELDS = ['username', 'email', 'password', 'confirmPassword'] as const;

type RegisterFormProps = { onSuccess: () => void };

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const register = useRegister();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(RegisterInputSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values: RegisterInput) => {
    setFormError(null);
    register.mutate(values, {
      onSuccess,
      onError: (error) => setFormError(applyServerErrors(error, form.setError, FIELDS)),
    });
  });

  return (
    <form aria-label="Criar conta" noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      {formError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-field border border-error/60 bg-error/10 px-3 py-2.5 text-body-sm text-coral"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{formError}</span>
        </div>
      ) : null}

      <FormField
        label="Nome de usuário"
        hint="3 a 24 caracteres: letras, números, ponto ou _"
        error={errors.username?.message}
        required
      >
        <Input autoComplete="username" placeholder="Nome de usuário" {...form.register('username')} />
      </FormField>

      <FormField label="E-mail" error={errors.email?.message} required>
        <Input
          type="email"
          autoComplete="email"
          placeholder="Digite seu e-mail"
          {...form.register('email')}
        />
      </FormField>

      <FormField
        label="Senha"
        hint="Mínimo de 8 caracteres, com maiúscula, número e símbolo"
        error={errors.password?.message}
        required
      >
        <PasswordInput autoComplete="new-password" placeholder="Senha" {...form.register('password')} />
      </FormField>

      <FormField label="Confirmar senha" error={errors.confirmPassword?.message} required>
        <PasswordInput
          autoComplete="new-password"
          placeholder="Confirmar senha"
          {...form.register('confirmPassword')}
        />
      </FormField>

      <Button type="submit" size="lg" loading={register.isPending} className="w-full">
        <span className="md:hidden">Criar perfil</span>
        <span className="hidden md:inline">Criar conta</span>
      </Button>
    </form>
  );
}
