import { render, screen } from '@testing-library/angular';

import { Alert } from './alert';

describe('Alert', () => {
  it('announces an info notice as status', async () => {
    await render('<app-alert variant="info">Conta criada com sucesso.</app-alert>', {
      imports: [Alert],
    });

    expect(screen.getByRole('status')).toHaveTextContent('Conta criada com sucesso.');
  });

  it('announces a danger message as an alert', async () => {
    await render('<app-alert variant="danger">E-mail ou senha inválidos.</app-alert>', {
      imports: [Alert],
    });

    expect(screen.getByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.');
  });
});
