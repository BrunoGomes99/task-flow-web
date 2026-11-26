import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
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
    // jsdom reports no geometry, so the CDK focus trap treats every control as hidden.
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(120);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(24);

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
    vi.restoreAllMocks();
  });

  // The shell header loads the icon library through the theme toggle.
  it('renders the header and the board in the outlet', async () => {
    signIn();

    const harness = await RouterTestingHarness.create('/tasks');
    const root = harness.routeNativeElement;
    if (root === null) {
      throw new Error('A rota /tasks não renderizou um componente.');
    }

    const view = within(root);
    const title = view.getByRole('heading', { name: 'Quadro de Tarefas' });
    const header = title.closest('header');
    if (header === null) {
      throw new Error('O título não está no cabeçalho.');
    }
    expect(within(header).getByRole('heading', { name: 'Quadro de Tarefas' })).toBeInTheDocument();
    expect(within(header).getByRole('button', { name: /Ativar tema/ })).toBeInTheDocument();
    expect(view.getByRole('complementary', { name: 'Barra lateral' })).toBeInTheDocument();

    const main = view.getByRole('main');
    expect(within(main).getByRole('textbox', { name: 'Filtrar por título' })).toBeInTheDocument();
    expect(within(main).getByRole('heading', { name: 'Pendente' })).toBeInTheDocument();
    expect(within(main).getByRole('heading', { name: 'Em Andamento' })).toBeInTheDocument();
    expect(within(main).getByRole('heading', { name: 'Concluída' })).toBeInTheDocument();

    TestBed.inject(HttpTestingController)
      .expectOne('/api/tasks/summary')
      .flush({ pending: 0, inProgress: 0, completed: 0, total: 0 });
    TestBed.tick();

    const sidebar = view.getByRole('complementary', { name: 'Barra lateral' });
    expect(within(sidebar).getByRole('heading', { name: 'Resumo Geral' })).toBeInTheDocument();
    expect(within(sidebar).getAllByText('0')).toHaveLength(4);
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

  it('shows the symbol next to the title', async () => {
    await render(Header);

    const header = screen.getByRole('banner');
    const symbol = within(header).getByRole('img', { name: 'TaskFlow' });
    const title = within(header).getByRole('heading', { name: 'Quadro de Tarefas' });

    expect(symbol.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('opens the sidebar as a dialog from the menu button', async () => {
    const root = await openTasks();
    const menu = menuButton(root);

    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(menu).toHaveAttribute('aria-controls', 'app-sidebar');
    expect(drawer(root)).not.toHaveAttribute('role', 'dialog');

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(menu);
    await settle();

    expect(menu).toHaveAttribute('aria-expanded', 'true');
    expect(drawer(root)).toHaveAttribute('role', 'dialog');
    expect(drawer(root)).toHaveAttribute('aria-modal', 'true');
    expect(drawer(root)?.contains(document.activeElement)).toBe(true);

    await user.tab();
    expect(drawer(root)?.contains(document.activeElement)).toBe(true);
    expect(within(root).getByRole('button', { name: /Ativar tema/ })).not.toHaveFocus();
  }, 30_000);

  it('closes the drawer with Escape and returns focus to the menu button', async () => {
    const root = await openTasks();
    const menu = menuButton(root);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    await user.click(menu);
    await settle();
    await user.keyboard('{Escape}');
    await settle();

    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(drawer(root)).not.toHaveAttribute('role', 'dialog');
    expect(menu).toHaveFocus();
  }, 30_000);

  it('closes the drawer from the backdrop and returns focus to the menu button', async () => {
    const root = await openTasks();
    const menu = menuButton(root);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    await user.click(menu);
    await settle();
    await user.click(within(root).getByRole('button', { name: 'Fechar menu' }));
    await settle();

    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(menu).toHaveFocus();
  }, 30_000);

  it('closes the drawer after navigation and returns focus to the menu button', async () => {
    const root = await openTasks();
    const menu = menuButton(root);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    await user.click(menu);
    await settle();
    await TestBed.inject(Router).navigateByUrl('/tasks?view=1');
    await settle();

    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(menu).toHaveFocus();
  }, 30_000);
});

async function openTasks(): Promise<HTMLElement> {
  signIn();

  const harness = await RouterTestingHarness.create('/tasks');
  const root = harness.routeNativeElement;
  if (root === null) {
    throw new Error('A rota /tasks não renderizou um componente.');
  }

  TestBed.inject(HttpTestingController)
    .expectOne('/api/tasks/summary')
    .flush({ pending: 0, inProgress: 0, completed: 0, total: 0 });
  TestBed.tick();

  return root;
}

function menuButton(root: HTMLElement): HTMLElement {
  return within(root).getByRole('button', { name: 'Abrir menu' });
}

function drawer(root: HTMLElement): HTMLElement | null {
  return root.querySelector('#app-sidebar');
}

async function settle(): Promise<void> {
  TestBed.tick();
  await TestBed.inject(ApplicationRef).whenStable();
}

function signIn(): void {
  const store = TestBed.inject(SessionStore);
  const http = TestBed.inject(HttpTestingController);

  store.login({ email: 'ana@example.com', password: 'senha1234' }).subscribe();
  http.expectOne('/api/users/login').flush({ accessToken: 'token-1', expiresIn: 3600 });
  http.expectOne('/api/users/me').flush(profileDto);
}
