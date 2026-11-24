import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { SessionStore } from '../auth/session-store';
import { SKIP_ERROR_TOAST } from '../notifications/skip-error-toast';
import { ToastStore } from '../notifications/toast-store';
import { toApiError } from './api-error';

const NETWORK_ERROR_TOAST = 'Não foi possível conectar ao servidor.';
const UNEXPECTED_ERROR_TOAST = 'Ocorreu um erro inesperado. Tente novamente.';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionStore);
  const toasts = inject(ToastStore);

  return next(req).pipe(
    catchError((error: unknown) => {
      const apiError = toApiError(error);

      // Login answers 401 for a wrong password and that request has no token.
      // Only a rejected session token ends the session.
      if (apiError.status === 401 && req.headers.has('Authorization')) {
        session.logout('expired');
      }

      if (!req.context.get(SKIP_ERROR_TOAST)) {
        const message = errorToastMessage(apiError.status);
        if (message !== null) {
          toasts.error(message);
        }
      }

      return throwError(() => apiError);
    }),
  );
};

function errorToastMessage(status: number): string | null {
  if (status === 0) {
    return NETWORK_ERROR_TOAST;
  }

  if (status >= 500) {
    return UNEXPECTED_ERROR_TOAST;
  }

  return null;
}
