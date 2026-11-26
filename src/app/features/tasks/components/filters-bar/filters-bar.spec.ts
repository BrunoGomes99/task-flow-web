import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { DEFAULT_BOARD_FILTERS, type BoardFilters } from '../../models/board-filters';
import { FiltersBar } from './filters-bar';

async function renderBar(filters: BoardFilters = DEFAULT_BOARD_FILTERS) {
  const filtersChange = vi.fn();
  const view = await render(FiltersBar, {
    inputs: { filters },
    on: { filtersChange },
  });

  return { view, filtersChange };
}

describe('FiltersBar', () => {
  it('emits title, description, status and order changes', async () => {
    const user = userEvent.setup();
    const { filtersChange } = await renderBar();

    await user.type(screen.getByRole('textbox', { name: 'Filtrar por título' }), 'abc');
    expect(filtersChange).toHaveBeenLastCalledWith({ ...DEFAULT_BOARD_FILTERS, title: 'abc' });

    await user.type(screen.getByRole('textbox', { name: 'Filtrar por descrição' }), 'nota');
    expect(filtersChange).toHaveBeenLastCalledWith({
      ...DEFAULT_BOARD_FILTERS,
      title: 'abc',
      description: 'nota',
    });

    await user.click(screen.getByRole('button', { name: 'Colunas visíveis' }));
    await user.click(await screen.findByRole('option', { name: 'Em Andamento' }));
    expect(filtersChange).toHaveBeenLastCalledWith({
      ...DEFAULT_BOARD_FILTERS,
      title: 'abc',
      description: 'nota',
      statuses: ['pending', 'completed'],
    });

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Ordenar por vencimento' }),
      'desc',
    );
    expect(filtersChange).toHaveBeenLastCalledWith({
      ...DEFAULT_BOARD_FILTERS,
      title: 'abc',
      description: 'nota',
      statuses: ['pending', 'completed'],
      order: 'desc',
    });
  });

  it('clears each text filter on its own', async () => {
    const user = userEvent.setup();
    const { filtersChange } = await renderBar();
    const title = screen.getByRole('textbox', { name: 'Filtrar por título' });
    const description = screen.getByRole('textbox', { name: 'Filtrar por descrição' });

    await user.type(title, 'abc');
    await user.type(description, 'nota');
    await user.click(screen.getByRole('button', { name: 'Limpar filtro de título' }));

    expect(title).toHaveValue('');
    expect(description).toHaveValue('nota');
    expect(filtersChange).toHaveBeenLastCalledWith({
      ...DEFAULT_BOARD_FILTERS,
      title: '',
      description: 'nota',
    });

    await user.click(screen.getByRole('button', { name: 'Limpar filtro de descrição' }));
    expect(description).toHaveValue('');
    expect(filtersChange).toHaveBeenLastCalledWith({ ...DEFAULT_BOARD_FILTERS, description: '' });
  });

  it('keeps the typed text when the URL echoes the trimmed value', async () => {
    const user = userEvent.setup();
    const { view } = await renderBar();
    const title = screen.getByRole('textbox', { name: 'Filtrar por título' });

    await user.type(title, 'ab ');
    view.fixture.componentRef.setInput('filters', { ...DEFAULT_BOARD_FILTERS, title: 'ab' });
    view.fixture.detectChanges();
    await view.fixture.whenStable();

    expect(title).toHaveValue('ab ');
  });

  it('toggles the filters panel on small screens', async () => {
    const user = userEvent.setup();
    await renderBar();
    const toggle = screen.getByRole('button', { name: 'Filtros' });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });
});
