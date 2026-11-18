import type { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import { toApiError } from './api-error';

export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(catchError((error: unknown) => throwError(() => toApiError(error))));
