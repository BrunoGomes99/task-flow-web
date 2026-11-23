import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { API_BASE_URL } from './core/api/api-base-url';
import { errorInterceptor } from './core/api/error-interceptor';
import { authInterceptor } from './core/auth/auth-interceptor';
import { SessionStore } from './core/auth/session-store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, errorInterceptor])),
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
    provideAppInitializer(() => inject(SessionStore).restore()),
  ],
};
