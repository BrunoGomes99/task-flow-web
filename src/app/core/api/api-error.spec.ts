import { HttpErrorResponse } from '@angular/common/http';

import { ApiError, isProblemDetails, isValidationProblemDetails, toApiError } from './api-error';

describe('toApiError', () => {
  it('maps a 409 with extensions.code to ApiError', () => {
    const error = toApiError(
      new HttpErrorResponse({
        status: 409,
        statusText: 'Conflict',
        url: '/api/users/register',
        error: {
          title: 'Conflict',
          detail: 'Este e-mail já está em uso.',
          status: 409,
          extensions: { code: 'user.email_already_in_use' },
        },
      }),
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.code).toBe('user.email_already_in_use');
    expect(error.message).toBe('Este e-mail já está em uso.');
    expect(error.fieldErrors).toEqual({});
  });

  it('reads code flattened onto the problem body', () => {
    const error = toApiError(
      new HttpErrorResponse({
        status: 409,
        error: {
          title: 'Conflict',
          detail: 'Este e-mail já está em uso.',
          code: 'user.email_already_in_use',
        },
      }),
    );

    expect(error.code).toBe('user.email_already_in_use');
    expect(error.message).toBe('Este e-mail já está em uso.');
  });

  it('converts PascalCase validation keys to camelCase', () => {
    const error = toApiError(
      new HttpErrorResponse({
        status: 400,
        error: {
          title: 'One or more validation errors occurred.',
          status: 400,
          code: 'request.validation_failed',
          errors: {
            Title: ['Informe o título.'],
            DueDate: ['A data de vencimento não pode estar no passado.'],
            Description: null,
          },
        },
      }),
    );

    expect(error.status).toBe(400);
    expect(error.code).toBe('request.validation_failed');
    expect(error.message).toBe('One or more validation errors occurred.');
    expect(error.fieldErrors).toEqual({
      title: ['Informe o título.'],
      dueDate: ['A data de vencimento não pode estar no passado.'],
    });
  });

  it('uses title when detail is missing and falls back when there is no code', () => {
    const error = toApiError(
      new HttpErrorResponse({
        status: 500,
        error: { title: 'Server error', detail: null, status: 500 },
      }),
    );

    expect(error.status).toBe(500);
    expect(error.code).toBe('server.unexpected_error');
    expect(error.message).toBe('Server error');
    expect(error.fieldErrors).toEqual({});
  });

  it('maps a network failure to status 0 and network.unreachable', () => {
    const error = toApiError(
      new HttpErrorResponse({
        status: 0,
        statusText: 'Unknown Error',
        url: '/api/tasks',
        error: new ProgressEvent('error'),
      }),
    );

    expect(error.status).toBe(0);
    expect(error.code).toBe('network.unreachable');
    expect(error.message).toBe('');
    expect(error.fieldErrors).toEqual({});
  });

  it('uses server.unexpected_error when the body is not a problem', () => {
    const error = toApiError(
      new HttpErrorResponse({
        status: 502,
        error: '<html>bad gateway</html>',
      }),
    );

    expect(error.status).toBe(502);
    expect(error.code).toBe('server.unexpected_error');
    expect(error.message).toBe('');
    expect(error.fieldErrors).toEqual({});
  });

  it('returns the same instance when the error is already an ApiError', () => {
    const original = new ApiError({
      status: 404,
      code: 'task.not_found',
      message: 'Tarefa não encontrada.',
    });

    expect(toApiError(original)).toBe(original);
  });
});

describe('problem details type guards', () => {
  it('accepts a problem body and a validation body', () => {
    const problem = { title: 'Not Found', status: 404, detail: 'Missing' };
    const validation = {
      title: 'One or more validation errors occurred.',
      status: 400,
      errors: { Title: ['Informe o título.'] },
    };

    expect(isProblemDetails(problem)).toBe(true);
    expect(isValidationProblemDetails(problem)).toBe(false);
    expect(isProblemDetails(validation)).toBe(true);
    expect(isValidationProblemDetails(validation)).toBe(true);
  });

  it('rejects values that are not problem details', () => {
    expect(isProblemDetails(null)).toBe(false);
    expect(isProblemDetails('error')).toBe(false);
    expect(isProblemDetails(new ProgressEvent('error'))).toBe(false);
    expect(isValidationProblemDetails({ title: 'Bad', errors: { Title: 'nope' } })).toBe(false);
  });
});
