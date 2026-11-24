import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { of, Subject, throwError } from 'rxjs';

import { ApiError } from '@core/api/api-error';
import { API_ERROR_CODES } from '@core/api/error-codes';
import { AuthApi } from '@core/auth/auth-api';
import type { RegisterResult } from '@core/auth/auth-models';

import { RegisterPage } from './register-page';

describe('RegisterPage', () => {
  it('shows validation messages after submit and does not call the API', async () => {
    const register = vi.fn();
    const user = userEvent.setup();
    await renderPage(register);

    expect(screen.queryByText('O nome é obrigatório.')).not.toBeInTheDocument();
    expect(screen.queryByText(/preencher dados de teste/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ativar tema escuro' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cadastrar conta/i }));

    expect(screen.getByLabelText('Nome completo')).toHaveAccessibleDescription(
      'O nome é obrigatório.',
    );
    expect(screen.getByLabelText('E-mail')).toHaveAccessibleDescription('O e-mail é obrigatório.');
    expect(screen.getByLabelText('Senha')).toHaveAccessibleDescription('A senha é obrigatória.');
    expect(register).not.toHaveBeenCalled();
  });

  it('shows a field error after the field is touched', async () => {
    const user = userEvent.setup();
    await renderPage(vi.fn());

    const password = screen.getByLabelText('Senha');
    await user.type(password, 'curta');
    expect(
      screen.queryByText('A senha deve conter no mínimo 8 caracteres.'),
    ).not.toBeInTheDocument();

    await user.tab();

    expect(password).toHaveAccessibleDescription('A senha deve conter no mínimo 8 caracteres.');
  });

  it('shows an invalid e-mail after the field is touched', async () => {
    const user = userEvent.setup();
    await renderPage(vi.fn());

    const email = screen.getByLabelText('E-mail');
    await user.type(email, 'nao-e-email');
    await user.tab();

    expect(email).toHaveAccessibleDescription('Informe um e-mail válido.');
  });

  it('shows the e-mail conflict inline and does not use a form alert', async () => {
    const register = vi.fn(() =>
      throwError(
        () =>
          new ApiError({
            status: 409,
            code: API_ERROR_CODES.userEmailAlreadyInUse,
            message: 'Email already in use.',
          }),
      ),
    );
    const user = userEvent.setup();
    await renderPage(register);
    await fillValidForm(user);

    await user.click(screen.getByRole('button', { name: /cadastrar conta/i }));

    const email = await screen.findByLabelText('E-mail');
    expect(email).toHaveAccessibleDescription('Este e-mail já está em uso');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(TestBed.inject(Router).url).not.toBe('/login');
  });

  it('shows a 400 field error inline', async () => {
    const register = vi.fn(() =>
      throwError(
        () =>
          new ApiError({
            status: 400,
            code: API_ERROR_CODES.requestValidationFailed,
            message: 'One or more validation errors occurred.',
            fieldErrors: { name: ['Name must not exceed 255 characters.'] },
          }),
      ),
    );
    const user = userEvent.setup();
    await renderPage(register);
    await fillValidForm(user);

    await user.click(screen.getByRole('button', { name: /cadastrar conta/i }));

    const name = await screen.findByLabelText('Nome completo');
    expect(name).toHaveAccessibleDescription('Name must not exceed 255 characters.');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a form-level alert when the request fails for another reason', async () => {
    const register = vi.fn(() =>
      throwError(
        () =>
          new ApiError({
            status: 500,
            code: API_ERROR_CODES.serverUnexpectedError,
            message: 'Internal server error.',
          }),
      ),
    );
    const user = userEvent.setup();
    await renderPage(register);
    await fillValidForm(user);

    await user.click(screen.getByRole('button', { name: /cadastrar conta/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ocorreu um erro inesperado. Tente novamente.',
    );
    expect(screen.getByRole('button', { name: /cadastrar conta/i })).toBeEnabled();
  });

  it('disables submit while the request runs', async () => {
    const pending = new Subject<RegisterResult>();
    const register = vi.fn(() => pending.asObservable());
    const user = userEvent.setup();
    await renderPage(register);
    await fillValidForm(user);

    await user.click(screen.getByRole('button', { name: /cadastrar conta/i }));

    expect(screen.getByRole('button', { name: /cadastrar conta/i })).toBeDisabled();
    pending.complete();
  });

  it('navigates to login with the registered notice and does not log in', async () => {
    const register = vi.fn(() => of({ id: 'user-1' }));
    const user = userEvent.setup();
    await renderPage(register);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await fillValidForm(user);

    await user.click(screen.getByRole('button', { name: /cadastrar conta/i }));

    expect(register).toHaveBeenCalledWith({
      name: 'Maria Silva',
      email: 'maria@exemplo.com',
      password: 'senha1234',
    });
    expect(navigate).toHaveBeenCalledWith(['/login'], { state: { authNotice: 'registered' } });
  });
});

async function renderPage(register: AuthApi['register']): Promise<void> {
  await render(RegisterPage, {
    providers: [provideRouter([]), { provide: AuthApi, useValue: { register } }],
  });
}

async function fillValidForm(user: UserEvent): Promise<void> {
  await user.type(screen.getByLabelText('Nome completo'), 'Maria Silva');
  await user.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com');
  await user.type(screen.getByLabelText('Senha'), 'senha1234');
}
