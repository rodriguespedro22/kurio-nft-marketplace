import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

import { Button } from './button';

test('Button em loading fica desabilitado, ocupado e ignora cliques', async () => {
  const onClick = vi.fn();
  render(
    <Button loading onClick={onClick}>
      Confirmar compra
    </Button>,
  );

  const button = screen.getByRole('button', { name: 'Confirmar compra' });
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute('aria-busy', 'true');
  await userEvent.click(button);
  expect(onClick).not.toHaveBeenCalled();
});

test('Button usa type="button" por padrão para não enviar formulários sem querer', () => {
  render(<Button>Adicionar</Button>);
  expect(screen.getByRole('button', { name: 'Adicionar' })).toHaveAttribute('type', 'button');
});
