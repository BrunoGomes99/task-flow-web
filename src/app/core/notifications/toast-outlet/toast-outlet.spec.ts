import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { ToastStore } from '../toast-store';
import { ToastOutlet } from './toast-outlet';

describe('ToastOutlet', () => {
  it('announces a success toast politely and leaves errors alone', async () => {
    await render(ToastOutlet);
    TestBed.inject(ToastStore).success('Tarefa criada com sucesso.');
    TestBed.tick();

    const message = screen.getByText('Tarefa criada com sucesso.');
    expect(message.closest('[aria-live="polite"]')).not.toBeNull();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
  });

  it('announces an error toast as an alert using the danger token', async () => {
    await render(ToastOutlet);
    TestBed.inject(ToastStore).error('Ocorreu um erro inesperado. Tente novamente.');
    TestBed.tick();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Ocorreu um erro inesperado. Tente novamente.');
    expect(alert.querySelector('.text-danger')).not.toBeNull();
    expect(
      screen
        .queryByText('Ocorreu um erro inesperado. Tente novamente.')
        ?.closest('[aria-live="polite"]'),
    ).toBeNull();
  });

  it('closes a toast from the keyboard', async () => {
    const user = userEvent.setup();
    await render(ToastOutlet);
    TestBed.inject(ToastStore).success('Bem-vindo(a) de volta, Maria!');
    TestBed.tick();

    screen.getByRole('button', { name: 'Fechar' }).focus();
    await user.keyboard('{Enter}');
    TestBed.tick();

    expect(screen.queryByText('Bem-vindo(a) de volta, Maria!')).not.toBeInTheDocument();
  });
});
