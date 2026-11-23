import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { API_BASE_URL } from '../api/api-base-url';
import { SessionStore } from './session-store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(SessionStore).accessToken();
  if (token === null || !isTaskFlowApiRequest(req.url, inject(API_BASE_URL))) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};

// Development sets API_BASE_URL to ''. startsWith('') is true for every URL,
// so the match is the `/api` root AuthApi actually calls (`${base}/api`).
function isTaskFlowApiRequest(url: string, apiBaseUrl: string): boolean {
  const prefix = `${apiBaseUrl}/api`;
  return url === prefix || url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`);
}
