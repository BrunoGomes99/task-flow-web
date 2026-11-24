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
