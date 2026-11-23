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
import { AuthApi } from '@core/auth/auth-api';
import { Alert } from '@shared/ui/alert/alert';
import { Button } from '@shared/ui/button/button';
import { FormField, FormFieldControl } from '@shared/ui/form-field/form-field';
import { applyServerErrors } from '@shared/utils/apply-server-errors';

import { AuthCard } from '../../components/auth-card/auth-card';

const NAME_MAX_LENGTH = 255;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 255;

const EMAIL_IN_USE = 'Este e-mail já está em uso';
const UNEXPECTED_ERROR = 'Ocorreu um erro inesperado. Tente novamente.';
const NO_ERRORS: readonly string[] = [];

type RegisterField = 'name' | 'email' | 'password';

interface RegisterForm {
  name: FormControl<string>;
  email: FormControl<string>;
  password: FormControl<string>;
}

@Component({
  selector: 'app-register-page',
  imports: [
    ReactiveFormsModule,
    AuthCard,
    FormField,
    FormFieldControl,
    Alert,
    Button,
    LucideChevronRight,
  ],
  templateUrl: './register-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly authApi = inject(AuthApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly submitting = signal(false);
  private readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);
  private readonly shownErrors: Record<RegisterField, readonly string[]> = {
    name: NO_ERRORS,
    email: NO_ERRORS,
    password: NO_ERRORS,
  };

  protected readonly form = new FormGroup<RegisterForm>({
    name: new FormControl('', {
      nonNullable: true,
      validators: [requiredText, Validators.maxLength(NAME_MAX_LENGTH)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [requiredText, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [
        requiredText,
        Validators.minLength(PASSWORD_MIN_LENGTH),
        Validators.maxLength(PASSWORD_MAX_LENGTH),
      ],
    }),
  });

  protected visibleErrors(field: RegisterField): readonly string[] {
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
    this.clearServerErrors();
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    this.submitting.set(true);

    this.authApi
      .register({
        name: value.name.trim(),
        email: value.email.trim(),
        password: value.password,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          void this.router.navigate(['/login'], { state: { authNotice: 'registered' } });
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.showFailure(error);
        },
      });
  }

  private clearServerErrors(): void {
    for (const control of Object.values(this.form.controls)) {
      if (!control.hasError('server')) {
        continue;
      }

      control.updateValueAndValidity();
    }
  }

  private showFailure(error: unknown): void {
    if (!(error instanceof ApiError)) {
      this.formError.set(UNEXPECTED_ERROR);
      return;
    }

    if (error.code === API_ERROR_CODES.userEmailAlreadyInUse) {
      applyServerErrors(this.form, { email: [EMAIL_IN_USE] });
      return;
    }

    if (error.status === 400) {
      const unmatched = applyServerErrors(this.form, error.fieldErrors);
      const messages = unmatched.flatMap((key) => error.fieldErrors[key] ?? []);
      if (messages.length > 0) {
        this.formError.set(messages.join(' '));
        return;
      }

      if (Object.keys(error.fieldErrors).length === 0) {
        this.formError.set(UNEXPECTED_ERROR);
      }

      return;
    }

    this.formError.set(UNEXPECTED_ERROR);
  }
}

function requiredText(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  return typeof value === 'string' && value.trim().length > 0 ? null : { required: true };
}

const REQUIRED_MESSAGE: Record<RegisterField, string> = {
  name: 'O nome é obrigatório.',
  email: 'O e-mail é obrigatório.',
  password: 'A senha é obrigatória.',
};

function sameMessages(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((message, index) => message === right[index]);
}

function messagesFor(field: RegisterField, errors: ValidationErrors | null): readonly string[] {
  if (errors === null) {
    return NO_ERRORS;
  }

  const messages: string[] = [];

  if (errors['required']) {
    messages.push(REQUIRED_MESSAGE[field]);
  } else if (errors['email']) {
    messages.push('Informe um e-mail válido.');
  } else if (errors['minlength']) {
    messages.push('A senha deve conter no mínimo 8 caracteres.');
  } else if (errors['maxlength']) {
    const maxLengthMessage = maxLengthMessageFor(field);
    if (maxLengthMessage !== null) {
      messages.push(maxLengthMessage);
    }
  }

  const server: unknown = errors['server'];
  if (Array.isArray(server)) {
    for (const message of server) {
      if (typeof message === 'string') {
        messages.push(message);
      }
    }
  }

  return messages;
}

function maxLengthMessageFor(field: RegisterField): string | null {
  if (field === 'name') {
    return 'O nome deve ter no máximo 255 caracteres.';
  }

  if (field === 'password') {
    return 'A senha deve ter no máximo 255 caracteres.';
  }

  return null;
}
