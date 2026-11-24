import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { announce } from './announce';
import { LiveRegion } from './live-region';

test('announce coloca a mensagem num nó role="status"', async () => {
  announce('Item adicionado ao carrinho');
  expect(await screen.findByText('Item adicionado ao carrinho')).toHaveAttribute('role', 'status');
});

test('announce assertivo usa role="alert"', async () => {
  announce('Sessão expirada', 'assertive');
  expect(await screen.findByText('Sessão expirada')).toHaveAttribute('role', 'alert');
});

test('announce repetido reanuncia a mesma mensagem', async () => {
  announce('Favorito salvo');
  const node = await screen.findByText('Favorito salvo');
  announce('Favorito salvo');
  expect(node).toHaveTextContent('');
  expect(await screen.findByText('Favorito salvo')).toBe(node);
});

test('LiveRegion local respeita a politeness', () => {
  render(<LiveRegion politeness="polite">Total atualizado</LiveRegion>);
  const region = screen.getByText('Total atualizado');
  expect(region).toHaveAttribute('aria-live', 'polite');
  expect(region).toHaveAttribute('role', 'status');
});
