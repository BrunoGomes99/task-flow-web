import { DestroyRef, Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, switchMap, tap, throwError } from 'rxjs';

import { ApiError } from '../api/api-error';
import { AuthApi } from './auth-api';
import type { LoginInput, UserProfile } from './auth-models';

export const CLOCK = new InjectionToken<() => number>('CLOCK', {
  providedIn: 'root',
  factory: () => Date.now,
});

const SESSION_STORAGE_KEY = 'taskflow.session';

// Browsers store the setTimeout delay as a 32-bit signed integer. A larger
// delay overflows and the timer fires immediately, so a longer session is
// re-checked when this capped timer fires.
const MAX_TIMEOUT_DELAY_MS = 2_147_483_647;

type SessionStatus = 'anonymous' | 'restoring' | 'authenticated';

interface SessionState {
  readonly accessToken: string | null;
  readonly expiresAt: number | null;
  readonly profile: UserProfile | null;
  readonly status: SessionStatus;
}

interface StoredSession {
  readonly accessToken: string;
  readonly expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly now = inject(CLOCK);
  private readonly authApi = inject(AuthApi);
  private readonly router = inject(Router);

  private readonly state = signal<SessionState>(anonymousState());
  private timerId: ReturnType<typeof setTimeout> | undefined;

  readonly isAuthenticated = computed(() => this.state().status === 'authenticated');
  readonly profile = computed(() => this.state().profile);
  readonly accessToken = computed(() => this.state().accessToken);
  readonly initials = computed(() => toInitials(this.state().profile?.name ?? ''));

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.clearTimer();
    });
  }

  login(input: LoginInput): Observable<void> {
    return this.authApi.login(input).pipe(
      switchMap((result) => {
        const stored: StoredSession = {
          accessToken: result.accessToken,
          expiresAt: this.now() + result.expiresInSeconds * 1000,
        };
        this.writeStorage(stored);
        this.remember(stored);
        return this.adoptProfile(stored).pipe(
          catchError((error: unknown) => {
            this.clearSession();
            return throwError(() => error);
          }),
        );
      }),
    );
  }

  restore(): Observable<void> {
    const stored = this.readStorage();
    if (stored === null) {
      return completed();
    }

    if (stored.expiresAt <= this.now()) {
      this.clearSession();
      return completed();
    }

    this.remember(stored);
    return this.adoptProfile(stored).pipe(
      catchError((error: unknown) => {
        // A 401 means the stored token was rejected. Other failures leave it
        // in storage so the next startup can try again.
        if (isUnauthorized(error)) {
          this.clearSession();
          return completed();
        }

        this.clearTimer();
        this.state.set(anonymousState());
        return throwError(() => error);
      }),
    );
  }

  logout(reason: 'user' | 'expired'): void {
    this.clearSession();

    if (reason === 'expired') {
      void this.router.navigate(['/login'], { state: { authNotice: 'sessionExpired' } });
      return;
    }

    void this.router.navigate(['/login']);
  }

  private adoptProfile(stored: StoredSession): Observable<void> {
    return this.authApi.getProfile().pipe(
      tap((profile) => {
        this.state.set({
          accessToken: stored.accessToken,
          expiresAt: stored.expiresAt,
          profile,
          status: 'authenticated',
        });
        this.scheduleLogout(stored.expiresAt);
      }),
      map((): void => undefined),
    );
  }

  private remember(stored: StoredSession): void {
    this.clearTimer();
    this.state.set({
      accessToken: stored.accessToken,
      expiresAt: stored.expiresAt,
      profile: null,
      status: 'restoring',
    });
  }

  private scheduleLogout(expiresAt: number): void {
    this.clearTimer();

    const remaining = expiresAt - this.now();
    if (remaining <= 0) {
      this.logout('expired');
      return;
    }

    const delay = Math.min(remaining, MAX_TIMEOUT_DELAY_MS);
    this.timerId = setTimeout(() => {
      this.timerId = undefined;
      this.scheduleLogout(expiresAt);
    }, delay);
  }

  private clearSession(): void {
    this.clearTimer();
    localStorage.removeItem(SESSION_STORAGE_KEY);
    this.state.set(anonymousState());
  }

  private clearTimer(): void {
    if (this.timerId === undefined) {
      return;
    }

    clearTimeout(this.timerId);
    this.timerId = undefined;
  }

  private readStorage(): StoredSession | null {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw === null) {
      return null;
    }

    const stored = parseStoredSession(raw);
    if (stored === null) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }

    return stored;
  }

  private writeStorage(stored: StoredSession): void {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stored));
  }
}

function anonymousState(): SessionState {
  return {
    accessToken: null,
    expiresAt: null,
    profile: null,
    status: 'anonymous',
  };
}

function completed(): Observable<void> {
  return new Observable((subscriber) => {
    subscriber.next();
    subscriber.complete();
  });
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

function toInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
  const first = parts[0];
  if (first === undefined) {
    return '';
  }

  const last = parts.length > 1 ? parts[parts.length - 1] : undefined;
  const letters = last === undefined ? first.charAt(0) : `${first.charAt(0)}${last.charAt(0)}`;
  return letters.toLocaleUpperCase('pt-BR');
}

function parseStoredSession(raw: string): StoredSession | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }

  return toStoredSession(parsed);
}

function toStoredSession(value: unknown): StoredSession | null {
  if (!isRecord(value)) {
    return null;
  }

  const accessToken = value['accessToken'];
  const expiresAt = value['expiresAt'];
  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    return null;
  }

  if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) {
    return null;
  }

  return { accessToken, expiresAt };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
