import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import { SessionStore } from './session-store';

export const authGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);

  if (session.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
