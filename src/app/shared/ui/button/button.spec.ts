import { render, screen } from '@testing-library/angular';

import { Button } from './button';

describe('Button', () => {
  it('disables the button and exposes a loading label while loading', async () => {
    await render('<app-button [loading]="true">Salvar</app-button>', {
      imports: [Button],
    });

    expect(screen.getByRole('button', { name: /salvar/i })).toBeDisabled();
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument();
  });

  it('disables the button when disabled is set', async () => {
    await render('<app-button [disabled]="true">Salvar</app-button>', {
      imports: [Button],
    });

    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    expect(screen.queryByRole('status', { name: 'Carregando' })).not.toBeInTheDocument();
  });

  it('stays enabled when it is neither disabled nor loading', async () => {
    await render('<app-button>Salvar</app-button>', {
      imports: [Button],
    });

    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled();
  });
});
