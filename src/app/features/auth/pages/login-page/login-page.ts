import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  type AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { LucideChevronRight } from '@lucide/angular';

import { ApiError } from '@core/api/api-error';
import { API_ERROR_CODES } from '@core/api/error-codes';
import { SessionStore } from '@core/auth/session-store';
import { Alert } from '@shared/ui/alert/alert';
import { Button } from '@shared/ui/button/button';
import { FormField, FormFieldControl } from '@shared/ui/form-field/form-field';

import { AuthCard } from '../../components/auth-card/auth-card';

const INVALID_CREDENTIALS = 'E-mail ou senha inválidos.';
const UNEXPECTED_ERROR = 'Ocorreu um erro inesperado. Tente novamente.';
const NO_ERRORS: readonly string[] = [];

type LoginField = 'email' | 'password';

interface LoginForm {
  email: FormControl<string>;
  password: FormControl<string>;
}

@Component({
  selector: 'app-login-page',
  imports: [
    ReactiveFormsModule,
    AuthCard,
    FormField,
    FormFieldControl,
    Alert,
    Button,
    LucideChevronRight,
  ],
  templateUrl: './login-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly submitting = signal(false);
  private readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly authNotice = consumeAuthNotice(this.router, this.location);
  private readonly shownErrors: Record<LoginField, readonly string[]> = {
    email: NO_ERRORS,
    password: NO_ERRORS,
  };

  protected readonly form = new FormGroup<LoginForm>({
    email: new FormControl('', {
      nonNullable: true,
      validators: [requiredText, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [requiredText],
    }),
  });

  protected visibleErrors(field: LoginField): readonly string[] {
    const control = this.form.controls[field];
    const next =
      !this.submitted() && !control.touched ? NO_ERRORS : messagesFor(field, control.errors);
    const current = this.shownErrors[field];
    if (sameMessages(current, next)) {
      return current;
    }

    this.shownErrors[field] = next;
    return next;
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }

    this.formError.set(null);
    this.submitted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    this.submitting.set(true);

    this.sessionStore
      .login({
        email: value.email.trim(),
        password: value.password,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          void this.router.navigate(['/tasks']);
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.showFailure(error);
        },
      });
  }

  private showFailure(error: unknown): void {
    if (error instanceof ApiError && error.code === API_ERROR_CODES.authInvalidCredentials) {
      this.formError.set(INVALID_CREDENTIALS);
      return;
    }

    this.formError.set(UNEXPECTED_ERROR);
  }
}

type AuthNotice = 'registered' | 'sessionExpired';

function consumeAuthNotice(router: Router, location: Location): AuthNotice | null {
  const notice = readAuthNotice(router.currentNavigation()?.extras.state);
  if (notice === null) {
    return null;
  }

  // A reload restores History.state, and the router copies it into the next
  // navigation. Drop the notice once it has been shown.
  const current = location.getState();
  if (isRecord(current) && readAuthNotice(current) === notice) {
    const next = { ...current };
    delete next['authNotice'];
    location.replaceState(location.path(), '', next);
  }

  return notice;
}

function readAuthNotice(state: unknown): AuthNotice | null {
  if (!isRecord(state)) {
    return null;
  }

  const notice = state['authNotice'];
  if (notice === 'registered' || notice === 'sessionExpired') {
    return notice;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function requiredText(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  return typeof value === 'string' && value.trim().length > 0 ? null : { required: true };
}

const REQUIRED_MESSAGE: Record<LoginField, string> = {
  email: 'O e-mail é obrigatório.',
  password: 'A senha é obrigatória.',
};

function sameMessages(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((message, index) => message === right[index]);
}

function messagesFor(field: LoginField, errors: ValidationErrors | null): readonly string[] {
  if (errors === null) {
    return NO_ERRORS;
  }

  const messages: string[] = [];

  if (errors['required']) {
    messages.push(REQUIRED_MESSAGE[field]);
  } else if (errors['email']) {
    messages.push('Informe um e-mail válido.');
  }

  return messages;
}
