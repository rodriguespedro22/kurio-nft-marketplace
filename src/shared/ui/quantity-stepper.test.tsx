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

  test.each(['0', '-1'])('abaixo do mínimo (%s) vira o mínimo, com mensagem no campo', async (typed) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial={3} onChange={onChange} />);

    await user.clear(input());
    await user.type(input(), typed);
    await user.tab();
    expect(input()).toHaveValue('1');
    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(describedText(input())).toContain('Mínimo: 1');
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

  test('não inteiro: o campo mostra o inteiro que vale, com mensagem, sem ficar inválido', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.clear(input());
    await user.type(input(), '2.5');
    await user.tab();
    expect(input()).toHaveValue('2');
    expect(onChange).toHaveBeenLastCalledWith(2);
    expect(input()).not.toHaveAttribute('aria-invalid');
    expect(describedText(input())).toContain('Use um número inteiro');
  });

  test('texto que não é número volta ao valor atual, com mensagem', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial={3} onChange={onChange} />);

    await user.clear(input());
    await user.type(input(), 'abc');
    await user.tab();
    expect(input()).toHaveValue('3');
    expect(onChange).not.toHaveBeenCalled();
    expect(describedText(input())).toContain('Use um número inteiro');

    // Um valor válido depois limpa a mensagem.
    await user.clear(input());
    await user.type(input(), '4');
    await user.tab();
    expect(onChange).toHaveBeenLastCalledWith(4);
    expect(describedText(input())).not.toContain('Use um número inteiro');
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

  test('rótulo específico (ex.: linha do carrinho) também nomeia os botões', () => {
    render(<QuantityStepper label="Quantidade de Ivory Baron #088" value={2} max={5} onChange={() => {}} />);
    expect(screen.getByRole('textbox', { name: 'Quantidade de Ivory Baron #088' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aumentar quantidade de Ivory Baron #088' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Diminuir quantidade de Ivory Baron #088' })).toBeEnabled();
  });
});
