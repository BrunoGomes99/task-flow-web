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

describe('authGuard', () => {
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

  it('sends a guest opening /tasks to /login', async () => {
    const harness = await RouterTestingHarness.create('/tasks');

    expect(TestBed.inject(Router).url).toBe('/login');
    expect(heading(harness)).toBe('Entrar');
  });

  it('sends a guest opening / to /login', async () => {
    const harness = await RouterTestingHarness.create('/');

    expect(TestBed.inject(Router).url).toBe('/login');
    expect(heading(harness)).toBe('Entrar');
  });

  it('sends a guest opening an unknown path to /login', async () => {
    const harness = await RouterTestingHarness.create('/nao-existe');

    expect(TestBed.inject(Router).url).toBe('/login');
    expect(heading(harness)).toBe('Entrar');
  });

  it('lets an authenticated user open /tasks', async () => {
    signIn();

    const harness = await RouterTestingHarness.create('/tasks');

    expect(TestBed.inject(Router).url).toBe('/tasks');
    expect(heading(harness)).toBe('Quadro de Tarefas');
  });

  it('opens the board when an authenticated user visits /', async () => {
    signIn();

    const harness = await RouterTestingHarness.create('/');

    expect(TestBed.inject(Router).url).toBe('/tasks');
    expect(heading(harness)).toBe('Quadro de Tarefas');
  });
});

function signIn(): void {
  const store = TestBed.inject(SessionStore);
  const http = TestBed.inject(HttpTestingController);

  store.login({ email: 'ana@example.com', password: 'senha1234' }).subscribe();
  http.expectOne('/api/users/login').flush({ accessToken: 'token-1', expiresIn: 3600 });
  http.expectOne('/api/users/me').flush(profileDto);
}

function heading(harness: RouterTestingHarness): string {
  return harness.routeNativeElement?.querySelector('h1')?.textContent?.trim() ?? '';
}
