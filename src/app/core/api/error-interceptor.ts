import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { SessionStore } from '../auth/session-store';
import { toApiError } from './api-error';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionStore);

  return next(req).pipe(
    catchError((error: unknown) => {
      const apiError = toApiError(error);

      // Login answers 401 for a wrong password and that request has no token.
      // Only a rejected session token ends the session.
      if (apiError.status === 401 && req.headers.has('Authorization')) {
        session.logout('expired');
      }

      return throwError(() => apiError);
    }),
  );
};
