import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { API_BASE_URL } from '../api/api-base-url';
import { authInterceptor } from './auth-interceptor';
import { SessionStore } from './session-store';

const profileDto = {
  id: 'user-1',
  name: 'Ana Silva',
  email: 'ana@example.com',
  createdAt: '2026-11-18T15:00:00Z',
};

describe('authInterceptor', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  describe('with the development base URL', () => {
    let http: HttpClient;
    let httpMock: HttpTestingController;
    let store: SessionStore;

    beforeEach(() => {
      ({ http, httpMock, store } = setup(''));
    });

    it('adds the bearer token to TaskFlow API requests after login', () => {
      signIn(store, httpMock, '');

      http.get('/api/tasks').subscribe();

      const request = httpMock.expectOne('/api/tasks');
      expect(request.request.headers.get('Authorization')).toBe('Bearer token-1');
      request.flush([]);
    });

    it('leaves the header off when there is no session', () => {
      http.get('/api/users/me').subscribe();

      const request = httpMock.expectOne('/api/users/me');
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush(profileDto);
    });

    it('does not send the token on the login call', () => {
      store.login({ email: 'ana@example.com', password: 'senha1234' }).subscribe();

      const loginRequest = httpMock.expectOne('/api/users/login');
      expect(loginRequest.request.headers.has('Authorization')).toBe(false);
      loginRequest.flush({ accessToken: 'token-1', expiresIn: 3600 });

      const profileRequest = httpMock.expectOne('/api/users/me');
      expect(profileRequest.request.headers.get('Authorization')).toBe('Bearer token-1');
      profileRequest.flush(profileDto);
    });

    it('does not send the token to another path on the same origin', () => {
      signIn(store, httpMock, '');

      http.get('/assets/logo.svg').subscribe();

      const request = httpMock.expectOne('/assets/logo.svg');
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush(null);
    });

    it('does not send the token to another origin', () => {
      signIn(store, httpMock, '');

      http.get('https://cdn.example/logo.svg').subscribe();

      const request = httpMock.expectOne('https://cdn.example/logo.svg');
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush(null);
    });
  });

  describe('with a production base URL', () => {
    const apiBaseUrl = 'https://api.taskflow.example';
    let http: HttpClient;
    let httpMock: HttpTestingController;
    let store: SessionStore;

    beforeEach(() => {
      ({ http, httpMock, store } = setup(apiBaseUrl));
    });

    it('adds the bearer token when the request starts with that API', () => {
      signIn(store, httpMock, apiBaseUrl);

      http.get(`${apiBaseUrl}/api/tasks`).subscribe();

      const request = httpMock.expectOne(`${apiBaseUrl}/api/tasks`);
      expect(request.request.headers.get('Authorization')).toBe('Bearer token-1');
      request.flush([]);
    });

    it('does not send the token to another origin that shares the host prefix', () => {
      signIn(store, httpMock, apiBaseUrl);

      http.get('https://api.taskflow.example.evil/api/tasks').subscribe();

      const request = httpMock.expectOne('https://api.taskflow.example.evil/api/tasks');
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush([]);
    });

    it('does not send the token to a different host', () => {
      signIn(store, httpMock, apiBaseUrl);

      http.get('https://other.example/api/tasks').subscribe();

      const request = httpMock.expectOne('https://other.example/api/tasks');
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush([]);
    });
  });
});

function setup(apiBaseUrl: string): {
  http: HttpClient;
  httpMock: HttpTestingController;
  store: SessionStore;
} {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: API_BASE_URL, useValue: apiBaseUrl },
    ],
  });

  return {
    http: TestBed.inject(HttpClient),
    httpMock: TestBed.inject(HttpTestingController),
    store: TestBed.inject(SessionStore),
  };
}

function signIn(store: SessionStore, httpMock: HttpTestingController, apiBaseUrl: string): void {
  store.login({ email: 'ana@example.com', password: 'senha1234' }).subscribe();
  httpMock
    .expectOne(`${apiBaseUrl}/api/users/login`)
    .flush({ accessToken: 'token-1', expiresIn: 3600 });
  httpMock.expectOne(`${apiBaseUrl}/api/users/me`).flush(profileDto);
}
