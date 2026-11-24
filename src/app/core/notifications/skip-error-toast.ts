import { HttpContextToken } from '@angular/common/http';

/** Set on a request whose caller shows its own message, so the interceptor stays quiet. */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);
