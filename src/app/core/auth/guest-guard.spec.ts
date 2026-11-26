import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';

import { routes } from '../../app.routes';
import { API_BASE_URL } from '../api/api-base-url';
import { SessionStore } from './session-store';

const profileDto = {
  id: 'user-1',
  name: 'Ana Silva',
  email: 'ana@example.com',
  createdAt: '2026-11-18T15:00:00Z',
};

describe('guestGuard', () => {
  beforeEach(() => {
    localStorage.clear();
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
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  // The lazy login chunk evaluates the icon library, which takes longer than the default 5s limit.
  it('lets a guest open /login', async () => {
    const harness = await RouterTestingHarness.create('/login');

    expect(TestBed.inject(Router).url).toBe('/login');
    expect(heading(harness)).toBe('Entrar');
  }, 60_000);

  // The lazy register chunk evaluates the icon library, which takes longer than the default 5s limit.
  it('lets a guest open /register', async () => {
    const harness = await RouterTestingHarness.create('/register');

    expect(TestBed.inject(Router).url).toBe('/register');
    expect(heading(harness)).toBe('Criar Conta');
  }, 60_000);

  it('sends an authenticated user from /login to /tasks', async () => {
    signIn();

    const harness = await RouterTestingHarness.create('/login');

    expect(TestBed.inject(Router).url).toBe('/tasks');
    expect(heading(harness)).toBe('Quadro de Tarefas');
    flushSummary();
  });

  it('sends an authenticated user from /register to /tasks', async () => {
    signIn();

    const harness = await RouterTestingHarness.create('/register');

    expect(TestBed.inject(Router).url).toBe('/tasks');
    expect(heading(harness)).toBe('Quadro de Tarefas');
    flushSummary();
  });
});

function signIn(): void {
  const store = TestBed.inject(SessionStore);
  const http = TestBed.inject(HttpTestingController);

  store.login({ email: 'ana@example.com', password: 'senha1234' }).subscribe();
  http.expectOne('/api/users/login').flush({ accessToken: 'token-1', expiresIn: 3600 });
  http.expectOne('/api/users/me').flush(profileDto);
}

function flushSummary(): void {
  TestBed.inject(HttpTestingController)
    .expectOne('/api/tasks/summary')
    .flush({ pending: 0, inProgress: 0, completed: 0, total: 0 });
}

function heading(harness: RouterTestingHarness): string {
  return harness.routeNativeElement?.querySelector('h1')?.textContent?.trim() ?? '';
}
