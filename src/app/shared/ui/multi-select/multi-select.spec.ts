import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { MultiSelect, type MultiSelectOption } from './multi-select';

const OPTIONS: readonly MultiSelectOption[] = [
  { value: 'pending', label: 'Pendente' },
  { value: 'inProgress', label: 'Em Andamento' },
  { value: 'completed', label: 'Concluída' },
];

const LOCKED_HINT = 'Pelo menos um status deve ficar visível';
const ARROW_DOWN = 40;
const ENTER = 13;
const SPACE = 32;

function pressKey(key: string, keyCode: number): void {
  const target = document.activeElement;
  if (!(target instanceof HTMLElement)) {
    throw new Error('expected a focused element');
  }

  // CDK listbox still reads keyCode. user-event leaves it at 0 in jsdom.
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  Object.defineProperty(event, 'keyCode', { get: () => keyCode });
  target.dispatchEvent(event);
}

async function renderSelect(
  selected: readonly string[],
  onSelected?: (value: readonly string[]) => void,
) {
  const view = await render(MultiSelect, {
    inputs: {
      label: 'Colunas visíveis',
      options: OPTIONS,
      selected,
    },
    on: onSelected ? { selectedChange: onSelected } : {},
  });

  return { view, button: screen.getByRole('button', { name: 'Colunas visíveis' }) };
}

describe('MultiSelect', () => {
  it('moves between options with the keyboard and toggles the active one', async () => {
    const user = userEvent.setup();
    const selectedChange = vi.fn();
    const { view, button } = await renderSelect(
      ['pending', 'inProgress', 'completed'],
      selectedChange,
    );

    await user.click(button);

    const listbox = await screen.findByRole('listbox', { name: 'Colunas visíveis' });
    expect(listbox).toHaveAttribute('aria-multiselectable', 'true');

    pressKey('ArrowDown', ARROW_DOWN);
    expect(screen.getByRole('option', { name: 'Em Andamento' })).toHaveFocus();

    pressKey(' ', SPACE);
    view.fixture.detectChanges();
    await view.fixture.whenStable();

    expect(selectedChange).toHaveBeenCalledOnce();
    expect(selectedChange).toHaveBeenCalledWith(['pending', 'completed']);
    expect(screen.getByRole('option', { name: 'Em Andamento' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('keeps the last selected option disabled for the mouse and the keyboard', async () => {
    const user = userEvent.setup();
    const selectedChange = vi.fn();
    const { view, button } = await renderSelect(['completed'], selectedChange);

    await user.click(button);

    const option = await screen.findByRole('option', { name: 'Concluída' });
    expect(option).toHaveAttribute('aria-disabled', 'true');
    expect(option).toHaveAccessibleDescription(LOCKED_HINT);
    expect(screen.getByText(LOCKED_HINT)).toBeInTheDocument();

    await user.click(option);
    option.focus();
    pressKey(' ', SPACE);
    pressKey('Enter', ENTER);
    view.fixture.detectChanges();
    await view.fixture.whenStable();

    expect(selectedChange).not.toHaveBeenCalled();
    expect(option).toHaveAttribute('aria-selected', 'true');
  });
});
