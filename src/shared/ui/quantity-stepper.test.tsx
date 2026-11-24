import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { QuantityStepper } from './quantity-stepper';

function Harness({
  max = 5,
  initial = 1,
  onChange,
}: {
  max?: number;
  initial?: number;
  onChange?: (n: number) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <QuantityStepper
      label="Quantidade"
      value={value}
      min={1}
      max={max}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

const input = () => screen.getByRole('textbox', { name: 'Quantidade' });
const describedText = (el: HTMLElement) =>
  (el.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' | ');

describe('QuantityStepper', () => {
  test('botões somam e subtraem dentro de [min, max] e desabilitam nos limites', async () => {
    const user = userEvent.setup();
    render(<Harness max={2} />);
    const minus = screen.getByRole('button', { name: 'Diminuir quantidade' });
    const plus = screen.getByRole('button', { name: 'Aumentar quantidade' });

    expect(minus).toBeDisabled();
    await user.click(plus);
    expect(input()).toHaveValue('2');
    expect(plus).toBeDisabled();
    expect(describedText(input())).toContain('Máximo disponível: 2');

    await user.click(minus);
    expect(input()).toHaveValue('1');
    expect(describedText(input())).not.toContain('Máximo disponível');
  });

  test('valor abaixo do mínimo vira o mínimo ao confirmar', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial={3} onChange={onChange} />);

    await user.clear(input());
    await user.type(input(), '0');
    await user.tab();
    expect(input()).toHaveValue('1');
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  test('acima do disponível limita ao máximo e explica pelo aria-describedby', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness max={5} onChange={onChange} />);

    await user.clear(input());
    await user.type(input(), '99{Enter}');
    expect(input()).toHaveValue('5');
    expect(onChange).toHaveBeenLastCalledWith(5);
    expect(describedText(input())).toContain('Máximo disponível: 5');
  });

  test('não inteiro é inválido: mensagem, aria-invalid e nenhum onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.clear(input());
    await user.type(input(), '2.5');
    await user.tab();
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    expect(describedText(input())).toContain('Use um número inteiro');
    expect(onChange).not.toHaveBeenCalled();

    // Corrigir limpa o erro.
    await user.clear(input());
    await user.type(input(), '3');
    await user.tab();
    expect(input()).not.toHaveAttribute('aria-invalid');
    expect(onChange).toHaveBeenLastCalledWith(3);
  });

  test('campo vazio ao sair volta ao valor atual', async () => {
    const user = userEvent.setup();
    render(<Harness initial={2} />);
    await user.clear(input());
    await user.tab();
    expect(input()).toHaveValue('2');
  });

  test('valor externo novo (ex.: troca de edição) atualiza o campo', () => {
    const { rerender } = render(
      <QuantityStepper label="Quantidade" value={4} min={1} max={5} onChange={() => {}} />,
    );
    expect(input()).toHaveValue('4');
    rerender(<QuantityStepper label="Quantidade" value={2} min={1} max={2} onChange={() => {}} />);
    expect(input()).toHaveValue('2');
  });
});
