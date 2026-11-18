import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../api/api-base-url';
import { AuthApi } from './auth-api';
import type { LoginResult, RegisterResult, UserProfile } from './auth-models';

describe('AuthApi', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  describe('with the development base URL', () => {
    let api: AuthApi;
    let httpMock: HttpTestingController;

    beforeEach(() => {
      ({ api, httpMock } = setup(''));
    });

    it('posts the register body to /api/users/register and maps the id', () => {
      let result: RegisterResult | undefined;

      api
        .register({ name: 'Ana Silva', email: 'ana@example.com', password: 'senha1234' })
        .subscribe((value) => {
          result = value;
        });

      const request = httpMock.expectOne('/api/users/register');
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({
        name: 'Ana Silva',
        email: 'ana@example.com',
        password: 'senha1234',
      });

      request.flush({ id: 'user-1' });

      expect(result).toEqual({ id: 'user-1' });
    });

    it('posts the login body to /api/users/login and maps the session', () => {
      let result: LoginResult | undefined;

      api.login({ email: 'ana@example.com', password: 'senha1234' }).subscribe((value) => {
        result = value;
      });

      const request = httpMock.expectOne('/api/users/login');
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({
        email: 'ana@example.com',
        password: 'senha1234',
      });

      request.flush({ accessToken: 'token-1', expiresIn: 3600 });

      expect(result).toEqual({ accessToken: 'token-1', expiresInSeconds: 3600 });
    });

    it('gets the profile from /api/users/me and maps it', () => {
      let result: UserProfile | undefined;

      api.getProfile().subscribe((value) => {
        result = value;
      });

      const request = httpMock.expectOne('/api/users/me');
      expect(request.request.method).toBe('GET');

      request.flush({
        id: 'user-1',
        name: 'Ana Silva',
        email: 'ana@example.com',
        createdAt: '2026-11-18T12:00:00Z',
      });

      expect(result).toEqual({
        id: 'user-1',
        name: 'Ana Silva',
        email: 'ana@example.com',
      });
    });
  });

  describe('with a production base URL', () => {
    let api: AuthApi;
    let httpMock: HttpTestingController;

    beforeEach(() => {
      ({ api, httpMock } = setup('https://api.taskflow.example'));
    });

    it('prefixes every auth path with API_BASE_URL', () => {
      api.login({ email: 'ana@example.com', password: 'senha1234' }).subscribe();

      httpMock
        .expectOne('https://api.taskflow.example/api/users/login')
        .flush({ accessToken: 'token-1', expiresIn: 60 });
    });
  });
});

function setup(apiBaseUrl: string): { api: AuthApi; httpMock: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: apiBaseUrl },
    ],
  });

  return {
    api: TestBed.inject(AuthApi),
    httpMock: TestBed.inject(HttpTestingController),
  };
}
