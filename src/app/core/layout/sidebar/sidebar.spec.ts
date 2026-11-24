import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { API_BASE_URL } from '../../api/api-base-url';
import { SessionStore } from '../../auth/session-store';
import { SummaryStore } from '../../task-summary/summary-store';
import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('shows the wordmark, the workspace badge and the signed-in user', async () => {
    await renderSidebar();
    signIn('Bruno Gomes', 'bruno@exemplo.com');
    TestBed.tick();

    expect(screen.getByRole('img', { name: 'TaskFlow' })).toBeInTheDocument();
    expect(screen.getByText('WORKSPACE')).toBeInTheDocument();
    expect(screen.getByText('Bruno Gomes')).toBeInTheDocument();
    expect(screen.getByText('bruno@exemplo.com')).toBeInTheDocument();
    expect(screen.getByText('BG')).toBeInTheDocument();
  });

  it('shows one initial when the user has a single name', async () => {
    await renderSidebar();
    signIn('Bruno', 'bruno@exemplo.com');
    TestBed.tick();

    expect(screen.getByText('Bruno')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('logs out through the session store and returns to login without an expired notice', async () => {
    await renderSidebar();
    signIn('Bruno Gomes', 'bruno@exemplo.com');
    TestBed.tick();
    const router = TestBed.inject(Router);
    const logout = vi.spyOn(TestBed.inject(SessionStore), 'logout');
    const navigate = vi.spyOn(router, 'navigate');
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    await user.click(screen.getByRole('button', { name: 'Sair da Conta' }));
    await navigate.mock.results[0]?.value;
    TestBed.tick();

    expect(logout).toHaveBeenCalledTimes(1);
    expect(logout).toHaveBeenCalledWith('user');
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(router.url).toBe('/login');
    expect(TestBed.inject(Location).getState()).not.toHaveProperty('authNotice');
  });

  it('shows zero counts for a user with no tasks', async () => {
    await renderSidebar();
    signIn('Bruno Gomes', 'bruno@exemplo.com');
    TestBed.tick();
    loadSummary({ pending: 0, inProgress: 0, completed: 0, total: 0 });

    expect(screen.getByRole('heading', { name: 'Resumo Geral' })).toBeInTheDocument();
    expect(screen.getByText('Suas Tarefas')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText('Em Andamento')).toBeInTheDocument();
    expect(screen.getByText('Concluída')).toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(4);
  });

  it('places each status count on its own row', async () => {
    await renderSidebar();
    signIn('Bruno Gomes', 'bruno@exemplo.com');
    TestBed.tick();
    loadSummary({ pending: 1, inProgress: 2, completed: 3, total: 6 });

    expect(screen.getByText('Pendente').closest('li')).toHaveTextContent('1');
    expect(screen.getByText('Em Andamento').closest('li')).toHaveTextContent('2');
    expect(screen.getByText('Concluída').closest('li')).toHaveTextContent('3');
    expect(screen.getByText('Suas Tarefas').parentElement).toHaveTextContent('6');
  });

  it('shows skeletons while the summary is loading', async () => {
    await renderSidebar();
    signIn('Bruno Gomes', 'bruno@exemplo.com');
    TestBed.tick();
    TestBed.inject(SummaryStore).load();
    TestBed.tick();

    try {
      const summary = screen.getByRole('heading', { name: 'Resumo Geral' }).closest('section');
      expect(summary).toHaveAttribute('aria-busy', 'true');
      expect(summary).toHaveTextContent('Carregando resumo');
      expect(screen.getByText('Pendente')).toBeInTheDocument();
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    } finally {
      TestBed.inject(HttpTestingController)
        .expectOne('/api/tasks/summary')
        .flush({ pending: 0, inProgress: 0, completed: 0, total: 0 });
    }
  });

  it('shows a muted message when the summary fails to load', async () => {
    await renderSidebar();
    signIn('Bruno Gomes', 'bruno@exemplo.com');
    TestBed.tick();
    loadSummary('error');

    const summary = screen.getByRole('heading', { name: 'Resumo Geral' }).closest('section');

    expect(screen.getByText('Não foi possível carregar o resumo')).toBeInTheDocument();
    expect(summary).not.toHaveAttribute('aria-busy');
    expect(summary).not.toHaveTextContent('Carregando resumo');
    expect(screen.queryByText('Pendente')).not.toBeInTheDocument();
  });
});

async function renderSidebar(): Promise<void> {
  await render(Sidebar, {
    providers: [
      provideRouter([{ path: 'login', children: [] }]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: '' },
    ],
  });
}

function loadSummary(
  body: { pending: number; inProgress: number; completed: number; total: number } | 'error',
): void {
  TestBed.inject(SummaryStore).load();
  const request = TestBed.inject(HttpTestingController).expectOne('/api/tasks/summary');

  if (body === 'error') {
    request.flush(null, { status: 500, statusText: 'Server Error' });
  } else {
    request.flush(body);
  }

  TestBed.tick();
}

function signIn(name: string, email: string): void {
  const store = TestBed.inject(SessionStore);
  const http = TestBed.inject(HttpTestingController);

  store.login({ email, password: 'senha1234' }).subscribe();
  http.expectOne('/api/users/login').flush({ accessToken: 'token-1', expiresIn: 3600 });
  http.expectOne('/api/users/me').flush({
    id: 'user-1',
    name,
    email,
    createdAt: '2026-11-18T15:00:00Z',
  });
}
