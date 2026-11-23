import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { render, screen } from '@testing-library/angular';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { of, Subject, throwError } from 'rxjs';

import { ApiError } from '@core/api/api-error';
import { API_ERROR_CODES } from '@core/api/error-codes';
import { SessionStore } from '@core/auth/session-store';

import { LoginPage } from './login-page';

describe('LoginPage', () => {
  afterEach(() => {
    history.replaceState(null, '');
  });

  it('shows validation messages after submit and does not call the store', async () => {
    const login = vi.fn();
    const user = userEvent.setup();
    await renderPage(login);

    expect(screen.queryByText('O e-mail é obrigatório.')).not.toBeInTheDocument();
    expect(screen.queryByText(/preencher dados de teste/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ativar tema escuro' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /acessar dashboard/i }));

    expect(screen.getByLabelText('E-mail')).toHaveAccessibleDescription('O e-mail é obrigatório.');
    expect(screen.getByLabelText('Senha')).toHaveAccessibleDescription('A senha é obrigatória.');
    expect(login).not.toHaveBeenCalled();
  });

  it('shows an invalid e-mail after the field is touched', async () => {
    const user = userEvent.setup();
    await renderPage(vi.fn());

    const email = screen.getByLabelText('E-mail');
    await user.type(email, 'nao-e-email');
    await user.tab();

    expect(email).toHaveAccessibleDescription('Informe um e-mail válido.');
  });

  it('shows invalid credentials and keeps the typed e-mail', async () => {
    const login = vi.fn(() =>
      throwError(
        () =>
          new ApiError({
            status: 401,
            code: API_ERROR_CODES.authInvalidCredentials,
            message: 'Invalid credentials.',
          }),
      ),
    );
    const user = userEvent.setup();
    await renderPage(login);
    await fillValidForm(user);

    await user.click(screen.getByRole('button', { name: /acessar dashboard/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.');
    expect(screen.getByLabelText('E-mail')).toHaveValue('maria@exemplo.com');
    expect(login).toHaveBeenCalledWith({
      email: 'maria@exemplo.com',
      password: 'senha1234',
    });
    expect(TestBed.inject(Router).url).not.toBe('/tasks');
  });

  it('shows a form-level alert when the request fails for another reason', async () => {
    const login = vi.fn(() =>
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
    await renderPage(login);
    await fillValidForm(user);

    await user.click(screen.getByRole('button', { name: /acessar dashboard/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ocorreu um erro inesperado. Tente novamente.',
    );
    expect(screen.getByRole('button', { name: /acessar dashboard/i })).toBeEnabled();
  });

  it('disables submit while the request runs', async () => {
    const pending = new Subject<void>();
    const login = vi.fn(() => pending.asObservable());
    const user = userEvent.setup();
    await renderPage(login);
    await fillValidForm(user);

    await user.click(screen.getByRole('button', { name: /acessar dashboard/i }));

    expect(screen.getByRole('button', { name: /acessar dashboard/i })).toBeDisabled();
    pending.complete();
  });

  it('navigates to the board on success and does not show the welcome toast', async () => {
    const login = vi.fn(() => of(undefined));
    const user = userEvent.setup();
    await renderPage(login);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await fillValidForm(user);

    await user.click(screen.getByRole('button', { name: /acessar dashboard/i }));

    expect(navigate).toHaveBeenCalledWith(['/tasks']);
    expect(screen.queryByText(/bem-vindo/i)).not.toBeInTheDocument();
  });

  it('shows the registered notice from the navigation state', async () => {
    await openLogin({ authNotice: 'registered' });

    expect(screen.getByRole('status')).toHaveTextContent(
      'Conta criada com sucesso. Faça login para continuar.',
    );
  });

  it('does not show the registered notice on a visit without that state', async () => {
    await renderPage(vi.fn());

    expect(screen.queryByText(/conta criada com sucesso/i)).not.toBeInTheDocument();
  });

  it('drops the registered notice from history so a reload does not show it again', async () => {
    await openLogin({ authNotice: 'registered' });

    const state: unknown = TestBed.inject(Location).getState();
    expect(state).toEqual(expect.objectContaining({ navigationId: expect.any(Number) }));
    expect(state).not.toHaveProperty('authNotice');
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('shows the expired-session notice from the navigation state', async () => {
    await openLogin({ authNotice: 'sessionExpired' });

    expect(screen.getByRole('status')).toHaveTextContent(
      'Sua sessão expirou. Faça login novamente.',
    );
    expect(screen.queryByText(/conta criada com sucesso/i)).not.toBeInTheDocument();
  });

  it('drops the expired-session notice from history so a reload does not show it again', async () => {
    await openLogin({ authNotice: 'sessionExpired' });

    const state: unknown = TestBed.inject(Location).getState();
    expect(state).toEqual(expect.objectContaining({ navigationId: expect.any(Number) }));
    expect(state).not.toHaveProperty('authNotice');
    expect(TestBed.inject(Router).url).toBe('/login');
  });
});

async function renderPage(login: SessionStore['login']): Promise<void> {
  await render(LoginPage, {
    providers: [provideRouter([]), { provide: SessionStore, useValue: { login } }],
  });
}

async function openLogin(state: { authNotice: string }): Promise<void> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'login', component: LoginPage }]),
      { provide: SessionStore, useValue: { login: vi.fn() } },
    ],
  });

  const harness = await RouterTestingHarness.create();
  await TestBed.inject(Router).navigateByUrl('/login', { state });
  harness.detectChanges();
}

async function fillValidForm(user: UserEvent): Promise<void> {
  await user.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com');
  await user.type(screen.getByLabelText('Senha'), 'senha1234');
}
