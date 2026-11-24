import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

import { PageError } from './page-error';

test('PageError explica falha de rede e permite tentar novamente', async () => {
  const onRetry = vi.fn();
  render(<PageError error={{ code: 'NETWORK', status: 0 }} onRetry={onRetry} />);

  expect(screen.getByRole('alert')).toHaveTextContent(/sem conexão/i);
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

test('PageError não vaza mensagem técnica de erro desconhecido', () => {
  render(<PageError error={new Error('TypeError: cannot read properties of undefined')} />);

  const alert = screen.getByRole('alert');
  expect(alert).not.toHaveTextContent(/TypeError/);
  expect(alert).toHaveTextContent(/algo deu errado/i);
  expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
});
