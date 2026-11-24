import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { render, screen, within } from '@testing-library/angular';
import { vi } from 'vitest';

import { routes } from '../../../app.routes';
import { API_BASE_URL } from '../../api/api-base-url';
import { SessionStore } from '../../auth/session-store';
import { Header } from '../header/header';

const profileDto = {
  id: 'user-1',
  name: 'Ana Silva',
  email: 'ana@example.com',
  createdAt: '2026-11-18T15:00:00Z',
};

describe('Shell', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '' },
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  // The shell header loads the icon library through the theme toggle.
  it('renders the header and the board placeholder in the outlet', async () => {
    signIn();

    const harness = await RouterTestingHarness.create('/tasks');
    const root = harness.routeNativeElement;
    if (root === null) {
      throw new Error('A rota /tasks não renderizou um componente.');
    }

    const view = within(root);
    const header = view.getByRole('banner');
    expect(within(header).getByRole('heading', { name: 'Quadro de Tarefas' })).toBeInTheDocument();
    expect(within(header).getByRole('button', { name: /Ativar tema/ })).toBeInTheDocument();
    expect(view.getByRole('complementary', { name: 'Barra lateral' })).toBeInTheDocument();

    const main = view.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Quadro de Tarefas' })).toBeInTheDocument();

    TestBed.inject(HttpTestingController)
      .expectOne('/api/tasks/summary')
      .flush({ pending: 0, inProgress: 0, completed: 0, total: 0 });
    TestBed.tick();

    expect(view.getByRole('heading', { name: 'Resumo Geral' })).toBeInTheDocument();
    expect(view.getAllByText('0')).toHaveLength(4);
  }, 30_000);

  it('keeps a slot in the header for the menu button', async () => {
    await render('<app-header><button type="button">Abrir menu</button></app-header>', {
      imports: [Header],
    });

    const header = screen.getByRole('banner');
    const menu = within(header).getByRole('button', { name: 'Abrir menu' });
    const title = within(header).getByRole('heading', { name: 'Quadro de Tarefas' });

    expect(within(header).getByRole('button', { name: /Ativar tema/ })).toBeInTheDocument();
    expect(menu.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});

function signIn(): void {
  const store = TestBed.inject(SessionStore);
  const http = TestBed.inject(HttpTestingController);

  store.login({ email: 'ana@example.com', password: 'senha1234' }).subscribe();
  http.expectOne('/api/users/login').flush({ accessToken: 'token-1', expiresIn: 3600 });
  http.expectOne('/api/users/me').flush(profileDto);
}
