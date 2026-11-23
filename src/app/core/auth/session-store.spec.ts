import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { appConfig } from '../../app.config';
import { API_BASE_URL } from '../api/api-base-url';
import { ApiError } from '../api/api-error';
import { errorInterceptor } from '../api/error-interceptor';
import { CLOCK, SessionStore } from './session-store';

const START = Date.UTC(2026, 10, 18, 15, 0, 0);
const STORAGE_KEY = 'taskflow.session';
const MAX_TIMEOUT_DELAY_MS = 2_147_483_647;

const profileDto = {
  id: 'user-1',
  name: 'Ana Silva',
  email: 'ana@example.com',
  createdAt: '2026-11-18T15:00:00Z',
};

const profile = {
  id: 'user-1',
  name: 'Ana Silva',
  email: 'ana@example.com',
};

let now = START;

describe('SessionStore', () => {
  beforeEach(() => {
    now = START;
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('login, restore and expiry', () => {
    let store: SessionStore;
    let httpMock: HttpTestingController;
    let router: Router;

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(withInterceptors([errorInterceptor])),
          provideHttpClientTesting(),
          provideRouter([]),
          { provide: API_BASE_URL, useValue: '' },
          { provide: CLOCK, useValue: () => now },
        ],
      });

      store = TestBed.inject(SessionStore);
      httpMock = TestBed.inject(HttpTestingController);
      router = TestBed.inject(Router);
      vi.spyOn(router, 'navigate').mockResolvedValue(true);
    });

    afterEach(() => {
      httpMock.verify();
      vi.useRealTimers();
    });

    it('stores the token and expiry, then publishes the profile', () => {
      let completed = false;

      store.login({ email: 'ana@example.com', password: 'senha1234' }).subscribe({
        complete: () => {
          completed = true;
        },
      });

      const loginRequest = httpMock.expectOne('/api/users/login');
      expect(loginRequest.request.method).toBe('POST');
      expect(loginRequest.request.body).toEqual({
        email: 'ana@example.com',
        password: 'senha1234',
      });
      loginRequest.flush({ accessToken: 'token-1', expiresIn: 3600 });

      expect(readStoredSession()).toEqual({
        accessToken: 'token-1',
        expiresAt: START + 3_600_000,
      });
      expect(store.accessToken()).toBe('token-1');
      expect(store.isAuthenticated()).toBe(false);
      expect(store.profile()).toBeNull();

      httpMock.expectOne('/api/users/me').flush(profileDto);

      expect(completed).toBe(true);
      expect(store.isAuthenticated()).toBe(true);
      expect(store.profile()).toEqual(profile);
      expect(store.initials()).toBe('AS');
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('keeps the user anonymous when login is rejected', () => {
      let error: unknown;

      store.login({ email: 'ana@example.com', password: 'errada' }).subscribe({
        error: (value: unknown) => {
          error = value;
        },
      });

      httpMock.expectOne('/api/users/login').flush(
        {
          title: 'Unauthorized',
          status: 401,
          code: 'auth.invalid_credentials',
        },
        { status: 401, statusText: 'Unauthorized' },
      );

      expect(error).toBeInstanceOf(ApiError);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(store.isAuthenticated()).toBe(false);
      expect(store.accessToken()).toBeNull();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('discards the session when the profile request after login is rejected', () => {
      let error: unknown;

      store.login({ email: 'ana@example.com', password: 'senha1234' }).subscribe({
        error: (value: unknown) => {
          error = value;
        },
      });

      httpMock.expectOne('/api/users/login').flush({ accessToken: 'token-1', expiresIn: 3600 });
      httpMock
        .expectOne('/api/users/me')
        .flush({ title: 'Unauthorized', status: 401 }, { status: 401, statusText: 'Unauthorized' });

      expect(error).toBeInstanceOf(ApiError);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(store.isAuthenticated()).toBe(false);
      expect(store.accessToken()).toBeNull();
      expect(store.profile()).toBeNull();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('logs out and opens the login page when the session reaches expiresAt', () => {
      login(store, httpMock);

      passTime(3_600_000 - 1);
      expect(store.isAuthenticated()).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();

      passTime(1);

      expect(store.isAuthenticated()).toBe(false);
      expect(store.accessToken()).toBeNull();
      expect(store.profile()).toBeNull();
      expect(store.initials()).toBe('');
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(router.navigate).toHaveBeenCalledTimes(1);
      expect(router.navigate).toHaveBeenCalledWith(['/login'], {
        state: { authNotice: 'sessionExpired' },
      });
    });

    it('rechecks a session longer than the maximum timer delay before logging out', () => {
      const expiresInSeconds = 2_147_484;
      login(store, httpMock, expiresInSeconds);

      passTime(MAX_TIMEOUT_DELAY_MS);
      expect(store.isAuthenticated()).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();

      passTime(expiresInSeconds * 1000 - MAX_TIMEOUT_DELAY_MS);

      expect(store.isAuthenticated()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/login'], {
        state: { authNotice: 'sessionExpired' },
      });
    });

    it('restores a stored session that has not expired and loads the profile', () => {
      writeStoredSession({ accessToken: 'token-1', expiresAt: START + 60_000 });

      let completed = false;
      store.restore().subscribe({
        complete: () => {
          completed = true;
        },
      });

      expect(store.accessToken()).toBe('token-1');
      expect(store.isAuthenticated()).toBe(false);

      httpMock.expectOne('/api/users/me').flush(profileDto);

      expect(completed).toBe(true);
      expect(store.isAuthenticated()).toBe(true);
      expect(store.profile()).toEqual(profile);
      expect(store.initials()).toBe('AS');
      expect(readStoredSession()).toEqual({
        accessToken: 'token-1',
        expiresAt: START + 60_000,
      });
    });

    it('logs out a restored session when its expiry is reached', () => {
      writeStoredSession({ accessToken: 'token-1', expiresAt: START + 60_000 });
      store.restore().subscribe();
      httpMock.expectOne('/api/users/me').flush(profileDto);

      passTime(60_000);

      expect(store.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login'], {
        state: { authNotice: 'sessionExpired' },
      });
    });

    it('removes a stored session whose expiry is already in the past', () => {
      writeStoredSession({ accessToken: 'old-token', expiresAt: START - 1 });

      let completed = false;
      store.restore().subscribe({
        complete: () => {
          completed = true;
        },
      });

      httpMock.expectNone('/api/users/me');
      expect(completed).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(store.isAuthenticated()).toBe(false);
      expect(store.accessToken()).toBeNull();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('removes a stored session that expires at the current time', () => {
      writeStoredSession({ accessToken: 'old-token', expiresAt: START });

      store.restore().subscribe();

      httpMock.expectNone('/api/users/me');
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(store.accessToken()).toBeNull();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('discards the stored session when the profile answers 401', () => {
      writeStoredSession({ accessToken: 'token-1', expiresAt: START + 60_000 });

      let completed = false;
      let failed = false;
      store.restore().subscribe({
        complete: () => {
          completed = true;
        },
        error: () => {
          failed = true;
        },
      });

      httpMock
        .expectOne('/api/users/me')
        .flush(
          { title: 'Unauthorized', status: 401, detail: 'Token inválido.' },
          { status: 401, statusText: 'Unauthorized' },
        );

      expect(failed).toBe(false);
      expect(completed).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(store.isAuthenticated()).toBe(false);
      expect(store.accessToken()).toBeNull();
      expect(store.profile()).toBeNull();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('keeps the stored session when restoring the profile fails for another reason', () => {
      writeStoredSession({ accessToken: 'token-1', expiresAt: START + 60_000 });

      let failed = false;
      store.restore().subscribe({
        error: () => {
          failed = true;
        },
      });

      httpMock
        .expectOne('/api/users/me')
        .flush({ title: 'Server Error', status: 500 }, { status: 500, statusText: 'Server Error' });

      expect(failed).toBe(true);
      expect(readStoredSession()).toEqual({
        accessToken: 'token-1',
        expiresAt: START + 60_000,
      });
      expect(store.isAuthenticated()).toBe(false);
      expect(store.accessToken()).toBeNull();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it.each([
      '{',
      'null',
      '[]',
      '{"accessToken":"","expiresAt":1}',
      '{"expiresAt":1}',
      '{"accessToken":"token-1"}',
      '{"accessToken":"token-1","expiresAt":"soon"}',
    ])('discards an unusable stored value %s', (raw) => {
      localStorage.setItem(STORAGE_KEY, raw);

      let completed = false;
      store.restore().subscribe({
        complete: () => {
          completed = true;
        },
      });

      httpMock.expectNone('/api/users/me');
      expect(completed).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(store.isAuthenticated()).toBe(false);
    });

    it('clears the session and opens login without a notice when the user logs out', () => {
      login(store, httpMock);

      store.logout('user');

      expect(store.isAuthenticated()).toBe(false);
      expect(store.accessToken()).toBeNull();
      expect(store.profile()).toBeNull();
      expect(store.initials()).toBe('');
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(router.navigate).toHaveBeenCalledTimes(1);
      expect(router.navigate).toHaveBeenCalledWith(['/login']);

      passTime(3_600_000);
      expect(router.navigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('application startup', () => {
    afterEach(() => {
      TestBed.inject(HttpTestingController).verify();
    });

    it('restores a stored session before application init finishes', async () => {
      writeStoredSession({ accessToken: 'token-1', expiresAt: START + 60_000 });

      TestBed.configureTestingModule({
        providers: [
          ...appConfig.providers,
          provideHttpClientTesting(),
          { provide: CLOCK, useValue: () => now },
        ],
      });

      const ready = TestBed.inject(ApplicationInitStatus).donePromise;
      TestBed.inject(HttpTestingController)
        .expectOne(`${environment.apiBaseUrl}/api/users/me`)
        .flush(profileDto);
      await ready;

      const store = TestBed.inject(SessionStore);
      expect(store.isAuthenticated()).toBe(true);
      expect(store.profile()).toEqual(profile);
    });
  });
});

function login(
  store: SessionStore,
  httpMock: HttpTestingController,
  expiresInSeconds = 3600,
): void {
  store.login({ email: 'ana@example.com', password: 'senha1234' }).subscribe();
  httpMock
    .expectOne('/api/users/login')
    .flush({ accessToken: 'token-1', expiresIn: expiresInSeconds });
  httpMock.expectOne('/api/users/me').flush(profileDto);
}

function passTime(milliseconds: number): void {
  now += milliseconds;
  vi.advanceTimersByTime(milliseconds);
}

function writeStoredSession(session: { accessToken: string; expiresAt: number }): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function readStoredSession(): unknown {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === null ? null : (JSON.parse(raw) as unknown);
}
