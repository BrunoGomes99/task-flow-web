import { FormControl, FormGroup, Validators } from '@angular/forms';

import { applyServerErrors } from './apply-server-errors';

describe('applyServerErrors', () => {
  it('sets the messages as a server error on the matching control', () => {
    const form = new FormGroup({
      email: new FormControl('ana@example.com', { nonNullable: true }),
    });

    const unmatched = applyServerErrors(form, {
      email: ['Este e-mail já está em uso'],
    });

    expect(unmatched).toEqual([]);
    expect(form.controls.email.errors).toEqual({
      server: ['Este e-mail já está em uso'],
    });
  });

  it('returns the keys that matched no control', () => {
    const form = new FormGroup({
      email: new FormControl('', { nonNullable: true }),
    });

    const unmatched = applyServerErrors(form, {
      email: ['Informe um e-mail válido.'],
      dueDate: ['A data não pode estar no passado.'],
    });

    expect(unmatched).toEqual(['dueDate']);
    expect(form.controls.email.hasError('server')).toBe(true);
    expect(form.get('dueDate')).toBeNull();
  });

  it('keeps the errors the control already has', () => {
    const form = new FormGroup({
      password: new FormControl('curta', {
        nonNullable: true,
        validators: [Validators.minLength(8)],
      }),
    });

    const unmatched = applyServerErrors(form, {
      password: ['Password must be at least 8 characters.'],
    });

    expect(unmatched).toEqual([]);
    expect(form.controls.password.errors).toEqual({
      minlength: { requiredLength: 8, actualLength: 5 },
      server: ['Password must be at least 8 characters.'],
    });
  });
});
