import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { FormField } from './form-field';
import { Input } from './input';

test('FormField com erro marca o campo como inválido e o descreve pela mensagem', () => {
  render(
    <FormField label="Nome de exibição" error="Obrigatório">
      <Input />
    </FormField>,
  );

  const input = screen.getByLabelText('Nome de exibição');
  expect(input).toHaveAttribute('aria-invalid', 'true');

  const describedBy = input.getAttribute('aria-describedby') ?? '';
  const ids = describedBy.split(' ').filter(Boolean);
  const messages = ids.map((id) => document.getElementById(id)?.textContent);
  expect(messages).toContain('Obrigatório');
});

test('FormField sem erro não marca o campo como inválido e descreve pela dica', () => {
  render(
    <FormField label="Código de indicação" hint="Use o código recebido por e-mail">
      <Input />
    </FormField>,
  );

  const input = screen.getByLabelText('Código de indicação');
  expect(input).not.toHaveAttribute('aria-invalid');
  expect(input).toHaveAccessibleDescription('Use o código recebido por e-mail');
});

test('FormField obrigatório marca aria-required sem poluir o nome acessível', () => {
  render(
    <FormField label="E-mail" required>
      <Input type="email" />
    </FormField>,
  );

  const input = screen.getByRole('textbox', { name: 'E-mail' });
  expect(input).toHaveAttribute('aria-required', 'true');
});
