import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ApiError } from './api-error';
import { errorInterceptor } from './error-interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
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
  });

  it('converts a network failure into status 0', () => {
    const captured = captureError('/api/tasks', () =>
      httpMock.expectOne('/api/tasks').error(new ProgressEvent('error')),
    );

    const error = expectApiError(captured);
    expect(error.status).toBe(0);
    expect(error.code).toBe('network.unreachable');
  });

  function captureError(url: string, fail: () => void): unknown {
    let captured: unknown;

    http.post(url, {}).subscribe({
      error: (error: unknown) => {
        captured = error;
      },
    });

    fail();

    return captured;
  }
});

function expectApiError(error: unknown): ApiError {
  expect(error).toBeInstanceOf(ApiError);
  if (!(error instanceof ApiError)) {
    throw new Error('Expected ApiError');
  }
  return error;
}
