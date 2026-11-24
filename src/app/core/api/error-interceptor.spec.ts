import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { type MockInstance, vi } from 'vitest';

import { SessionStore } from '../auth/session-store';
import { SKIP_ERROR_TOAST } from '../notifications/skip-error-toast';
import { ToastStore } from '../notifications/toast-store';
import { API_BASE_URL } from './api-base-url';
import { ApiError } from './api-error';
import { errorInterceptor } from './error-interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let logout: MockInstance<(reason: 'user' | 'expired') => void>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: '' },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    logout = vi.spyOn(TestBed.inject(SessionStore), 'logout').mockImplementation(() => undefined);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lets a successful response through', () => {
    let body: unknown;

    http.get<{ id: string }>('/api/users/me').subscribe((response) => {
      body = response;
    });

    httpMock.expectOne('/api/users/me').flush({ id: '1' });

    expect(body).toEqual({ id: '1' });
  });

  it('converts a 409 problem into ApiError', () => {
    const captured = captureError('/api/users/register', () =>
      httpMock.expectOne('/api/users/register').flush(
        {
          title: 'Conflict',
          detail: 'Este e-mail já está em uso.',
          status: 409,
          code: 'user.email_already_in_use',
        },
        { status: 409, statusText: 'Conflict' },
      ),
    );

    const error = expectApiError(captured);
    expect(error.status).toBe(409);
    expect(error.code).toBe('user.email_already_in_use');
    expect(error.message).toBe('Este e-mail já está em uso.');
  });

  it('converts validation errors to camelCase fieldErrors', () => {
    const captured = captureError('/api/tasks', () =>
      httpMock.expectOne('/api/tasks').flush(
        {
          title: 'One or more validation errors occurred.',
          status: 400,
          errors: {
            Title: ['Informe o título.'],
            DueDate: ['Data inválida.'],
          },
        },
        { status: 400, statusText: 'Bad Request' },
      ),
    );

    expect(expectApiError(captured).fieldErrors).toEqual({
      title: ['Informe o título.'],
      dueDate: ['Data inválida.'],
    });
    expectNoToast();
  });

  it('converts a network failure into status 0', () => {
    const captured = captureError('/api/tasks', () =>
      httpMock.expectOne('/api/tasks').error(new ProgressEvent('error')),
    );

    const error = expectApiError(captured);
    expect(error.status).toBe(0);
    expect(error.code).toBe('network.unreachable');
    expect(logout).not.toHaveBeenCalled();
    expectErrorToast('Não foi possível conectar ao servidor.');
  });

  it('logs out and still rethrows when an authenticated request answers 401', () => {
    const captured = captureError(
      '/api/tasks',
      () =>
        httpMock
          .expectOne('/api/tasks')
          .flush(
            { title: 'Unauthorized', status: 401, detail: 'Token inválido.' },
            { status: 401, statusText: 'Unauthorized' },
          ),
      { headers: { Authorization: 'Bearer token-1' } },
    );

    const error = expectApiError(captured);
    expect(error.status).toBe(401);
    expect(logout).toHaveBeenCalledTimes(1);
    expect(logout).toHaveBeenCalledWith('expired');
    expectNoToast();
  });

  it('does not log out when login answers 401', () => {
    const captured = captureError('/api/users/login', () =>
      httpMock.expectOne('/api/users/login').flush(
        {
          title: 'Unauthorized',
          status: 401,
          detail: 'E-mail ou senha inválidos.',
          code: 'auth.invalid_credentials',
        },
        { status: 401, statusText: 'Unauthorized' },
      ),
    );

    const error = expectApiError(captured);
    expect(error.status).toBe(401);
    expect(error.code).toBe('auth.invalid_credentials');
    expect(logout).not.toHaveBeenCalled();
    expectNoToast();
  });

  it('does not log out when an authenticated request fails with another status', () => {
    const captured = captureError(
      '/api/tasks',
      () =>
        httpMock
          .expectOne('/api/tasks')
          .flush(
            { title: 'Internal Server Error', status: 500 },
            { status: 500, statusText: 'Internal Server Error' },
          ),
      { headers: { Authorization: 'Bearer token-1' } },
    );

    expect(expectApiError(captured).status).toBe(500);
    expect(logout).not.toHaveBeenCalled();
    expectErrorToast('Ocorreu um erro inesperado. Tente novamente.');
  });

  it('does not toast a 4xx response', () => {
    const captured = captureError('/api/users/register', () =>
      httpMock.expectOne('/api/users/register').flush(
        {
          title: 'Conflict',
          status: 409,
          code: 'user.email_already_in_use',
        },
        { status: 409, statusText: 'Conflict' },
      ),
    );

    expect(expectApiError(captured).status).toBe(409);
    expectNoToast();
  });

  it('skips the error toast when the request opts out', () => {
    const captured = captureError(
      '/api/tasks',
      () =>
        httpMock
          .expectOne('/api/tasks')
          .flush(
            { title: 'Internal Server Error', status: 500 },
            { status: 500, statusText: 'Internal Server Error' },
          ),
      { skipErrorToast: true },
    );

    expect(expectApiError(captured).status).toBe(500);
    expectNoToast();
  });

  it('skips the connection toast when the request opts out', () => {
    const captured = captureError(
      '/api/tasks',
      () => httpMock.expectOne('/api/tasks').error(new ProgressEvent('error')),
      { skipErrorToast: true },
    );

    expect(expectApiError(captured).status).toBe(0);
    expectNoToast();
  });

  function captureError(
    url: string,
    fail: () => void,
    options?: { headers?: Record<string, string>; skipErrorToast?: boolean },
  ): unknown {
    let captured: unknown;
    const context = options?.skipErrorToast
      ? new HttpContext().set(SKIP_ERROR_TOAST, true)
      : undefined;

    http.post(url, {}, { headers: options?.headers, context }).subscribe({
      error: (error: unknown) => {
        captured = error;
      },
    });

    fail();

    return captured;
  }
});

function expectErrorToast(message: string): void {
  expect(TestBed.inject(ToastStore).toasts()).toEqual([
    expect.objectContaining({ kind: 'error', message }),
  ]);
}

function expectNoToast(): void {
  expect(TestBed.inject(ToastStore).toasts()).toEqual([]);
}

function expectApiError(error: unknown): ApiError {
  expect(error).toBeInstanceOf(ApiError);
  if (!(error instanceof ApiError)) {
    throw new Error('Expected ApiError');
  }
  return error;
}
